import { FinanceInputError } from "./finance-validation";
import { getDateInTimeZone, parseDateInputInTimeZone } from "./timezone";
export type BudgetScope = "TOTAL" | "CATEGORY" | "UNCATEGORIZED";

export function currentMonth(timeZone: string, now = new Date()) {
  const { year, month } = getDateInTimeZone(now, timeZone);
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}`;
}
export function parseMonth(value: unknown) {
  if (
    typeof value !== "string" ||
    !/^(?!0000)\d{4}-(0[1-9]|1[0-2])$/.test(value)
  ) {
    throw new FinanceInputError("Tháng không hợp lệ (YYYY-MM).");
  }
  return value;
}
export function monthDates(value: unknown) {
  const month = parseMonth(value);
  const [year, m] = month.split("-").map(Number);
  const marker = new Date(0);
  marker.setUTCFullYear(year, m, 0);
  const last = marker.getUTCDate();
  return { start: `${month}-01`, end: `${month}-${last}` };
}
export function monthBounds(value: unknown, timeZone: string) {
  const days = monthDates(value);
  return {
    start: parseDateInputInTimeZone(days.start, timeZone, false)!,
    end: parseDateInputInTimeZone(days.end, timeZone, true)!,
  };
}
export function previousMonth(value: unknown) {
  const month = parseMonth(value);
  const [year, m] = month.split("-").map(Number);
  if (year === 1 && m === 1)
    throw new FinanceInputError("Không có tháng trước để sao chép.");
  return `${String(m === 1 ? year - 1 : year).padStart(4, "0")}-${String(m === 1 ? 12 : m - 1).padStart(2, "0")}`;
}
export function budgetIdentity(scope: unknown, category: unknown) {
  if (scope === "TOTAL" || scope === "UNCATEGORIZED")
    return { scope, category: null, scopeKey: scope };
  if (
    scope === "CATEGORY" &&
    typeof category === "string" &&
    category.trim() &&
    category.length <= 200
  ) {
    return { scope, category, scopeKey: `CATEGORY:${category}` };
  }
  throw new FinanceInputError("Phạm vi hoặc danh mục ngân sách không hợp lệ.");
}
export function budgetStatus(
  spent: number,
  limit: number,
): "normal" | "warning" | "reached" | "over" {
  return spent > limit
    ? "over"
    : spent === limit
      ? "reached"
      : spent * 100 >= limit * 80
        ? "warning"
        : "normal";
}
export const BUDGET_STATUS_LABELS = {
  normal: "Trong ngân sách",
  warning: "Gần đạt hạn mức",
  reached: "Đạt hạn mức",
  over: "Vượt ngân sách",
};
export function budgetHistoryUrl(
  month: string,
  currency: string,
  scope: string,
  category: string | null,
) {
  const { start, end } = monthDates(month);
  const query = new URLSearchParams({
    type: "expense",
    expenseScope: "budget",
    currency,
    start,
    end,
  });
  if (scope === "CATEGORY" && category !== null)
    query.set("category", category);
  if (scope === "UNCATEGORIZED") query.set("uncategorized", "1");
  return `/history?${query}`;
}
