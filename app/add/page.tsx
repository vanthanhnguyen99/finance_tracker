import AddPageClient from "./AddPageClient";
import { requireActivePageSession } from "@/lib/server-auth";

export default async function AddPage() {
  await requireActivePageSession();
  return <AddPageClient />;
}
