import { NextResponse } from "next/server";

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export async function GET(
  _request: Request,
  context: { params: Promise<{ userId: string }> }
) {
  const { userId } = await context.params;

  try {
    const response = await fetch(`${apiBaseUrl}/users/${encodeURIComponent(userId)}`, {
      method: "GET",
      cache: "no-store"
    });

    return new NextResponse(response.body, {
      status: response.status,
      headers: {
        "Content-Type":
          response.headers.get("Content-Type") ?? "application/json"
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "ApiUnavailable",
        message:
          error instanceof Error
            ? error.message
            : "Unable to reach the API server"
      },
      {
        status: 502
      }
    );
  }
}
