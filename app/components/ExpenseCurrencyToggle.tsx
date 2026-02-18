"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function ExpenseCurrencyToggle({ active }: { active: "DKK" | "VND" }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setCurrency(currency: "DKK" | "VND") {
    const params = new URLSearchParams(searchParams.toString());
    params.set("expenseCurrency", currency);
    router.push(`/?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="flex items-center gap-2">
      {(["DKK", "VND"] as const).map((currency) => (
        <button
          key={currency}
          type="button"
          onClick={() => setCurrency(currency)}
          className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-wide ${
            active === currency
              ? "border-transparent bg-ink text-white"
              : "border-slate-200 text-slate-500"
          }`}
        >
          {currency}
        </button>
      ))}
    </div>
  );
}
