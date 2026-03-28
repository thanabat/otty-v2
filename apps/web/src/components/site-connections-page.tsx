"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { UserSiteConnectionsResponse } from "@otty/shared";
import { ConnectionListCard } from "./connection-list-card";
import { ensureLiffSession } from "../lib/liff-auth";

type SiteConnectionsPageProps = {
  site: string;
  currentPage: number;
};

type SiteConnectionsState = {
  isLoading: boolean;
  error: string | null;
  data: UserSiteConnectionsResponse | null;
};

export function SiteConnectionsPage({
  site,
  currentPage
}: SiteConnectionsPageProps) {
  const [state, setState] = useState<SiteConnectionsState>({
    isLoading: true,
    error: null,
    data: null
  });

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        await ensureLiffSession(
          `/sites/${encodeURIComponent(site)}?page=${currentPage}`
        );
        const data = await fetchUsersBySite(site, currentPage);

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
                : "Unable to load site connections",
            data: null
          });
        }
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [currentPage, site]);

  if (state.isLoading) {
    return (
      <main className="profile-stage">
        <div className="page-shell page-shell--connections">
          <section className="hero-card hero-card--dark">
            <p className="eyebrow">Current Site</p>
            <h1>Loading site connections...</h1>
            <p className="lead lead--dark">
              กำลังตรวจสอบ LINE login และโหลดรายชื่อใน site เดียวกัน
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
            <p className="eyebrow">Current Site</p>
            <h1>Unable to load site connections</h1>
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
          <p className="eyebrow">Current Site</p>
          <h1>{state.data.site} Team</h1>
          <p className="lead lead--dark">
            พบ {state.data.total} คนใน current site เดียวกัน
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
              href={`/profile/${item.id}?site=${encodeURIComponent(state.data!.site)}`}
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
                : `/sites/${encodeURIComponent(state.data.site)}?page=${
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
                : `/sites/${encodeURIComponent(state.data.site)}?page=${
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

async function fetchUsersBySite(site: string, page: number) {
  const response = await fetch(`/api/users/site/${encodeURIComponent(site)}?limit=5&page=${page}`, {
    method: "GET",
    cache: "no-store"
  });

  if (!response.ok) {
    const errorPayload = (await response.json().catch(() => null)) as
      | { message?: string }
      | null;

    throw new Error(errorPayload?.message ?? "Unable to load site connections");
  }

  return (await response.json()) as UserSiteConnectionsResponse;
}
