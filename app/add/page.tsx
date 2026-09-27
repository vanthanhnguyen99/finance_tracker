import AddPageClient from "./AddPageClient";
import { requireActivePageSession } from "@/lib/server-auth";

export default async function AddPage() {
  const user = await requireActivePageSession();
  return <AddPageClient primaryCurrency={user.primaryCurrency} />;
}
