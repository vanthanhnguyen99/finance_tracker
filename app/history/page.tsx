import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { Currency, TransactionType } from "@prisma/client";
import { HistoryList, type HistoryItem } from "../components/HistoryList";
import { requireActivePageSession } from "@/lib/server-auth";
import { LogoutButton } from "../components/LogoutButton";

export default async function History({
  searchParams
}: {
  searchParams: Promise<{ type?: string; currency?: string; start?: string; end?: string }>;
}) {
  const user = await requireActivePageSession();
  const { type, currency, start, end } = await searchParams;
  const startDate = start ? new Date(start) : undefined;
  const endDate = end ? new Date(`${end}T23:59:59.999`) : undefined;
  const hasInvalidDate =
    (startDate && Number.isNaN(startDate.getTime())) ||
    (endDate && Number.isNaN(endDate.getTime()));
  const createdAt = !hasInvalidDate && (startDate || endDate)
    ? { gte: startDate, lte: endDate }
    : undefined;
  const normalizedType =
    type?.toLowerCase() === "income"
      ? TransactionType.INCOME
      : type?.toLowerCase() === "expense"
        ? TransactionType.EXPENSE
        : undefined;
  const normalizedCurrency =
    currency?.toUpperCase() === "DKK"
      ? Currency.DKK
      : currency?.toUpperCase() === "VND"
        ? Currency.VND
        : undefined;

  const transactionsPromise = prisma.transaction.findMany({
    where: {
      userId: user.id,
      ...(normalizedType ? { type: normalizedType } : {}),
      ...(normalizedCurrency ? { currency: normalizedCurrency } : {}),
      ...(createdAt ? { createdAt } : {})
    },
    orderBy: { createdAt: "desc" }
  });

  const exchangesPromise = prisma.exchange.findMany({
    where: {
      userId: user.id,
      ...(createdAt ? { createdAt } : {})
    },
    orderBy: { createdAt: "desc" }
  });

  const [transactions, exchanges] = await Promise.all([transactionsPromise, exchangesPromise]);

  const exchangeItems = (type && type !== "exchange") ? [] : exchanges
    .filter((exchange) => {
      if (!currency) return true;
      const curr = currency.toUpperCase();
      return curr === "DKK" || curr === "VND";
    })
    .map((exchange) => ({
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
    }));

  const transactionItems = transactions
    .filter(() => !(type?.toLowerCase() === "exchange"))
    .map((txn) => ({
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
      currency: txn.currency,
      amountMajor: txn.currency === "DKK" ? txn.amount / 100 : txn.amount
    }));

  const items = [...exchangeItems, ...transactionItems].sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  }) as HistoryItem[];
  const csvParams = new URLSearchParams();
  if (type) csvParams.set("type", type);
  if (currency) csvParams.set("currency", currency);
  if (start) csvParams.set("start", start);
  if (end) csvParams.set("end", end);
  const csvHref = `/api/export/csv${csvParams.toString() ? `?${csvParams.toString()}` : ""}`;

  return (
    <main className="container-page">
      <div className="hero-bar">
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-400">Danh sách</p>
          <h1 className="text-lg font-semibold text-ink">Lịch sử giao dịch</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="chip">Bộ lọc</span>
          <LogoutButton />
        </div>
      </div>

      <form className="mt-6 grid gap-3 card">
        <select className="select" name="type" defaultValue={type ?? ""}>
          <option value="">Tất cả loại</option>
          <option value="income">Thu nhập</option>
          <option value="expense">Chi tiêu</option>
          <option value="exchange">Đổi tiền</option>
        </select>
        <select className="select" name="currency" defaultValue={currency ?? ""}>
          <option value="">Tất cả tiền tệ</option>
          <option value="DKK">DKK</option>
          <option value="VND">VND</option>
        </select>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="grid gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Từ ngày
            <input className="input" type="date" name="start" defaultValue={start ?? ""} />
          </label>
          <label className="grid gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Đến ngày
            <input className="input" type="date" name="end" defaultValue={end ?? ""} />
          </label>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button className="button" type="submit">Áp dụng bộ lọc</button>
          <a className="button text-center" href={csvHref}>
            Xuất CSV
          </a>
        </div>
      </form>

      <HistoryList items={items} />
    </main>
  );
}
