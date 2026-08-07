"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { TimeFilter } from "@/lib/date";
import { CalendarIcon, ChevronDownIcon } from "./AppIcons";

const STORAGE_KEY = "finance_tracker_time_filter";

export function TimeFilterTabs({
  filters,
  active,
  expenseCurrency,
  fromDate,
  toDate,
  customActive,
  rangeLabel
}: {
  filters: { key: TimeFilter; label: string }[];
  active: TimeFilter;
  expenseCurrency: "DKK" | "VND";
  fromDate: string;
  toDate: string;
  customActive: boolean;
  rangeLabel: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const [isCustomOpen, setIsCustomOpen] = useState(customActive);
  const [customError, setCustomError] = useState("");
  const activeLabel = customActive
    ? "Tùy chỉnh"
    : filters.find((item) => item.key === active)?.label ?? "Tháng này";

  useEffect(() => {
    const hasFilterQuery = searchParams.has("filter");
    const hasCustomQuery = searchParams.has("from") && searchParams.has("to");
    if (hasFilterQuery || hasCustomQuery) return;
    const saved = localStorage.getItem(STORAGE_KEY) as TimeFilter | null;
    if (!saved || saved === active) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("filter", saved);
    params.set("expenseCurrency", expenseCurrency);
    params.set("refresh", String(Date.now()));
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [active, expenseCurrency, pathname, router, searchParams]);

  useEffect(() => {
    if (!isOpen) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isOpen]);

  function setFilter(next: TimeFilter) {
    localStorage.setItem(STORAGE_KEY, next);
    const params = new URLSearchParams(searchParams.toString());
    params.set("filter", next);
    params.delete("from");
    params.delete("to");
    params.set("expenseCurrency", expenseCurrency);
    params.set("refresh", String(Date.now()));
    setIsOpen(false);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function applyCustomRange(from: string, to: string) {
    if (!from || !to || from > to) {
      setCustomError("Khoảng ngày không hợp lệ.");
      return;
    }
    setCustomError("");
    localStorage.setItem(STORAGE_KEY, "month");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("filter");
    params.set("from", from);
    params.set("to", to);
    params.set("expenseCurrency", expenseCurrency);
    params.set("refresh", String(Date.now()));
    setIsOpen(false);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <section className="mt-4" aria-label="Khoảng thời gian dashboard">
      <button
        type="button"
        onClick={() => {
          setIsCustomOpen(customActive);
          setIsOpen(true);
        }}
        className="flex min-h-12 w-full items-center gap-3 rounded-control border border-slate-200 bg-white px-3 text-left shadow-soft transition active:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <CalendarIcon className="h-5 w-5 shrink-0 text-primary-600" />
        <span className="flex min-w-0 flex-1 items-center gap-1 text-sm font-semibold text-ink">
          <span className="truncate">{activeLabel}</span>
          <ChevronDownIcon className="h-4 w-4 shrink-0 text-slate-400" />
        </span>
        <span className="shrink-0 text-xs font-medium text-slate-500">{rangeLabel}</span>
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/35 sm:items-center sm:p-4" role="presentation" onMouseDown={() => setIsOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="time-filter-title"
            className="w-full max-w-md rounded-t-[20px] bg-white p-4 shadow-sheet sm:rounded-[20px]"
            style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-200 sm:hidden" />
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 id="time-filter-title" className="text-xl font-semibold text-ink">Khoảng thời gian</h2>
                <p className="mt-1 text-sm text-slate-500">Dữ liệu dashboard sẽ cập nhật theo lựa chọn.</p>
              </div>
              <button type="button" className="icon-button" onClick={() => setIsOpen(false)} aria-label="Đóng">
                <span aria-hidden="true" className="text-2xl font-light">×</span>
              </button>
            </div>

            <div className="mt-5 grid gap-2">
              {filters.map((item) => {
                const isActive = !customActive && active === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setFilter(item.key)}
                    className={`flex min-h-12 items-center justify-between rounded-control px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 ${
                      isActive ? "bg-primary-50 text-primary-700" : "text-slate-700 active:bg-slate-50"
                    }`}
                  >
                    {item.label}
                    <span className={`h-5 w-5 rounded-full border-2 ${isActive ? "border-[6px] border-primary-600" : "border-slate-300"}`} />
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setIsCustomOpen((current) => !current)}
                className={`flex min-h-12 items-center justify-between rounded-control px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 ${
                  customActive || isCustomOpen ? "bg-primary-50 text-primary-700" : "text-slate-700 active:bg-slate-50"
                }`}
              >
                Tùy chỉnh
                <ChevronDownIcon className={`h-5 w-5 transition ${isCustomOpen ? "rotate-180" : ""}`} />
              </button>
            </div>

            {isCustomOpen ? (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  const data = new FormData(event.currentTarget);
                  applyCustomRange((data.get("from") as string) ?? "", (data.get("to") as string) ?? "");
                }}
                className="mt-3 grid gap-3 rounded-control bg-slate-50 p-3"
              >
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="form-label">
                    Từ ngày
                    <input type="date" name="from" defaultValue={fromDate} className="input px-3" />
                  </label>
                  <label className="form-label">
                    Đến ngày
                    <input type="date" name="to" defaultValue={toDate} className="input px-3" />
                  </label>
                </div>
                {customError ? (
                  <p className="text-sm font-medium text-danger-dark" role="alert">{customError}</p>
                ) : null}
                <button type="submit" className="button">Áp dụng</button>
              </form>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
