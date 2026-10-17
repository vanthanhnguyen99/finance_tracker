export type Appearance = "system" | "light" | "dark";
export type Transparency = "system" | "standard" | "reduced";
export type ThemeSettings = { appearance: Appearance; transparency: Transparency };

export function parseAppearance(value?: string): Appearance {
  return value === "light" || value === "dark" ? value : "system";
}
export function parseTransparency(value?: string): Transparency {
  return value === "standard" || value === "reduced" ? value : "system";
}

/** Self-contained so the identical resolver can run before paint and after hydration. */
export function applyDocumentTheme() {
  const root = document.documentElement;
  const appearance = root.dataset.appearance;
  const transparency = root.dataset.transparencyPreference;
  const dark = appearance === "dark" || (appearance === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  const reduced = transparency === "reduced" || matchMedia("(prefers-contrast: more)").matches ||
    (transparency === "system" && matchMedia("(prefers-reduced-transparency: reduce)").matches);
  root.dataset.colorMode = dark ? "dark" : "light";
  root.dataset.transparency = reduced ? "reduced" : "standard";
  // Literal metadata colors mirror the canvas tokens; no layout/style read before paint.
  const color = dark ? "#101622" : root.dataset.visualStyle === "glass" ? "#F4F6FB" : "#F8F9FB";
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", color);
}

export const THEME_BOOTSTRAP_SCRIPT = `(${applyDocumentTheme.toString()})()`;
