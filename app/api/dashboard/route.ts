import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getRange, type TimeFilter } from "@/lib/date";
import { getApiSessionUser } from "@/lib/auth";
import { getTimeZoneFromRequest, parseDateInputInTimeZone } from "@/lib/timezone";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getApiSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const userTimeZone = getTimeZoneFromRequest(req);
  const filterParam = searchParams.get("filter");
  const filter: TimeFilter =
    filterParam === "today" ||
    filterParam === "week" ||
    filterParam === "month" ||
    filterParam === "last7" ||
    filterParam === "last30"
      ? filterParam
      : "month";
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const fromDate = parseDateInputInTimeZone(fromParam, userTimeZone, false);
  const toDate = parseDateInputInTimeZone(toParam, userTimeZone, true);
  const hasCustomRange = Boolean(fromDate && toDate && fromDate <= toDate);

  const { start, end } = hasCustomRange
    ? { start: fromDate!, end: toDate! }
    : getRange(filter, userTimeZone);

  const [incomeDkk, expenseDkk, expenseVnd] = await Promise.all([
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: {
        userId: user.id,
        type: "INCOME",
        currency: "DKK",
        createdAt: { gte: start, lte: end }
      }
    }),
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: {
        userId: user.id,
        type: "EXPENSE",
        currency: "DKK",
        createdAt: { gte: start, lte: end }
      }
    }),
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: {
        userId: user.id,
        type: "EXPENSE",
        currency: "VND",
        createdAt: { gte: start, lte: end }
      }
    })
  ]);

  return NextResponse.json({
    filter: hasCustomRange ? "custom" : filter,
    totals: {
      incomeDkk: incomeDkk._sum.amount ?? 0,
      expenseDkk: expenseDkk._sum.amount ?? 0,
      expenseVnd: expenseVnd._sum.amount ?? 0
    }
  });
}
