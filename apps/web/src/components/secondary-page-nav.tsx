"use client";

import Link from "next/link";
import { BackButton } from "./back-button";

type SecondaryPageNavProps = {
  fallbackHref: string;
};

export function SecondaryPageNav({ fallbackHref }: SecondaryPageNavProps) {
  return (
    <div className="secondary-page-nav">
      <BackButton
        className="action-button action-button--secondary-dark"
        fallbackHref={fallbackHref}
      >
        Back
      </BackButton>

      <Link
        aria-label="Go to my profile"
        className="secondary-page-nav__icon-button"
        href="/profile"
        title="My profile"
      >
        <svg
          aria-hidden="true"
          className="secondary-page-nav__icon"
          fill="none"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 12.25C14.3472 12.25 16.25 10.3472 16.25 8C16.25 5.65279 14.3472 3.75 12 3.75C9.65279 3.75 7.75 5.65279 7.75 8C7.75 10.3472 9.65279 12.25 12 12.25Z"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
          <path
            d="M4.75 19.25C4.75 16.6266 7.87665 14.5 12 14.5C16.1234 14.5 19.25 16.6266 19.25 19.25"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        </svg>
      </Link>
    </div>
  );
}
