"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { TimeFilter } from "@/lib/date";

const STORAGE_KEY = "finance_tracker_time_filter";

export function TimeFilterTabs({
  filters,
  active,
  expenseCurrency,
  fromDate,
  toDate,
  customActive
}: {
  filters: { key: TimeFilter; label: string }[];
  active: TimeFilter;
  expenseCurrency: "DKK" | "VND";
  fromDate: string;
  toDate: string;
  customActive: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

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

  function setFilter(next: TimeFilter) {
    localStorage.setItem(STORAGE_KEY, next);
    const params = new URLSearchParams(searchParams.toString());
    params.set("filter", next);
    params.delete("from");
    params.delete("to");
    params.set("expenseCurrency", expenseCurrency);
    params.set("refresh", String(Date.now()));
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function applyCustomRange(from: string, to: string) {
    if (!from || !to || from > to) return;
    localStorage.setItem(STORAGE_KEY, "month");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("filter");
    params.set("from", from);
    params.set("to", to);
    params.set("expenseCurrency", expenseCurrency);
    params.set("refresh", String(Date.now()));
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="mt-6 space-y-3">
      <div className="no-scrollbar overflow-x-auto">
        <div className="inline-flex min-w-full items-center rounded-2xl border border-slate-200 bg-white p-1">
          {filters.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setFilter(item.key)}
              className={`flex min-h-11 min-w-[84px] flex-1 items-center justify-center rounded-xl px-2 text-sm font-semibold touch-manipulation ${
                !customActive && active === item.key
                  ? "bg-ink text-white"
                  : "text-slate-500"
              }`}
            >
              {item.label}
            </button>
          ))}
          <span
            className={`flex min-h-11 min-w-[92px] items-center justify-center rounded-xl px-3 text-sm font-semibold ${
              customActive ? "bg-ink text-white" : "text-slate-500"
            }`}
          >
            Tùy chỉnh
          </span>
        </div>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const from = (data.get("from") as string) ?? "";
          const to = (data.get("to") as string) ?? "";
          applyCustomRange(from, to);
        }}
        className="grid grid-cols-5 items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2"
      >
        <input
          type="date"
          name="from"
          defaultValue={fromDate}
          className="col-span-2 min-h-11 rounded-xl border border-slate-200 px-2 text-base text-slate-700"
          aria-label="Từ ngày"
        />
        <input
          type="date"
          name="to"
          defaultValue={toDate}
          className="col-span-2 min-h-11 rounded-xl border border-slate-200 px-2 text-base text-slate-700"
          aria-label="Đến ngày"
        />
        <button
          type="submit"
          className="min-h-11 rounded-xl bg-ink px-2 text-sm font-semibold text-white touch-manipulation"
        >
          Xem
        </button>
      </form>
    </div>
  );
}
