import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", "Segoe UI", "Arial", "sans-serif"]
      },
      colors: {
        ink: "rgb(var(--text-primary) / <alpha-value>)",
        mist: "rgb(var(--app-bg) / <alpha-value>)",
        surface: "rgb(var(--surface-solid) / <alpha-value>)",
        "on-accent": "rgb(var(--text-on-accent) / <alpha-value>)",
        slate: Object.fromEntries([50,100,200,300,400,500,600,700,800,900,950].map(n => [n, `rgb(var(--neutral-${n}) / <alpha-value>)`])),
        primary: Object.fromEntries([50,100,200,300,400,500,600,700,800,900].map(n => [n, `rgb(var(--accent-${n}) / <alpha-value>)`])),
        success: { light: "rgb(var(--positive-bg) / <alpha-value>)", DEFAULT: "rgb(var(--income) / <alpha-value>)", dark: "rgb(var(--income-text) / <alpha-value>)" },
        danger: { light: "rgb(var(--negative-bg) / <alpha-value>)", DEFAULT: "rgb(var(--expense) / <alpha-value>)", dark: "rgb(var(--expense-text) / <alpha-value>)" },
        warning: { light: "rgb(var(--warning-bg) / <alpha-value>)", DEFAULT: "rgb(var(--warning) / <alpha-value>)", dark: "rgb(var(--warning-text) / <alpha-value>)" }
      },
      transitionDuration: { 150: "var(--motion-fast)", 200: "var(--motion-base)", 300: "var(--motion-slow)" },
      borderRadius: {
        card: "var(--radius-card)",
        control: "var(--radius-control)"
      },
      boxShadow: {
        soft: "var(--shadow-soft)",
        card: "var(--shadow-soft)",
        sheet: "var(--shadow-overlay)"
      }
    }
  },
  plugins: []
};

export default config;
