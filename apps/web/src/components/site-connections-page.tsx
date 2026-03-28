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
      <main className="profile-stage profile-stage--top">
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
      <main className="profile-stage profile-stage--top">
        <div className="page-shell page-shell--connections">
          <section className="hero-card hero-card--dark">
            <p className="eyebrow">Current Site</p>
            <h1>Unable to load site connections</h1>
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
          <p className="eyebrow">Current Site</p>
          <h1>{data.site} Team</h1>
          <p className="lead lead--dark">
            พบ {data.total} คนใน current site เดียวกัน
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
              href={`/profile/${item.id}?site=${encodeURIComponent(
                data.site
              )}&page=${data.page}`}
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
                  : `/sites/${encodeURIComponent(data.site)}?page=${
                      data.page - 1
                    }`
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
                  : `/sites/${encodeURIComponent(data.site)}?page=${
                      data.page + 1
                    }`
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
