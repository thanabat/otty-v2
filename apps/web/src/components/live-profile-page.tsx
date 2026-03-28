"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { LiffLoginResponse } from "@otty/shared";
import { webEnv } from "../lib/env";

type LiveProfileState = {
  isInitializing: boolean;
  isLoggedIn: boolean;
  isInClient: boolean;
  error: string | null;
  session: LiffLoginResponse | null;
};

const initialState: LiveProfileState = {
  isInitializing: true,
  isLoggedIn: false,
  isInClient: false,
  error: null,
  session: null
};

export function LiveProfilePage() {
  const [state, setState] = useState(initialState);

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
            redirectUri: window.location.href
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
            session
          });
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
                <p className="phone-profile-card__subtitle">
                  {user.personalInfo?.email || "No email"}
                </p>
                <div className="phone-profile-card__meta-stack">
                  <p className="phone-profile-card__meta-line">
                    Joining Year: {joiningYear ?? "-"}
                  </p>
                  <p className="phone-profile-card__meta-line">
                    Experience:{" "}
                    {yearsWorked !== null
                      ? `${yearsWorked} year${yearsWorked === 1 ? "" : "s"}`
                      : "-"}
                  </p>
                </div>
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
              <button
                className="action-button phone-profile-card__logout"
                onClick={() => void handleLogout()}
                type="button"
              >
                Logout
              </button>
            </div>
          </div>
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
