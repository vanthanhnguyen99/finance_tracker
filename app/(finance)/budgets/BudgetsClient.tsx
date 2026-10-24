"use client";
import { Dialog } from "../../components/ui/Dialog";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { BudgetView } from "@/lib/budgets";
import type { FinanceCurrency } from "@/lib/finance-validation";
import { formatMajorAmountForInput, normalizeAmountForApi } from "@/lib/money";
import { BudgetCard } from "../../components/BudgetCard";
import { markFinanceDataChanged } from "../../components/DataRefreshSync";
export function BudgetsClient({
  month,
  currency,
  budgets,
  categories,
}: {
  month: string;
  currency: FinanceCurrency;
  budgets: BudgetView[];
  categories: string[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const mutating = useRef(false);
  const [visibleBudgets, setVisibleBudgets] = useState(budgets);
  const serverSignature = JSON.stringify(budgets);
  const previousSignature = useRef(serverSignature);
  useEffect(() => {
    if (previousSignature.current === serverSignature) return;
    previousSignature.current = serverSignature;
    setVisibleBudgets(budgets);
  }, [budgets, serverSignature]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<BudgetView | null>(null);
  const [creating, setCreating] = useState(false);
  const [scope, setScope] = useState("TOTAL");
  async function mutate(path: string, method: string, body?: object) {
    if (mutating.current) return false;
    mutating.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(path, {
        method,
        headers: { "Content-Type": "application/json" },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.error ?? "Không thể lưu ngân sách.");
      setCreating(false);
      setEditing(null);
      setMessage(
        path.endsWith("copy-previous")
          ? `Đã sao chép ${payload.copied} ngân sách, bỏ qua ${payload.skipped} mục đã có.`
          : "Đã cập nhật ngân sách.",
      );
      // Read computed views from the server; do not infer spending or totals from the POST response.
      try {
        const query = new URLSearchParams({ month, currency });
        const fresh = await fetch(`/api/budgets?${query}`, { cache: "no-store" });
        const views = await fresh.json();
        if (!fresh.ok || !Array.isArray(views.budgets)) throw new Error("Budget refresh failed");
        setVisibleBudgets(views.budgets);
      } catch {
        setError("Đã lưu thay đổi, nhưng chưa tải được danh sách mới. Hãy tải lại trang.");
      }
      markFinanceDataChanged();
      return true;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Không thể lưu. Vui lòng kiểm tra kết nối.",
      );
      return false;
    } finally {
      mutating.current = false;
      setBusy(false);
    }
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const limitMajor = normalizeAmountForApi(
      String(data.get("limitMajor") ?? ""),
    );
    if (editing)
      await mutate(`/api/budgets/${editing.id}`, "PATCH", { limitMajor });
    else
      await mutate("/api/budgets", "POST", {
        month,
        currency,
        scope,
        category: data.get("category"),
        limitMajor,
      });
  }
  return (
    <>
      <form
        className="card mt-5 grid min-w-0 grid-cols-1 gap-3 min-[360px]:grid-cols-2 sm:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          router.push(
            `/budgets?${new URLSearchParams({ month: String(data.get("month")), currency: String(data.get("currency")) })}`,
          );
        }}
      >
        <label className="form-label">
          Tháng
          <input
            className="input"
            type="month"
            name="month"
            defaultValue={month}
            required
          />
        </label>
        <label className="form-label">
          Tiền tệ
          <select
            aria-label="Tiền tệ"
            className="select"
            name="currency"
            defaultValue={currency}
          >
            <option>DKK</option>
            <option>VND</option>
          </select>
        </label>
        <button className="button button-secondary self-end min-[360px]:col-span-2 sm:col-span-1" disabled={busy}>
          Xem ngân sách
        </button>
      </form>
      <details className="mt-3 text-sm leading-6 text-slate-600">
        <summary className="min-h-11 cursor-pointer py-2">
          Ngân sách tháng {month.split("-").reverse().join("/")} · {currency}
        </summary>
        <p className="pb-2">Tính chi tiền mặt và mua bằng thẻ, không gồm trả thẻ, đổi tiền hoặc phí
        đổi tiền. Ngân sách tổng và từng danh mục độc lập.</p>
      </details>
      <div className="mt-3 grid grid-cols-1 gap-3 min-[360px]:grid-cols-2">
        <button
          className="button"
          disabled={busy}
          onClick={() => {
            setEditing(null);
            setCreating(true);
            setScope("TOTAL");
            setError("");
          }}
        >
          Thêm ngân sách
        </button>
        <button
          className="button button-secondary"
          disabled={busy}
          onClick={() =>
            mutate("/api/budgets/copy-previous", "POST", { month, currency })
          }
        >
          Sao chép tháng trước
        </button>
      </div>
      {message && (
        <p
          role="status"
          className="alert mt-4 border-success/20 text-success-dark"
        >
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="alert mt-4 border-danger/20 text-danger-dark">
          {error}
        </p>
      )}
      {(creating || editing) && (
        <Dialog open={creating || !!editing} onClose={() => { if (!busy) { setCreating(false); setEditing(null); } }} labelledBy="budget-form-title">
        <form
          key={editing?.id ?? "new"}
          className="grid gap-4"
          onSubmit={submit}
          aria-label={editing ? "Sửa hạn mức" : "Tạo ngân sách"}
        >
          <h2 id="budget-form-title" className="text-lg font-semibold">
            {editing
              ? `Sửa hạn mức: ${editing.scope === "TOTAL" ? "Tổng tháng" : (editing.category ?? "Chưa phân loại")}`
              : "Ngân sách mới"}
          </h2>
          {!editing && (
            <>
              <label className="form-label">
                Phạm vi
                <select
                  className="select"
                  aria-label="Phạm vi"
                  name="scope"
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                  disabled={busy}
                >
                  <option value="TOTAL">Tổng tháng</option>
                  <option value="CATEGORY">Theo danh mục</option>
                  <option value="UNCATEGORIZED">Chưa phân loại</option>
                </select>
              </label>
              {scope === "CATEGORY" && (
                <label className="form-label">
                  Danh mục
                  <select
                    className="select"
                    aria-label="Danh mục"
                    name="category"
                    required
                    disabled={busy}
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Chọn danh mục
                    </option>
                    {categories.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </label>
              )}
            </>
          )}
          <label className="form-label">
            Hạn mức ({currency})
            <input
              autoFocus
              className="input"
              name="limitMajor"
              inputMode="decimal"
              required
              disabled={busy}
              defaultValue={
                editing
                  ? formatMajorAmountForInput(
                      editing.limitMinor / (currency === "DKK" ? 100 : 1),
                    )
                  : ""
              }
              placeholder={
                currency === "DKK" ? "Ví dụ: 2.000,50" : "Ví dụ: 5.000.000"
              }
            />
          </label>
          <p className="text-xs text-slate-500">
            Dùng dấu phẩy cho phần thập phân. Cảnh báo từ 80%; vượt hạn mức vẫn
            được ghi giao dịch.
          </p>
          <div className="flex gap-3">
            <button className="button" disabled={busy}>
              {busy ? "Đang lưu…" : "Lưu hạn mức"}
            </button>
            <button
              type="button"
              className="button button-secondary"
              disabled={busy}
              onClick={() => {
                setCreating(false);
                setEditing(null);
              }}
            >
              Hủy
            </button>
          </div>
        </form>
        </Dialog>
      )}
      {!visibleBudgets.length ? (
        <div className="empty-state mt-6">
          <h2 className="text-lg font-semibold">Chưa đặt ngân sách</h2>
          <p className="mt-2 text-sm text-slate-500">
            Tạo hạn mức cho tháng này hoặc sao chép từ tháng trước để bắt đầu.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {[...visibleBudgets]
            .sort(
              (a, b) =>
                Number(b.scope === "TOTAL") - Number(a.scope === "TOTAL"),
            )
            .map((budget) => (
              <BudgetCard key={budget.id} budget={budget}>
                <button
                  className="min-h-11 text-sm font-semibold text-primary-700"
                  disabled={busy}
                  onClick={() => {
                    setCreating(false);
                    setEditing(budget);
                    setError("");
                  }}
                >
                  Sửa hạn mức
                </button>
                <button
                  className="min-h-11 text-sm font-semibold text-danger-dark"
                  disabled={busy}
                  onClick={() => {
                    if (confirm("Xóa hạn mức này? Giao dịch được giữ nguyên."))
                      void mutate(`/api/budgets/${budget.id}`, "DELETE");
                  }}
                >
                  Xóa
                </button>
              </BudgetCard>
            ))}
        </div>
      )}
    </>
  );
}
