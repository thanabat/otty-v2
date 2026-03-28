"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type {
  UserRecord,
  UserWorkingExperience,
  UserWorkingExperienceInput
} from "@otty/shared";
import { ConnectionsLoadingState } from "./loading-state";
import { ensureLiffSession } from "../lib/liff-auth";

type UserWorkingExperiencesPageProps = {
  userId: string;
  self?: string;
  referrer?: string;
  referrerUserId?: string;
  site?: string;
  year?: string;
  page?: string;
};

type UserWorkingExperiencesState = {
  isLoading: boolean;
  error: string | null;
  user: UserRecord | null;
  accessToken: string | null;
};

type ExperienceFormState = {
  site: string;
  project: string;
  startYear: string;
  endYear: string;
  isCurrent: boolean;
};

export function UserWorkingExperiencesPage({
  userId,
  self,
  referrer,
  referrerUserId,
  site,
  year,
  page
}: UserWorkingExperiencesPageProps) {
  const [state, setState] = useState<UserWorkingExperiencesState>({
    isLoading: true,
    error: null,
    user: null,
    accessToken: null
  });
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<"create" | "edit">("create");
  const [editingExperienceId, setEditingExperienceId] = useState<string | null>(null);
  const [form, setForm] = useState<ExperienceFormState>(createEmptyFormState());
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const isSelf = self === "1";

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

      if (referrerUserId) {
        query.set("referrerUserId", referrerUserId);
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
        const { accessToken } = await ensureLiffSession(redirectPath);
        const user = await fetchUserById(userId);

        if (!cancelled) {
          setState({
            isLoading: false,
            error: null,
            user,
            accessToken
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
            user: null,
            accessToken: null
          });
        }
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [page, referrer, referrerUserId, self, site, userId, year]);

  useEffect(() => {
    if (!isEditorOpen) {
      return;
    }

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [isEditorOpen]);

  const backHref = isSelf
    ? "/profile"
    : buildProfileHref(userId, {
        referrer,
        referrerUserId,
        site,
        year,
        page
      });

  const displayName = state.user?.personalInfo?.fullname || "Employee";
  const experiences = useMemo(
    () => buildVisibleExperiences(state.user),
    [state.user]
  );

  function openCreateEditor() {
    setEditorMode("create");
    setEditingExperienceId(null);
    setForm(createEmptyFormState());
    setSaveError(null);
    setIsEditorOpen(true);
  }

  function openEditEditor(experience: UserWorkingExperience) {
    setEditorMode("edit");
    setEditingExperienceId(experience.id ?? null);
    setForm(createExperienceFormState(experience));
    setSaveError(null);
    setIsEditorOpen(true);
  }

  async function handleSaveExperience() {
    if (!state.accessToken) {
      setSaveError("Current session is missing an access token");
      return;
    }

    if (editorMode === "edit" && !editingExperienceId) {
      setSaveError("Working experience id is missing");
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const payload = normalizeExperienceForm(form);
      const updatedUser =
        editorMode === "create"
          ? await createWorkingExperience(state.accessToken, payload)
          : await updateWorkingExperience(
              state.accessToken,
              editingExperienceId!,
              payload
            );

      setState((current) => ({
        ...current,
        user: updatedUser
      }));
      setIsEditorOpen(false);
      setEditingExperienceId(null);
      setForm(createEmptyFormState());
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Unable to save working experience"
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteExperience(experience: UserWorkingExperience) {
    if (!state.accessToken || !experience.id) {
      return;
    }

    const confirmed = window.confirm(
      `Delete working experience for ${experience.site || "this site"}?`
    );

    if (!confirmed) {
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const updatedUser = await deleteWorkingExperience(
        state.accessToken,
        experience.id
      );

      setState((current) => ({
        ...current,
        user: updatedUser
      }));
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Unable to delete working experience"
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (state.isLoading) {
    return (
      <ConnectionsLoadingState
        description="กำลังเช็ก LINE login และเตรียมประวัติการทำงานทั้งหมด"
        eyebrow="Working Experiences"
        title="Loading work history..."
      />
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

        <div className="button-row button-row--compact button-row--split button-row--toolbar">
          <Link
            className="action-button action-button--secondary-dark"
            href={backHref}
          >
            Back To Profile
          </Link>
          {isSelf ? (
            <button className="action-button" onClick={openCreateEditor} type="button">
              Add Experience
            </button>
          ) : null}
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

                {experience.id && isSelf ? (
                  <div className="experience-card__actions">
                    <button
                      className="action-button action-button--secondary-dark"
                      onClick={() => openEditEditor(experience)}
                      type="button"
                    >
                      Edit
                    </button>
                    <button
                      className="action-button action-button--ghost-dark"
                      disabled={isSaving}
                      onClick={() => void handleDeleteExperience(experience)}
                      type="button"
                    >
                      Delete
                    </button>
                  </div>
                ) : null}
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
            <div className="experience-empty-card__actions">
              {isSelf ? (
                <button className="action-button" onClick={openCreateEditor} type="button">
                  Add Experience
                </button>
              ) : null}
            </div>
          </section>
        )}

        {saveError && !isEditorOpen ? (
          <section className="callout callout--error">{saveError}</section>
        ) : null}
      </div>

      {isEditorOpen ? (
        <section className="profile-editor-overlay">
          <div
            aria-hidden="true"
            className="profile-editor-overlay__backdrop"
            onClick={() => {
              if (!isSaving) {
                setIsEditorOpen(false);
                setSaveError(null);
              }
            }}
          />

          <div className="profile-editor-sheet">
            <p className="eyebrow">Working Experience</p>
            <h2>{editorMode === "create" ? "Add new work history" : "Edit work history"}</h2>

            <div className="editor-form">
              <label className="editor-field">
                <span>Site</span>
                <input
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      site: event.target.value.toUpperCase()
                    }))
                  }
                  type="text"
                  value={form.site}
                />
              </label>

              <label className="editor-field">
                <span>Project</span>
                <input
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      project: event.target.value
                    }))
                  }
                  type="text"
                  value={form.project}
                />
              </label>

              <div className="editor-grid">
                <label className="editor-field">
                  <span>Start Year</span>
                  <input
                    inputMode="numeric"
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        startYear: event.target.value
                      }))
                    }
                    type="text"
                    value={form.startYear}
                  />
                </label>

                <label className="editor-field">
                  <span>End Year</span>
                  <input
                    disabled={form.isCurrent}
                    inputMode="numeric"
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        endYear: event.target.value
                      }))
                    }
                    placeholder={form.isCurrent ? "Present" : ""}
                    type="text"
                    value={form.endYear}
                  />
                </label>
              </div>

              <label className="editor-checkbox">
                <input
                  checked={form.isCurrent}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      isCurrent: event.target.checked,
                      endYear: event.target.checked ? "" : current.endYear
                    }))
                  }
                  type="checkbox"
                />
                <span className="editor-toggle" aria-hidden="true">
                  <span className="editor-toggle__thumb" />
                </span>
                <span>Use this as the current site</span>
              </label>
            </div>

            {saveError ? (
              <section className="callout callout--error">{saveError}</section>
            ) : null}

            <div className="button-row button-row--editor">
              <button
                className="action-button action-button--secondary-dark"
                disabled={isSaving}
                onClick={() => {
                  setIsEditorOpen(false);
                  setSaveError(null);
                }}
                type="button"
              >
                Cancel
              </button>
              <button
                className="action-button"
                disabled={isSaving}
                onClick={() => void handleSaveExperience()}
                type="button"
              >
                {isSaving ? "Saving..." : editorMode === "create" ? "Add Experience" : "Save Changes"}
              </button>
            </div>
          </div>
        </section>
      ) : null}
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

async function createWorkingExperience(
  accessToken: string,
  experience: UserWorkingExperienceInput
) {
  const response = await fetch("/api/auth/liff/working-experiences", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      accessToken,
      experience
    })
  });

  if (!response.ok) {
    const errorPayload = (await response.json().catch(() => null)) as
      | { message?: string }
      | null;

    throw new Error(errorPayload?.message ?? "Unable to create working experience");
  }

  return (await response.json()) as UserRecord;
}

async function updateWorkingExperience(
  accessToken: string,
  experienceId: string,
  experience: UserWorkingExperienceInput
) {
  const response = await fetch("/api/auth/liff/working-experiences", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      accessToken,
      experienceId,
      experience
    })
  });

  if (!response.ok) {
    const errorPayload = (await response.json().catch(() => null)) as
      | { message?: string }
      | null;

    throw new Error(errorPayload?.message ?? "Unable to update working experience");
  }

  return (await response.json()) as UserRecord;
}

async function deleteWorkingExperience(accessToken: string, experienceId: string) {
  const response = await fetch("/api/auth/liff/working-experiences", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      accessToken,
      experienceId
    })
  });

  if (!response.ok) {
    const errorPayload = (await response.json().catch(() => null)) as
      | { message?: string }
      | null;

    throw new Error(errorPayload?.message ?? "Unable to delete working experience");
  }

  return (await response.json()) as UserRecord;
}

function buildProfileHref(
  userId: string,
  options: {
    referrer?: string;
    referrerUserId?: string;
    site?: string;
    year?: string;
    page?: string;
  }
) {
  const query = new URLSearchParams();

  if (options.referrer) {
    query.set("referrer", options.referrer);
  }

  if (options.referrerUserId) {
    query.set("referrerUserId", options.referrerUserId);
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

function buildVisibleExperiences(user: UserRecord | null) {
  const persistedExperiences = user?.workingExperiences ?? [];

  if (persistedExperiences.length > 0) {
    return sortExperiences(persistedExperiences);
  }

  const currentSite =
    user?.workingInfo?.currentSite?.trim() ||
    user?.workingInfo?.currentSiteOther?.trim() ||
    "";
  const currentProject = user?.workingInfo?.project?.trim() || "";
  const joiningYear = user?.workingInfo?.joiningYear ?? null;

  if (!currentSite && !currentProject) {
    return [];
  }

  return [
    {
      id: null,
      site: currentSite || null,
      project: currentProject || null,
      startYear: joiningYear,
      endYear: null,
      isCurrent: true
    }
  ];
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

function createEmptyFormState(): ExperienceFormState {
  return {
    site: "",
    project: "",
    startYear: "",
    endYear: "",
    isCurrent: false
  };
}

function createExperienceFormState(experience: UserWorkingExperience): ExperienceFormState {
  return {
    site: experience.site ?? "",
    project: experience.project ?? "",
    startYear: experience.startYear ? String(experience.startYear) : "",
    endYear: experience.endYear ? String(experience.endYear) : "",
    isCurrent: experience.isCurrent
  };
}

function normalizeExperienceForm(form: ExperienceFormState): UserWorkingExperienceInput {
  const site = form.site.trim();
  const project = form.project.trim();
  const startYear = Number(form.startYear.trim());
  const endYear = form.isCurrent
    ? null
    : form.endYear.trim()
      ? Number(form.endYear.trim())
      : null;

  if (!site) {
    throw new Error("Site is required");
  }

  if (!project) {
    throw new Error("Project is required");
  }

  if (!Number.isInteger(startYear)) {
    throw new Error("Start year must be a valid year");
  }

  if (endYear != null && !Number.isInteger(endYear)) {
    throw new Error("End year must be a valid year");
  }

  if (endYear != null && endYear < startYear) {
    throw new Error("End year must be greater than or equal to start year");
  }

  return {
    site,
    project,
    startYear,
    endYear,
    isCurrent: form.isCurrent
  };
}
