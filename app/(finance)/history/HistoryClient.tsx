"use client";
import Link from "next/link";
import { FilterAccordion } from "../../components/ui/FilterAccordion";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  formatMoney,
  formatMajorAmountForInput,
  normalizeAmountForApi,
} from "@/lib/money";
import { useHistoryState } from "../../components/useHistoryState";
import type { HistoryResult } from "@/lib/history";
import { HistoryList } from "../../components/HistoryList";

export function HistoryFiltersForm({
  query,
  categories,
}: {
  query: string;
  categories: string[];
}) {
  const params = new URLSearchParams(query);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [currency, setCurrency] = useState(params.get("currency") ?? "");
  if (params.get("category") && !categories.includes(params.get("category")!)) {
    categories = [...categories, params.get("category")!];
  }
  const categoryValue = params.get("uncategorized")
    ? "uncategorized"
    : params.has("category")
      ? `category:${params.get("category")}`
      : "";
  const advanced = [
    "type",
    "currency",
    "start",
    "end",
    "category",
    "uncategorized",
    "paymentMethod",
    "minAmount",
    "maxAmount",
  ].some((k) => Boolean(params.get(k)));
  const inputAmount = (key: string) => {
    const raw = params.get(key);
    return raw && /^\d+(\.\d+)?$/.test(raw)
      ? formatMajorAmountForInput(Number(raw))
      : (raw ?? "");
  };
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const next = new URLSearchParams();
    for (const [key, value] of data.entries()) {
      if (
        typeof value !== "string" ||
        !value.trim() ||
        key === "categoryChoice"
      )
        continue;
      next.set(
        key,
        key === "minAmount" || key === "maxAmount"
          ? normalizeAmountForApi(value)
          : key === "q"
            ? value.trim()
            : value,
      );
    }
    const category = String(data.get("categoryChoice") ?? "");
    if (category === "uncategorized") next.set("uncategorized", "1");
    else if (category.startsWith("category:"))
      next.set("category", category.slice(9));
    startTransition(() => router.push(`/history?${next}`, { scroll: false }));
  }
  return (
    <form
      className="card mt-5 grid gap-4"
      onSubmit={submit}
      aria-label="Tìm kiếm và lọc giao dịch"
    >
      <label className="form-label">
        Tìm giao dịch
        <input
          className="input"
          type="search"
          name="q"
          maxLength={200}
          defaultValue={params.get("q") ?? ""}
          placeholder="Ghi chú, danh mục, nơi đổi tiền…"
        />
      </label>
      {params.get("expenseScope") === "budget" && (
        <div className="rounded-control bg-primary-50 p-3 text-sm text-primary-700">
          Chi tiêu tính ngân sách · không gồm trả thẻ, đổi tiền và phí đổi tiền
          <input type="hidden" name="expenseScope" value="budget" />
          <Link
          prefetch={false}
            className="ml-2 underline"
            href={`/history?${new URLSearchParams([...params].filter(([key]) => key !== "expenseScope"))}`}
          >
            Bỏ chế độ
          </Link>
        </div>
      )}
      <FilterAccordion initiallyOpen={advanced}>
        <div className="mt-2 grid gap-4 sm:grid-cols-2">
          <label className="form-label">
            Loại giao dịch
            <select
              className="select"
              aria-label="Loại giao dịch"
              name="type"
              defaultValue={params.get("type") ?? ""}
            >
              <option value="">Tất cả</option>
              <option value="income">Thu nhập</option>
              <option value="expense">Chi tiêu</option>
              <option value="exchange">Đổi tiền</option>
            </select>
          </label>
          <label className="form-label">
            Tiền tệ
            <select
              className="select"
              aria-label="Tiền tệ"
              name="currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              <option value="">Tất cả tiền tệ</option>
              <option>DKK</option>
              <option>VND</option>
            </select>
          </label>
          <label className="form-label">
            Từ ngày
            <input
              className="input"
              type="date"
              name="start"
              defaultValue={params.get("start") ?? ""}
            />
          </label>
          <label className="form-label">
            Đến ngày
            <input
              className="input"
              type="date"
              name="end"
              defaultValue={params.get("end") ?? ""}
            />
          </label>
          <label className="form-label">
            Danh mục
            <select
              className="select"
              aria-label="Danh mục"
              name="categoryChoice"
              defaultValue={categoryValue}
            >
              <option value="">Tất cả danh mục</option>
              <option value="uncategorized">Chưa phân loại</option>
              {categories.map((c) => (
                <option key={c} value={`category:${c}`}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="form-label">
            Phương thức thanh toán
            <select
              className="select"
              aria-label="Phương thức thanh toán"
              name="paymentMethod"
              defaultValue={params.get("paymentMethod") ?? ""}
            >
              <option value="">Tất cả</option>
              <option value="CASH">Tiền mặt</option>
              <option value="CREDIT_CARD">Thẻ tín dụng</option>
            </select>
          </label>
          <label className="form-label">
            Số tiền tối thiểu
            <input
              className="input"
              name="minAmount"
              inputMode="decimal"
              defaultValue={inputAmount("minAmount")}
              placeholder={currency || "Chọn tiền tệ trước"}
            />
          </label>
          <label className="form-label">
            Số tiền tối đa
            <input
              className="input"
              name="maxAmount"
              inputMode="decimal"
              defaultValue={inputAmount("maxAmount")}
              placeholder={currency || "Chọn tiền tệ trước"}
            />
          </label>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Khi lọc số tiền, hãy chọn DKK hoặc VND. Với đổi tiền: lọc DKK đem đổi
          hoặc VND nhận, không gồm phí. Dùng dấu phẩy cho phần thập phân.
        </p>
      </FilterAccordion>
      <div className="grid grid-cols-2 gap-2">
        <button className="button" disabled={pending}>
          {pending ? "Đang tìm…" : "Áp dụng"}
        </button>
        <Link prefetch={false} className="button button-secondary" href="/history">
          Đặt lại
        </Link>
      </div>
    </form>
  );
}
export function HistoryResults({
  initial,
  query,
  timeZone,
}: {
  initial: HistoryResult;
  query: string;
  timeZone: string;
}) {
  const { result, loading, error, loadMore } = useHistoryState(initial, query, timeZone);
  return (
    <>
      <section
        className="mt-5"
        aria-label="Tổng kết quả tìm kiếm"
        aria-busy={loading}
        aria-live="polite"
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold">
            {result.totalCount} kết quả · đang hiển thị {result.items.length}
          </p>
          <a
            className="button button-secondary"
            href={`/api/export/csv?${query}`}
          >
            Xuất CSV
          </a>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {(["DKK", "VND"] as const).map((currency) => {
            const s = result.summaryByCurrency[currency];
            return (
              <div className="card p-4" key={currency}>
                <h2 className="text-sm font-semibold">
                  Tổng kết quả · {currency}
                </h2>
                <dl className="mt-3 grid gap-2 text-sm">
                  <div className="flex flex-wrap justify-between gap-1">
                    <dt>Khoản thu</dt>
                    <dd className="money-value text-success-dark">
                      {formatMoney(s.income, currency)}
                    </dd>
                  </div>
                  <div className="flex flex-wrap justify-between gap-1">
                    <dt>
                      Khoản chi
                      {query.includes("expenseScope=budget")
                        ? " tính ngân sách"
                        : " (gồm trả thẻ)"}
                    </dt>
                    <dd className="money-value text-danger-dark">
                      {formatMoney(s.expense, currency)}
                    </dd>
                  </div>
                  <div className="flex flex-wrap justify-between gap-1">
                    <dt>
                      {currency === "DKK" ? "Đổi đi" : "Nhận từ đổi tiền"}
                    </dt>
                    <dd className="money-value">
                      {formatMoney(
                        currency === "DKK" ? s.exchangeOut : s.exchangeIn,
                        currency,
                      )}
                    </dd>
                  </div>
                  <div className="flex flex-wrap justify-between gap-1">
                    <dt>Phí đổi tiền</dt>
                    <dd className="money-value">
                      {formatMoney(s.exchangeFees, currency)}
                    </dd>
                  </div>
                </dl>
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Tổng của toàn bộ kết quả khớp bộ lọc; đổi tiền được hiển thị riêng.
        </p>
      </section>
      <HistoryList
        items={result.items}
        timeZone={timeZone}
        filtered={Boolean(query)}

      />
      {error && (
        <p role="alert" className="mt-3 text-sm text-danger-dark">
          {error}
        </p>
      )}
      {result.nextCursor && (
        <button
          className="button button-secondary mt-5 w-full"
          disabled={loading}
          onClick={loadMore}
        >
          {loading ? "Đang tải…" : "Tải thêm"}
        </button>
      )}
    </>
  );
}
