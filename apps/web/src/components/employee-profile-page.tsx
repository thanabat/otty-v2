"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type {
  LiffLoginResponse,
  LineUserProfile,
  VerifiedLineProfileResponse
} from "@otty/shared";
import { webEnv } from "../lib/env";

type ProfileState = {
  isInitializing: boolean;
  isLineLoggedIn: boolean;
  isInClient: boolean;
  error: string | null;
  liffId: string;
  accessToken: string | null;
  language: string | null;
  os: string | null;
  lineProfile: LineUserProfile | null;
  tokenMetadata: VerifiedLineProfileResponse["token"] | null;
  session: LiffLoginResponse | null;
};

const initialState: ProfileState = {
  isInitializing: true,
  isLineLoggedIn: false,
  isInClient: false,
  error: null,
  liffId: webEnv.liffId,
  accessToken: null,
  language: null,
  os: null,
  lineProfile: null,
  tokenMetadata: null,
  session: null
};

export function EmployeeProfilePage() {
  const [state, setState] = useState<ProfileState>(initialState);

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
              isLineLoggedIn: false,
              isInClient: liff.isInClient(),
              language: liff.getLanguage(),
              os: liff.getOS() ?? null,
              error: null
            }));
          }
          return;
        }

        const accessToken = liff.getAccessToken();

        if (!accessToken) {
          throw new Error("LIFF did not return an access token");
        }

        try {
          const session = await fetchLiffLogin(accessToken);

          if (!cancelled) {
            setState({
              isInitializing: false,
              isLineLoggedIn: true,
              isInClient: liff.isInClient(),
              error: null,
              liffId: webEnv.liffId,
              accessToken,
              language: liff.getLanguage(),
              os: liff.getOS() ?? null,
              lineProfile: session.lineProfile,
              tokenMetadata: session.token,
              session
            });
          }
        } catch (error) {
          const verifiedProfile = await fetchVerifiedProfile(accessToken).catch(
            () => null
          );

          if (!cancelled) {
            setState({
              isInitializing: false,
              isLineLoggedIn: true,
              isInClient: liff.isInClient(),
              error:
                error instanceof Error
                  ? error.message
                  : "LINE login succeeded but the user could not be resolved",
              liffId: webEnv.liffId,
              accessToken,
              language: liff.getLanguage(),
              os: liff.getOS() ?? null,
              lineProfile: verifiedProfile?.profile ?? null,
              tokenMetadata: verifiedProfile?.token ?? null,
              session: null
            });
          }
        }
      } catch (error) {
        if (!cancelled) {
          setState((current) => ({
            ...current,
            isInitializing: false,
            error:
              error instanceof Error
                ? error.message
                : "Unable to load employee profile"
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

  const user = state.session?.user;

  return (
    <main className="page-shell">
      <section className="hero-card hero-card--split">
        <div>
          <p className="eyebrow">Employee Profile</p>
          <h1>ดึงโปรไฟล์จาก MongoDB ผ่าน LINE Login</h1>
          <p className="lead">
            หน้านี้ verify ผู้ใช้จาก LIFF แล้ว lookup collection `users` ด้วย
            `line_user_id` ก่อนแสดงข้อมูลพนักงานจริงจากระบบ
          </p>
        </div>

        <div className="status-stack">
          <StatusPill
            label={state.isInitializing ? "Initializing LIFF" : "LIFF Ready"}
            tone={state.isInitializing ? "muted" : "success"}
          />
          <StatusPill
            label={state.isLineLoggedIn ? "LINE login success" : "Login required"}
            tone={state.isLineLoggedIn ? "success" : "warning"}
          />
          <StatusPill
            label={state.session ? "MongoDB user matched" : "No MongoDB match"}
            tone={state.session ? "success" : "warning"}
          />
          <StatusPill
            label={state.isInClient ? "Opened in LINE" : "External browser"}
            tone="neutral"
          />
        </div>
      </section>

      <section className="info-grid info-grid--wide">
        <article className="info-card">
          <h2>Profile Actions</h2>
          <div className="button-row">
            <button
              className="action-button"
              disabled={state.isInitializing || !state.liffId || state.isLineLoggedIn}
              onClick={() => void handleLogin()}
              type="button"
            >
              Login with LINE
            </button>
            <button
              className="action-button action-button--secondary"
              onClick={() => window.location.reload()}
              type="button"
            >
              Reload profile
            </button>
            {!state.isInClient && state.isLineLoggedIn ? (
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
            <div className="callout callout--error">
              <p>{state.error}</p>
              {state.lineProfile ? (
                <p className="callout__meta">
                  LINE user id: {state.lineProfile.userId}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="callout">
              ถ้า login ผ่านแล้วแต่ไม่เจอข้อมูล แปลว่า LINE account นี้ยังไม่มี
              record ที่ `users.line_user_id`
            </p>
          )}

          <p className="helper-text">
            กลับไปหน้า login check ได้ที่{" "}
            <Link className="inline-link" href="/dev/line">
              /dev/line
            </Link>
          </p>
        </article>

        <article className="info-card">
          <h2>Employee Summary</h2>
          {user ? (
            <div className="employee-summary">
              <p className="employee-summary__name">
                {user.personalInfo?.fullname || "Unknown employee"}
              </p>
              <p className="employee-summary__nickname">
                {user.personalInfo?.nickname || "-"}
              </p>
              <div className="flag-row">
                <StatusPill
                  label={user.isActive ? "Active" : "Inactive"}
                  tone={user.isActive ? "success" : "warning"}
                />
                <StatusPill
                  label={
                    user.hasPurchasedTicket
                      ? "Ticket purchased"
                      : "No ticket purchase"
                  }
                  tone="neutral"
                />
              </div>
            </div>
          ) : (
            <EmptyState>
              {state.isLineLoggedIn
                ? "LINE login สำเร็จแล้ว แต่ยังไม่พบ user ที่ match กับ users.line_user_id"
                : "ยังไม่มี employee profile จาก collection `users`"}
            </EmptyState>
          )}

          {state.session ? (
            <JsonBlock
              title="Resolved Session"
              value={{
                lineUserId: state.session.lineProfile.userId,
                userId: state.session.user.id,
                scopes: state.session.token.scope
              }}
            />
          ) : null}
        </article>

        <article className="info-card">
          <h2>Personal Info</h2>
          {user ? (
            <dl className="meta-list">
              <div>
                <dt>Full Name</dt>
                <dd>{user.personalInfo?.fullname ?? "-"}</dd>
              </div>
              <div>
                <dt>Nickname</dt>
                <dd>{user.personalInfo?.nickname ?? "-"}</dd>
              </div>
              <div>
                <dt>Basecamp Name</dt>
                <dd>{user.personalInfo?.basecampName ?? "-"}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{user.personalInfo?.email ?? "-"}</dd>
              </div>
            </dl>
          ) : (
            <EmptyState>ต้อง login และ match user ก่อน</EmptyState>
          )}
        </article>

        <article className="info-card">
          <h2>Working Info</h2>
          {user ? (
            <dl className="meta-list">
              <div>
                <dt>Current Site</dt>
                <dd>{user.workingInfo?.currentSite ?? "-"}</dd>
              </div>
              <div>
                <dt>Current Site Other</dt>
                <dd>{user.workingInfo?.currentSiteOther ?? "-"}</dd>
              </div>
              <div>
                <dt>Project</dt>
                <dd>{user.workingInfo?.project ?? "-"}</dd>
              </div>
              <div>
                <dt>Joining Year</dt>
                <dd>{user.workingInfo?.joiningYear ?? "-"}</dd>
              </div>
              <div>
                <dt>Referrer</dt>
                <dd>{user.workingInfo?.referrer ?? "-"}</dd>
              </div>
            </dl>
          ) : (
            <EmptyState>ต้อง login และ match user ก่อน</EmptyState>
          )}
        </article>

        <article className="info-card">
          <h2>LINE Account</h2>
          {state.lineProfile ? (
            <>
              <LineAccountCard
                displayName={state.lineProfile.displayName}
                pictureUrl={state.lineProfile.pictureUrl}
                statusMessage={state.lineProfile.statusMessage}
                userId={state.lineProfile.userId}
              />
              {state.tokenMetadata ? (
                <JsonBlock title="Token Metadata" value={state.tokenMetadata} />
              ) : null}
            </>
          ) : (
            <EmptyState>ยังไม่มีข้อมูลจาก LINE account</EmptyState>
          )}
        </article>
      </section>
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
    throw new Error("Unable to verify LINE profile");
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

function LineAccountCard({
  displayName,
  pictureUrl,
  statusMessage,
  userId
}: {
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
  userId: string;
}) {
  return (
    <div className="profile-card">
      {pictureUrl ? (
        <img
          alt={displayName}
          className="profile-card__avatar"
          height={72}
          src={pictureUrl}
          width={72}
        />
      ) : (
        <div className="profile-card__avatar profile-card__avatar--fallback">
          {displayName.slice(0, 1)}
        </div>
      )}

      <div>
        <p className="profile-card__name">{displayName}</p>
        <p className="profile-card__subtle">{userId}</p>
        <p className="profile-card__message">
          {statusMessage || "No status message"}
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
