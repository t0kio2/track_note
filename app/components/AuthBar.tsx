"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { onAuthStateChange, signInWithGoogle, signOut } from "@/app/lib/auth";
import { clearGuestData, isGuestStarted } from "@/app/lib/storage-local";
import { showToast } from "@/app/lib/toast";
import { logEvent } from "@/app/lib/analytics";

export default function AuthBar() {
  const [email, setEmail] = useState<string | null>(null);
  const [guest, setGuest] = useState<boolean>(false);
  const pathname = usePathname();
  const showBrand = pathname !== "/";
  useEffect(() => {
    const off = onAuthStateChange((s) => {
      setEmail(s?.user?.email ?? null);
      if (s) {
        // ログイン後はゲストデータを削除
        try { clearGuestData(); } catch {}
        setGuest(false);
        // コールバックからの合図があればトースト表示
        try {
          const flag = sessionStorage.getItem("tracknote.auth.justSignedIn");
          if (flag === "1") {
            showToast("ログインしました");
            try { logEvent('login'); } catch {}
            sessionStorage.removeItem("tracknote.auth.justSignedIn");
          }
        } catch {}
      }
    });
    return () => off();
  }, []);

  useEffect(() => {
    // 初期判定とイベント購読（動画登録で開始）
    try { setGuest(!email && isGuestStarted()); } catch {}
    const onStarted = () => { try { setGuest(!email && isGuestStarted()); } catch {} };
    window.addEventListener("tracknote-guest-started", onStarted);
    return () => window.removeEventListener("tracknote-guest-started", onStarted);
  }, [email]);
  return (
    <div className={`flex items-center ${showBrand ? "justify-between" : "justify-end"} gap-2 text-sm`}>
      {showBrand && (
        <Link href="/" className="text-2xl text-zinc-50 hover:text-zinc-600">
          TrackNote
        </Link>
      )}
      <div className="flex items-center gap-2">
        {email ? (
          <>
            <span className="text-zinc-600">{email}</span>
            <button
              className="rounded-md border px-2 py-1 hover:bg-zinc-600"
              onClick={async () => {
                await signOut();
                showToast("ログアウトしました");
                try { logEvent('logout'); } catch {}
              }}
            >
              ログアウト
            </button>
          </>
        ) : (
          <>
            {guest && (
              <span className="rounded bg-amber-200/80 px-2 py-1 text-amber-900">
                ゲストモード
              </span>
            )}
            <button className="rounded-md border px-2 py-1 hover:bg-zinc-600" onClick={() => signInWithGoogle()}>
              Google でログイン
            </button>
          </>
        )}
      </div>
    </div>
  );
}
