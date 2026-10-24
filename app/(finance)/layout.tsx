import { requireActivePageSession } from "@/lib/server-auth";
import { AppShell } from "../components/AppShell";
export default async function FinanceLayout({ children }: { children: React.ReactNode }) {
  const user = await requireActivePageSession();
  return <AppShell key={user.id} userId={user.id}>{children}</AppShell>;
}
