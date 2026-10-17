"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { clearUiSession } from "@/lib/ui-session";
export function SessionUiReset() {
  const pathname = usePathname();
  useEffect(() => {
    if (["/login", "/register", "/forgot-password", "/reset-password"].includes(pathname)) clearUiSession();
  }, [pathname]);
  return null;
}
