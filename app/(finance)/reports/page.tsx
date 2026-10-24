import { AppPage } from "../../components/AppPage";
import { requireActivePageSession } from "@/lib/server-auth";
import { ChartIcon } from "../../components/AppIcons";
import { ProfileMenu } from "../../components/ProfileMenu";

export const dynamic = "force-dynamic";

export default async function Reports() {
  const user = await requireActivePageSession();

  return (
    <AppPage header={<>
        <h1 className="text-xl font-semibold text-ink">Báo cáo</h1>
        <ProfileMenu
          name={user.displayName}
          email={user.email}
          primaryCurrency={user.primaryCurrency}
        />
       </>}>

      <section className="reports-placeholder mt-6" aria-labelledby="reports-coming-soon">
        <span className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-500">
          <ChartIcon className="h-8 w-8" />
        </span>
        <h2 id="reports-coming-soon" className="text-xl font-semibold text-ink">
          Sắp ra mắt
        </h2>
      </section>
    </AppPage>
  );
}
