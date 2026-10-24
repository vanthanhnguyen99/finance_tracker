import { AppPage } from "../../components/AppPage";
import { cookies } from "next/headers";
import { requireActivePageSession } from "@/lib/server-auth";
import { resolveTimeZone, TIMEZONE_COOKIE_NAME } from "@/lib/timezone";
import {
  getHistory,
  getUserCategories,
  parseHistoryFilters,
  type HistoryResult,
} from "@/lib/history";
import { FinanceInputError } from "@/lib/finance-validation";
import { ProfileMenu } from "../../components/ProfileMenu";
import { HistoryFiltersForm, HistoryResults } from "./HistoryClient";
export const dynamic = "force-dynamic";
export default async function History({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireActivePageSession();
  const cookieStore = await cookies();
  const timeZone = resolveTimeZone(
    cookieStore.get(TIMEZONE_COOKIE_NAME)?.value,
  );
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams))
    if (typeof value === "string" && key !== "refresh" && key !== "cursor")
      params.set(key, value);
  const categories = await getUserCategories(user.id);
  let error = "";
  let result: HistoryResult | null = null;
  try {
    result = await getHistory(user.id, parseHistoryFilters(params, timeZone));
  } catch (err) {
    if (err instanceof FinanceInputError) error = err.message;
    else throw err;
  }
  const incompatibleExchange =
    params.get("type") === "exchange" &&
    Boolean(
      params.get("category") ||
      params.get("uncategorized") ||
      params.get("paymentMethod") ||
      params.get("expenseScope"),
    );
  return (
    <AppPage header={<>
        <div className="flex min-w-0 items-center gap-3">
          <img src="/logo.svg" alt="" className="h-9 w-9 shrink-0" />
          <h1 className="text-xl font-semibold text-ink">Giao dịch</h1>
        </div>
        <ProfileMenu
          name={user.displayName}
          email={user.email}
          primaryCurrency={user.primaryCurrency}
        />
       </>}>

      <HistoryFiltersForm
        key={`filters:${params.toString()}`}
        query={params.toString()}
        categories={categories}
      />
      {error && (
        <p className="alert mt-4 border-danger/20 text-danger-dark" role="alert">
          {error}
        </p>
      )}
      {incompatibleExchange && (
        <p className="mt-4 text-sm text-slate-600">
          Giao dịch đổi tiền không có danh mục hoặc phương thức thanh toán, và
          không thuộc chi tiêu tính ngân sách. Hãy bỏ các bộ lọc này để xem đổi
          tiền.
        </p>
      )}
      {result && (
        <HistoryResults
          key={`results:${params.toString()}`}
          initial={result}
          query={params.toString()}
          timeZone={timeZone}
        />
      )}
    </AppPage>
  );
}
