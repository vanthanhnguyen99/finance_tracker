import { prisma } from "@/lib/db";
import { getPreviousRangeFromBounds, getRange, type TimeFilter } from "@/lib/date";
import { getWalletBalances } from "@/lib/wallet";
import { formatMoney } from "@/lib/money";
import { StatCard } from "./components/StatCard";
import { ExpenseCurrencyToggle } from "./components/ExpenseCurrencyToggle";
import { TimeFilterTabs } from "./components/TimeFilterTabs";
import { unstable_noStore as noStore } from "next/cache";
import { requireActivePageSession } from "@/lib/server-auth";
import { LogoutButton } from "./components/LogoutButton";
import { cookies } from "next/headers";
import { isCreditCardRepayment } from "@/lib/credit";
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

  const [trendTransactionsDkk, exchangeDkkEntries, balances] = await Promise.all([
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
    getWalletBalances(user.id)
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
      return "+100.0%";
    }
    const percent = ((currentValue - previousValue) / Math.abs(previousValue)) * 100;
    const sign = percent > 0 ? "+" : "";
    return `${sign}${percent.toFixed(1)}%`;
  }

  const incomeDelta = formatDelta(totalIncome, previousIncome);
  const expenseDelta = formatDelta(totalExpenseDkk, previousExpense);
  const netDelta = formatDelta(netDkk, previousNet);

  function deltaClass(delta: string, positiveTone: string) {
    if (delta.startsWith("+")) return `font-semibold ${positiveTone}`;
    if (delta.startsWith("-")) return "font-semibold text-emerald-600";
    return "font-semibold text-slate-600";
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

  const cycleTargetPoints =
    totalDays <= 7
      ? totalDays
      : totalDays <= 20
        ? 6
        : 8;
  const cycleChunkSize = Math.max(1, Math.ceil(totalDays / Math.max(1, cycleTargetPoints)));
  const cycleChunkCount = Math.ceil(totalDays / cycleChunkSize);
  const cycleBuckets = Array.from({ length: cycleChunkCount }).map((_, index) => {
    const chunkStart = new Date(dayStart);
    chunkStart.setDate(dayStart.getDate() + index * cycleChunkSize);
    const chunkEnd = new Date(chunkStart);
    chunkEnd.setDate(chunkStart.getDate() + cycleChunkSize - 1);
    chunkEnd.setHours(23, 59, 59, 999);
    if (chunkEnd > dayEnd) chunkEnd.setTime(dayEnd.getTime());
    return {
      start: chunkStart,
      end: chunkEnd,
      income: 0,
      expense: 0
    };
  });

  for (const txn of currentRangeTransactionsDkk) {
    const bucket = cycleBuckets.find(
      (item) => txn.createdAt >= item.start && txn.createdAt <= item.end
    );
    if (!bucket) continue;
    if (txn.type === "EXPENSE" && !isCreditCardRepayment(txn.category, txn.paymentMethod)) {
      bucket.expense += txn.amount;
    }
  }

  const inCycleData = cycleBuckets.map((bucket) => ({
    ...bucket,
    label: formatDateSlash(bucket.end)
  }));
  const maxInCycleValue = Math.max(
    ...inCycleData.map((item) => item.expense),
    1
  );
  const inCycleStepX =
    inCycleData.length > 1
      ? (trendChartWidth - trendChartPaddingX * 2) / (inCycleData.length - 1)
      : 0;
  const inCycleExpensePoints = inCycleData
    .map((item, index) => {
      const x = trendChartPaddingX + inCycleStepX * index;
      const y = trendChartHeight - trendChartPaddingY - (item.expense / maxInCycleValue) * (trendChartHeight - trendChartPaddingY * 2);
      return `${x},${y}`;
    })
    .join(" ");

  const compareCurrent = [
    { key: "income", label: "Thu nhập", value: totalIncome },
    { key: "expense", label: "Chi tiêu", value: totalExpenseDkk }
  ];
  const comparePrevious = [
    { key: "income", label: "Thu nhập", value: previousIncome },
    { key: "expense", label: "Chi tiêu", value: previousExpense }
  ];
  const maxCompareValue = Math.max(
    ...compareCurrent.map((item) => Math.abs(item.value)),
    ...comparePrevious.map((item) => Math.abs(item.value)),
    1
  );

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

  const now = new Date();
  const monthStarts = Array.from({ length: 4 }).map((_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (3 - index), 1);
    return date;
  });
  const monthLabelFormatter = new Intl.DateTimeFormat("en-GB", { month: "short" });
  const monthLabels = monthStarts.map((date) => monthLabelFormatter.format(date));
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [monthlyTransactions, monthlyExchanges] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        userId: user.id,
        type: { in: ["INCOME", "EXPENSE"] },
        currency: "DKK",
        createdAt: { gte: monthStarts[0], lt: monthEnd }
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
        createdAt: { gte: monthStarts[0], lt: monthEnd }
      },
      select: {
        createdAt: true,
        fromAmountDkk: true,
        feeAmount: true,
        feeCurrency: true
      }
    })
  ]);

  const monthlyIncome = new Array(4).fill(0);
  const monthlyExpense = new Array(4).fill(0);

  for (const txn of monthlyTransactions) {
    const monthIndex = monthStarts.findIndex(
      (start) =>
        txn.createdAt >= start &&
        txn.createdAt < new Date(start.getFullYear(), start.getMonth() + 1, 1)
    );
    if (monthIndex === -1) continue;
    if (txn.type === "INCOME") monthlyIncome[monthIndex] += txn.amount;
    if (txn.type === "EXPENSE" && !isCreditCardRepayment(txn.category, txn.paymentMethod)) {
      monthlyExpense[monthIndex] += txn.amount;
    }
  }

  for (const exchange of monthlyExchanges) {
    const monthIndex = monthStarts.findIndex(
      (startOfMonth) =>
        exchange.createdAt >= startOfMonth &&
        exchange.createdAt < new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 1)
    );
    if (monthIndex === -1) continue;
    monthlyExpense[monthIndex] += exchangeToDkkExpense(exchange);
  }

  const maxMonthly = Math.max(
    ...monthlyIncome,
    ...monthlyExpense,
    1
  );

  return (
    <main className="container-page">
      <div className="hero-bar">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center">
            <img src="/logo.svg" alt="FinanceTracker" className="h-10 w-10" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-slate-400">FinanceTracker</p>
            <h1 className="text-lg font-semibold text-ink">Quản lý chi tiêu dễ dàng</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a className="primary-pill" href="/add">
            + Thêm giao dịch
          </a>
          <LogoutButton />
        </div>
      </div>

      <TimeFilterTabs
        filters={filters}
        active={filter}
        expenseCurrency={expenseCurrency}
        fromDate={fromDateInput}
        toDate={toDateInput}
        customActive={hasCustomRange}
      />
      <p className="mt-2 text-sm text-slate-500">Khoảng thời gian: {periodLabel}</p>
      <p className="mt-1 text-xs text-slate-400">Áp dụng cho: Tổng thu chi và phân bổ chi tiêu</p>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Ví DKK"
          value={formatMoney(balances.balances.DKK, "DKK")}
          hint={
            <span className="chip">
              <span>Ví DKK</span>
            </span>
          }
          tone="balance"
        />
        <StatCard
          title="Ví VND"
          value={formatMoney(balances.balances.VND, "VND")}
          hint={
            <span className="chip">
              <span>Ví VND</span>
            </span>
          }
        />
        <StatCard title="Thu nhập" value={formatMoney(totalIncome, "DKK")} tone="income" />
        <StatCard title="Chi tiêu" value={formatMoney(totalExpenseDkk, "DKK")} tone="expense" />
      </div>
      <div className="mt-3 grid gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-xs text-slate-500 md:grid-cols-3">
        <p>
          Thu nhập vs kỳ trước:{" "}
          <span className={deltaClass(incomeDelta, "text-emerald-600")}>
            {incomeDelta}
          </span>
        </p>
        <p>
          Chi tiêu vs kỳ trước:{" "}
          <span className={deltaClass(expenseDelta, "text-rose-500")}>
            {expenseDelta}
          </span>
        </p>
        <p>
          Chênh lệch ròng vs kỳ trước: <span className="font-semibold text-slate-700">{netDelta}</span>
        </p>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <div className="card">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-ink">Xu hướng theo kỳ lọc (DKK)</h2>
            <span className="chip">
              {hasCustomRange ? `${trendData.length} mốc` : "3 kỳ gần nhất"}
            </span>
          </div>
          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <svg
              viewBox={`0 0 ${trendChartWidth} ${trendChartHeight}`}
              className="h-36 w-full"
              role="img"
              aria-label="Biểu đồ đường thu nhập và chi tiêu theo kỳ lọc"
            >
              <line
                x1={trendChartPaddingX}
                y1={trendChartHeight - trendChartPaddingY}
                x2={trendChartWidth - trendChartPaddingX}
                y2={trendChartHeight - trendChartPaddingY}
                stroke="#cbd5e1"
                strokeWidth="1"
              />
              <polyline
                fill="none"
                stroke="#34d399"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={incomeLinePoints}
              />
              <polyline
                fill="none"
                stroke="#f87171"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={expenseLinePoints}
              />
              {trendData.map((item, index) => {
                const x = trendChartPaddingX + trendStepX * index;
                const incomeY = getTrendY(item.income);
                const expenseY = getTrendY(item.expense);
                return (
                  <g key={item.label}>
                    <circle cx={x} cy={incomeY} r="3" fill="#34d399" />
                    <circle cx={x} cy={expenseY} r="3" fill="#f87171" />
                  </g>
                );
              })}
            </svg>
            <div
              className="mt-2 grid gap-2 text-[10px] text-slate-400"
              style={{ gridTemplateColumns: `repeat(${trendData.length}, minmax(0, 1fr))` }}
            >
              {trendData.map((item) => (
                <span key={item.label} className="truncate text-center">
                  <span className="whitespace-nowrap">{item.label}</span>
                </span>
              ))}
            </div>
          </div>
          <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Thu nhập
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-rose-400" />
              Chi tiêu
            </span>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-ink">Chi tiêu trong kỳ (DKK)</h2>
            <span className="chip">{inCycleData.length} mốc</span>
          </div>
          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <svg
              viewBox={`0 0 ${trendChartWidth} ${trendChartHeight}`}
              className="h-36 w-full"
              role="img"
              aria-label="Biểu đồ đường chi tiêu DKK trong kỳ hiện tại"
            >
              <line
                x1={trendChartPaddingX}
                y1={trendChartHeight - trendChartPaddingY}
                x2={trendChartWidth - trendChartPaddingX}
                y2={trendChartHeight - trendChartPaddingY}
                stroke="#cbd5e1"
                strokeWidth="1"
              />
              <polyline
                fill="none"
                stroke="#f87171"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={inCycleExpensePoints}
              />
              {inCycleData.map((item, index) => {
                const x = trendChartPaddingX + inCycleStepX * index;
                const expenseY =
                  trendChartHeight -
                  trendChartPaddingY -
                  (item.expense / maxInCycleValue) * (trendChartHeight - trendChartPaddingY * 2);
                return (
                  <g key={item.label}>
                    <circle cx={x} cy={expenseY} r="3" fill="#f87171" />
                  </g>
                );
              })}
            </svg>
            <div
              className="mt-2 grid gap-2 text-[10px] text-slate-400"
              style={{ gridTemplateColumns: `repeat(${inCycleData.length}, minmax(0, 1fr))` }}
            >
              {inCycleData.map((item, index) => {
                const showLabel = inCycleData.length <= 7 || index % 2 === 0;
                return (
                  <span key={item.label} className="truncate text-center">
                    <span className="whitespace-nowrap">{showLabel ? item.label : ""}</span>
                  </span>
                );
              })}
            </div>
          </div>
          <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-rose-400" />
              Chi tiêu
            </span>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-ink">So sánh với kỳ trước</h2>
            <span className="chip">DKK</span>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {compareCurrent.map((item, index) => {
              const currentHeight = Math.max(
                4,
                Math.round((Math.abs(item.value) / maxCompareValue) * 120)
              );
              const previousHeight = Math.max(
                4,
                Math.round((Math.abs(comparePrevious[index].value) / maxCompareValue) * 120)
              );
              return (
                <div key={item.key} className="flex flex-col items-center gap-2">
                  <div className="flex h-32 items-end gap-2">
                    <div
                      className="w-3.5 rounded-full bg-indigo-300"
                      style={{ height: `${previousHeight}px` }}
                      title={`Kỳ trước: ${formatMoney(comparePrevious[index].value, "DKK")}`}
                    />
                    <div
                      className="w-3.5 rounded-full bg-indigo-600"
                      style={{ height: `${currentHeight}px` }}
                      title={`Kỳ này: ${formatMoney(item.value, "DKK")}`}
                    />
                  </div>
                  <span className="text-[10px] font-semibold text-slate-500">{item.label}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-indigo-600" />
              Kỳ này
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-indigo-300" />
              Kỳ trước
            </span>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-ink">Phân bổ chi tiêu</h2>
            <ExpenseCurrencyToggle active={expenseCurrency} />
          </div>
          <div className="mt-6 flex items-center justify-center">
            <div
              className="relative h-40 w-40 rounded-full sm:h-44 sm:w-44"
              style={{
                background: totalBreakdown ? `conic-gradient(${gradient})` : "#e2e8f0"
              }}
            >
              <div className="absolute inset-5 rounded-full bg-white sm:inset-6" />
            </div>
          </div>
          {breakdownItems.length === 0 ? (
            <p className="mt-6 text-center text-xs text-slate-500">Chưa có dữ liệu chi tiêu.</p>
          ) : (
            <div className="mt-6 grid gap-2 text-xs text-slate-500">
              {conicStops.map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                    {item.label}
                  </span>
                  <span>{formatMoney(item.amount, expenseCurrency)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-ink">Tổng quan theo tháng</h2>
            <span className="chip">Luôn 4 tháng gần nhất (DKK)</span>
          </div>
          <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-gradient-to-b from-white to-slate-50 p-4">
            <div className="flex h-52 items-end gap-4">
              {monthLabels.map((label, index) => {
                const incomeHeight = Math.round((monthlyIncome[index] / maxMonthly) * 180);
                const expenseHeight = Math.round((monthlyExpense[index] / maxMonthly) * 180);
                return (
                  <div key={label} className="flex flex-1 flex-col items-center gap-2">
                    <div className="flex h-44 items-end gap-2">
                      <div
                        className="w-3 rounded-full bg-emerald-400"
                        style={{ height: `${incomeHeight}px` }}
                      />
                      <div
                        className="w-3 rounded-full bg-rose-400"
                        style={{ height: `${expenseHeight}px` }}
                      />
                    </div>
                    <span className="text-[10px] uppercase tracking-wide text-slate-400">
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-rose-400" />
              Chi tiêu
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Thu nhập
            </span>
          </div>
        </div>
      </div>

    </main>
  );
}
