"use client";
import { getAccessToken } from "./auth";
type FetchOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  headers?: Record<string, string>;
  body?: any;
  // 認証が必須なエンドポイントでは true を指定
  requireAuth?: boolean;
};

export function supabaseEnabled() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return !!url && !!key;
}

async function authHeaders(requireAuth = false) {
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const access = await getAccessToken().catch(() => null);
  if (requireAuth && !access) throw new Error("認証が必要です");
  const headers: Record<string, string> = { apikey: anon };
  if (access) headers["Authorization"] = `Bearer ${access}`;
  return headers;
}

export async function sbFetch(path: string, opts: FetchOptions = {}) {
  const urlBase = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!urlBase) throw new Error("Supabase URL が未設定です");
  const url = `${urlBase}${path}`;
  const res = await fetch(url, {
    method: opts.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(await authHeaders(!!opts.requireAuth)),
      ...(opts.headers || {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Supabase Error ${res.status}: ${text}`);
  }
  // 204 No Content or empty body (e.g. Prefer: return=minimal) に対応
  if (res.status === 204) return null;
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    // JSON でない場合はそのまま返す（使われないが安全側）
    return text as any;
  }
}
