"use client";

import { createContext, useContext } from "react";
import type { Lang } from "./config";
import { getDict } from "./index";

const LangContext = createContext<Lang>("ka");

export function I18nProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return <LangContext.Provider value={lang}>{children}</LangContext.Provider>;
}

/** Current language and its UI text, for client components. */
export function useI18n() {
  const lang = useContext(LangContext);
  return { lang, t: getDict(lang) };
}
