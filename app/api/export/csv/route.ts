import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getApiSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

function escapeCsv(value: string | number | null | undefined) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (!/[",\n]/.test(text)) return text;
  return `"${text.replaceAll('"', '""')}"`;
}

function parseDateStart(value: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return undefined;
  return date;
}

function parseDateEnd(value: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T23:59:59.999`);
  if (Number.isNaN(date.getTime())) return undefined;
  return date;
}

export async function GET(req: NextRequest) {
  const user = await getApiSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const currency = searchParams.get("currency");
  const startDate = parseDateStart(searchParams.get("start"));
  const endDate = parseDateEnd(searchParams.get("end"));
  const createdAt =
    startDate || endDate
      ? {
          gte: startDate,
          lte: endDate
        }
      : undefined;

  const normalizedType =
    type?.toLowerCase() === "income"
      ? "INCOME"
      : type?.toLowerCase() === "expense"
        ? "EXPENSE"
        : type?.toLowerCase() === "exchange"
          ? "EXCHANGE"
          : undefined;
  const normalizedCurrency =
    currency?.toUpperCase() === "DKK"
      ? "DKK"
      : currency?.toUpperCase() === "VND"
        ? "VND"
        : undefined;

  const includeTransactions = !normalizedType || normalizedType === "INCOME" || normalizedType === "EXPENSE";
  const includeExchanges = !normalizedType || normalizedType === "EXCHANGE";

  const [transactions, exchanges] = await Promise.all([
    includeTransactions
      ? prisma.transaction.findMany({
          where: {
            userId: user.id,
            ...(normalizedType ? { type: normalizedType } : {}),
            ...(normalizedCurrency ? { currency: normalizedCurrency } : {}),
            ...(createdAt ? { createdAt } : {})
          },
          orderBy: { createdAt: "desc" }
        })
      : Promise.resolve([]),
    includeExchanges
      ? prisma.exchange.findMany({
          where: {
            userId: user.id,
            ...(createdAt ? { createdAt } : {})
          },
          orderBy: { createdAt: "desc" }
        })
      : Promise.resolve([])
  ]);

  const rows: string[] = [];
  rows.push(
    [
      "createdAt",
      "type",
      "currency",
      "amount",
      "category",
      "note",
      "detail",
      "provider",
      "fee"
    ].join(",")
  );

  const records = [
    ...transactions.map((txn) => ({ kind: "transaction" as const, createdAt: txn.createdAt, txn })),
    ...exchanges.map((exchange) => ({ kind: "exchange" as const, createdAt: exchange.createdAt, exchange }))
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  for (const record of records) {
    if (record.kind === "transaction") {
      const { txn } = record;
      const amount = txn.currency === "DKK" ? txn.amount / 100 : txn.amount;
      rows.push(
        [
          escapeCsv(txn.createdAt.toISOString()),
          escapeCsv(txn.type),
          escapeCsv(txn.currency),
          escapeCsv(amount),
          escapeCsv(txn.category),
          escapeCsv(txn.note),
          "",
          "",
          ""
        ].join(",")
      );
      continue;
    }

    const { exchange } = record;
    const feeValue =
      exchange.feeAmount && exchange.feeCurrency
        ? `${exchange.feeCurrency === "DKK" ? exchange.feeAmount / 100 : exchange.feeAmount} ${exchange.feeCurrency}`
        : "";
    rows.push(
      [
        escapeCsv(exchange.createdAt.toISOString()),
        "EXCHANGE",
        "DKK->VND",
        escapeCsv(exchange.fromAmountDkk / 100),
        "",
        "",
        escapeCsv(`${exchange.fromAmountDkk / 100} DKK -> ${exchange.toAmountVnd} VND`),
        escapeCsv(exchange.provider),
        escapeCsv(feeValue)
      ].join(",")
    );
  }

  const header = new Headers();
  header.set("Content-Type", "text/csv; charset=utf-8");
  header.set(
    "Content-Disposition",
    `attachment; filename="finance-export-${new Date().toISOString().slice(0, 10)}.csv"`
  );
  return new NextResponse(rows.join("\n"), { headers: header });
}
