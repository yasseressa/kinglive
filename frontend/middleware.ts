import { NextRequest, NextResponse } from "next/server";

const locales = ["ar", "en", "fr", "es"] as const;
const defaultLocale = "ar";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon") || pathname.match(/\.[^/]+$/)) {
    return NextResponse.next();
  }

  const segments = pathname.split("/").filter(Boolean);
  const firstSegment = segments[0];

  if (!firstSegment || !locales.includes(firstSegment as (typeof locales)[number])) {
    const url = request.nextUrl.clone();
    const preferredLocale = getPreferredLocale(request);
    url.pathname = `/${preferredLocale}${pathname === "/" ? "" : pathname}`;
    const response = NextResponse.redirect(url);
    response.cookies.set("melbet-locale", preferredLocale);
    return response;
  }

  const response = NextResponse.next();
  response.cookies.set("melbet-locale", firstSegment);
  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};

function getPreferredLocale(request: NextRequest) {
  const cookieLocale = request.cookies.get("melbet-locale")?.value;
  if (cookieLocale && locales.includes(cookieLocale as (typeof locales)[number])) {
    return cookieLocale as (typeof locales)[number];
  }

  const acceptLanguage = request.headers.get("accept-language") ?? "";
  const normalizedLanguages = acceptLanguage
    .split(",")
    .map((part) => part.split(";")[0]?.trim().toLowerCase())
    .filter(Boolean);

  for (const language of normalizedLanguages) {
    const baseLanguage = language.split("-")[0];
    if (locales.includes(baseLanguage as (typeof locales)[number])) {
      return baseLanguage as (typeof locales)[number];
    }
  }

  return defaultLocale;
}
