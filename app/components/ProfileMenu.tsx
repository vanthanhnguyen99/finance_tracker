"use client";

import { useState } from "react";
import { LogoutButton } from "./LogoutButton";

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "FT";
  return parts.slice(-2).map((part) => part[0]).join("").toUpperCase();
}

export function ProfileMenu({ name, email }: { name: string; email?: string | null }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700 transition active:bg-primary-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300"
        onClick={() => setIsOpen((current) => !current)}
        aria-label="Mở menu tài khoản"
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        {getInitials(name)}
      </button>

      {isOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setIsOpen(false)}
            aria-label="Đóng menu tài khoản"
          />
          <div
            role="menu"
            className="absolute right-0 top-[52px] z-50 w-64 rounded-card border border-slate-200 bg-white p-2 shadow-sheet"
          >
            <div className="px-3 py-2">
              <p className="truncate text-sm font-semibold text-ink">{name}</p>
              {email ? <p className="mt-0.5 truncate text-xs text-slate-500">{email}</p> : null}
            </div>
            <div className="my-1 border-t border-slate-100" />
            <LogoutButton className="w-full justify-start rounded-control px-3 [&>span]:!inline" />
          </div>
        </>
      ) : null}
    </div>
  );
}
