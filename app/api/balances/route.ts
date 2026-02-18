import { NextRequest, NextResponse } from "next/server";
import { getWalletBalances } from "@/lib/wallet";
import { getApiSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getApiSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await getWalletBalances(user.id);
  return NextResponse.json({ balances: data.balances });
}
