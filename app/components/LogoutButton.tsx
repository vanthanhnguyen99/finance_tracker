"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogoutIcon } from "./AppIcons";

export function LogoutButton({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleLogout() {
    if (pending) return;
    setPending(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={pending}
      className={`icon-button gap-2 px-2 sm:px-3 ${pending ? "opacity-70" : ""} ${className}`}
      aria-label={pending ? "Đang đăng xuất" : "Đăng xuất"}
      title={pending ? "Đang đăng xuất" : "Đăng xuất"}
    >
      <LogoutIcon className="h-5 w-5" />
      <span className="hidden text-sm font-semibold sm:inline">
        {pending ? "Đang đăng xuất..." : "Đăng xuất"}
      </span>
    </button>
  );
}
