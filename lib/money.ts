export const MINOR_PER_MAJOR = {
  DKK: 100,
  VND: 1
} as const;

export function formatMoney(amountMinor: number, currency: "DKK" | "VND") {
  const divisor = MINOR_PER_MAJOR[currency];
  const value = amountMinor / divisor;
  if (currency === "DKK") {
    return new Intl.NumberFormat("da-DK", {
      style: "currency",
      currency: "DKK"
    }).format(value);
  }
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0
  }).format(value);
}

export function parseAmount(input: string) {
  const normalized = normalizeAmountForApi(input);
  return Number(normalized || "0");
}

export function toMinor(amountMajor: number, currency: "DKK" | "VND") {
  const divisor = MINOR_PER_MAJOR[currency];
  return Math.round(amountMajor * divisor);
}

export function normalizeAmountForApi(input: string) {
  const cleaned = input.trim().replace(/\s+/g, "").replace(/\./g, "");
  if (!cleaned) return "";
  const [intPart, ...decParts] = cleaned.split(",");
  if (decParts.length === 0) return intPart;
  return `${intPart || "0"}.${decParts.join("")}`;
}

export function formatAmountForInput(input: string) {
  const cleaned = input.replace(/[^\d.,]/g, "");
  if (!cleaned) return "";

  const commaIndex = cleaned.indexOf(",");
  const hasDecimal = commaIndex !== -1;
  const rawIntPart = (hasDecimal ? cleaned.slice(0, commaIndex) : cleaned).replace(/[.,]/g, "");
  const intPart = rawIntPart.replace(/^0+(?=\d)/, "");
  const groupedInt = (intPart || "0").replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  if (!hasDecimal) return groupedInt;

  const rawDecimalPart = cleaned.slice(commaIndex + 1).replace(/[.,]/g, "");
  if (cleaned.endsWith(",")) return `${groupedInt},`;
  return rawDecimalPart ? `${groupedInt},${rawDecimalPart}` : groupedInt;
}
