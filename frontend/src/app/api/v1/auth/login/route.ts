import { NextRequest, NextResponse } from "next/server";

function normalizeApiBaseUrl(value?: string) {
  if (!value) {
    return "";
  }

  return value.startsWith("http://") || value.startsWith("https://") ? value : `http://${value}`;
}

export async function POST(request: NextRequest) {
  const apiBaseUrl = normalizeApiBaseUrl(
    process.env.INTERNAL_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000",
  );

  if (!apiBaseUrl) {
    return NextResponse.json({ detail: "API base URL is not configured." }, { status: 500 });
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ detail: "Invalid login payload." }, { status: 400 });
  }

  let upstreamResponse: Response;

  try {
    upstreamResponse = await fetch(`${apiBaseUrl}/api/v1/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ detail: "Unable to reach API server." }, { status: 502 });
  }

  let responseBody: unknown = null;

  try {
    responseBody = await upstreamResponse.json();
  } catch {
    responseBody = {
      detail: upstreamResponse.ok ? "Login succeeded." : "Login request failed.",
    };
  }

  return NextResponse.json(responseBody, { status: upstreamResponse.status });
}
