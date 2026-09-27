import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getApiSessionUser } from "@/lib/auth";

export async function PATCH(req: NextRequest) {
  const user = await getApiSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const primaryCurrency = body.primaryCurrency;
  if (primaryCurrency !== "DKK" && primaryCurrency !== "VND") {
    return NextResponse.json({ error: "Đơn vị tiền tệ không hợp lệ" }, { status: 400 });
  }

  await prisma.userAllowlist.update({
    where: { id: user.id },
    data: { primaryCurrency }
  });

  revalidatePath("/");
  revalidatePath("/add");
  revalidatePath("/history");

  return NextResponse.json({ ok: true, primaryCurrency });
}
