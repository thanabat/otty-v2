"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { UserRecord, UserWorkingExperience } from "@otty/shared";
import { ensureLiffSession } from "../lib/liff-auth";

type UserWorkingExperiencesPageProps = {
  userId: string;
  self?: string;
  referrer?: string;
  site?: string;
  year?: string;
  page?: string;
};

type UserWorkingExperiencesState = {
  isLoading: boolean;
  error: string | null;
  user: UserRecord | null;
};

export function UserWorkingExperiencesPage({
  userId,
  self,
  referrer,
  site,
  year,
  page
}: UserWorkingExperiencesPageProps) {
  const [state, setState] = useState<UserWorkingExperiencesState>({
    isLoading: true,
    error: null,
    user: null
  });

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const query = new URLSearchParams();

      if (self) {
        query.set("self", self);
      }

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
        ? `/profile/${encodeURIComponent(userId)}/working-experiences?${query.toString()}`
        : `/profile/${encodeURIComponent(userId)}/working-experiences`;

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
                : "Unable to load working experiences",
            user: null
          });
        }
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [page, referrer, self, site, userId, year]);

  const backHref = self
    ? "/profile"
    : buildProfileHref(userId, {
        referrer,
        site,
        year,
        page
      });

  const displayName = state.user?.personalInfo?.fullname || "Employee";
  const experiences = useMemo(
    () => sortExperiences(state.user?.workingExperiences ?? []),
    [state.user?.workingExperiences]
  );

  if (state.isLoading) {
    return (
      <main className="profile-stage profile-stage--top">
        <div className="page-shell page-shell--connections">
          <section className="hero-card hero-card--dark">
            <p className="eyebrow">Working Experiences</p>
            <h1>Loading work history...</h1>
            <p className="lead lead--dark">
              กำลังตรวจสอบ LINE login และโหลดประวัติการทำงานทั้งหมด
            </p>
          </section>
        </div>
      </main>
    );
  }

  if (state.error || !state.user) {
    return (
      <main className="profile-stage profile-stage--top">
        <div className="page-shell page-shell--connections">
          <section className="hero-card hero-card--dark">
            <p className="eyebrow">Working Experiences</p>
            <h1>Unable to load work history</h1>
            <p className="lead lead--dark">{state.error ?? "Unknown error"}</p>
          </section>

          <div className="button-row button-row--compact">
            <Link
              className="action-button action-button--secondary-dark"
              href={backHref}
            >
              Back To Profile
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="profile-stage profile-stage--top">
      <div className="page-shell page-shell--connections">
        <section className="hero-card hero-card--dark hero-card--connections">
          <p className="eyebrow">Working Experiences</p>
          <h1>{displayName}</h1>
          <p className="lead lead--dark">
            มีทั้งหมด {experiences.length} ช่วงการทำงานที่บันทึกไว้
          </p>
        </section>

        <div className="button-row button-row--compact">
          <Link
            className="action-button action-button--secondary-dark"
            href={backHref}
          >
            Back To Profile
          </Link>
        </div>

        {experiences.length > 0 ? (
          <section className="connections-list">
            {experiences.map((experience, index) => (
              <article className="experience-card" key={experience.id ?? `${index}`}>
                <div className="experience-card__header">
                  <div>
                    <p className="experience-card__site">
                      {experience.site || "No site"}
                    </p>
                    <p className="experience-card__project">
                      {experience.project || "No project"}
                    </p>
                  </div>
                  {experience.isCurrent ? (
                    <span className="experience-card__status">Current</span>
                  ) : null}
                </div>

                <div className="experience-card__meta-grid">
                  <div className="experience-card__meta-item">
                    <span className="experience-card__label">Year Range</span>
                    <span className="experience-card__value">
                      {formatYearRange(experience)}
                    </span>
                  </div>
                  <div className="experience-card__meta-item">
                    <span className="experience-card__label">Duration</span>
                    <span className="experience-card__value">
                      {formatDuration(experience)}
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </section>
        ) : (
          <section className="experience-empty-card">
            <p className="experience-empty-card__eyebrow">Working Experiences</p>
            <h2 className="experience-empty-card__title">No history yet</h2>
            <p className="experience-empty-card__message">
              ยังไม่มี working experiences ถูกบันทึกใน user นี้
            </p>
            <div className="experience-empty-card__actions" />
          </section>
        )}
      </div>
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

function buildProfileHref(
  userId: string,
  options: {
    referrer?: string;
    site?: string;
    year?: string;
    page?: string;
  }
) {
  const query = new URLSearchParams();

  if (options.referrer) {
    query.set("referrer", options.referrer);
  }

  if (options.site) {
    query.set("site", options.site);
  }

  if (options.year) {
    query.set("year", options.year);
  }

  if (options.page) {
    query.set("page", options.page);
  }

  return query.size
    ? `/profile/${encodeURIComponent(userId)}?${query.toString()}`
    : `/profile/${encodeURIComponent(userId)}`;
}

function sortExperiences(items: UserWorkingExperience[]) {
  return [...items].sort((left, right) => {
    if (left.isCurrent !== right.isCurrent) {
      return left.isCurrent ? -1 : 1;
    }

    const rightStart = right.startYear ?? -1;
    const leftStart = left.startYear ?? -1;

    return rightStart - leftStart;
  });
}

function formatYearRange(experience: UserWorkingExperience) {
  const startYear = experience.startYear ?? null;
  const endYear = experience.endYear ?? null;

  if (startYear && endYear) {
    return `${startYear} - ${endYear}`;
  }

  if (startYear && experience.isCurrent) {
    return `${startYear} - Present`;
  }

  if (startYear) {
    return `${startYear}`;
  }

  return "-";
}

function formatDuration(experience: UserWorkingExperience) {
  const startYear = experience.startYear ?? null;

  if (!startYear) {
    return "-";
  }

  const endYear = experience.isCurrent
    ? new Date().getFullYear()
    : experience.endYear ?? startYear;
  const duration = Math.max(endYear - startYear, 0);

  return `${duration + 1} year${duration === 0 ? "" : "s"}`;
}
