import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { budgetExpenseCondition } from "./history";
import {
  budgetHistoryUrl,
  budgetStatus,
  monthBounds,
  parseMonth,
} from "./budget-utils";
import type { FinanceCurrency } from "./finance-validation";

export async function getBudgets(
  userId: string,
  monthValue: string,
  currency: FinanceCurrency,
  timeZone: string,
  scope?: "TOTAL",
) {
  const month = parseMonth(monthValue);
  const { start, end } = monthBounds(month, timeZone);
  return prisma.$transaction(
    async (tx) => {
      const budgets = await tx.budget.findMany({
        where: { userId, month, currency, ...(scope ? { scope } : {}) },
        orderBy: { scopeKey: "asc" },
      });
      if (!budgets.length) return [];
      const groups = await tx.$queryRaw<
        { category: string | null; amount: bigint }[]
      >(Prisma.sql`
      SELECT CASE WHEN coalesce("category", '') ~ '^[[:space:]]*$' THEN NULL ELSE "category" END AS category, sum(amount) AS amount
      FROM "Transaction" WHERE "userId" = ${userId} AND "currency"::text = ${currency}
      AND "createdAt" >= ${start} AND "createdAt" <= ${end} AND ${budgetExpenseCondition}
      GROUP BY 1`);
      const totalSpent = groups.reduce(
        (sum, row) => sum + Number(row.amount),
        0,
      );
      return budgets.map((budget) => {
        const spent =
          budget.scope === "TOTAL"
            ? totalSpent
            : Number(
                groups.find((row) => row.category === budget.category)
                  ?.amount ?? 0,
              );
        return {
          ...budget,
          createdAt: budget.createdAt.toISOString(),
          updatedAt: budget.updatedAt.toISOString(),
          spent,
          remaining: budget.limitMinor - spent,
          percent: (spent / budget.limitMinor) * 100,
          status: budgetStatus(spent, budget.limitMinor),
          historyUrl: budgetHistoryUrl(
            month,
            currency,
            budget.scope,
            budget.category,
          ),
        };
      });
    },
    { isolationLevel: "RepeatableRead" },
  );
}
export type BudgetView = Awaited<ReturnType<typeof getBudgets>>[number];
