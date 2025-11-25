"use client";

import { getSupabaseClient } from "./supabase-client";

export async function signInWithGoogle() {
  const supabase = getSupabaseClient();
  const redirectTo = `${window.location.origin}/auth/callback`;
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      queryParams: {
        // 2回目以降もアカウント選択ダイアログを表示
        prompt: "select_account",
      },
    },
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const supabase = getSupabaseClient();
  await supabase.auth.signOut();
}

export async function getSession() {
  const supabase = getSupabaseClient();
  const { data } = await supabase.auth.getSession();
  return data.session ?? null;
}

export async function getAccessToken(): Promise<string | null> {
  const s = await getSession();
  return s?.access_token ?? null;
}

export async function getUserId(): Promise<string | null> {
  const s = await getSession();
  return (s as any)?.user?.id ?? null;
}

export function onAuthStateChange(cb: (session: any | null) => void) {
  const supabase = getSupabaseClient();
  // 初期セッションを即時通知
  supabase.auth
    .getSession()
    .then(({ data }) => cb(data.session ?? null))
    .catch(() => cb(null));
  // 以降の変化はイベントから直接 session を受け取って反映
  const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => cb(session));
  return () => sub.subscription.unsubscribe();
}
