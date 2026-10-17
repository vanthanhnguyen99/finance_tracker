import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { formatMoney } from "./money";
import {
  FinanceInputError,
  parseCurrency,
  parseMinorAmount,
  type FinanceCurrency,
} from "./finance-validation";
import { parseDateInputInTimeZone } from "./timezone";
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from "./categories";
import type { HistoryItem } from "@/app/components/HistoryList";

export const HISTORY_PAGE_SIZE = 30;
export type HistoryFilters = {
  q?: string;
  type?: string;
  currency?: FinanceCurrency;
  start?: Date;
  end?: Date;
  category?: string;
  uncategorized?: boolean;
  paymentMethod?: string;
  minAmount?: number;
  maxAmount?: number;
  expenseScope?: string;
};
type Cursor = { createdAt: string; source: string; id: string };
export type HistoryRow = {
  id: string;
  source: string;
  createdAt: Date;
  type: "INCOME" | "EXPENSE" | "EXCHANGE";
  currency: FinanceCurrency | null;
  amount: number | null;
  category: string | null;
  note: string | null;
  paymentMethod: "CASH" | "CREDIT_CARD" | null;
  provider: string | null;
  fromAmountDkk: number | null;
  toAmountVnd: number | null;
  feeAmount: number | null;
  feeCurrency: FinanceCurrency | null;
};
export type HistorySummary = Record<
  FinanceCurrency,
  {
    income: number;
    expense: number;
    exchangeOut: number;
    exchangeIn: number;
    exchangeFees: number;
  }
>;
export type HistoryResult = {
  items: HistoryItem[];
  totalCount: number;
  summaryByCurrency: HistorySummary;
  nextCursor: string | null;
};

export function parseHistoryFilters(
  params: URLSearchParams,
  timeZone: string,
): HistoryFilters {
  const result: HistoryFilters = {};
  const q = params.get("q")?.trim();
  if (q && q.length > 200)
    throw new FinanceInputError("Từ khóa có tối đa 200 ký tự.");
  if (q) result.q = q;
  const type = params.get("type")?.toLowerCase();
  if (type) {
    if (!["income", "expense", "exchange"].includes(type))
      throw new FinanceInputError("Loại giao dịch không hợp lệ.");
    result.type = type;
  }
  const currency = params.get("currency");
  if (currency) result.currency = parseCurrency(currency);
  for (const key of ["start", "end"] as const) {
    const raw = params.get(key);
    if (raw) {
      const date = /^\d{4}-\d{2}-\d{2}$/.test(raw)
        ? parseDateInputInTimeZone(raw, timeZone, key === "end")
        : null;
      if (!date) throw new FinanceInputError("Khoảng ngày không hợp lệ.");
      result[key] = date;
    }
  }
  if (result.start && result.end && result.start > result.end)
    throw new FinanceInputError("Ngày bắt đầu phải trước ngày kết thúc.");
  const category = params.get("category");
  if (category) {
    if (!category.trim() || category.length > 200)
      throw new FinanceInputError("Danh mục không hợp lệ.");
    result.category = category;
  }
  const uncategorized = params.get("uncategorized");
  if (uncategorized && uncategorized !== "1")
    throw new FinanceInputError("Bộ lọc danh mục không hợp lệ.");
  if (uncategorized) result.uncategorized = true;
  if (result.category && result.uncategorized)
    throw new FinanceInputError("Chỉ chọn một danh mục.");
  const paymentMethod = params.get("paymentMethod");
  if (paymentMethod) {
    if (!["CASH", "CREDIT_CARD"].includes(paymentMethod))
      throw new FinanceInputError("Phương thức thanh toán không hợp lệ.");
    result.paymentMethod = paymentMethod;
  }
  for (const key of ["minAmount", "maxAmount"] as const) {
    const value = params.get(key);
    if (value) {
      if (!result.currency)
        throw new FinanceInputError("Chọn tiền tệ trước khi lọc số tiền.");
      result[key] = parseMinorAmount(value, result.currency, true);
    }
  }
  if (
    result.minAmount !== undefined &&
    result.maxAmount !== undefined &&
    result.minAmount > result.maxAmount
  ) {
    throw new FinanceInputError(
      "Số tiền tối thiểu phải nhỏ hơn hoặc bằng tối đa.",
    );
  }
  const expenseScope = params.get("expenseScope");
  if (expenseScope) {
    if (expenseScope !== "budget")
      throw new FinanceInputError("Phạm vi chi tiêu không hợp lệ.");
    result.expenseScope = expenseScope;
  }
  return result;
}

// One rule for budgets and their history/CSV drill-down, including legacy NULL methods.
export const budgetExpenseCondition = Prisma.sql`"type" = 'EXPENSE' AND (
  coalesce("paymentMethod"::text, 'CASH') = 'CREDIT_CARD' OR
  lower(unaccent(regexp_replace(coalesce("category", ''), '^[[:space:]]+|[[:space:]]+$', '', 'g'))) <> 'tin dung'
)`;
const isUncategorized = Prisma.sql`coalesce("category", '') ~ '^[[:space:]]*$'`;

export function historyCte(userId: string, f: HistoryFilters) {
  const transactionConditions: Prisma.Sql[] = [
    Prisma.sql`"userId" = ${userId}`,
    Prisma.sql`"type" IN ('INCOME', 'EXPENSE')`,
  ];
  const exchangeConditions: Prisma.Sql[] = [Prisma.sql`"userId" = ${userId}`];
  if (f.type === "exchange") transactionConditions.push(Prisma.sql`false`);
  else if (f.type) {
    transactionConditions.push(
      Prisma.sql`"type"::text = ${f.type.toUpperCase()}`,
    );
    exchangeConditions.push(Prisma.sql`false`);
  }
  if (f.currency)
    transactionConditions.push(Prisma.sql`"currency"::text = ${f.currency}`);
  for (const [column, date] of [
    ["start", f.start],
    ["end", f.end],
  ] as const) {
    if (date) {
      const condition =
        column === "start"
          ? Prisma.sql`"createdAt" >= ${date}`
          : Prisma.sql`"createdAt" <= ${date}`;
      transactionConditions.push(condition);
      exchangeConditions.push(condition);
    }
  }
  if (f.q) {
    const pattern = `%${f.q.replace(/[\\%_]/g, "\\$&")}%`;
    transactionConditions.push(
      Prisma.sql`(unaccent(coalesce("note", '')) ILIKE unaccent(${pattern}) ESCAPE chr(92) OR unaccent(coalesce("category", '')) ILIKE unaccent(${pattern}) ESCAPE chr(92))`,
    );
    exchangeConditions.push(
      Prisma.sql`unaccent(coalesce("provider", '')) ILIKE unaccent(${pattern}) ESCAPE chr(92)`,
    );
  }
  if (f.category || f.uncategorized) {
    transactionConditions.push(
      f.uncategorized
        ? isUncategorized
        : Prisma.sql`"category" = ${f.category!}`,
    );
    exchangeConditions.push(Prisma.sql`false`);
  }
  if (f.paymentMethod) {
    transactionConditions.push(
      Prisma.sql`"type" = 'EXPENSE' AND coalesce("paymentMethod"::text, 'CASH') = ${f.paymentMethod}`,
    );
    exchangeConditions.push(Prisma.sql`false`);
  }
  if (f.expenseScope === "budget") {
    transactionConditions.push(budgetExpenseCondition);
    exchangeConditions.push(Prisma.sql`false`);
  }
  const exchangeAmount =
    f.currency === "VND"
      ? Prisma.sql`"toAmountVnd"`
      : Prisma.sql`"fromAmountDkk"`;
  if (f.minAmount !== undefined) {
    transactionConditions.push(Prisma.sql`"amount" >= ${f.minAmount}`);
    exchangeConditions.push(Prisma.sql`${exchangeAmount} >= ${f.minAmount}`);
  }
  if (f.maxAmount !== undefined) {
    transactionConditions.push(Prisma.sql`"amount" <= ${f.maxAmount}`);
    exchangeConditions.push(Prisma.sql`${exchangeAmount} <= ${f.maxAmount}`);
  }
  return Prisma.sql`WITH filtered AS (
    SELECT "id", 'transaction'::text AS source, "createdAt", "type"::text, "currency"::text, "amount", "category", "note", "paymentMethod"::text,
      NULL::text AS provider, NULL::integer AS "fromAmountDkk", NULL::integer AS "toAmountVnd", NULL::integer AS "feeAmount", NULL::text AS "feeCurrency"
    FROM "Transaction" WHERE ${Prisma.join(transactionConditions, " AND ")}
    UNION ALL
    SELECT "id", 'exchange'::text, "createdAt", 'EXCHANGE'::text, NULL::text, NULL::integer, NULL::text, NULL::text, NULL::text,
      "provider", "fromAmountDkk", "toAmountVnd", "feeAmount", "feeCurrency"::text
    FROM "Exchange" WHERE ${Prisma.join(exchangeConditions, " AND ")}
  )`;
}

function decodeCursor(value: string | null): Cursor | null {
  if (!value) return null;
  try {
    if (value.length > 1000) throw new Error();
    const c = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    if (
      typeof c.createdAt !== "string" ||
      !Number.isFinite(Date.parse(c.createdAt)) ||
      !["transaction", "exchange"].includes(c.source) ||
      typeof c.id !== "string" ||
      !c.id ||
      c.id.length > 200
    )
      throw new Error();
    return c;
  } catch {
    throw new FinanceInputError(
      "Vị trí tải tiếp không hợp lệ. Vui lòng tìm lại.",
    );
  }
}
function rowToItem(row: HistoryRow): HistoryItem {
  if (row.type === "EXCHANGE")
    return {
      id: row.id,
      type: "EXCHANGE",
      createdAt: row.createdAt.toISOString(),
      description: "Đổi DKK → VND",
      detail: `${formatMoney(row.fromAmountDkk!, "DKK")} → ${formatMoney(row.toAmountVnd!, "VND")}`,
      provider: row.provider,
      fee: row.feeAmount
        ? formatMoney(row.feeAmount, row.feeCurrency ?? "DKK")
        : null,
      fromAmountDkk: row.fromAmountDkk! / 100,
      toAmountVnd: row.toAmountVnd!,
      feeAmount: (row.feeAmount ?? 0) / (row.feeCurrency === "VND" ? 1 : 100),
      feeCurrency: row.feeCurrency,
    };
  return {
    id: row.id,
    type: row.type,
    createdAt: row.createdAt.toISOString(),
    description:
      row.type === "INCOME"
        ? `Thu nhập (${row.currency})`
        : `Chi tiêu (${row.currency})`,
    detail: formatMoney(row.amount!, row.currency!),
    currency: row.currency!,
    amountMajor: row.amount! / (row.currency === "DKK" ? 100 : 1),
    category: row.category,
    note: row.note,
    paymentMethod: row.paymentMethod,
  };
}
export async function getHistory(
  userId: string,
  filters: HistoryFilters,
  cursorValue: string | null = null,
): Promise<HistoryResult> {
  const cursor = decodeCursor(cursorValue);
  const cte = historyCte(userId, filters);
  const after = cursor
    ? Prisma.sql`WHERE ("createdAt", source, id) < (${new Date(cursor.createdAt)}, ${cursor.source}, ${cursor.id})`
    : Prisma.empty;
  return prisma.$transaction(
    async (tx) => {
      const rows = await tx.$queryRaw<HistoryRow[]>(
        Prisma.sql`${cte} SELECT * FROM filtered ${after} ORDER BY "createdAt" DESC, source DESC, id DESC LIMIT ${HISTORY_PAGE_SIZE + 1}`,
      );
      const [summary] = await tx.$queryRaw<
        Record<string, bigint | null>[]
      >(Prisma.sql`${cte} SELECT count(*) AS count,
      sum(amount) FILTER (WHERE type = 'INCOME' AND currency = 'DKK') AS "incomeDKK",
      sum(amount) FILTER (WHERE type = 'INCOME' AND currency = 'VND') AS "incomeVND",
      sum(amount) FILTER (WHERE type = 'EXPENSE' AND currency = 'DKK') AS "expenseDKK",
      sum(amount) FILTER (WHERE type = 'EXPENSE' AND currency = 'VND') AS "expenseVND",
      sum("fromAmountDkk") AS "exchangeOut", sum("toAmountVnd") AS "exchangeIn",
      sum("feeAmount") FILTER (WHERE coalesce("feeCurrency", 'DKK') = 'DKK') AS "feesDKK",
      sum("feeAmount") FILTER (WHERE "feeCurrency" = 'VND') AS "feesVND" FROM filtered`);
      const page = rows.slice(0, HISTORY_PAGE_SIZE);
      const last = page[page.length - 1];
      const nextCursor =
        rows.length > HISTORY_PAGE_SIZE && last
          ? Buffer.from(
              JSON.stringify({
                createdAt: last.createdAt.toISOString(),
                source: last.source,
                id: last.id,
              }),
            ).toString("base64url")
          : null;
      return {
        items: page.map(rowToItem),
        totalCount: Number(summary.count),
        nextCursor,
        summaryByCurrency: {
          DKK: {
            income: Number(summary.incomeDKK ?? 0),
            expense: Number(summary.expenseDKK ?? 0),
            exchangeOut: Number(summary.exchangeOut ?? 0),
            exchangeIn: 0,
            exchangeFees: Number(summary.feesDKK ?? 0),
          },
          VND: {
            income: Number(summary.incomeVND ?? 0),
            expense: Number(summary.expenseVND ?? 0),
            exchangeOut: 0,
            exchangeIn: Number(summary.exchangeIn ?? 0),
            exchangeFees: Number(summary.feesVND ?? 0),
          },
        },
      };
    },
    { isolationLevel: "RepeatableRead" },
  );
}
export async function getHistoryRows(userId: string, filters: HistoryFilters) {
  return prisma.$queryRaw<HistoryRow[]>(
    Prisma.sql`${historyCte(userId, filters)} SELECT * FROM filtered ORDER BY "createdAt" DESC, source DESC, id DESC LIMIT 10001`,
  );
}
export async function getUserCategories(userId: string) {
  const rows = await prisma.$queryRaw<{ category: string }[]>(Prisma.sql`
    SELECT DISTINCT "category" FROM "Transaction"
    WHERE "userId" = ${userId} AND "category" IS NOT NULL
      AND "category" !~ '^[[:space:]]*$'`);
  return [
    ...new Set([
      ...INCOME_CATEGORIES,
      ...EXPENSE_CATEGORIES,
      ...rows.flatMap((r) => (r.category?.trim() ? [r.category] : [])),
    ]),
  ].sort((a, b) => a.localeCompare(b, "vi"));
}
