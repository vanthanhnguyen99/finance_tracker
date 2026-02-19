"use client";

import { useEffect } from "react";
import { TIMEZONE_COOKIE_NAME } from "@/lib/timezone";

export function TimezoneCookieSync() {
  useEffect(() => {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!timeZone) return;
    const maxAge = 60 * 60 * 24 * 365;
    document.cookie = `${TIMEZONE_COOKIE_NAME}=${encodeURIComponent(timeZone)}; path=/; max-age=${maxAge}; samesite=lax`;
  }, []);

  return null;
}
