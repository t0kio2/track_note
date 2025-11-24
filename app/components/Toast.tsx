"use client";

import { useEffect, useState } from "react";

type ToastState = { message: string; visible: boolean };

export default function Toast() {
  const [state, setState] = useState<ToastState>({ message: "", visible: false });

  useEffect(() => {
    let timer: any;
    const onToast = (e: Event) => {
      const ce = e as CustomEvent<{ message: string }>;
      const msg = ce.detail?.message || "";
      setState({ message: msg, visible: true });
      clearTimeout(timer);
      timer = setTimeout(() => setState((s) => ({ ...s, visible: false })), 3000);
    };
    window.addEventListener("tracknote-toast", onToast as any);
    return () => {
      window.removeEventListener("tracknote-toast", onToast as any);
      clearTimeout(timer);
    };
  }, []);

  if (!state.visible) return null;
  return (
    <div className="pointer-events-none fixed left-1/2 top-4 z-[1000] -translate-x-1/2">
      <div className="pointer-events-auto rounded-md border border-emerald-700 bg-emerald-600 px-3 py-2 text-sm text-white shadow-lg">
        {state.message}
      </div>
    </div>
  );
}
