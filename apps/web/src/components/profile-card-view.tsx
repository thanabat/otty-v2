"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { UserRecord } from "@otty/shared";

type ProfileCardViewProps = {
  user: UserRecord;
  displayName: string;
  pictureUrl?: string | null;
  referrerHref?: string | null;
  currentSiteHref?: string | null;
  footer?: ReactNode;
};

export function ProfileCardView({
  user,
  displayName,
  pictureUrl,
  referrerHref,
  currentSiteHref,
  footer
}: ProfileCardViewProps) {
  const currentYear = new Date().getFullYear();
  const joiningYear = user.workingInfo?.joiningYear ?? null;
  const yearsWorked =
    typeof joiningYear === "number" && joiningYear > 0
      ? Math.max(currentYear - joiningYear, 0)
      : null;
  const referrer = user.workingInfo?.referrer?.trim() || "";
  const currentSite =
    user.workingInfo?.currentSite?.trim() ||
    user.workingInfo?.currentSiteOther?.trim() ||
    "";

  return (
    <section className="profile-spotlight">
      <div className="profile-spotlight__glow" />
      <article className="phone-profile-card">
        <div className="phone-profile-card__media">
          {pictureUrl ? (
            <img
              alt={displayName}
              className="phone-profile-card__image"
              height={420}
              src={pictureUrl}
              width={420}
            />
          ) : (
            <div className="phone-profile-card__image phone-profile-card__image--fallback">
              {displayName.slice(0, 1)}
            </div>
          )}
        </div>

        <div className="phone-profile-card__content">
          <div className="phone-profile-card__title-row">
            <div>
              <p className="phone-profile-card__name">
                {user.personalInfo?.fullname || displayName}
              </p>
              <p className="phone-profile-card__role">
                {user.workingInfo?.title || "No title"}
              </p>
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
            <div className="phone-profile-card__details-grid">
              <section className="profile-detail-card">
                <p className="profile-detail-card__eyebrow">Contact Info</p>
                <div className="profile-detail-card__list">
                  <div className="profile-detail-card__item profile-detail-card__item--icon">
                    <img
                      alt="Email"
                      className="profile-detail-card__icon"
                      height={18}
                      src="/email.svg"
                      width={18}
                    />
                    <span className="profile-detail-card__value">
                      {user.personalInfo?.email || "-"}
                    </span>
                  </div>
                  <div className="profile-detail-card__item profile-detail-card__item--icon">
                    <img
                      alt="Phone"
                      className="profile-detail-card__icon"
                      height={18}
                      src="/phone.svg"
                      width={18}
                    />
                    <span className="profile-detail-card__value">
                      {user.personalInfo?.phone || "-"}
                    </span>
                  </div>
                </div>
              </section>

              <section className="profile-detail-card">
                <p className="profile-detail-card__eyebrow">Working Info</p>
                <div className="profile-detail-card__list profile-detail-card__list--two-column">
                  <div className="profile-detail-card__item">
                    <span className="profile-detail-card__label">Experience</span>
                    <span className="profile-detail-card__value">
                      {yearsWorked !== null
                        ? `${yearsWorked} year${yearsWorked === 1 ? "" : "s"}`
                        : "-"}
                    </span>
                  </div>
                  <div className="profile-detail-card__item">
                    <span className="profile-detail-card__label">Joining Year</span>
                    <span className="profile-detail-card__value">
                      {joiningYear ?? "-"}
                    </span>
                  </div>
                  <div className="profile-detail-card__item">
                    <span className="profile-detail-card__label">Current Site</span>
                    {currentSite && currentSiteHref ? (
                      <Link
                        className="profile-detail-card__value profile-detail-card__value--link"
                        href={currentSiteHref}
                      >
                        {currentSite}
                      </Link>
                    ) : (
                      <span className="profile-detail-card__value">
                        {currentSite || "-"}
                      </span>
                    )}
                  </div>
                  <div className="profile-detail-card__item">
                    <span className="profile-detail-card__label">Referrer</span>
                    {referrer && referrerHref ? (
                      <Link
                        className="profile-detail-card__value profile-detail-card__value--link"
                        href={referrerHref}
                      >
                        {referrer}
                      </Link>
                    ) : (
                      <span className="profile-detail-card__value">
                        {referrer || "-"}
                      </span>
                    )}
                  </div>
                </div>
              </section>

              <section className="profile-detail-card profile-detail-card--full">
                <p className="profile-detail-card__eyebrow">Bio</p>
                <div className="profile-detail-card__list">
                  <div className="profile-detail-card__item">
                    <span className="profile-detail-card__value profile-detail-card__value--body">
                      {user.personalInfo?.bio || "-"}
                    </span>
                  </div>
                </div>
              </section>
            </div>

            {footer}
          </div>
        </div>
      </article>
    </section>
  );
}
