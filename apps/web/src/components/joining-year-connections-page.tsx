"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { UserYearConnectionsResponse } from "@otty/shared";
import { ensureLiffSession } from "../lib/liff-auth";

type JoiningYearConnectionsPageProps = {
  year: number;
};

type JoiningYearConnectionsState = {
  isLoading: boolean;
  error: string | null;
  data: UserYearConnectionsResponse | null;
};

export function JoiningYearConnectionsPage({
  year
}: JoiningYearConnectionsPageProps) {
  const [state, setState] = useState<JoiningYearConnectionsState>({
    isLoading: true,
    error: null,
    data: null
  });

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        await ensureLiffSession(`/years/${year}`);
        const data = await fetchUsersByJoiningYear(year);

        if (!cancelled) {
          setState({
            isLoading: false,
            error: null,
            data
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
                : "Unable to load joining year connections",
            data: null
          });
        }
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [year]);

  if (state.isLoading) {
    return (
      <main className="profile-stage">
        <div className="page-shell page-shell--connections">
          <section className="hero-card hero-card--dark">
            <p className="eyebrow">Joining Year</p>
            <h1>Loading cohort...</h1>
            <p className="lead lead--dark">
              กำลังตรวจสอบ LINE login และโหลดรายชื่อคนที่เข้าปีเดียวกัน
            </p>
          </section>
        </div>
      </main>
    );
  }

  if (state.error || !state.data) {
    return (
      <main className="profile-stage">
        <div className="page-shell page-shell--connections">
          <section className="hero-card hero-card--dark">
            <p className="eyebrow">Joining Year</p>
            <h1>Unable to load cohort</h1>
            <p className="lead lead--dark">{state.error ?? "Unknown error"}</p>
          </section>

          <div className="button-row button-row--compact">
            <Link
              className="action-button action-button--secondary-dark"
              href="/profile"
            >
              Back To Profile
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="profile-stage">
      <div className="page-shell page-shell--connections">
        <section className="hero-card hero-card--dark hero-card--connections">
          <p className="eyebrow">Joining Year</p>
          <h1>{state.data.joiningYear} Cohort</h1>
          <p className="lead lead--dark">
            พบ {state.data.total} คนที่เข้าร่วมในปีเดียวกัน
          </p>
        </section>

        <div className="button-row button-row--compact">
          <Link
            className="action-button action-button--secondary-dark"
            href="/profile"
          >
            Back To Profile
          </Link>
        </div>

        <section className="connections-list">
          {state.data.items.map((item) => (
            <Link
              className="connection-card connection-card--dark"
              href={`/profile/${item.id}?year=${state.data!.joiningYear}`}
              key={item.id}
            >
              <p className="connection-card__name">
                {item.fullname || "Unknown user"}
              </p>
              <p className="connection-card__meta">
                Nickname: {item.nickname || "-"}
              </p>
              <p className="connection-card__meta">Title: {item.title || "-"}</p>
              <p className="connection-card__meta">
                Joining Year: {item.joiningYear ?? "-"}
              </p>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}

async function fetchUsersByJoiningYear(year: number) {
  const response = await fetch(`/api/users/joining-year/${year}?limit=100`, {
    method: "GET",
    cache: "no-store"
  });

  if (!response.ok) {
    const errorPayload = (await response.json().catch(() => null)) as
      | { message?: string }
      | null;

    throw new Error(
      errorPayload?.message ?? "Unable to load joining year connections"
    );
  }

  return (await response.json()) as UserYearConnectionsResponse;
}
