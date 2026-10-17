import { NextResponse } from "next/server";
import { withApiSecurity } from "@/lib/http-security";
export const dynamic = "force-dynamic";
// Anonymous callers cannot choose a replacement password for somebody else's account.
async function handlePOST() {
  return NextResponse.json({ error: "Hãy liên hệ quản trị viên qua kênh đã đăng ký để xác minh danh tính và nhận liên kết khôi phục dùng một lần." }, { status: 410 });
}
export const POST = withApiSecurity(handlePOST);
