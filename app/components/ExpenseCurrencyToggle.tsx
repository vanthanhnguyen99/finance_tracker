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
    <div className="inline-flex rounded-lg bg-slate-100 p-1" aria-label="Đơn vị hiển thị chi tiêu">
      {(["DKK", "VND"] as const).map((currency) => (
        <button
          key={currency}
          type="button"
          onClick={() => setCurrency(currency)}
          className={`min-h-8 rounded-md px-3 text-xs font-semibold uppercase transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 ${
            active === currency
              ? "bg-white text-primary-700 shadow-soft"
              : "text-slate-500"
          }`}
          aria-pressed={active === currency}
        >
          {currency}
        </button>
      ))}
    </div>
  );
}
