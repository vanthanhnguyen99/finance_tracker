"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LogoutButton } from "./LogoutButton";

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "FT";
  return parts.slice(-2).map((part) => part[0]).join("").toUpperCase();
}

export function ProfileMenu({
  name,
  email,
  primaryCurrency
}: {
  name: string;
  email?: string | null;
  primaryCurrency: "DKK" | "VND";
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  async function setPrimaryCurrency(currency: "DKK" | "VND") {
    if (currency === primaryCurrency || isSaving) return;
    setIsSaving(true);
    setError("");
    try {
      const response = await fetch("/api/account/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ primaryCurrency: currency })
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setError(payload?.error ?? "Không thể cập nhật. Vui lòng thử lại.");
        return;
      }

      setIsOpen(false);
      if (pathname === "/") {
        const params = new URLSearchParams(searchParams.toString());
        params.delete("expenseCurrency");
        params.set("refresh", String(Date.now()));
        router.replace(`/?${params.toString()}`, { scroll: false });
      } else {
        router.refresh();
      }
    } catch {
      setError("Không thể cập nhật. Vui lòng kiểm tra kết nối.");
    } finally {
      setIsSaving(false);
    }
  }

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
            <div className="px-3 py-2">
              <p className="text-xs font-semibold text-slate-500">Đơn vị tiền tệ chính</p>
              <div className="mt-2 grid grid-cols-2 gap-2" aria-label="Chọn đơn vị tiền tệ chính">
                {(["DKK", "VND"] as const).map((currency) => {
                  const active = primaryCurrency === currency;
                  return (
                    <button
                      key={currency}
                      type="button"
                      onClick={() => setPrimaryCurrency(currency)}
                      disabled={isSaving}
                      className={`min-h-10 rounded-control border px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 disabled:opacity-60 ${
                        active
                          ? "border-primary-200 bg-primary-50 text-primary-700"
                          : "border-slate-200 text-slate-600 active:bg-slate-50"
                      }`}
                      aria-pressed={active}
                    >
                      {currency}
                    </button>
                  );
                })}
              </div>
              {error ? <p className="mt-2 text-xs text-danger-dark">{error}</p> : null}
            </div>
            <div className="my-1 border-t border-slate-100" />
            <LogoutButton className="w-full justify-start rounded-control px-3 [&>span]:!inline" />
          </div>
        </>
      ) : null}
    </div>
  );
}
