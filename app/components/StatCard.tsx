import { ReactNode } from "react";

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
      ? "bg-gradient-to-br from-[#6f3bf3] via-[#7c3aed] to-[#9333ea] text-white"
      : "bg-white";
  const valueStyles =
    tone === "income"
      ? "text-emerald-600"
      : tone === "expense"
        ? "text-rose-500"
        : tone === "balance"
          ? "text-white"
          : "text-ink";

  return (
    <div className={`card relative overflow-hidden ${toneStyles}`}>
      <div className="absolute -right-10 -top-10 h-24 w-24 rounded-full bg-white/20" />
      <div className="absolute right-6 top-12 h-16 w-16 rounded-full bg-white/10" />
      <p className={`text-xs uppercase tracking-wide ${tone === "balance" ? "text-white/70" : "text-slate-400"}`}>{title}</p>
      <p className={`mt-2 text-xl font-semibold sm:text-2xl ${valueStyles}`}>{value}</p>
      {hint ? <div className={`mt-2 text-xs ${tone === "balance" ? "text-white/70" : "text-slate-500"}`}>{hint}</div> : null}
    </div>
  );
}
