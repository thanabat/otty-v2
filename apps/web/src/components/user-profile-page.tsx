"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { UserRecord } from "@otty/shared";
import { ProfileLoadingState } from "./loading-state";
import { ProfileCardView } from "./profile-card-view";
import { ensureLiffSession } from "../lib/liff-auth";

type UserProfilePageProps = {
  userId: string;
  referrer?: string;
  site?: string;
  year?: string;
  page?: string;
};

type UserProfileState = {
  isLoading: boolean;
  error: string | null;
  user: UserRecord | null;
};

export function UserProfilePage({
  userId,
  referrer,
  site,
  year,
  page
}: UserProfilePageProps) {
  const [state, setState] = useState<UserProfileState>({
    isLoading: true,
    error: null,
    user: null
  });

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const query = new URLSearchParams();

      if (referrer) {
        query.set("referrer", referrer);
      }

      if (site) {
        query.set("site", site);
      }

      if (year) {
        query.set("year", year);
      }

      if (page) {
        query.set("page", page);
      }

      const redirectPath = query.size
        ? `/profile/${encodeURIComponent(userId)}?${query.toString()}`
        : `/profile/${encodeURIComponent(userId)}`;

      try {
        await ensureLiffSession(redirectPath);
        const user = await fetchUserById(userId);

        if (!cancelled) {
          setState({
            isLoading: false,
            error: null,
            user
          });
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
            isLoading: false,
            error:
              error instanceof Error
                ? error.message
                : "Unable to load employee profile",
            user: null
          });
        }
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [page, referrer, site, userId, year]);

  const backHref = year
    ? `/years/${encodeURIComponent(year)}${page ? `?page=${encodeURIComponent(page)}` : ""}`
    : site
      ? `/sites/${encodeURIComponent(site)}${page ? `?page=${encodeURIComponent(page)}` : ""}`
      : referrer
        ? `/connections/${encodeURIComponent(referrer)}${page ? `?page=${encodeURIComponent(page)}` : ""}`
        : "/profile";

  const workingExperiencesQuery = new URLSearchParams();

  if (referrer) {
    workingExperiencesQuery.set("referrer", referrer);
  }

  if (site) {
    workingExperiencesQuery.set("site", site);
  }

  if (year) {
    workingExperiencesQuery.set("year", year);
  }

  if (page) {
    workingExperiencesQuery.set("page", page);
  }

  const workingExperiencesHref = workingExperiencesQuery.size
    ? `/profile/${encodeURIComponent(userId)}/working-experiences?${workingExperiencesQuery.toString()}`
    : `/profile/${encodeURIComponent(userId)}/working-experiences`;

  if (state.isLoading) {
    return (
      <ProfileLoadingState
        description="กำลังตรวจสอบสิทธิ์และโหลด employee profile"
        eyebrow="Profile"
        title="Loading profile..."
      />
    );
  }

  if (state.error || !state.user) {
    return (
      <main className="page-shell">
        <section className="hero-card">
          <p className="eyebrow">Profile</p>
          <h1>Unable to load employee profile</h1>
          <p className="lead">{state.error ?? "Unknown error"}</p>
        </section>

        <div className="button-row button-row--compact">
          <Link
            className="action-button action-button--secondary"
            href={backHref}
          >
            Back
          </Link>
        </div>
      </main>
    );
  }

  const footer = (
    <div className="button-row button-row--stack">
      <Link
        className="action-button action-button--secondary phone-profile-card__action"
        href={backHref}
      >
        Back
      </Link>
    </div>
  );

  return (
    <main className="profile-stage">
      <ProfileCardView
        currentSiteHref={
          state.user.workingInfo?.currentSite?.trim() ||
          state.user.workingInfo?.currentSiteOther?.trim()
            ? `/sites/${encodeURIComponent(
                state.user.workingInfo?.currentSite?.trim() ||
                  state.user.workingInfo?.currentSiteOther?.trim() ||
                  ""
              )}`
            : null
        }
        displayName={state.user.personalInfo?.fullname || "Employee"}
        footer={footer}
        joiningYearHref={
          state.user.workingInfo?.joiningYear
            ? `/years/${state.user.workingInfo.joiningYear}`
            : null
        }
        pictureUrl={state.user.personalInfo?.pictureUrl}
        referrerHref={
          state.user.workingInfo?.referrer?.trim()
            ? `/connections/${encodeURIComponent(state.user.workingInfo.referrer.trim())}`
            : null
        }
        user={state.user}
        workingExperiencesHref={workingExperiencesHref}
      />
    </main>
  );
}

async function fetchUserById(userId: string) {
  const response = await fetch(`/api/users/${encodeURIComponent(userId)}`, {
    method: "GET",
    cache: "no-store"
  });

  if (!response.ok) {
    const errorPayload = (await response.json().catch(() => null)) as
      | { message?: string }
      | null;

    throw new Error(errorPayload?.message ?? "Unable to load user");
  }

  return (await response.json()) as UserRecord;
}
