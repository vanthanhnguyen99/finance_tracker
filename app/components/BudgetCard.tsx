import { DataCard } from "./ui/Surfaces";
import Link from "next/link";
import { formatMoney } from "@/lib/money";
import { BUDGET_STATUS_LABELS } from "@/lib/budget-utils";
import type { BudgetView } from "@/lib/budgets";
export function BudgetCard({
  budget,
  children,
}: {
  budget: BudgetView;
  children?: React.ReactNode;
}) {
  const warning = budget.status !== "normal";
  const danger = budget.status === "over" || budget.status === "reached";
  const tone = danger
    ? "text-danger-dark"
    : warning
      ? "text-warning-dark"
      : "text-primary-700";
  return (
    <DataCard className="min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="text-lg font-semibold text-ink">
          {budget.scope === "TOTAL"
            ? "Tổng tháng"
            : budget.scope === "UNCATEGORIZED"
              ? "Chưa phân loại"
              : budget.category}
        </h2>
        <span className={`text-xs font-semibold ${tone}`}>
          {BUDGET_STATUS_LABELS[budget.status]}
        </span>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Đã chi / Hạn mức · {budget.currency}
      </p>
      <p className="money-value mt-1 break-words text-lg font-bold">
        {formatMoney(budget.spent, budget.currency)}{" "}
        <span className="text-sm font-medium text-slate-500">
          / {formatMoney(budget.limitMinor, budget.currency)}
        </span>
      </p>
      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-label="Mức sử dụng ngân sách"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.min(100, budget.percent)}
        aria-valuetext={`${budget.percent.toFixed(1)}%`}
      >
        <div
          className={`h-full rounded-full ${danger ? "bg-danger" : warning ? "bg-warning" : "bg-primary-600"}`}
          style={{ width: `${Math.min(100, budget.percent)}%` }}
        />
      </div>
      <div className="mt-2 flex flex-wrap justify-between gap-1 text-sm">
        <span className={tone}>
          {budget.percent.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}
          %
        </span>
        <span className={tone}>
          {budget.remaining < 0 ? "Vượt" : "Còn lại"}{" "}
          {formatMoney(Math.abs(budget.remaining), budget.currency)}
        </span>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Link
          prefetch={false}
          className="min-h-11 py-3 text-sm font-semibold text-primary-700 underline"
          href={budget.historyUrl}
        >
          Xem giao dịch
        </Link>
        {children}
      </div>
    </DataCard>
  );
}
