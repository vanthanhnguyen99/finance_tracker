import { AppPage } from "../components/AppPage";
export default function Loading() {
  return <AppPage motion={false} header={<h1 className="text-xl font-semibold">Đang tải…</h1>}><div className="route-loading" aria-busy="true">
    <p role="status">Đang tải dữ liệu…</p>
    <div className="skeleton mt-4 w-64" aria-hidden="true" />
  </div></AppPage>;
}
