import { NextResponse } from "next/server";

function normalizeApiBaseUrl(value?: string) {
  if (!value) {
    return "";
  }

  return value.startsWith("http://") || value.startsWith("https://") ? value : `http://${value}`;
}

function getApiBaseUrl() {
  return normalizeApiBaseUrl(
    process.env.INTERNAL_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000",
  );
}

export async function GET() {
  const apiBaseUrl = getApiBaseUrl();

  if (!apiBaseUrl) {
    return NextResponse.json({ detail: "API base URL is not configured." }, { status: 500 });
  }

  let upstreamResponse: Response;

  try {
    upstreamResponse = await fetch(`${apiBaseUrl}/api/v1/redirect/config`, {
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ detail: "Unable to reach API server." }, { status: 502 });
  }

  const responseText = await upstreamResponse.text();

  return new NextResponse(responseText, {
    status: upstreamResponse.status,
    headers: {
      "Content-Type": upstreamResponse.headers.get("content-type") || "application/json",
    },
  });
}
