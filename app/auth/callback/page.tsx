"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/app/lib/supabase-client";
import { useT } from "@/app/components/LocaleProvider";

export default function AuthCallback() {
  const t = useT();
  const router = useRouter();
  useEffect(() => {
    (async () => {
      try {
        const supabase = getSupabaseClient();
        // URL の code をセッションに交換
        await supabase.auth.exchangeCodeForSession(window.location.href);
        try { sessionStorage.setItem("tracknote.auth.justSignedIn", "1"); } catch {}
      } catch {
        // noop
      } finally {
        router.replace("/");
      }
    })();
  }, []);
  return (
    <div className="mx-auto max-w-md p-6 text-center text-sm text-zinc-600">{t("auth.processing")}</div>
  );
}
