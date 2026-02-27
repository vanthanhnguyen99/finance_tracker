import type { PaymentMethod } from "@prisma/client";

const CREDIT_CARD_REPAYMENT_CATEGORY = "tin dung";

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
