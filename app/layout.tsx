import "./globals.css";
import type { Metadata, Viewport } from "next";
import { cookies, headers } from "next/headers";
import { parseAppearance, parseTransparency, THEME_BOOTSTRAP_SCRIPT } from "@/lib/theme";
import { ThemeProvider } from "./components/ThemeProvider";
import { SessionUiReset } from "./components/SessionUiReset";
import { TimezoneCookieSync } from "./components/TimezoneCookieSync";

// Resolve the server rollout flag per request, including authentication pages.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Quản lý chi tiêu DKK/VND",
  description: "Theo dõi thu nhập, chi tiêu và đổi DKK sang VND.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/logo.svg",
    shortcut: "/logo.svg",
    apple: "/logo.svg"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // Browser chrome requires a literal color; keep in sync with --app-bg.
  themeColor: process.env.GLASS_UI_ENABLED === "true" ? "#F4F6FB" : "#F8F9FB"
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const preferences = await cookies();
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const settings = {
    appearance: parseAppearance(preferences.get("finance_appearance")?.value),
    transparency: parseTransparency(preferences.get("finance_transparency")?.value)
  };
  return (
    <html lang="vi" suppressHydrationWarning
      data-appearance={settings.appearance} data-transparency-preference={settings.transparency}
      data-color-mode={settings.appearance === "dark" ? "dark" : "light"}
      data-visual-style={process.env.GLASS_UI_ENABLED === "true" ? "glass" : "classic"}>
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }} />
      </head>
      <body>
        <ThemeProvider initialSettings={settings}>
        <TimezoneCookieSync />
        <SessionUiReset />
        {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
