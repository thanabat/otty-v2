"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { LiffLoginResponse, UserProfileUpdateInput } from "@otty/shared";
import { webEnv } from "../lib/env";

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
  joiningYear: string;
};

export function LiveProfilePage() {
  const [state, setState] = useState(initialState);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [form, setForm] = useState<EditFormState>({
    fullname: "",
    nickname: "",
    email: "",
    phone: "",
    bio: "",
    title: "",
    joiningYear: ""
  });

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      if (!webEnv.liffId) {
        if (!cancelled) {
          setState({
            ...initialState,
            isInitializing: false,
            error: "NEXT_PUBLIC_LIFF_ID is missing"
          });
        }
        return;
      }

      try {
        const { default: liff } = await import("@line/liff");

        await liff.init({
          liffId: webEnv.liffId
        });

        if (!liff.isLoggedIn()) {
          liff.login({
            redirectUri: `${window.location.origin}/profile`
          });
          return;
        }

        const accessToken = liff.getAccessToken();

        if (!accessToken) {
          throw new Error("LIFF did not return an access token");
        }

        const session = await fetchLiffLogin(accessToken);

        if (!cancelled) {
          setState({
            isInitializing: false,
            isLoggedIn: true,
            isInClient: liff.isInClient(),
            error: null,
            accessToken,
            session
          });
          setForm(createEditFormState(session));
        }
      } catch (error) {
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

  async function handleLogout() {
    const { default: liff } = await import("@line/liff");

    liff.logout();
    window.location.reload();
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
        joiningYear: normalizeJoiningYear(form.joiningYear)
      });

      setState((current) => ({
        ...current,
        session: updatedSession
      }));
      setForm(createEditFormState(updatedSession));
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
      <main className="page-shell">
        <section className="hero-card">
          <p className="eyebrow">Profile</p>
          <h1>Checking LINE login...</h1>
          <p className="lead">
            ระบบกำลังตรวจสอบ LIFF session และเตรียมโหลดข้อมูลจาก MongoDB
          </p>
        </section>
      </main>
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
  const currentYear = new Date().getFullYear();
  const joiningYear = user.workingInfo?.joiningYear ?? null;
  const yearsWorked =
    typeof joiningYear === "number" && joiningYear > 0
      ? Math.max(currentYear - joiningYear, 0)
      : null;

  return (
    <main className="profile-stage">
      <section className="profile-spotlight">
        <div className="profile-spotlight__glow" />
        <article className="phone-profile-card">
          <div className="phone-profile-card__media">
            {lineProfile.pictureUrl ? (
              <img
                alt={lineProfile.displayName}
                className="phone-profile-card__image"
                height={420}
                src={lineProfile.pictureUrl}
                width={420}
              />
            ) : (
              <div className="phone-profile-card__image phone-profile-card__image--fallback">
                {lineProfile.displayName.slice(0, 1)}
              </div>
            )}
          </div>

          <div className="phone-profile-card__content">
            <div className="phone-profile-card__title-row">
              <div>
                <p className="phone-profile-card__name">
                  {user.personalInfo?.fullname || lineProfile.displayName}
                </p>
                <p className="phone-profile-card__role">
                  {user.workingInfo?.title || "No title"}
                </p>
              </div>
              <img
                alt="Verified profile"
                className="verify-badge"
                height={44}
                src="/verify.svg"
                width={44}
              />
            </div>

            <div className="phone-profile-card__footer">
              <div className="phone-profile-card__details-grid">
                <section className="profile-detail-card">
                  <p className="profile-detail-card__eyebrow">Contact Info</p>
                  <div className="profile-detail-card__list">
                    <div className="profile-detail-card__item profile-detail-card__item--icon">
                      <img
                        alt="Email"
                        className="profile-detail-card__icon"
                        height={18}
                        src="/email.svg"
                        width={18}
                      />
                      <span className="profile-detail-card__value">
                        {user.personalInfo?.email || "-"}
                      </span>
                    </div>
                    <div className="profile-detail-card__item profile-detail-card__item--icon">
                      <img
                        alt="Phone"
                        className="profile-detail-card__icon"
                        height={18}
                        src="/phone.svg"
                        width={18}
                      />
                      <span className="profile-detail-card__value">
                        {user.personalInfo?.phone || "-"}
                      </span>
                    </div>
                  </div>
                </section>

                <section className="profile-detail-card">
                  <p className="profile-detail-card__eyebrow">Working Info</p>
                  <div className="profile-detail-card__list profile-detail-card__list--two-column">
                    <div className="profile-detail-card__item">
                      <span className="profile-detail-card__label">Experience</span>
                      <span className="profile-detail-card__value">
                        {yearsWorked !== null
                          ? `${yearsWorked} year${yearsWorked === 1 ? "" : "s"}`
                          : "-"}
                      </span>
                    </div>
                    <div className="profile-detail-card__item">
                      <span className="profile-detail-card__label">Joining Year</span>
                      <span className="profile-detail-card__value">
                        {joiningYear ?? "-"}
                      </span>
                    </div>
                    <div className="profile-detail-card__item">
                      <span className="profile-detail-card__label">Current Site</span>
                      <span className="profile-detail-card__value">
                        {user.workingInfo?.currentSite ||
                          user.workingInfo?.currentSiteOther ||
                          "-"}
                      </span>
                    </div>
                    <div className="profile-detail-card__item">
                      <span className="profile-detail-card__label">Referrer</span>
                      <span className="profile-detail-card__value">
                        {user.workingInfo?.referrer || "-"}
                      </span>
                    </div>
                  </div>
                </section>

                <section className="profile-detail-card profile-detail-card--full">
                  <p className="profile-detail-card__eyebrow">Bio</p>
                  <div className="profile-detail-card__list">
                    <div className="profile-detail-card__item">
                      <span className="profile-detail-card__value profile-detail-card__value--body">
                        {user.personalInfo?.bio || "-"}
                      </span>
                    </div>
                  </div>
                </section>
              </div>

              <div className="button-row button-row--stack">
                <button
                  className="action-button action-button--secondary phone-profile-card__action"
                  onClick={() => {
                    setForm(createEditFormState(state.session!));
                    setSaveError(null);
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
            </div>
          </div>
        </article>
      </section>

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
                      phone: event.target.value
                    }))
                  }
                  type="text"
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
                <span>Joining Year</span>
                <input
                  inputMode="numeric"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      joiningYear: event.target.value
                    }))
                  }
                  type="text"
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
