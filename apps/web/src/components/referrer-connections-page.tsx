"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { UserConnectionsResponse, UserReferrerSummary } from "@otty/shared";
import { ConnectionListCard } from "./connection-list-card";
import { ConnectionsLoadingState } from "./loading-state";
import { ensureLiffSession } from "../lib/liff-auth";

type ReferrerConnectionsPageProps = {
  referrer: string;
  referrerUserId?: string;
  currentPage: number;
};

type ConnectionsState = {
  isLoading: boolean;
  error: string | null;
  data: UserConnectionsResponse | null;
  referrerProfile: UserReferrerSummary | null;
};

export function ReferrerConnectionsPage({
  referrer,
  referrerUserId,
  currentPage
}: ReferrerConnectionsPageProps) {
  const [state, setState] = useState<ConnectionsState>({
    isLoading: true,
    error: null,
    data: null,
    referrerProfile: null
  });

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        await ensureLiffSession(
          buildReferrerConnectionsHref(referrer, currentPage, referrerUserId)
        );
        const [data, referrerProfile] = await Promise.all([
          fetchUsersByReferrer(referrer, currentPage, referrerUserId),
          fetchReferrerProfile(referrer, referrerUserId)
        ]);

        if (!cancelled) {
          setState({
            isLoading: false,
            error: null,
            data,
            referrerProfile
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
            data: null,
            referrerProfile: null
          });
        }
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [currentPage, referrer, referrerUserId]);

  if (state.isLoading) {
    return (
      <ConnectionsLoadingState
        description="กำลังเช็ก LINE login และเตรียมรายชื่อ connection"
        eyebrow="Connections"
        title="Loading connections..."
      />
    );
  }

  if (state.error || !state.data) {
    return (
      <main className="profile-stage profile-stage--top">
        <div className="page-shell page-shell--connections">
          <section className="hero-card hero-card--dark">
            <p className="eyebrow">Connections</p>
            <h1>Unable to load connections</h1>
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
        {state.referrerProfile ? (
          <Link
            className="connection-card connection-card--dark connection-card--compact connection-card--profile connection-card--profile-link"
            href={`/profile/${state.referrerProfile.id}`}
          >
            <p className="connection-card__eyebrow">Referrer</p>
            <p className="connection-card__name">
              {state.referrerProfile.fullname || data.referrer}
            </p>
            <p className="connection-card__meta">
              {state.referrerProfile.title || "No title"}
            </p>
          </Link>
        ) : (
          <section className="hero-card hero-card--dark hero-card--connections">
            <p className="eyebrow">Connections</p>
            <h1>{data.referrer} Connection</h1>
            <p className="lead lead--dark">
              พบ {data.total} คนที่มี referrer เดียวกัน
            </p>
            {shouldShowPagination ? (
              <p className="lead lead--dark lead--compact">
                Page {data.page} of {data.totalPages}
              </p>
            ) : null}
          </section>
        )}

        {state.referrerProfile ? (
          <section className="connections-summary">
            <p className="lead lead--dark">พบ {data.total} คนที่มี referrer เดียวกัน</p>
            {shouldShowPagination ? (
              <p className="lead lead--dark lead--compact">
                Page {data.page} of {data.totalPages}
              </p>
            ) : null}
          </section>
        ) : null}

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
              href={`/profile/${item.id}?referrer=${encodeURIComponent(
                data.referrer
              )}${referrerUserId ? `&referrerUserId=${encodeURIComponent(referrerUserId)}` : ""}&page=${data.page}`}
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
                  : buildReferrerConnectionsHref(
                      data.referrer,
                      data.page - 1,
                      referrerUserId
                    )
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
                  : buildReferrerConnectionsHref(
                      data.referrer,
                      data.page + 1,
                      referrerUserId
                    )
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

async function fetchUsersByReferrer(
  referrer: string,
  page: number,
  referrerUserId?: string
) {
  const query = new URLSearchParams({
    limit: "5",
    page: String(page)
  });

  if (referrerUserId) {
    query.set("referrerUserId", referrerUserId);
  }

  const response = await fetch(
    `/api/users/referrer/${encodeURIComponent(referrer)}?${query.toString()}`,
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

async function fetchReferrerProfile(referrer: string, referrerUserId?: string) {
  if (!referrerUserId) {
    return null;
  }

  const query = new URLSearchParams();
  query.set("referrerUserId", referrerUserId);

  const response = await fetch(
    `/api/users/referrer-profile/${encodeURIComponent(referrer)}${
      query.size ? `?${query.toString()}` : ""
    }`,
    {
      method: "GET",
      cache: "no-store"
    }
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error("Unable to load referrer profile");
  }

  const payload = (await response.json()) as Partial<UserReferrerSummary> | null;

  if (!payload?.id) {
    return null;
  }

  return {
    id: payload.id,
    fullname: payload.fullname ?? null,
    title: payload.title ?? null
  };
}

function buildReferrerConnectionsHref(
  referrer: string,
  page: number,
  referrerUserId?: string
) {
  const query = new URLSearchParams({
    page: String(page)
  });

  if (referrerUserId) {
    query.set("referrerUserId", referrerUserId);
  }

  return `/connections/${encodeURIComponent(referrer)}?${query.toString()}`;
}
