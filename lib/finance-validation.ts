import { isValidMinorAmount } from "./money";

export class FinanceInputError extends Error {}
export type FinanceCurrency = "DKK" | "VND";

export function parseCurrency(value: unknown): FinanceCurrency {
  if (value !== "DKK" && value !== "VND")
    throw new FinanceInputError("Tiền tệ phải là DKK hoặc VND.");
  return value;
}

// API/query values use decimal dots; locale-formatted inputs are normalized by the UI.
export function parseMinorAmount(
  value: unknown,
  currency: FinanceCurrency,
  allowZero = false,
) {
  if (
    (typeof value !== "string" && typeof value !== "number") ||
    !/^\d+(?:\.\d{1,2})?$/.test(String(value)) ||
    (currency === "VND" && String(value).includes("."))
  ) {
    throw new FinanceInputError(
      currency === "VND"
        ? "VND phải là số nguyên."
        : "DKK có tối đa hai chữ số thập phân.",
    );
  }
  const amount = Math.round(Number(value) * (currency === "DKK" ? 100 : 1));
  if (!isValidMinorAmount(amount, allowZero))
    throw new FinanceInputError("Số tiền không hợp lệ hoặc vượt giới hạn.");
  return amount;
}
