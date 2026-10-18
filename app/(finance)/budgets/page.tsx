import Link from "next/link";
import { AppPage } from "../../components/AppPage";
import { cookies } from "next/headers";
import { requireActivePageSession } from "@/lib/server-auth";
import { resolveTimeZone, TIMEZONE_COOKIE_NAME } from "@/lib/timezone";
import { currentMonth, parseMonth } from "@/lib/budget-utils";
import { getBudgets } from "@/lib/budgets";
import { getUserCategories } from "@/lib/history";
import { FinanceInputError, parseCurrency } from "@/lib/finance-validation";
import { ProfileMenu } from "../../components/ProfileMenu";
import { BudgetsClient } from "./BudgetsClient";
export const dynamic = "force-dynamic";
export default async function Budgets({ searchParams }: { searchParams: Promise<{ month?: string; currency?: string }> }) {
  const user = await requireActivePageSession();
  const cookieStore = await cookies();
  const timeZone = resolveTimeZone(cookieStore.get(TIMEZONE_COOKIE_NAME)?.value);
  const params = await searchParams;
  const result = await (async () => {
    try {
      const month = parseMonth(params.month ?? currentMonth(timeZone));
      const currency = parseCurrency(params.currency ?? user.primaryCurrency);
      const [budgets, categories] = await Promise.all([getBudgets(user.id, month, currency, timeZone), getUserCategories(user.id, "EXPENSE")]);
      return { month, currency, budgets, categories };
    } catch (error) {
      if (!(error instanceof FinanceInputError)) throw error;
      return { error: error.message };
    }
  })();
  return <AppPage header={<><h1 className="text-xl font-semibold text-ink">Ngân sách</h1><ProfileMenu name={user.displayName} email={user.email} primaryCurrency={user.primaryCurrency} /></>}>
    {"error" in result ? <><p role="alert" className="alert mt-4 text-danger-dark">{result.error}</p><Link href="/budgets" className="button mt-4">Về tháng hiện tại</Link></> :
      <BudgetsClient key={`${result.month}:${result.currency}`} month={result.month} currency={result.currency} budgets={result.budgets} categories={result.categories} />}
  </AppPage>;
}
