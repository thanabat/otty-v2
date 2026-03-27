export const webEnv = {
  appEnv: process.env.NEXT_PUBLIC_APP_ENV ?? "local",
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000",
  liffId: process.env.NEXT_PUBLIC_LIFF_ID ?? ""
} as const;

