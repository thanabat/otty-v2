"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type {
  LineUserProfile,
  VerifiedLineProfileResponse
} from "@otty/shared";
import { webEnv } from "../lib/env";

type TesterState = {
  isInitializing: boolean;
  isLoggedIn: boolean;
  isInClient: boolean;
  error: string | null;
  liffId: string;
  accessToken: string | null;
  idToken: string | null;
  language: string | null;
  os: string | null;
  clientProfile: LineUserProfile | null;
  verifiedProfile: VerifiedLineProfileResponse | null;
  decodedIdToken: Record<string, unknown> | null;
};

const initialState: TesterState = {
  isInitializing: true,
  isLoggedIn: false,
  isInClient: false,
  error: null,
  liffId: webEnv.liffId,
  accessToken: null,
  idToken: null,
  language: null,
  os: null,
  clientProfile: null,
  verifiedProfile: null,
  decodedIdToken: null
};

export function LineLoginTester() {
  const [state, setState] = useState<TesterState>(initialState);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      if (!webEnv.liffId) {
        if (!cancelled) {
          setState((current) => ({
            ...current,
            isInitializing: false,
            error: "NEXT_PUBLIC_LIFF_ID is missing"
          }));
        }
        return;
      }

      try {
        const { default: liff } = await import("@line/liff");

        await liff.init({
          liffId: webEnv.liffId
        });

        if (!liff.isLoggedIn()) {
          if (!cancelled) {
            setState((current) => ({
              ...current,
              isInitializing: false,
              isLoggedIn: false,
              isInClient: liff.isInClient(),
              language: liff.getLanguage(),
              os: liff.getOS() ?? null,
              error: null
            }));
          }
          return;
        }

        const accessToken = liff.getAccessToken();
        const clientProfile = await liff.getProfile();
        const verifiedProfile = accessToken
          ? await fetchVerifiedProfile(accessToken)
          : null;

        if (!cancelled) {
          setState({
            isInitializing: false,
            isLoggedIn: true,
            isInClient: liff.isInClient(),
            error: null,
            liffId: webEnv.liffId,
            accessToken,
            idToken: liff.getIDToken(),
            language: liff.getLanguage(),
            os: liff.getOS() ?? null,
            clientProfile,
            verifiedProfile,
            decodedIdToken: liff.getDecodedIDToken() as Record<
              string,
              unknown
            > | null
          });
        }
      } catch (error) {
        if (!cancelled) {
          setState((current) => ({
            ...current,
            isInitializing: false,
            error: error instanceof Error ? error.message : "Unknown LIFF error"
          }));
        }
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleLogin() {
    const { default: liff } = await import("@line/liff");

    liff.login({
      redirectUri: window.location.href
    });
  }

  async function handleLogout() {
    const { default: liff } = await import("@line/liff");

    liff.logout();
    window.location.reload();
  }

  return (
    <main className="page-shell">
      <section className="hero-card hero-card--split">
        <div>
          <p className="eyebrow">Step 1 • LINE Login</p>
          <h1>เช็ก LINE login ก่อน แล้วค่อยไปดู employee profile</h1>
          <p className="lead">
            หน้านี้ใช้ LIFF สำหรับ sign-in และแสดงข้อมูลจาก LINE โดยตรงก่อน
            เมื่อแน่ใจว่า login สำเร็จแล้ว ค่อยกดไปหน้า profile เพื่อ lookup
            ข้อมูลพนักงานจาก collection `users`
          </p>
        </div>

        <div className="status-stack">
          <StatusPill
            label={state.isInitializing ? "Initializing LIFF" : "LIFF Ready"}
            tone={state.isInitializing ? "muted" : "success"}
          />
          <StatusPill
            label={state.isLoggedIn ? "Logged in" : "Not logged in"}
            tone={state.isLoggedIn ? "success" : "warning"}
          />
          <StatusPill
            label={state.isInClient ? "Opened in LINE" : "External browser"}
            tone="neutral"
          />
        </div>
      </section>

      <section className="info-grid info-grid--wide">
        <article className="info-card">
          <h2>Controls</h2>
          <div className="button-row">
            <button
              className="action-button"
              onClick={() => void handleLogin()}
              disabled={state.isInitializing || !state.liffId || state.isLoggedIn}
              type="button"
            >
              Login with LINE
            </button>
            <button
              className="action-button action-button--secondary"
              onClick={() => window.location.reload()}
              type="button"
            >
              Refresh state
            </button>
            <Link
              aria-disabled={!state.isLoggedIn}
              className={`action-button action-button--secondary${
                state.isLoggedIn ? "" : " action-button--disabled-link"
              }`}
              href={state.isLoggedIn ? "/profile" : "#"}
              onClick={(event) => {
                if (!state.isLoggedIn) {
                  event.preventDefault();
                }
              }}
            >
              View Profile
            </Link>
            {!state.isInClient && state.isLoggedIn ? (
              <button
                className="action-button action-button--ghost"
                onClick={() => void handleLogout()}
                type="button"
              >
                Logout
              </button>
            ) : null}
          </div>

          <dl className="meta-list">
            <div>
              <dt>LIFF ID</dt>
              <dd>{state.liffId || "Not configured"}</dd>
            </div>
            <div>
              <dt>API Base URL</dt>
              <dd>{webEnv.apiBaseUrl}</dd>
            </div>
            <div>
              <dt>OS</dt>
              <dd>{state.os ?? "-"}</dd>
            </div>
            <div>
              <dt>Language</dt>
              <dd>{state.language ?? "-"}</dd>
            </div>
          </dl>

          {state.error ? (
            <p className="callout callout--error">{state.error}</p>
          ) : (
            <p className="callout">
              Step นี้จบเมื่อเห็น LINE profile ด้านล่างและปุ่ม `View Profile`
              ใช้งานได้
            </p>
          )}
        </article>

        <article className="info-card">
          <h2>Verified Profile</h2>
          {state.verifiedProfile ? (
            <>
              <ProfileCard profile={state.verifiedProfile.profile} />
              <JsonBlock
                title="Token Metadata"
                value={state.verifiedProfile.token}
              />
            </>
          ) : (
            <EmptyState>
              ยังไม่มี profile จาก API
              {state.isLoggedIn
                ? " ลองกด Refresh state ถ้า token เพิ่งได้มาใหม่"
                : " ให้ login ผ่าน LINE ก่อน"}
            </EmptyState>
          )}
        </article>

        <article className="info-card">
          <h2>Client Profile</h2>
          {state.clientProfile ? (
            <>
              <ProfileCard profile={state.clientProfile} />
              <p className="helper-text">
                ชุดข้อมูลนี้มาจาก `liff.getProfile()` โดยตรงบน browser
              </p>
            </>
          ) : (
            <EmptyState>
              ยังไม่ได้เรียก `liff.getProfile()` เพราะยังไม่ login
            </EmptyState>
          )}
        </article>

        <article className="info-card">
          <h2>Token Snapshot</h2>
          <dl className="meta-list">
            <div>
              <dt>Access Token</dt>
              <dd>{maskToken(state.accessToken)}</dd>
            </div>
            <div>
              <dt>ID Token</dt>
              <dd>{maskToken(state.idToken)}</dd>
            </div>
          </dl>

          <JsonBlock title="Decoded ID Token" value={state.decodedIdToken} />
        </article>
      </section>
    </main>
  );
}

async function fetchVerifiedProfile(accessToken: string) {
  const response = await fetch("/api/auth/line/profile", {
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

    throw new Error(
      errorPayload?.message ?? "Unable to verify LINE profile from API"
    );
  }

  return (await response.json()) as VerifiedLineProfileResponse;
}

function StatusPill({
  label,
  tone
}: {
  label: string;
  tone: "muted" | "success" | "warning" | "neutral";
}) {
  return <span className={`status-pill status-pill--${tone}`}>{label}</span>;
}

function ProfileCard({ profile }: { profile: LineUserProfile }) {
  return (
    <div className="profile-card">
      {profile.pictureUrl ? (
        <img
          alt={profile.displayName}
          className="profile-card__avatar"
          height={72}
          src={profile.pictureUrl}
          width={72}
        />
      ) : (
        <div className="profile-card__avatar profile-card__avatar--fallback">
          {profile.displayName.slice(0, 1)}
        </div>
      )}

      <div>
        <p className="profile-card__name">{profile.displayName}</p>
        <p className="profile-card__subtle">{profile.userId}</p>
        <p className="profile-card__message">
          {profile.statusMessage || "No status message"}
        </p>
      </div>
    </div>
  );
}

function JsonBlock({
  title,
  value
}: {
  title: string;
  value: unknown;
}) {
  return (
    <div className="json-block">
      <p className="json-block__title">{title}</p>
      <pre>{JSON.stringify(value, null, 2)}</pre>
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="empty-state">{children}</p>;
}

function maskToken(token: string | null) {
  if (!token) {
    return "-";
  }

  if (token.length <= 20) {
    return token;
  }

  return `${token.slice(0, 10)}...${token.slice(-8)}`;
}
