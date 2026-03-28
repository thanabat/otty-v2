import { NextResponse } from "next/server";

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export async function POST(request: Request) {
  return forwardRequest("POST", request);
}

export async function PATCH(request: Request) {
  return forwardRequest("PATCH", request);
}

export async function DELETE(request: Request) {
  return forwardRequest("DELETE", request);
}

async function forwardRequest(method: "POST" | "PATCH" | "DELETE", request: Request) {
  const body = await request.text();

  try {
    const response = await fetch(`${apiBaseUrl}/auth/liff/working-experiences`, {
      method,
      headers: {
        "Content-Type": "application/json"
      },
      body,
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
