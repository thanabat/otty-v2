"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type {
  LiffLoginResponse,
  UserProfileUpdateInput,
  UserReferrerCandidate,
  UserReferrerCandidatesResponse
} from "@otty/shared";
import { ProfileLoadingState } from "./loading-state";
import { ProfileCardView } from "./profile-card-view";
import { ensureLiffSession, logoutLiff } from "../lib/liff-auth";

type LiveProfileState = {
  isInitializing: boolean;
  isLoggedIn: boolean;
  isInClient: boolean;
  error: string | null;
  accessToken: string | null;
  session: LiffLoginResponse | null;
};

const initialState: LiveProfileState = {
  isInitializing: true,
  isLoggedIn: false,
  isInClient: false,
  error: null,
  accessToken: null,
  session: null
};

type EditFormState = {
  fullname: string;
  nickname: string;
  email: string;
  phone: string;
  bio: string;
  title: string;
  referrer: string;
  referrerUserId: string;
  emergencyContactUserIds: string[];
  joiningYear: string;
};

export function LiveProfilePage() {
  const [state, setState] = useState(initialState);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [referrerCandidates, setReferrerCandidates] = useState<
    UserReferrerCandidate[]
  >([]);
  const [isReferrerMenuOpen, setIsReferrerMenuOpen] = useState(false);
  const [isEmergencyContactsMenuOpen, setIsEmergencyContactsMenuOpen] =
    useState(false);
  const [emergencyContactQuery, setEmergencyContactQuery] = useState("");
  const referrerFieldRef = useRef<HTMLDivElement | null>(null);
  const emergencyContactsFieldRef = useRef<HTMLDivElement | null>(null);
  const [form, setForm] = useState<EditFormState>({
    fullname: "",
    nickname: "",
    email: "",
    phone: "",
    bio: "",
    title: "",
    referrer: "",
    referrerUserId: "",
    emergencyContactUserIds: [],
    joiningYear: ""
  });

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const { accessToken, isInClient } = await ensureLiffSession("/profile");
        const session = await fetchLiffLogin(accessToken);

        if (!cancelled) {
          setState({
            isInitializing: false,
            isLoggedIn: true,
            isInClient,
            error: null,
            accessToken,
            session
          });
          setForm(createEditFormState(session));
        }
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === "LIFF login redirect started"
        ) {
          return;
        }

        if (!cancelled) {
          setState({
            isInitializing: false,
            isLoggedIn: false,
            isInClient: false,
            error:
              error instanceof Error
                ? error.message
                : "Unable to load employee profile",
            accessToken: null,
            session: null
          });
        }
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!state.session) {
      return;
    }

    let cancelled = false;

    async function loadReferrerOptions() {
      try {
        const items = await fetchReferrerOptions();

        if (!cancelled) {
          setReferrerCandidates(items);
        }
      } catch {}
    }

    void loadReferrerOptions();

    return () => {
      cancelled = true;
    };
  }, [state.session]);

  useEffect(() => {
    if (!isEditing) {
      return;
    }

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [isEditing]);

  useEffect(() => {
    if (!isEditing || !isReferrerMenuOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!referrerFieldRef.current) {
        return;
      }

      if (!referrerFieldRef.current.contains(event.target as Node)) {
        setIsReferrerMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isEditing, isReferrerMenuOpen]);

  useEffect(() => {
    if (!isEditing || !isEmergencyContactsMenuOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!emergencyContactsFieldRef.current) {
        return;
      }

      if (!emergencyContactsFieldRef.current.contains(event.target as Node)) {
        setIsEmergencyContactsMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isEditing, isEmergencyContactsMenuOpen]);

  const normalizedReferrerQuery = form.referrer.trim().toLowerCase();
  const filteredReferrerOptions = referrerCandidates
    .filter((item) =>
      normalizedReferrerQuery
        ? [
            item.nickname ?? "",
            item.shortName ?? "",
            item.fullname ?? ""
          ].some((value) => value.toLowerCase().includes(normalizedReferrerQuery))
        : true
    )
    .slice(0, 8);
  const emergencyContactCandidates = referrerCandidates.filter(
    (item) =>
      item.id !== state.session?.user.id &&
      !form.emergencyContactUserIds.includes(item.id)
  );
  const normalizedEmergencyContactQuery = emergencyContactQuery.trim().toLowerCase();
  const filteredEmergencyContactOptions = emergencyContactCandidates
    .filter((item) =>
      normalizedEmergencyContactQuery
        ? [
            item.nickname ?? "",
            item.shortName ?? "",
            item.fullname ?? ""
          ].some((value) =>
            value.toLowerCase().includes(normalizedEmergencyContactQuery)
          )
        : true
    )
    .slice(0, 8);
  const selectedEmergencyContacts = form.emergencyContactUserIds
    .map(
      (id) =>
        referrerCandidates.find((item) => item.id === id) ??
        state.session?.user.emergencyContacts.find((item) => item.id === id) ??
        null
    )
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  async function handleLogout() {
    await logoutLiff();
  }

  async function handleSaveProfile() {
    if (!state.accessToken || !state.session) {
      setSaveError("Current session is missing an access token");
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const updatedSession = await updateLiffProfile(state.accessToken, {
        fullname: normalizeFormText(form.fullname),
        nickname: normalizeFormText(form.nickname),
        email: normalizeFormText(form.email),
        phone: normalizeFormText(form.phone),
        bio: normalizeFormText(form.bio),
        title: normalizeFormText(form.title),
        referrer: normalizeFormText(form.referrer),
        referrerUserId: normalizeFormText(form.referrerUserId),
        emergencyContactUserIds: form.emergencyContactUserIds,
        joiningYear: normalizeJoiningYear(form.joiningYear)
      });

      setState((current) => ({
        ...current,
        session: updatedSession
      }));
      setForm(createEditFormState(updatedSession));
      setIsReferrerMenuOpen(false);
      setIsEditing(false);
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Unable to update profile"
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (state.isInitializing) {
    return (
      <ProfileLoadingState
        description="กำลังเช็ก LINE login และเตรียม employee profile ของคุณ"
        eyebrow="Profile"
        title="Preparing your card..."
      />
    );
  }

  if (state.error || !state.session) {
    return (
      <main className="page-shell">
        <section className="hero-card">
          <p className="eyebrow">Profile</p>
          <h1>Unable to load employee profile</h1>
          <p className="lead">
            {state.error ??
              "The LINE account is authenticated but no matching user was found."}
          </p>
        </section>

        <section className="info-grid">
          <article className="info-card">
            <h2>What To Check</h2>
            <p className="lead lead--compact">
              ตรวจว่า LINE account นี้มี `users.line_user_id` ตรงกับ `userId`
              ที่ LINE ส่งกลับมาหรือไม่
            </p>
            <p className="helper-text">
              ถ้าต้องการไล่ flow แบบละเอียด ไปที่{" "}
              <Link className="inline-link" href="/dev/line">
                /dev/line
              </Link>
            </p>
          </article>
        </section>
      </main>
    );
  }

  const { user, lineProfile } = state.session;
  const referrer = user.workingInfo?.referrer?.trim() || "";
  const referrerUserId = user.workingInfo?.referrerUserId?.trim() || "";
  const currentSite =
    user.workingInfo?.currentSite?.trim() ||
    user.workingInfo?.currentSiteOther?.trim() ||
    "";
  const joiningYear = user.workingInfo?.joiningYear ?? null;

  return (
    <main className="profile-stage">
      <ProfileCardView
        currentSiteHref={
          currentSite ? `/sites/${encodeURIComponent(currentSite)}` : null
        }
        displayName={lineProfile.displayName}
        joiningYearHref={joiningYear ? `/years/${joiningYear}` : null}
        pictureUrl={user.personalInfo?.pictureUrl ?? lineProfile.pictureUrl}
        referrerHref={
          referrer
            ? buildReferrerHref(referrer, referrerUserId || null)
            : null
        }
        user={user}
        workingExperiencesHref={`/profile/${encodeURIComponent(user.id)}/working-experiences?self=1`}
        footer={
          <div className="button-row button-row--stack">
            <button
              className="action-button action-button--secondary phone-profile-card__action"
              onClick={() => {
                setForm(createEditFormState(state.session!));
                setSaveError(null);
                setIsReferrerMenuOpen(false);
                setIsEmergencyContactsMenuOpen(false);
                setEmergencyContactQuery("");
                setIsEditing(true);
              }}
              type="button"
            >
              Edit Profile
            </button>
            <button
              className="action-button phone-profile-card__logout"
              onClick={() => void handleLogout()}
              type="button"
            >
              Logout
            </button>
          </div>
        }
      />

      {isEditing ? (
        <section className="profile-editor-overlay">
          <div
            aria-hidden="true"
            className="profile-editor-overlay__backdrop"
            onClick={() => {
              if (!isSaving) {
                setIsEditing(false);
                setSaveError(null);
              }
            }}
          />

          <div className="profile-editor-sheet">
            <p className="eyebrow">Edit Profile</p>
            <h2>Edit the fields shown on this card</h2>

            <div className="editor-form">
              <label className="editor-field">
                <span>Fullname</span>
                <input
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      fullname: event.target.value
                    }))
                  }
                  type="text"
                  value={form.fullname}
                />
              </label>

              <label className="editor-field">
                <span>Nick Name</span>
                <input
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      nickname: event.target.value
                    }))
                  }
                  type="text"
                  value={form.nickname}
                />
              </label>

              <label className="editor-field">
                <span>Email</span>
                <input
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      email: event.target.value
                    }))
                  }
                  type="email"
                  value={form.email}
                />
              </label>

              <label className="editor-field">
                <span>Phone</span>
                <input
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      phone: event.target.value.replace(/\D/g, "").slice(0, 10)
                    }))
                  }
                  inputMode="numeric"
                  maxLength={10}
                  pattern="[0-9]*"
                  type="tel"
                  value={form.phone}
                />
              </label>

              <label className="editor-field">
                <span>Bio</span>
                <textarea
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      bio: event.target.value
                    }))
                  }
                  rows={4}
                  value={form.bio}
                />
              </label>

              <label className="editor-field">
                <span>Title</span>
                <input
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      title: event.target.value
                    }))
                  }
                  type="text"
                  value={form.title}
                />
              </label>

              <label className="editor-field">
                <span>Referrer</span>
                <div className="combobox-field" ref={referrerFieldRef}>
                  <input
                    autoComplete="off"
                    aria-autocomplete="list"
                    aria-expanded={isReferrerMenuOpen}
                    aria-label="Referrer"
                    className="combobox-field__input"
                    onChange={(event) => {
                      setForm((current) => ({
                        ...current,
                        referrer: event.target.value,
                        referrerUserId: ""
                      }));
                      setIsReferrerMenuOpen(true);
                    }}
                    onFocus={() => {
                      setIsReferrerMenuOpen(true);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Escape") {
                        setIsReferrerMenuOpen(false);
                      }
                    }}
                    role="combobox"
                    type="search"
                    value={form.referrer}
                  />

                  {isReferrerMenuOpen ? (
                    <div className="combobox-field__menu" role="listbox">
                      {filteredReferrerOptions.length > 0 ? (
                        filteredReferrerOptions.map((item) => (
                          <button
                            className={`combobox-field__option${
                              form.referrerUserId === item.id
                                ? " combobox-field__option--active"
                                : ""
                            }`}
                            key={item.id}
                            onClick={() => {
                              setForm((current) => ({
                                ...current,
                                referrer: buildReferrerCandidateLabel(item),
                                referrerUserId: item.id
                              }));
                              setIsReferrerMenuOpen(false);
                            }}
                            onMouseDown={(event) => {
                              event.preventDefault();
                            }}
                            role="option"
                            type="button"
                          >
                            {buildReferrerCandidateLabel(item)}
                          </button>
                        ))
                      ) : (
                        <p className="combobox-field__empty">
                          No matching referrer. You can add a new one.
                        </p>
                      )}
                    </div>
                  ) : null}
                </div>
              </label>

              <label className="editor-field">
                <span>Emergency Contact(s)</span>
                <div className="combobox-field" ref={emergencyContactsFieldRef}>
                  <input
                    autoComplete="off"
                    aria-autocomplete="list"
                    aria-expanded={isEmergencyContactsMenuOpen}
                    aria-label="Emergency Contacts"
                    className="combobox-field__input"
                    onChange={(event) => {
                      setEmergencyContactQuery(event.target.value);
                      setIsEmergencyContactsMenuOpen(true);
                    }}
                    onFocus={() => {
                      setIsEmergencyContactsMenuOpen(true);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Escape") {
                        setIsEmergencyContactsMenuOpen(false);
                      }
                    }}
                    placeholder="Search coworkers"
                    role="combobox"
                    type="search"
                    value={emergencyContactQuery}
                  />

                  {isEmergencyContactsMenuOpen ? (
                    <div className="combobox-field__menu" role="listbox">
                      {filteredEmergencyContactOptions.length > 0 ? (
                        filteredEmergencyContactOptions.map((item) => (
                          <button
                            className="combobox-field__option combobox-field__option--person"
                            key={item.id}
                            onClick={() => {
                              setForm((current) => ({
                                ...current,
                                emergencyContactUserIds: [
                                  ...current.emergencyContactUserIds,
                                  item.id
                                ]
                              }));
                              setEmergencyContactQuery("");
                              setIsEmergencyContactsMenuOpen(false);
                            }}
                            onMouseDown={(event) => {
                              event.preventDefault();
                            }}
                            role="option"
                            type="button"
                          >
                            <span className="combobox-field__person-name">
                              {buildReferrerCandidateLabel(item)}
                            </span>
                          </button>
                        ))
                      ) : (
                        <p className="combobox-field__empty">
                          No matching coworkers found.
                        </p>
                      )}
                    </div>
                  ) : null}
                </div>

                {selectedEmergencyContacts.length > 0 ? (
                  <div className="selected-people-row">
                    {selectedEmergencyContacts.map((contact) => (
                      <div className="selected-person-chip" key={contact.id}>
                        {contact.pictureUrl ? (
                          <img
                            alt={contact.fullname ?? contact.nickname ?? "Emergency contact"}
                            className="selected-person-chip__avatar"
                            height={30}
                            src={contact.pictureUrl}
                            width={30}
                          />
                        ) : (
                          <div className="selected-person-chip__avatar selected-person-chip__avatar--fallback">
                            {(contact.nickname ?? contact.fullname ?? "U").slice(0, 1)}
                          </div>
                        )}
                        <span className="selected-person-chip__label">
                          {buildReferrerCandidateLabel(contact)}
                        </span>
                        <button
                          className="selected-person-chip__remove"
                          onClick={() => {
                            setForm((current) => ({
                              ...current,
                              emergencyContactUserIds:
                                current.emergencyContactUserIds.filter(
                                  (id) => id !== contact.id
                                )
                            }));
                          }}
                          type="button"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="helper-text">
                    If someone can&apos;t reach you, they can try these coworkers.
                  </p>
                )}
              </label>

              <label className="editor-field">
                <span>Joining Year</span>
                <input
                  inputMode="numeric"
                  maxLength={4}
                  pattern="[0-9]*"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      joiningYear: event.target.value.replace(/\D/g, "").slice(0, 4)
                    }))
                  }
                  type="tel"
                  value={form.joiningYear}
                />
              </label>

            </div>

            {saveError ? <p className="callout callout--error">{saveError}</p> : null}

            <div className="button-row button-row--editor">
              <button
                className="action-button action-button--ghost"
                disabled={isSaving}
                onClick={() => {
                  setIsEditing(false);
                  setSaveError(null);
                  setIsReferrerMenuOpen(false);
                  setIsEmergencyContactsMenuOpen(false);
                  setEmergencyContactQuery("");
                }}
                type="button"
              >
                Cancel
              </button>
              <button
                className="action-button"
                disabled={isSaving}
                onClick={() => void handleSaveProfile()}
                type="button"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}

async function fetchLiffLogin(accessToken: string) {
  const response = await fetch("/api/auth/liff/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      accessToken
    })
  });

  if (!response.ok) {
    const errorPayload = (await response.json().catch(() => null)) as
      | { message?: string }
      | null;

    throw new Error(errorPayload?.message ?? "Unable to resolve LIFF user");
  }

  return (await response.json()) as LiffLoginResponse;
}

async function updateLiffProfile(
  accessToken: string,
  profile: UserProfileUpdateInput
) {
  const response = await fetch("/api/auth/liff/profile", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      accessToken,
      profile
    })
  });

  if (!response.ok) {
    const errorPayload = (await response.json().catch(() => null)) as
      | { message?: string }
      | null;

    throw new Error(errorPayload?.message ?? "Unable to update profile");
  }

  return (await response.json()) as LiffLoginResponse;
}

function createEditFormState(session: LiffLoginResponse): EditFormState {
  return {
    fullname: session.user.personalInfo?.fullname ?? "",
    nickname: session.user.personalInfo?.nickname ?? "",
    email: session.user.personalInfo?.email ?? "",
    phone: session.user.personalInfo?.phone ?? "",
    bio: session.user.personalInfo?.bio ?? "",
    title: session.user.workingInfo?.title ?? "",
    referrer: session.user.workingInfo?.referrer ?? "",
    referrerUserId: session.user.workingInfo?.referrerUserId ?? "",
    emergencyContactUserIds: session.user.emergencyContacts.map(
      (contact) => contact.id
    ),
    joiningYear: session.user.workingInfo?.joiningYear
      ? String(session.user.workingInfo.joiningYear)
      : ""
  };
}

function normalizeFormText(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeJoiningYear(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

async function fetchReferrerOptions() {
  const response = await fetch("/api/users/referrer-candidates", {
    method: "GET",
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("Unable to load referrer options");
  }

  const payload = (await response.json()) as UserReferrerCandidatesResponse;
  return payload.items;
}

function buildReferrerCandidateLabel(candidate: {
  nickname?: string | null;
  shortName?: string | null;
  fullname?: string | null;
}) {
  const nickname = candidate.nickname?.trim() ?? "";
  const shortName = candidate.shortName?.trim() ?? "";

  if (nickname && shortName) {
    return `${nickname} • ${shortName}`;
  }

  return nickname || shortName || candidate.fullname?.trim() || "Unknown user";
}

function buildReferrerHref(referrer: string, referrerUserId?: string | null) {
  if (referrerUserId) {
    return `/connections/user/${encodeURIComponent(referrerUserId)}`;
  }

  return `/connections/${encodeURIComponent(referrer)}`;
}
