"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { UserConnectionsResponse } from "@otty/shared";
import { ConnectionListCard } from "./connection-list-card";
import { ensureLiffSession } from "../lib/liff-auth";

type ReferrerConnectionsPageProps = {
  referrer: string;
  currentPage: number;
};

type ConnectionsState = {
  isLoading: boolean;
  error: string | null;
  data: UserConnectionsResponse | null;
};

export function ReferrerConnectionsPage({
  referrer,
  currentPage
}: ReferrerConnectionsPageProps) {
  const [state, setState] = useState<ConnectionsState>({
    isLoading: true,
    error: null,
    data: null
  });

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        await ensureLiffSession(
          `/connections/${encodeURIComponent(referrer)}?page=${currentPage}`
        );
        const data = await fetchUsersByReferrer(referrer, currentPage);

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
                : "Unable to load connections",
            data: null
          });
        }
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [currentPage, referrer]);

  if (state.isLoading) {
    return (
      <main className="profile-stage">
        <div className="page-shell page-shell--connections">
          <section className="hero-card hero-card--dark">
            <p className="eyebrow">Connections</p>
            <h1>Loading connections...</h1>
            <p className="lead lead--dark">
              กำลังตรวจสอบ LINE login และโหลดรายชื่อที่เกี่ยวข้อง
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
            <p className="eyebrow">Connections</p>
            <h1>Unable to load connections</h1>
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
          <p className="eyebrow">Connections</p>
          <h1>{state.data.referrer} Connection</h1>
          <p className="lead lead--dark">
            พบ {state.data.total} คนที่มี referrer เดียวกัน
          </p>
          <p className="lead lead--dark lead--compact">
            Page {state.data.page} of {state.data.totalPages}
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
            <ConnectionListCard
              href={`/profile/${item.id}?referrer=${encodeURIComponent(
                state.data!.referrer
              )}`}
              item={item}
              key={item.id}
            />
          ))}
        </section>

        <div className="pagination-row">
          <Link
            className={`action-button action-button--secondary-dark${
              state.data.page <= 1 ? " action-button--disabled-link" : ""
            }`}
            href={
              state.data.page <= 1
                ? "#"
                : `/connections/${encodeURIComponent(state.data.referrer)}?page=${
                    state.data.page - 1
                  }`
            }
          >
            Previous
          </Link>
          <p className="pagination-row__label">
            Page {state.data.page} / {state.data.totalPages}
          </p>
          <Link
            className={`action-button action-button--secondary-dark${
              state.data.page >= state.data.totalPages
                ? " action-button--disabled-link"
                : ""
            }`}
            href={
              state.data.page >= state.data.totalPages
                ? "#"
                : `/connections/${encodeURIComponent(state.data.referrer)}?page=${
                    state.data.page + 1
                  }`
            }
          >
            Next
          </Link>
        </div>
      </div>
    </main>
  );
}

async function fetchUsersByReferrer(referrer: string, page: number) {
  const response = await fetch(
    `/api/users/referrer/${encodeURIComponent(referrer)}?limit=5&page=${page}`,
    {
      method: "GET",
      cache: "no-store"
    }
  );

  if (!response.ok) {
    const errorPayload = (await response.json().catch(() => null)) as
      | { message?: string }
      | null;

    throw new Error(errorPayload?.message ?? "Unable to load referrer connections");
  }

  return (await response.json()) as UserConnectionsResponse;
}
