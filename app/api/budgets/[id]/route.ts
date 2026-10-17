import { withApiSecurity, readJsonBody } from "@/lib/http-security";
import { NextRequest, NextResponse } from "next/server";
import { getApiSessionUser } from "@/lib/auth";
import { FinanceInputError, parseMinorAmount } from "@/lib/finance-validation";
import { withUserLedger } from "@/lib/wallet";
import {
  budgetApiError,
  refreshBudgetPages,
  requireBody,
} from "@/lib/budget-api";
type Context = { params: Promise<{ id: string }> };
async function handlePATCH(req: NextRequest, context: Context) {
  const user = await getApiSessionUser(req);
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await context.params;
    const body = requireBody(await readJsonBody(req));
    if (Object.keys(body).some((key) => key !== "limitMajor"))
      throw new FinanceInputError(
        "Chỉ có thể sửa hạn mức. Hãy tạo ngân sách mới để đổi phạm vi.",
      );
    const budget = await withUserLedger(user.id, async (tx) => {
      const existing = await tx.budget.findFirst({
        where: { id, userId: user.id },
      });
      if (!existing) return null;
      return tx.budget.update({
        where: { id },
        data: {
          limitMinor: parseMinorAmount(body.limitMajor, existing.currency),
        },
      });
    });
    if (!budget)
      return NextResponse.json(
        { error: "Không tìm thấy ngân sách." },
        { status: 404 },
      );
    refreshBudgetPages();
    return NextResponse.json({ budget });
  } catch (error) {
    return budgetApiError(error);
  }
}
async function handleDELETE(req: NextRequest, context: Context) {
  const user = await getApiSessionUser(req);
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await context.params;
    const result = await withUserLedger(user.id, (tx) =>
      tx.budget.deleteMany({ where: { id, userId: user.id } }),
    );
    if (!result.count)
      return NextResponse.json(
        { error: "Không tìm thấy ngân sách." },
        { status: 404 },
      );
    refreshBudgetPages();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return budgetApiError(error);
  }
}

export const PATCH = withApiSecurity(handlePATCH);
export const DELETE = withApiSecurity(handleDELETE);
