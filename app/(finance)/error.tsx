"use client";
import { AppPage } from "../components/AppPage";
import { Button } from "../components/ui/Surfaces";
export default function FinanceError({ reset }: { error: Error; reset: () => void }) {
  return <AppPage header={<h1 className="text-xl font-semibold">Không thể tải dữ liệu</h1>}>
    <div className="card mt-6"><p role="alert">Có lỗi khi tải dữ liệu. Vui lòng thử lại.</p><Button className="mt-4" onClick={reset}>Thử lại</Button></div>
  </AppPage>;
}
