import type { PaymentMethod, Prisma } from "@prisma/client";

const CREDIT_CARD_REPAYMENT_CATEGORY = "tin dung";

// Explicit NULL branches avoid SQL three-valued logic dropping uncategorized
// expenses and treat legacy NULL payment methods as cash.
export const nonRepaymentExpenseFilter: Prisma.TransactionWhereInput = {
  OR: [
    { category: null },
    { NOT: { OR: [
      { category: { equals: "Tín dụng", mode: "insensitive" } },
      { category: { equals: "Tin dung", mode: "insensitive" } }
    ] } },
    { paymentMethod: "CREDIT_CARD" }
  ]
};

function normalizeCategory(value: string | null | undefined) {
  if (!value) return "";
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function normalizePaymentMethod(value: unknown): PaymentMethod | undefined {
  return value === "CASH" || value === "CREDIT_CARD" ? value : undefined;
}

export function expenseAffectsWallet(paymentMethod: PaymentMethod | null | undefined) {
  return paymentMethod !== "CREDIT_CARD";
}

export function isCreditCardRepayment(
  category: string | null | undefined,
  paymentMethod: PaymentMethod | null | undefined
) {
  return expenseAffectsWallet(paymentMethod) && normalizeCategory(category) === CREDIT_CARD_REPAYMENT_CATEGORY;
}
