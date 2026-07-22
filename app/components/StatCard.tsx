import { ReactNode } from "react";
import { ExpenseIcon, IncomeIcon, WalletIcon } from "./AppIcons";

export function StatCard({
  title,
  value,
  hint,
  tone = "neutral"
}: {
  title: string;
  value: string;
  hint?: ReactNode;
  tone?: "neutral" | "income" | "expense" | "balance";
}) {
  const toneStyles =
    tone === "balance"
      ? "stat-card-balance border-primary-600 bg-primary-600 text-white"
      : "bg-white";
  const valueStyles =
    tone === "income"
      ? "text-emerald-600"
      : tone === "expense"
        ? "text-danger"
        : tone === "balance"
          ? "text-white"
          : "text-ink";

  const Icon = tone === "income" ? IncomeIcon : tone === "expense" ? ExpenseIcon : WalletIcon;
  const iconStyles =
    tone === "balance"
      ? "bg-white/15 text-white"
      : tone === "income"
        ? "bg-success-light text-success-dark"
        : tone === "expense"
          ? "bg-danger-light text-danger-dark"
          : "bg-primary-50 text-primary-700";

  return (
    <div className={`card ${toneStyles}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`text-sm font-medium ${tone === "balance" ? "text-white/75" : "text-slate-500"}`}>
            {title}
          </p>
          <p className={`money-value mt-2 break-words text-2xl font-bold leading-8 sm:text-[28px] ${valueStyles}`}>
            {value}
          </p>
        </div>
        <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconStyles}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      {hint ? <div className={`mt-3 text-xs ${tone === "balance" ? "text-white/75" : "text-slate-500"}`}>{hint}</div> : null}
    </div>
  );
}
