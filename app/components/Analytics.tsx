"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { initAnalytics, pageview } from "@/app/lib/analytics";

export default function Analytics() {
  const pathname = usePathname();
  const search = useSearchParams();

  useEffect(() => {
    initAnalytics();
  }, []);

  useEffect(() => {
    if (!pathname) return;
    const p = `${pathname}${search?.toString() ? `?${search!.toString()}` : ""}`;
    pageview(p);
  }, [pathname, search]);

  return null;
}

