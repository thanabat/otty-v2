import { NextResponse } from "next/server";

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export async function GET(
  request: Request,
  context: { params: Promise<{ year: string }> }
) {
  const { year } = await context.params;
  const { searchParams } = new URL(request.url);
  const limit = searchParams.get("limit");
  const page = searchParams.get("page");
  const apiUrl = new URL(
    `${apiBaseUrl}/users/joining-year/${encodeURIComponent(year)}`
  );

  if (limit) {
    apiUrl.searchParams.set("limit", limit);
  }

  if (page) {
    apiUrl.searchParams.set("page", page);
  }

  try {
    const response = await fetch(apiUrl.toString(), {
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
