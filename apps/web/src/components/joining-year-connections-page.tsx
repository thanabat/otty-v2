"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { UserYearConnectionsResponse } from "@otty/shared";
import { ConnectionListCard } from "./connection-list-card";
import { ConnectionsLoadingState } from "./loading-state";
import { ensureLiffSession } from "../lib/liff-auth";

type JoiningYearConnectionsPageProps = {
  year: number;
  currentPage: number;
};

type JoiningYearConnectionsState = {
  isLoading: boolean;
  error: string | null;
  data: UserYearConnectionsResponse | null;
};

export function JoiningYearConnectionsPage({
  year,
  currentPage
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
        await ensureLiffSession(`/years/${year}?page=${currentPage}`);
        const data = await fetchUsersByJoiningYear(year, currentPage);

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
  }, [currentPage, year]);

  if (state.isLoading) {
    return (
      <ConnectionsLoadingState
        description="กำลังเช็ก LINE login และเตรียมรายชื่อคนที่เข้าปีเดียวกัน"
        eyebrow="Joining Year"
        title="Loading cohort..."
      />
    );
  }

  if (state.error || !state.data) {
    return (
      <main className="profile-stage profile-stage--top">
        <div className="page-shell page-shell--connections">
          <section className="hero-card hero-card--dark">
            <p className="eyebrow">Joining Year</p>
            <h1>Unable to load cohort</h1>
            <p className="lead lead--dark">{state.error ?? "Unknown error"}</p>
          </section>

          <div className="button-row button-row--compact button-row--toolbar">
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

  const data = state.data;
  const shouldShowPagination = data.totalPages > 1;

  return (
    <main className="profile-stage profile-stage--top">
      <div className="page-shell page-shell--connections">
        <section className="hero-card hero-card--dark hero-card--connections">
          <p className="eyebrow">Joining Year</p>
          <h1>{data.joiningYear} Cohort</h1>
          <p className="lead lead--dark">
            พบ {data.total} คนที่เข้าร่วมในปีเดียวกัน
          </p>
          {shouldShowPagination ? (
            <p className="lead lead--dark lead--compact">
              Page {data.page} of {data.totalPages}
            </p>
          ) : null}
        </section>

        <div className="button-row button-row--compact button-row--toolbar">
          <Link
            className="action-button action-button--secondary-dark"
            href="/profile"
          >
            Back To Profile
          </Link>
        </div>

        <section className="connections-list">
          {data.items.map((item) => (
            <ConnectionListCard
              href={`/profile/${item.id}?year=${data.joiningYear}&page=${data.page}`}
              item={item}
              key={item.id}
            />
          ))}
        </section>

        {shouldShowPagination ? (
          <div className="pagination-row">
            <Link
              className={`action-button action-button--secondary-dark${
                data.page <= 1 ? " action-button--disabled-link" : ""
              }`}
              href={
                data.page <= 1
                  ? "#"
                  : `/years/${data.joiningYear}?page=${data.page - 1}`
              }
            >
              Previous
            </Link>
            <p className="pagination-row__label">
              Page {data.page} / {data.totalPages}
            </p>
            <Link
              className={`action-button action-button--secondary-dark${
                data.page >= data.totalPages
                  ? " action-button--disabled-link"
                  : ""
              }`}
              href={
                data.page >= data.totalPages
                  ? "#"
                  : `/years/${data.joiningYear}?page=${data.page + 1}`
              }
            >
              Next
            </Link>
          </div>
        ) : null}
      </div>
    </main>
  );
}

async function fetchUsersByJoiningYear(year: number, page: number) {
  const response = await fetch(
    `/api/users/joining-year/${year}?limit=5&page=${page}`,
    {
      method: "GET",
      cache: "no-store"
    }
  );

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
