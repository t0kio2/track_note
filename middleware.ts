import { NextRequest, NextResponse } from "next/server";

const SUPPORTED = ["ja", "en"] as const;
type Locale = (typeof SUPPORTED)[number];

function pickFromAcceptLanguage(header: string | null): Locale {
  if (!header) return "en";
  const lower = header.toLowerCase();
  if (lower.includes("ja")) return "ja";
  return "en";
}

export function middleware(req: NextRequest) {
  // 1) explicit cookie
  const cookie = req.cookies.get("lang")?.value as Locale | undefined;
  let locale: Locale | undefined = cookie && (SUPPORTED as readonly string[]).includes(cookie) ? (cookie as Locale) : undefined;

  // 2) Accept-Language fallback
  if (!locale) {
    locale = pickFromAcceptLanguage(req.headers.get("accept-language"));
  }

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-locale", locale);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    "/((?!_next/|.*\\.(?:css|js|map|png|jpg|jpeg|gif|webp|svg|ico)$).*)",
  ],
};

