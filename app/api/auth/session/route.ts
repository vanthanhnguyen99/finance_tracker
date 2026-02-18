import { NextRequest, NextResponse } from "next/server";
import { getApiSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getApiSessionUser(req);
  if (!user) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      id: user.id,
      displayName: user.displayName,
      email: user.email,
      status: user.status
    }
  });
}
