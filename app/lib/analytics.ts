"use client";

let inited = false;

function gaId() {
  return process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "";
}

export function initAnalytics() {
  const id = gaId();
  if (!id || typeof window === "undefined" || inited) return;
  inited = true;
  // gtag.js を挿入
  const s1 = document.createElement("script");
  s1.async = true;
  s1.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(s1);
  const s2 = document.createElement("script");
  s2.innerHTML = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', '${id}', { send_page_view: false });`;
  document.head.appendChild(s2);
}

export function pageview(path: string) {
  const id = gaId();
  if (!id || typeof window === "undefined") return;
  if (!(window as any).gtag) return;
  (window as any).gtag('event', 'page_view', {
    page_location: window.location.href,
    page_path: path,
    page_title: document.title,
    send_to: id,
  });
}

export function logEvent(eventName: string, params?: Record<string, any>) {
  const id = gaId();
  if (!id || typeof window === "undefined") return;
  if (!(window as any).gtag) return;
  (window as any).gtag('event', eventName, params || {});
}

export function setUserId(userId: string | null) {
  const id = gaId();
  if (!id || typeof window === "undefined") return;
  const g = (window as any).gtag;
  if (!g) return;
  // GA4 では config で user_id を設定
  if (userId) {
    g('config', id, { user_id: userId });
  } else {
    // 明示的に user_id を外す（空値を設定）
    g('config', id, { user_id: undefined });
  }
}
