"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";

type BackButtonProps = {
  fallbackHref: string;
  className?: string;
  children?: ReactNode;
};

export function BackButton({
  fallbackHref,
  className,
  children = "Back"
}: BackButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleBack() {
    if (typeof window === "undefined") {
      router.push(fallbackHref);
      return;
    }

    const currentUrl = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;

    router.back();

    window.setTimeout(() => {
      const nextUrl = `${window.location.pathname}${window.location.search}`;

      if (nextUrl === currentUrl) {
        router.push(fallbackHref);
      }
    }, 120);
  }

  return (
    <button className={className} onClick={handleBack} type="button">
      {children}
    </button>
  );
}
