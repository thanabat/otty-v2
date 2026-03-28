"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { LiffLoginResponse, UserProfileUpdateInput } from "@otty/shared";
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
          referrer ? `/connections/${encodeURIComponent(referrer)}` : null
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
