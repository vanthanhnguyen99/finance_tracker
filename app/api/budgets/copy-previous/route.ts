import { withApiSecurity, readJsonBody } from "@/lib/http-security";
import { NextRequest, NextResponse } from "next/server";
import { getApiSessionUser } from "@/lib/auth";
import { parseMonth, previousMonth } from "@/lib/budget-utils";
import { parseCurrency } from "@/lib/finance-validation";
import { withUserLedger } from "@/lib/wallet";
import {
  budgetApiError,
  refreshBudgetPages,
  requireBody,
} from "@/lib/budget-api";
async function handlePOST(req: NextRequest) {
  const user = await getApiSessionUser(req);
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = requireBody(await readJsonBody(req));
    const month = parseMonth(body.month);
    const currency = parseCurrency(body.currency);
    const sourceMonth = previousMonth(month);
    const result = await withUserLedger(user.id, async (tx) => {
      const previous = await tx.budget.findMany({
        where: { userId: user.id, month: sourceMonth, currency },
      });
      if (!previous.length) return { copied: 0, skipped: 0 };
      const copied = await tx.budget.createMany({
        data: previous.map(({ scope, scopeKey, category, limitMinor }) => ({
          userId: user.id,
          month,
          currency,
          scope,
          scopeKey,
          category,
          limitMinor,
        })),
        skipDuplicates: true,
      });
      return { copied: copied.count, skipped: previous.length - copied.count };
    });
    refreshBudgetPages();
    return NextResponse.json(result);
  } catch (error) {
    return budgetApiError(error);
  }
}

export const POST = withApiSecurity(handlePOST);
