"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { TIMEZONE_COOKIE_NAME } from "@/lib/timezone";

export function TimezoneCookieSync() {
  const router = useRouter();

  useEffect(() => {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!timeZone) return;
    const cookiePrefix = `${TIMEZONE_COOKIE_NAME}=`;
    const currentTimeZone = document.cookie
      .split(";")
      .map((value) => value.trim())
      .find((value) => value.startsWith(cookiePrefix))
      ?.slice(cookiePrefix.length);
    if (currentTimeZone && decodeURIComponent(currentTimeZone) === timeZone) return;

    const maxAge = 60 * 60 * 24 * 365;
    document.cookie = `${TIMEZONE_COOKIE_NAME}=${encodeURIComponent(timeZone)}; path=/; max-age=${maxAge}; samesite=lax`;
    router.refresh();
  }, [router]);

  return null;
}
