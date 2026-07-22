import { prisma } from "@/lib/db";
import Link from "next/link";
import { getPreviousRangeFromBounds, getRange, type TimeFilter } from "@/lib/date";
import { getWalletBalances } from "@/lib/wallet";
import { formatMoney } from "@/lib/money";
import { ExpenseCurrencyToggle } from "./components/ExpenseCurrencyToggle";
import { TimeFilterTabs } from "./components/TimeFilterTabs";
import { unstable_noStore as noStore } from "next/cache";
import { requireActivePageSession } from "@/lib/server-auth";
import { cookies } from "next/headers";
import { isCreditCardRepayment } from "@/lib/credit";
import {
  ChartIcon,
  ChevronRightIcon,
  ExchangeIcon,
  ExpenseIcon,
  IncomeIcon,
  PlusIcon,
  WalletIcon
} from "./components/AppIcons";
import { ProfileMenu } from "./components/ProfileMenu";
import {
  getDateInTimeZone,
  parseDateInputInTimeZone,
  resolveTimeZone,
  TIMEZONE_COOKIE_NAME,
  zonedDateTimeToUtc
} from "@/lib/timezone";

export const dynamic = "force-dynamic";

const filters: { key: TimeFilter; label: string }[] = [
  { key: "today", label: "Hôm nay" },
  { key: "week", label: "Tuần này" },
  { key: "month", label: "Tháng này" },
  { key: "last7", label: "7 ngày" },
  { key: "last30", label: "30 ngày" }
];

export default async function Dashboard({
  searchParams
}: {
  searchParams: Promise<{
    filter?: TimeFilter;
    expenseCurrency?: "DKK" | "VND";
    from?: string;
    to?: string;
  }>;
}) {
  noStore();
  const user = await requireActivePageSession();
  const cookieStore = await cookies();
  const userTimeZone = resolveTimeZone(cookieStore.get(TIMEZONE_COOKIE_NAME)?.value);
  const resolvedSearchParams = await searchParams;
  const filterParam = resolvedSearchParams.filter;
  const filter: TimeFilter =
    filterParam === "today" ||
    filterParam === "week" ||
    filterParam === "month" ||
    filterParam === "last7" ||
    filterParam === "last30"
      ? filterParam
      : "month";
  const expenseCurrency = resolvedSearchParams.expenseCurrency ?? "DKK";

  const parsedFrom = parseDateInputInTimeZone(resolvedSearchParams.from, userTimeZone, false);
  const parsedTo = parseDateInputInTimeZone(resolvedSearchParams.to, userTimeZone, true);
  const hasCustomRange = Boolean(parsedFrom && parsedTo && parsedFrom <= parsedTo);
  const presetRange = getRange(filter, userTimeZone);
  const start = hasCustomRange ? parsedFrom! : presetRange.start;
  const end = hasCustomRange ? parsedTo! : presetRange.end;
  const previousRange = getPreviousRangeFromBounds(start, end);
  const previousRange2 = getPreviousRangeFromBounds(previousRange.start, previousRange.end);
  const presetTrendPeriods = !hasCustomRange
    ? (() => {
        if (filter === "month") {
          const localStart = getDateInTimeZone(presetRange.start, userTimeZone);
          return Array.from({ length: 3 }).map((_, index) => {
            const monthOffset = 2 - index;
            const baseMonthIndex = localStart.month - 1 - monthOffset;
            const monthStartYear = localStart.year + Math.floor(baseMonthIndex / 12);
            const monthStartMonthIndex = ((baseMonthIndex % 12) + 12) % 12;
            const monthStartMonth = monthStartMonthIndex + 1;
            const daysInMonth = new Date(Date.UTC(monthStartYear, monthStartMonth, 0)).getUTCDate();

            const startOfMonth = zonedDateTimeToUtc(
              monthStartYear,
              monthStartMonth,
              1,
              0,
              0,
              0,
              0,
              userTimeZone
            );
            const endOfMonth = zonedDateTimeToUtc(
              monthStartYear,
              monthStartMonth,
              daysInMonth,
              23,
              59,
              59,
              999,
              userTimeZone
            );
            return { start: startOfMonth, end: endOfMonth };
          });
        }

        const periodDays =
          filter === "today"
            ? 1
            : filter === "week" || filter === "last7"
              ? 7
              : 30;

        return Array.from({ length: 3 }).map((_, index) => {
          const startOfPeriod = new Date(presetRange.start);
          startOfPeriod.setDate(startOfPeriod.getDate() - (2 - index) * periodDays);
          startOfPeriod.setHours(0, 0, 0, 0);
          const endOfPeriod = new Date(startOfPeriod);
          endOfPeriod.setDate(endOfPeriod.getDate() + periodDays - 1);
          endOfPeriod.setHours(23, 59, 59, 999);
          return { start: startOfPeriod, end: endOfPeriod };
        });
      })()
    : null;
  const trendWindowStart = hasCustomRange
    ? start
    : presetTrendPeriods
      ? presetTrendPeriods[0].start
      : previousRange2.start;
  const transactionMetricsStart = new Date(
    Math.min(start.getTime(), previousRange.start.getTime(), trendWindowStart.getTime())
  );
  const exchangeMetricsStart = transactionMetricsStart;
  const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
    timeZone: userTimeZone,
    day: "2-digit",
    month: "2-digit"
  });
  const inputFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: userTimeZone });
  const rangeLabelFormatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: userTimeZone,
    day: "2-digit",
    month: "2-digit"
  });
  const periodLabel = `${dateFormatter.format(start)} - ${dateFormatter.format(end)}`;
  const fromDateInput = inputFormatter.format(start);
  const toDateInput = inputFormatter.format(end);

  const formatDateSlash = (value: Date) => rangeLabelFormatter.format(value);
  const formatDateDash = (value: Date) => formatDateSlash(value).replace("/", "-");
  const formatRangeLabel = (rangeStart: Date, rangeEnd: Date) => {
    const startDay = formatDateSlash(rangeStart);
    const endDay = formatDateSlash(rangeEnd);
    const sameDay = startDay === endDay;
    if (sameDay) return formatDateSlash(rangeStart);
    return `${formatDateDash(rangeStart)}->${formatDateDash(rangeEnd)}`;
  };

  const [trendTransactionsDkk, exchangeDkkEntries, balances, recentTransactions, recentExchanges] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        userId: user.id,
        currency: "DKK",
        createdAt: { gte: transactionMetricsStart, lte: end },
        type: { in: ["INCOME", "EXPENSE"] }
      },
      select: {
        type: true,
        amount: true,
        createdAt: true,
        category: true,
        paymentMethod: true
      }
    }),
    prisma.exchange.findMany({
      where: {
        userId: user.id,
        createdAt: { gte: exchangeMetricsStart, lte: end }
      },
      select: {
        createdAt: true,
        fromAmountDkk: true,
        feeAmount: true,
        feeCurrency: true
      }
    }),
    getWalletBalances(user.id),
    prisma.transaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        type: true,
        amount: true,
        currency: true,
        category: true,
        createdAt: true
      }
    }),
    prisma.exchange.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        fromAmountDkk: true,
        toAmountVnd: true,
        provider: true,
        createdAt: true
      }
    })
  ]);

  const exchangeToDkkExpense = (entry: {
    fromAmountDkk: number;
    feeAmount: number | null;
    feeCurrency: "DKK" | "VND" | null;
  }) => {
    const feeAsDkk = !entry.feeCurrency || entry.feeCurrency === "DKK" ? entry.feeAmount ?? 0 : 0;
    return entry.fromAmountDkk + feeAsDkk;
  };

  const sumExchangeDkkInRange = (rangeStart: Date, rangeEnd: Date) => {
    let sum = 0;
    for (const entry of exchangeDkkEntries) {
      if (entry.createdAt < rangeStart || entry.createdAt > rangeEnd) continue;
      sum += exchangeToDkkExpense(entry);
    }
    return sum;
  };

  const sumDkkTransactionsInRange = (
    rangeStart: Date,
    rangeEnd: Date,
    type: "INCOME" | "EXPENSE"
  ) => {
    let sum = 0;
    for (const entry of trendTransactionsDkk) {
      if (entry.type !== type) continue;
      if (entry.createdAt < rangeStart || entry.createdAt > rangeEnd) continue;
      if (type === "EXPENSE" && isCreditCardRepayment(entry.category, entry.paymentMethod)) {
        continue;
      }
      sum += entry.amount;
    }
    return sum;
  };

  const totalIncome = sumDkkTransactionsInRange(start, end, "INCOME");
  const exchangeExpenseCurrent = sumExchangeDkkInRange(start, end);
  const totalExpenseDkk =
    sumDkkTransactionsInRange(start, end, "EXPENSE") + exchangeExpenseCurrent;
  const netDkk = totalIncome - totalExpenseDkk;
  const previousIncome = sumDkkTransactionsInRange(previousRange.start, previousRange.end, "INCOME");
  const previousExpense =
    sumDkkTransactionsInRange(previousRange.start, previousRange.end, "EXPENSE") +
    sumExchangeDkkInRange(previousRange.start, previousRange.end);
  const previousNet = previousIncome - previousExpense;

  function formatDelta(currentValue: number, previousValue: number) {
    if (previousValue === 0) {
      if (currentValue === 0) return "0%";
      return "+100,0%";
    }
    const percent = ((currentValue - previousValue) / Math.abs(previousValue)) * 100;
    const sign = percent > 0 ? "+" : "";
    return `${sign}${percent.toFixed(1).replace(".", ",")}%`;
  }

  const incomeDelta = formatDelta(totalIncome, previousIncome);
  const expenseDelta = formatDelta(totalExpenseDkk, previousExpense);
  const netDelta = formatDelta(netDkk, previousNet);

  function deltaLabel(delta: string) {
    if (delta === "0%") return "Không thay đổi so với kỳ trước";
    const direction = delta.startsWith("+") ? "Tăng" : "Giảm";
    return `${direction} ${delta.replace(/^[+-]/, "")} so với kỳ trước`;
  }

  function deltaTone(delta: string, increaseIsGood: boolean) {
    if (delta === "0%") return "text-slate-500";
    const isIncrease = delta.startsWith("+");
    return isIncrease === increaseIsGood ? "text-success-dark" : "text-danger-dark";
  }

  const dayStart = new Date(start);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(end);
  dayEnd.setHours(23, 59, 59, 999);
  const totalDays = Math.max(1, Math.floor((dayEnd.getTime() - dayStart.getTime()) / 86400000) + 1);
  const targetPoints = 3;
  const chunkSize = Math.max(1, Math.ceil(totalDays / targetPoints));
  const chunkCount = Math.ceil(totalDays / chunkSize);

  const trendBuckets = Array.from({ length: chunkCount }).map((_, index) => {
    const chunkStart = new Date(dayStart);
    chunkStart.setDate(dayStart.getDate() + index * chunkSize);
    const chunkEnd = new Date(chunkStart);
    chunkEnd.setDate(chunkStart.getDate() + chunkSize - 1);
    chunkEnd.setHours(23, 59, 59, 999);
    if (chunkEnd > dayEnd) chunkEnd.setTime(dayEnd.getTime());

    return {
      start: chunkStart,
      end: chunkEnd,
      income: 0,
      expense: 0
    };
  });

  const currentRangeTransactionsDkk = trendTransactionsDkk.filter(
    (txn) => txn.createdAt >= start && txn.createdAt <= end
  );

  for (const txn of currentRangeTransactionsDkk) {
    const bucket = trendBuckets.find(
      (item) => txn.createdAt >= item.start && txn.createdAt <= item.end
    );
    if (!bucket) continue;
    if (txn.type === "INCOME") bucket.income += txn.amount;
    if (txn.type === "EXPENSE" && !isCreditCardRepayment(txn.category, txn.paymentMethod)) {
      bucket.expense += txn.amount;
    }
  }

  const customTrendData = trendBuckets.map((bucket) => {
    const label = formatRangeLabel(bucket.start, bucket.end);
    return { ...bucket, label };
  });

  const recentPeriods = presetTrendPeriods ?? [
    { start: previousRange2.start, end: previousRange2.end },
    { start: previousRange.start, end: previousRange.end },
    { start, end }
  ];

  const presetTrendData = recentPeriods.map((period) => {
    let income = 0;
    let expense = 0;
    for (const txn of trendTransactionsDkk) {
      if (txn.createdAt < period.start || txn.createdAt > period.end) continue;
      if (txn.type === "INCOME") income += txn.amount;
      if (txn.type === "EXPENSE" && !isCreditCardRepayment(txn.category, txn.paymentMethod)) {
        expense += txn.amount;
      }
    }
    return {
      ...period,
      income,
      expense,
      label: formatRangeLabel(period.start, period.end)
    };
  });

  const trendData = hasCustomRange ? customTrendData : presetTrendData;

  const maxTrendValue = Math.max(
    ...trendData.map((item) => Math.max(item.income, item.expense)),
    1
  );
  const trendChartWidth = 240;
  const trendChartHeight = 124;
  const trendChartPaddingX = 12;
  const trendChartPaddingY = 10;
  const trendStepX =
    trendData.length > 1
      ? (trendChartWidth - trendChartPaddingX * 2) / (trendData.length - 1)
      : 0;

  function getTrendY(value: number) {
    const ratio = value / maxTrendValue;
    return (
      trendChartHeight -
      trendChartPaddingY -
      ratio * (trendChartHeight - trendChartPaddingY * 2)
    );
  }

  const incomeLinePoints = trendData
    .map((item, index) => {
      const x = trendChartPaddingX + trendStepX * index;
      const y = getTrendY(item.income);
      return `${x},${y}`;
    })
    .join(" ");
  const expenseLinePoints = trendData
    .map((item, index) => {
      const x = trendChartPaddingX + trendStepX * index;
      const y = getTrendY(item.expense);
      return `${x},${y}`;
    })
    .join(" ");

  const creditRepaymentFilter = {
    AND: [
      {
        OR: [
          { category: { equals: "Tín dụng", mode: "insensitive" as const } },
          { category: { equals: "Tin dung", mode: "insensitive" as const } }
        ]
      },
      { paymentMethod: { not: "CREDIT_CARD" as const } }
    ]
  };

  const [expenseByCategory, uncategorized] = await Promise.all([
    prisma.transaction.groupBy({
      by: ["category"],
      _sum: { amount: true },
      where: {
        userId: user.id,
        type: "EXPENSE",
        currency: expenseCurrency,
        NOT: creditRepaymentFilter,
        AND: [{ category: { not: null } }, { category: { not: "" } }],
        createdAt: { gte: start, lte: end }
      },
      orderBy: {
        _sum: { amount: "desc" }
      }
    }),
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: {
        userId: user.id,
        type: "EXPENSE",
        currency: expenseCurrency,
        NOT: creditRepaymentFilter,
        OR: [{ category: null }, { category: "" }],
        createdAt: { gte: start, lte: end }
      }
    })
  ]);

  const exchangeAmount =
    expenseCurrency === "DKK"
      ? exchangeExpenseCurrent
      : 0;

  const breakdownItems = [
    ...expenseByCategory.map((item) => ({
      label: item.category ?? "Khác",
      amount: item._sum.amount ?? 0
    })),
    ...(uncategorized._sum.amount
      ? [{ label: "Khác", amount: uncategorized._sum.amount }]
      : []),
    ...(exchangeAmount ? [{ label: "Chuyển đổi tiền tệ", amount: exchangeAmount }] : [])
  ].filter((item) => item.amount > 0);

  const totalBreakdown = breakdownItems.reduce((acc, item) => acc + item.amount, 0);
  const chartColors = [
    "#facc15",
    "#38bdf8",
    "#34d399",
    "#f472b6",
    "#a78bfa",
    "#fb7185",
    "#f97316"
  ];

  const conicStops = breakdownItems.map((item, index) => {
    const percent = totalBreakdown ? (item.amount / totalBreakdown) * 100 : 0;
    return { ...item, color: chartColors[index % chartColors.length], percent };
  });

  let current = 0;
  const gradient = conicStops
    .map((item) => {
      const startPct = current;
      current += item.percent;
      return `${item.color} ${startPct.toFixed(2)}% ${current.toFixed(2)}%`;
    })
    .join(", ");

  const hasTrendData = trendData.some((item) => item.income > 0 || item.expense > 0);
  const recentDateFormatter = new Intl.DateTimeFormat("vi-VN", {
    timeZone: userTimeZone,
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
  const recentItems = [
    ...recentTransactions.map((transaction) => {
      const isIncome = transaction.type === "INCOME";
      const typeLabel = isIncome ? "Thu nhập" : transaction.type === "EXPENSE" ? "Chi tiêu" : "Giao dịch";
      return {
        id: `transaction-${transaction.id}`,
        type: transaction.type,
        title: transaction.category || typeLabel,
        subtitle: `${typeLabel} · ${recentDateFormatter.format(transaction.createdAt)}`,
        amount: `${isIncome ? "+" : transaction.type === "EXPENSE" ? "-" : ""}${formatMoney(transaction.amount, transaction.currency)}`,
        createdAt: transaction.createdAt
      };
    }),
    ...recentExchanges.map((exchange) => ({
      id: `exchange-${exchange.id}`,
      type: "EXCHANGE" as const,
      title: exchange.provider || "Đổi DKK sang VND",
      subtitle: `Nhận ${formatMoney(exchange.toAmountVnd, "VND")} · ${recentDateFormatter.format(exchange.createdAt)}`,
      amount: `-${formatMoney(exchange.fromAmountDkk, "DKK")}`,
      createdAt: exchange.createdAt
    }))
  ]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 5);

  return (
    <main className="container-page app-enter">
      <div className="hero-bar">
        <div className="flex min-w-0 items-center gap-3">
          <img src="/logo.svg" alt="" className="h-9 w-9 shrink-0" />
          <h1 className="truncate text-xl font-semibold text-ink">Tổng quan</h1>
        </div>
        <ProfileMenu name={user.displayName} email={user.email} />
      </div>

      <TimeFilterTabs
        filters={filters}
        active={filter}
        expenseCurrency={expenseCurrency}
        fromDate={fromDateInput}
        toDate={toDateInput}
        customActive={hasCustomRange}
        rangeLabel={periodLabel}
      />
      <section className="card mt-4 overflow-hidden p-0 md:p-0" aria-labelledby="wallets-title">
        <div className="flex items-center justify-between px-4 pt-4">
          <div>
            <p className="text-xs font-medium text-slate-500">Tài sản của tôi</p>
            <h2 id="wallets-title" className="mt-0.5 text-lg font-semibold text-ink">Số dư theo ví</h2>
          </div>
          <span className="chip">2 ví</span>
        </div>
        <div className="mt-3 grid grid-cols-2 divide-x divide-slate-100 border-t border-slate-100">
          <div className="min-w-0 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
                <WalletIcon className="h-4 w-4" />
              </span>
              DKK
            </div>
            <p className="money-value mt-3 break-words text-lg font-bold leading-6 text-ink sm:text-xl">
              {formatMoney(balances.balances.DKK, "DKK")}
            </p>
          </div>
          <div className="min-w-0 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                <WalletIcon className="h-4 w-4" />
              </span>
              VND
            </div>
            <p className="money-value mt-3 break-words text-lg font-bold leading-6 text-ink sm:text-xl">
              {formatMoney(balances.balances.VND, "VND")}
            </p>
          </div>
        </div>
      </section>

      <section className="card mt-4 overflow-hidden p-0 md:p-0" aria-label="Thu nhập và chi tiêu trong kỳ">
        <div className="grid grid-cols-2 divide-x divide-slate-100">
          <div className="min-w-0 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
              <IncomeIcon className="h-5 w-5 text-success-dark" />
              Thu nhập (DKK)
            </div>
            <p className="money-value mt-2 break-words text-xl font-bold leading-7 text-success-dark">
              {formatMoney(totalIncome, "DKK")}
            </p>
            <p className={`mt-2 text-xs leading-4 ${deltaTone(incomeDelta, true)}`}>
              {deltaLabel(incomeDelta)}
            </p>
          </div>
          <div className="min-w-0 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
              <ExpenseIcon className="h-5 w-5 text-danger-dark" />
              Chi tiêu (DKK)
            </div>
            <p className="money-value mt-2 break-words text-xl font-bold leading-7 text-danger-dark">
              {formatMoney(totalExpenseDkk, "DKK")}
            </p>
            <p className={`mt-2 text-xs leading-4 ${deltaTone(expenseDelta, false)}`}>
              {deltaLabel(expenseDelta)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50 px-4 py-3">
          <div>
            <p className="text-xs text-slate-500">Còn lại trong kỳ</p>
            <p className="money-value mt-0.5 text-base font-semibold text-ink">{formatMoney(netDkk, "DKK")}</p>
          </div>
          <p className={`text-xs ${deltaTone(netDelta, true)}`}>{deltaLabel(netDelta)}</p>
        </div>
      </section>

      <div className="mt-7 grid gap-7 lg:grid-cols-2">
        <section aria-labelledby="trend-title">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 id="trend-title" className="text-xl font-semibold text-ink">Xu hướng thu và chi</h2>
              <p className="mt-0.5 text-sm text-slate-500">Đơn vị DKK · {periodLabel}</p>
            </div>
            {hasTrendData ? <span className="chip">{hasCustomRange ? `${trendData.length} mốc` : "3 kỳ"}</span> : null}
          </div>
          <div className="card mt-3">
            {hasTrendData ? (
              <>
                <div className="rounded-control bg-slate-50 p-3">
                  <svg
                    viewBox={`0 0 ${trendChartWidth} ${trendChartHeight}`}
                    className="h-40 w-full"
                    role="img"
                    aria-label="Biểu đồ đường thu nhập và chi tiêu theo kỳ lọc"
                  >
                    <line
                      x1={trendChartPaddingX}
                      y1={trendChartHeight - trendChartPaddingY}
                      x2={trendChartWidth - trendChartPaddingX}
                      y2={trendChartHeight - trendChartPaddingY}
                      stroke="#E1E5EA"
                      strokeWidth="1"
                    />
                    <polyline fill="none" stroke="#2E9D62" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={incomeLinePoints} />
                    <polyline fill="none" stroke="#DC4C4C" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={expenseLinePoints} />
                    {trendData.map((item, index) => {
                      const x = trendChartPaddingX + trendStepX * index;
                      return (
                        <g key={item.label}>
                          <circle cx={x} cy={getTrendY(item.income)} r="3" fill="#2E9D62" />
                          <circle cx={x} cy={getTrendY(item.expense)} r="3" fill="#DC4C4C" />
                        </g>
                      );
                    })}
                  </svg>
                  <div className="mt-2 grid gap-2 text-xs text-slate-500" style={{ gridTemplateColumns: `repeat(${trendData.length}, minmax(0, 1fr))` }}>
                    {trendData.map((item) => <span key={item.label} className="truncate text-center">{item.label}</span>)}
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-success" />Thu nhập</span>
                  <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-danger" />Chi tiêu</span>
                </div>
              </>
            ) : (
              <div className="flex min-h-44 flex-col items-center justify-center px-4 text-center">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-primary-50 text-primary-600">
                  <ChartIcon className="h-5 w-5" />
                </span>
                <h3 className="mt-3 text-base font-semibold text-ink">Chưa có dữ liệu trong kỳ này</h3>
                <p className="mt-1 text-sm text-slate-500">Thêm giao dịch để xem xu hướng thu và chi.</p>
                <Link href="/add" className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-control bg-primary-600 px-4 text-sm font-semibold text-white">
                  <PlusIcon className="h-4 w-4" />Thêm giao dịch
                </Link>
              </div>
            )}
          </div>
        </section>

        <section aria-labelledby="breakdown-title">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 id="breakdown-title" className="text-xl font-semibold text-ink">Phân bổ chi tiêu</h2>
              <p className="mt-0.5 text-sm text-slate-500">Tiền đang được chi vào đâu</p>
            </div>
            <ExpenseCurrencyToggle active={expenseCurrency} />
          </div>
          <div className="card mt-3">
            {totalBreakdown > 0 ? (
              <div className="grid items-center gap-5 sm:grid-cols-[168px_minmax(0,1fr)]">
                <div className="flex justify-center">
                  <div className="relative h-36 w-36 rounded-full" style={{ background: `conic-gradient(${gradient})` }}>
                    <div className="absolute inset-5 flex flex-col items-center justify-center rounded-full bg-white text-center">
                      <span className="text-xs text-slate-500">Tổng chi</span>
                      <span className="money-value mt-1 max-w-[96px] break-words text-sm font-bold text-ink">{formatMoney(totalBreakdown, expenseCurrency)}</span>
                    </div>
                  </div>
                </div>
                <div className="grid gap-2.5 text-sm text-slate-600">
                  {conicStops.map((item) => (
                    <div key={item.label} className="flex items-center justify-between gap-3">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="truncate">{item.label}</span>
                      </span>
                      <span className="money-value shrink-0 font-medium text-slate-700">{formatMoney(item.amount, expenseCurrency)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex min-h-44 flex-col items-center justify-center px-4 text-center">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-danger-light text-danger-dark">
                  <ExpenseIcon className="h-5 w-5" />
                </span>
                <h3 className="mt-3 text-base font-semibold text-ink">Chưa có khoản chi trong kỳ</h3>
                <p className="mt-1 text-sm text-slate-500">Các danh mục chi tiêu sẽ xuất hiện tại đây.</p>
              </div>
            )}
          </div>
        </section>
      </div>

      <section className="mt-7" aria-labelledby="recent-title">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 id="recent-title" className="text-xl font-semibold text-ink">Giao dịch gần đây</h2>
            <p className="mt-0.5 text-sm text-slate-500">5 hoạt động mới nhất</p>
          </div>
          <Link href="/history" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-primary-600 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300">
            Xem tất cả <ChevronRightIcon className="h-4 w-4" />
          </Link>
        </div>
        {recentItems.length > 0 ? (
          <div className="mt-3 overflow-hidden rounded-card border border-slate-200 bg-white shadow-soft">
            {recentItems.map((item, index) => {
              const ItemIcon = item.type === "INCOME" ? IncomeIcon : item.type === "EXPENSE" ? ExpenseIcon : ExchangeIcon;
              const iconTone = item.type === "INCOME" ? "bg-success-light text-success-dark" : item.type === "EXPENSE" ? "bg-danger-light text-danger-dark" : "bg-primary-50 text-primary-700";
              const amountTone = item.type === "INCOME" ? "text-success-dark" : item.type === "EXPENSE" ? "text-danger-dark" : "text-primary-700";
              return (
                <div key={item.id} className={`flex min-h-16 items-center gap-3 px-4 py-3 ${index > 0 ? "border-t border-slate-100" : ""}`}>
                  <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconTone}`}><ItemIcon className="h-5 w-5" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{item.title}</p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">{item.subtitle}</p>
                  </div>
                  <p className={`money-value max-w-[42%] break-words text-right text-sm font-semibold ${amountTone}`}>{item.amount}</p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="card mt-3 flex min-h-36 flex-col items-center justify-center text-center">
            <p className="text-base font-semibold text-ink">Chưa có giao dịch</p>
            <p className="mt-1 text-sm text-slate-500">Thêm giao dịch đầu tiên để bắt đầu theo dõi.</p>
            <Link href="/add" className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-control bg-primary-600 px-4 text-sm font-semibold text-white">
              <PlusIcon className="h-4 w-4" />Thêm giao dịch
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
