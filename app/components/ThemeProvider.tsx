"use client";

import { createContext, useContext, useLayoutEffect, useState } from "react";
import { applyDocumentTheme, type ThemeSettings } from "@/lib/theme";

type ThemeContextValue = ThemeSettings & { updateTheme: (settings: Partial<ThemeSettings>) => void };
const ThemeContext = createContext<ThemeContextValue | null>(null);
export function useTheme() {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error("ThemeProvider is required");
  return theme;
}

export function ThemeProvider({ initialSettings, children }: { initialSettings: ThemeSettings; children: React.ReactNode }) {
  const [settings, setSettings] = useState(initialSettings);
  useLayoutEffect(() => {
    const queries = ["(prefers-color-scheme: dark)", "(prefers-reduced-transparency: reduce)", "(prefers-contrast: more)"].map(query => matchMedia(query));
    applyDocumentTheme();
    for (const query of queries) query.addEventListener("change", applyDocumentTheme);
    return () => { for (const query of queries) query.removeEventListener("change", applyDocumentTheme); };
  }, []);

  function updateTheme(update: Partial<ThemeSettings>) {
    const next = { ...settings, ...update };
    setSettings(next);
    document.documentElement.dataset.appearance = next.appearance;
    document.documentElement.dataset.transparencyPreference = next.transparency;
    applyDocumentTheme();
    for (const [name, value] of [["finance_appearance", next.appearance], ["finance_transparency", next.transparency]]) {
      try {
        document.cookie = `${name}=${value}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
      } catch { /* Preferences still work in memory when cookies are blocked. */ }
    }
  }

  return <ThemeContext.Provider value={{ ...settings, updateTheme }}>{children}</ThemeContext.Provider>;
}
