import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lang = searchParams.get("lang");
  const allow = ["ja", "en"];
  const value = allow.includes(String(lang)) ? String(lang) : "ja";
  const referer = req.headers.get("referer") || "/";

  const res = NextResponse.redirect(referer);
  res.cookies.set("lang", value, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  return res;
}

