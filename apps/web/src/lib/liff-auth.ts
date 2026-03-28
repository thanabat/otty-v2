"use client";

import { webEnv } from "./env";

export async function ensureLiffSession(
  redirectPath: string
): Promise<{ accessToken: string; isInClient: boolean }> {
  if (!webEnv.liffId) {
    throw new Error("NEXT_PUBLIC_LIFF_ID is missing");
  }

  const { default: liff } = await import("@line/liff");

  await liff.init({
    liffId: webEnv.liffId
  });

  if (!liff.isLoggedIn()) {
    liff.login({
      redirectUri: `${window.location.origin}${redirectPath}`
    });

    throw new Error("LIFF login redirect started");
  }

  const accessToken = liff.getAccessToken();

  if (!accessToken) {
    throw new Error("LIFF did not return an access token");
  }

  return {
    accessToken,
    isInClient: liff.isInClient()
  };
}

export async function logoutLiff() {
  const { default: liff } = await import("@line/liff");

  liff.logout();
  window.location.href = "/profile";
}
