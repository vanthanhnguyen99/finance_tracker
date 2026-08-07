import { prisma } from "@/lib/db";
import Link from "next/link";
import { formatMoney } from "@/lib/money";
import { Currency, TransactionType } from "@prisma/client";
import { HistoryList, type HistoryItem } from "../components/HistoryList";
import { requireActivePageSession } from "@/lib/server-auth";
import { cookies } from "next/headers";
import { parseDateInputInTimeZone, resolveTimeZone, TIMEZONE_COOKIE_NAME } from "@/lib/timezone";
import { ProfileMenu } from "../components/ProfileMenu";

export const dynamic = "force-dynamic";

export default async function History({
  searchParams
}: {
  searchParams: Promise<{ type?: string; currency?: string; start?: string; end?: string }>;
}) {
  const user = await requireActivePageSession();
  const cookieStore = await cookies();
  const userTimeZone = resolveTimeZone(cookieStore.get(TIMEZONE_COOKIE_NAME)?.value);
  const { type, currency, start, end } = await searchParams;
  const rawType = type?.trim().toLowerCase() ?? "";
  const selectedType =
    rawType === "income" || rawType === "expense" || rawType === "exchange"
      ? rawType
      : "";
  const rawCurrency = currency?.trim().toUpperCase() ?? "";
  const selectedCurrency = rawCurrency === "DKK" || rawCurrency === "VND" ? rawCurrency : "";
  const startDate = start ? parseDateInputInTimeZone(start, userTimeZone, false) ?? undefined : undefined;
  const endDate = end ? parseDateInputInTimeZone(end, userTimeZone, true) ?? undefined : undefined;
  const hasInvalidDate =
    Boolean(start && !startDate) ||
    Boolean(end && !endDate) ||
    Boolean(startDate && endDate && startDate > endDate);
  const createdAt = !hasInvalidDate && (startDate || endDate)
    ? { gte: startDate, lte: endDate }
    : undefined;
  const normalizedType =
    selectedType === "income"
      ? TransactionType.INCOME
      : selectedType === "expense"
        ? TransactionType.EXPENSE
        : undefined;
  const normalizedCurrency =
    selectedCurrency === "DKK"
      ? Currency.DKK
      : selectedCurrency === "VND"
        ? Currency.VND
        : undefined;
  const includeTransactions = selectedType !== "exchange";
  const includeExchanges = selectedType === "" || selectedType === "exchange";
  const filterKey = [selectedType || "all", selectedCurrency || "all", start ?? "", end ?? ""].join(":");

  const [transactionsResult, exchangesResult] = await Promise.all([
    includeTransactions && !hasInvalidDate
      ? prisma.transaction.findMany({
          where: {
            userId: user.id,
            type: normalizedType ?? { in: [TransactionType.INCOME, TransactionType.EXPENSE] },
            ...(normalizedCurrency ? { currency: normalizedCurrency } : {}),
            ...(createdAt ? { createdAt } : {})
          },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            type: true,
            createdAt: true,
            amount: true,
            currency: true,
            category: true,
            note: true,
            paymentMethod: true
          }
        })
      : Promise.resolve(null),
    includeExchanges && !hasInvalidDate
      ? prisma.exchange.findMany({
          where: {
            userId: user.id,
            ...(createdAt ? { createdAt } : {})
          },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            createdAt: true,
            provider: true,
            feeAmount: true,
            feeCurrency: true,
            fromAmountDkk: true,
            toAmountVnd: true
          }
        })
      : Promise.resolve(null)
  ]);

  const transactions = transactionsResult ?? [];
  const exchanges = exchangesResult ?? [];

  const exchangeItems = includeExchanges
    ? exchanges.map((exchange) => ({
        id: exchange.id,
        type: "EXCHANGE",
        createdAt: exchange.createdAt.toISOString(),
        description: `Đổi DKK → VND`,
        detail: `${formatMoney(exchange.fromAmountDkk, "DKK")} → ${formatMoney(exchange.toAmountVnd, "VND")}`,
        provider: exchange.provider,
        fee: exchange.feeAmount && exchange.feeCurrency
          ? formatMoney(exchange.feeAmount, exchange.feeCurrency)
          : null,
        fromAmountDkk: exchange.fromAmountDkk / 100,
        toAmountVnd: exchange.toAmountVnd,
        feeAmountDkk: exchange.feeCurrency === "DKK" && exchange.feeAmount ? exchange.feeAmount / 100 : 0
      }))
    : [];

  const transactionItems = transactions.map((txn) => ({
    id: txn.id,
    type: txn.type,
    createdAt: txn.createdAt.toISOString(),
    description:
      txn.type === "INCOME"
        ? `Thu nhập (${txn.currency})`
        : txn.type === "EXPENSE"
          ? `Chi tiêu (${txn.currency})`
          : `Giao dịch (${txn.currency})`,
    detail: formatMoney(txn.amount, txn.currency),
    note: txn.note,
    category: txn.category,
    paymentMethod: txn.paymentMethod,
    currency: txn.currency,
    amountMajor: txn.currency === "DKK" ? txn.amount / 100 : txn.amount
  }));

  const items = [...exchangeItems, ...transactionItems].sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  }) as HistoryItem[];

  return (
    <main className="container-page app-enter">
      <div className="hero-bar">
        <div className="flex min-w-0 items-center gap-3">
          <img src="/logo.svg" alt="" className="h-9 w-9 shrink-0" />
          <h1 className="truncate text-xl font-semibold text-ink">Giao dịch</h1>
        </div>
        <ProfileMenu
          name={user.displayName}
          email={user.email}
          primaryCurrency={user.primaryCurrency}
        />
      </div>

      <form key={filterKey} className="card mt-6 grid gap-4" aria-label="Bộ lọc giao dịch">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-ink">Bộ lọc</h2>
            <p className="mt-1 text-sm text-slate-500">Thu hẹp danh sách theo loại, tiền tệ hoặc ngày.</p>
          </div>
          <span className="chip">{items.length} mục</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="form-label">
            Loại giao dịch
            <select className="select" name="type" defaultValue={selectedType}>
              <option value="">Tất cả loại</option>
              <option value="income">Thu nhập</option>
              <option value="expense">Chi tiêu</option>
              <option value="exchange">Đổi tiền</option>
            </select>
          </label>
          <label className="form-label">
            Tiền tệ
            <select className="select" name="currency" defaultValue={selectedCurrency}>
              <option value="">Tất cả tiền tệ</option>
              <option value="DKK">DKK</option>
              <option value="VND">VND</option>
            </select>
          </label>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="form-label">
            Từ ngày
            <input
              className="input"
              type="date"
              name="start"
              defaultValue={start ?? ""}
              style={{
                display: "block",
                boxSizing: "border-box",
                inlineSize: "100%",
                minInlineSize: 0,
                maxInlineSize: "100%",
                WebkitAppearance: "none",
                appearance: "none"
              }}
            />
          </label>
          <label className="form-label">
            Đến ngày
            <input
              className="input"
              type="date"
              name="end"
              defaultValue={end ?? ""}
              style={{
                display: "block",
                boxSizing: "border-box",
                inlineSize: "100%",
                minInlineSize: 0,
                maxInlineSize: "100%",
                WebkitAppearance: "none",
                appearance: "none"
              }}
            />
          </label>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <button className="button" type="submit">Áp dụng bộ lọc</button>
          <Link href="/history" className="button button-secondary">
            Đặt lại
          </Link>
        </div>
        {hasInvalidDate ? (
          <p className="text-sm font-medium text-danger-dark" role="alert">
            Khoảng ngày không hợp lệ. Vui lòng kiểm tra lại ngày bắt đầu và ngày kết thúc.
          </p>
        ) : null}
      </form>

      <HistoryList items={items} />
    </main>
  );
}
