"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { onAuthStateChange, signInWithGoogle, signOut } from "@/app/lib/auth";
import { clearGuestData, isGuestStarted } from "@/app/lib/storage-local";
import { showToast } from "@/app/lib/toast";
import { logEvent } from "@/app/lib/analytics";

export default function AuthBar() {
  const [email, setEmail] = useState<string | null>(null);
  const [guest, setGuest] = useState<boolean>(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const showBrandText = pathname !== "/";
  const menuRef = useRef<HTMLDivElement | null>(null);
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

  // メニュー外クリックで閉じる
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!menuOpen) return;
      const el = menuRef.current;
      if (el && e.target instanceof Node && !el.contains(e.target)) setMenuOpen(false);
    };
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, [menuOpen]);
  return (
    <div className={`flex items-center justify-between gap-2 text-sm`}>
      <Link href="/" className="flex items-center gap-2 group">
        {/* ヘッダロゴ。public/logo.png を参照します */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="TrackNote" className="h-6 w-6 rounded" />
        {showBrandText && (
          <span className="text-2xl text-zinc-50 group-hover:text-zinc-600">TrackNote</span>
        )}
      </Link>
      <div className="flex items-center gap-2">
        {email ? (
          <>
            <span className="text-zinc-100">{email}</span>
            <div className="relative" ref={menuRef}>
              <button
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-label="メニュー"
                className="p-2 text-zinc-50 hover:bg-zinc-100"
                onClick={() => setMenuOpen((v) => !v)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                  <path d="M4 6h16a1 1 0 100-2H4a1 1 0 100 2zm16 5H4a1 1 0 100 2h16a1 1 0 100-2zm0 7H4a1 1 0 100 2h16a1 1 0 100-2z" />
                </svg>
              </button>
              {menuOpen && (
                <div role="menu" className="absolute right-0 z-50 mt-2 w-44 overflow-hidden rounded-md border bg-white shadow-lg">
                  <a
                    role="menuitem"
                    href="https://forms.gle/uHT1achWiPJh68hK6"
                    target="_blank"
                    rel="noreferrer"
                    className="block w-full px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50"
                    onClick={() => setMenuOpen(false)}
                  >
                    お問い合わせ
                  </a>
                  <div className="my-1 h-px bg-zinc-200" />
                  <button
                    role="menuitem"
                    className="block w-full px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50"
                    onClick={async () => {
                      setMenuOpen(false);
                      await signOut();
                      showToast("ログアウトしました");
                      try { logEvent('logout'); } catch {}
                    }}
                  >
                    ログアウト
                  </button>
                </div>
              )}
            </div>
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
