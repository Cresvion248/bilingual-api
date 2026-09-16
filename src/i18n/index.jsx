import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/appClient";
import { en } from "./en";
import { es } from "./es";

const dictionaries = { en, es };
const STORAGE_KEY = "cresvion_interface_language";

function detectBrowserLanguage() {
  const nav = String(navigator.language || navigator.userLanguage || "en").toLowerCase();
  return nav.startsWith("es") ? "es" : "en";
}

// Keep the context instance stable across dev hot-reloads so components
// re-evaluated by HMR still find the mounted provider instead of crashing.
const LanguageContext = (globalThis.__CresvionLanguageContext ||= createContext(null));

export function LanguageProvider({ children }) {
  const { isAuthenticated, isLoadingAuth } = useAuth();
  const [lang, setLangState] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "en" || stored === "es") return stored;
    } catch (e) {
      // localStorage unavailable
    }
    return detectBrowserLanguage();
  });

  const applyLang = useCallback((next) => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch (e) {
      // localStorage unavailable
    }
    document.documentElement.lang = next;
    document.documentElement.dir = "ltr";
  }, []);

  // Load the persisted preference from the user profile once authenticated.
  useEffect(() => {
    if (!isLoadingAuth && isAuthenticated) {
      base44.functions
        .invoke("updateProfile", {})
        .then((res) => {
          const p = res && res.data && res.data.profile;
          if (p && (p.preferred_interface_language === "en" || p.preferred_interface_language === "es")) {
            applyLang(p.preferred_interface_language);
          }
        })
        .catch(() => {});
    }
  }, [isAuthenticated, isLoadingAuth, applyLang]);

  const setLang = useCallback(
    (next) => {
      applyLang(next);
      if (isAuthenticated) {
        base44.functions.invoke("updateProfile", { preferred_interface_language: next }).catch(() => {});
      }
    },
    [applyLang, isAuthenticated]
  );

  const t = useCallback(
    (key, vars = null) => {
      let value;
      if (dictionaries[lang] && dictionaries[lang][key] !== undefined) value = dictionaries[lang][key];
      else value = en[key];
      if (value === undefined) return key;
      if (vars) {
        Object.keys(vars).forEach((k) => {
          value = String(value).split("{" + k + "}").join(String(vars[k]));
        });
      }
      return value;
    },
    [lang]
  );

  return <LanguageContext.Provider value={{ lang, setLang, t }}>{children}</LanguageContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useI18n must be used within LanguageProvider");
  return ctx;
}