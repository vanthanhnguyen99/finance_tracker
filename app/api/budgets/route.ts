import { withApiSecurity, readJsonBody } from "@/lib/http-security";
import { NextRequest, NextResponse } from "next/server";
import { getApiSessionUser } from "@/lib/auth";
import { budgetIdentity, currentMonth, parseMonth } from "@/lib/budget-utils";
import { parseCurrency, parseMinorAmount } from "@/lib/finance-validation";
import { getTimeZoneFromRequest } from "@/lib/timezone";
import { getBudgets } from "@/lib/budgets";
import { withUserLedger } from "@/lib/wallet";
import {
  budgetApiError,
  refreshBudgetPages,
  requireBody,
} from "@/lib/budget-api";
export const dynamic = "force-dynamic";
async function handleGET(req: NextRequest) {
  const user = await getApiSessionUser(req);
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const params = new URL(req.url).searchParams;
    const timeZone = getTimeZoneFromRequest(req);
    const month = parseMonth(params.get("month") ?? currentMonth(timeZone));
    const currency = parseCurrency(
      params.get("currency") ?? user.primaryCurrency,
    );
    return NextResponse.json({
      budgets: await getBudgets(user.id, month, currency, timeZone),
    });
  } catch (error) {
    return budgetApiError(error);
  }
}
async function handlePOST(req: NextRequest) {
  const user = await getApiSessionUser(req);
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = requireBody(await readJsonBody(req));
    const month = parseMonth(body.month);
    const currency = parseCurrency(body.currency);
    const identity = budgetIdentity(body.scope, body.category);
    const limitMinor = parseMinorAmount(body.limitMajor, currency);
    const budget = await withUserLedger(user.id, (tx) =>
      tx.budget.create({
        data: { userId: user.id, month, currency, ...identity, limitMinor },
      }),
    );
    refreshBudgetPages();
    return NextResponse.json({ budget }, { status: 201 });
  } catch (error) {
    return budgetApiError(error);
  }
}

export const GET = withApiSecurity(handleGET);
export const POST = withApiSecurity(handlePOST);
