import { withApiSecurity } from "@/lib/http-security";
import { NextRequest, NextResponse } from "next/server";
import { getApiSessionUser } from "@/lib/auth";
import { getHistory, parseHistoryFilters } from "@/lib/history";
import { FinanceInputError } from "@/lib/finance-validation";
import { getTimeZoneFromRequest } from "@/lib/timezone";
export const dynamic = "force-dynamic";
async function handleGET(req: NextRequest) {
  const user = await getApiSessionUser(req);
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const params = new URL(req.url).searchParams;
    return NextResponse.json(
      await getHistory(
        user.id,
        parseHistoryFilters(params, getTimeZoneFromRequest(req)),
        params.get("cursor"),
      ),
    );
  } catch (error) {
    if (error instanceof FinanceInputError)
      return NextResponse.json({ error: error.message }, { status: 400 });
    throw error;
  }
}

export const GET = withApiSecurity(handleGET);
