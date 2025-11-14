"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let singleton: SupabaseClient | null = null;

export function getSupabaseClient() {
  if (singleton) return singleton;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error("Supabase の環境変数が未設定です");
  singleton = createClient(url, anon, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      // ストレージキーを固定し、ホスト名の違いによるキー変化を防止
      storageKey: "track_note_auth",
    },
  });
  return singleton;
}
