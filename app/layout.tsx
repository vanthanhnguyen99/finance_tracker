import "./globals.css";
import type { Metadata, Viewport } from "next";
import { BottomNav } from "./components/BottomNav";
import { TimezoneCookieSync } from "./components/TimezoneCookieSync";

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
  viewportFit: "cover"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <TimezoneCookieSync />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        {children}
        <BottomNav />
      </body>
    </html>
  );
}
