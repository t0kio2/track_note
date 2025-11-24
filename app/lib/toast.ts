"use client";

export function showToast(message: string) {
  try {
    const ev = new CustomEvent("tracknote-toast", { detail: { message } });
    window.dispatchEvent(ev);
  } catch {
    // noop
  }
}

