import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getActiveUserBySessionToken } from "@/lib/auth";
import { SESSION_COOKIE_NAME } from "@/lib/session-constants";

export async function requireActivePageSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const user = await getActiveUserBySessionToken(token);
  if (!user) {
    redirect("/login");
  }
  return user;
}
