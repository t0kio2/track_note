"use client";

import React, { createContext, useContext, useMemo } from "react";
import type { Locale } from "@/app/lib/i18n";
import { translate } from "@/app/lib/i18n";

const LocaleContext = createContext<Locale>("ja");

export function LocaleProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

export function useT() {
  const locale = useLocale();
  return useMemo(() => {
    return (key: string) => translate(locale, key);
  }, [locale]);
}

