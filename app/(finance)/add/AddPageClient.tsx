"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { normalizeAmountForApi } from "@/lib/money";
import { readUiSession, writeUiSession } from "@/lib/ui-session";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/lib/categories";
import { ArrowLeftIcon, CalendarIcon, ChevronDownIcon } from "../../components/AppIcons";
import { markFinanceDataChanged } from "../../components/DataRefreshSync";
import { AppPage } from "../../components/AppPage";
import { useAppState } from "../../components/AppShell";
import { SegmentedControl } from "../../components/ui/SegmentedControl";
import { MoneyInput } from "../../components/ui/MoneyInput";
import { FormActions } from "../../components/ui/FormActions";
import { Button, Feedback, Select, TextField } from "../../components/ui/Surfaces";

const tabs = [{ key: "expense", label: "Chi tiêu" }, { key: "income", label: "Thu nhập" }, { key: "exchange", label: "Đổi tiền" }] as const;
type Tab = (typeof tabs)[number]["key"];
type Draft = Record<string, string>;
type Drafts = { tab: Tab; values: Record<Tab, Draft> };
const emptyDrafts = (): Drafts => ({ tab: "expense", values: { expense: {}, income: {}, exchange: {} } });
function localTime() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}
function validDrafts(value: Drafts): Drafts {
  if (!value || !tabs.some(tab => tab.key === value.tab)) return emptyDrafts();
  const result = emptyDrafts(); result.tab = value.tab;
  for (const { key } of tabs) {
    const fields = value.values?.[key];
    if (fields && typeof fields === "object") for (const [name, entry] of Object.entries(fields)) {
      if (typeof entry === "string") result.values[key][name] = entry;
    }
  }
  return result;
}

export default function AddPage({ primaryCurrency }: { primaryCurrency: "DKK" | "VND" }) {
  const app = useAppState();
  const [drafts, setDrafts] = useState<Drafts>(emptyDrafts);
  const current = useRef(drafts);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState<{ text: string; tone: "success" | "error" } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitting = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tab = drafts.tab;
  const fields = drafts.values[tab];
  useEffect(() => {
    const saved = validDrafts(readUiSession(app.userId, "drafts", emptyDrafts()));
    current.current = saved; setDrafts(saved); setReady(true);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [app.userId]);
  function commit(next: Drafts) {
    current.current = next; setDrafts(next); writeUiSession(app.userId, "drafts", next);
  }
  function field(name: string, value: string) {
    const old = current.current;
    commit({ ...old, values: { ...old.values, [old.tab]: { ...old.values[old.tab], [name]: value } } });
  }
  function changeTab(next: Tab) {
    if (submitting.current) return;
    commit({ ...current.current, tab: next }); setMessage(null);
  }
  const value = (name: string, fallback = "") => fields[name] ?? fallback;
  const currency = value("currency", primaryCurrency);
  function money(name: string, label: string, required = true) {
    return <label className="form-label">{label}<MoneyInput name={name} value={value(name)} placeholder="0" required={required} disabled={isSubmitting}
      onValueChange={next => field(name, next)} /></label>;
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready || submitting.current) return;
    submitting.current = true; setIsSubmitting(true); setMessage(null);
    if (timer.current) clearTimeout(timer.current);
    const submittedTab = tab;
    const form = event.currentTarget;
    const data = new FormData(form);
    const amount = (name: string) => normalizeAmountForApi(String(data.get(name) ?? ""));
    const createdAt = fields.customTime === "1" && fields.createdAt ? new Date(fields.createdAt).toISOString() : undefined;
    const payload = tab === "exchange" ? {
      fromAmountDkk: amount("fromAmountDkk"), toAmountVnd: amount("toAmountVnd"),
      feeAmount: amount("feeAmount") || undefined, feeCurrency: amount("feeAmount") ? data.get("feeCurrency") : undefined,
      provider: data.get("provider"), createdAt
    } : {
      type: tab === "income" ? "INCOME" : "EXPENSE", currency, amountMajor: amount("amount"),
      category: data.get("category"), note: data.get("note"), ...(tab === "expense" ? { paymentMethod: data.get("paymentMethod") } : {}), createdAt
    };
    try {
      const response = await fetch(tab === "exchange" ? "/api/exchange" : "/api/transactions", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage({ text: result.error ?? "Không thể lưu giao dịch. Vui lòng thử lại.", tone: "error" });
        form.querySelector<HTMLElement>("input:invalid, select:invalid, textarea:invalid")?.focus();
        return;
      }
      const old = current.current;
      commit({ ...old, values: { ...old.values, [submittedTab]: {} } });
      markFinanceDataChanged();
      setMessage({ text: "Đã lưu giao dịch", tone: "success" });
      timer.current = setTimeout(() => setMessage(null), 5000);
    } catch {
      setMessage({ text: "Chưa xác nhận được kết quả lưu. Hãy kiểm tra Giao dịch trước khi thử lại.", tone: "error" });
    } finally { submitting.current = false; setIsSubmitting(false); }
  }
  return <AppPage className="pb-32 md:pb-10" header={<>
    <div className="flex min-w-0 items-center gap-2">
      <Link href={app.returnHref} scroll={!app.returnHref.startsWith("/history")} prefetch={false} className="icon-button -ml-2" aria-label="Quay lại màn hình trước"><ArrowLeftIcon className="h-6 w-6" /></Link>
      <div className="min-w-0"><p className="text-xs font-medium text-slate-500">Thêm nhanh</p><h1 className="truncate text-xl font-semibold text-ink">Giao dịch mới</h1></div>
    </div><span className="chip">DKK · VND</span>
  </>}>
    <div className="mx-auto w-full max-w-xl">
      <SegmentedControl items={tabs} value={tab} onChange={changeTab} disabled={!ready || isSubmitting} id="transaction-type" label="Loại giao dịch" />
      {message && <Feedback tone={message.tone}>{message.text}</Feedback>}
      <div key={tab} className="form-panel" id="transaction-type-panel" role="tabpanel" aria-labelledby={`transaction-type-${tab}`}>
        <form id="new-transaction" className="transaction-form mt-6" onSubmit={submit} aria-busy={isSubmitting}>
          <fieldset disabled={!ready || isSubmitting} className="grid min-w-0 gap-4">
          <div><h2 className="text-lg font-semibold">{tab === "exchange" ? "Đổi DKK sang VND" : tab === "income" ? "Thông tin khoản thu" : "Thông tin khoản chi"}</h2>
            <p className="mt-1 text-sm text-slate-500">{tab === "exchange" ? "Ghi lại số tiền gửi, số tiền nhận và phí giao dịch." : "Bản nháp được giữ trong phiên trình duyệt này."}</p></div>
          {tab === "exchange" ? <>
            {money("fromAmountDkk", "Số DKK đổi")}{money("toAmountVnd", "Số VND nhận")}
            <div className="grid grid-cols-[minmax(0,1fr)_132px] gap-2">{money("feeAmount", "Phí (tùy chọn)", false)}
              <label className="form-label">Đơn vị phí<Select name="feeCurrency" value={value("feeCurrency", "DKK")} onChange={event => field("feeCurrency", event.target.value)}><option>DKK</option><option>VND</option></Select></label>
            </div>
            <label className="form-label">Nhà cung cấp (không bắt buộc)<TextField name="provider" value={value("provider")} onChange={event => field("provider", event.target.value)} placeholder="Tên dịch vụ đổi tiền" /></label>
          </> : <>
            <div className="grid grid-cols-[minmax(0,1fr)_108px] gap-2">{money("amount", "Số tiền")}
              <label className="form-label">Tiền tệ<Select name="currency" value={currency} onChange={event => field("currency", event.target.value)}><option>DKK</option><option>VND</option></Select></label>
            </div>
            <label className="form-label">Danh mục<Select name="category" value={value("category")} onChange={event => field("category", event.target.value)}><option value="">Chọn danh mục</option>{(tab === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map(category => <option key={category}>{category}</option>)}</Select></label>
            {tab === "expense" && <>
              <label className="form-label">Phương thức thanh toán<Select name="paymentMethod" value={value("paymentMethod", "CASH")} onChange={event => field("paymentMethod", event.target.value)}><option value="CASH">Tiền mặt</option><option value="CREDIT_CARD">Thẻ tín dụng</option></Select></label>
              <p className="rounded-control bg-primary-50 px-3 py-2 text-xs leading-5 text-primary-800">Nếu mua bằng thẻ, chọn <strong>Thẻ tín dụng</strong>. Khi trả thẻ cuối kỳ, dùng danh mục <strong>Tín dụng</strong> và phương thức <strong>Tiền mặt</strong>.</p>
            </>}
            <label className="form-label">Ghi chú (không bắt buộc)<TextField name="note" value={value("note")} onChange={event => field("note", event.target.value)} placeholder="Ghi chú giao dịch" /></label>
          </>}
          <div className="surface-muted p-3">
            <button type="button" className="flex min-h-11 w-full items-center justify-between gap-2 text-left text-sm font-semibold" aria-expanded={fields.customTime === "1"}
              onClick={() => { const old = current.current; commit({ ...old, values: { ...old.values, [tab]: { ...old.values[tab], customTime: fields.customTime === "1" ? "0" : "1", createdAt: fields.createdAt || localTime() } } }); }}>
              <CalendarIcon /><span className="flex-1">Chỉnh thời gian giao dịch</span><ChevronDownIcon className={`h-5 w-5 ${fields.customTime === "1" ? "rotate-180" : ""}`} />
            </button>
            {fields.customTime === "1" && <label className="form-label mt-3">Thời gian giao dịch<TextField name="createdAt" type="datetime-local" required value={value("createdAt")} onChange={event => field("createdAt", event.target.value)} /></label>}
          </div>
          <Button type="button" variant="ghost" disabled={!ready || isSubmitting} onClick={() => { const old = current.current; commit({ ...old, values: { ...old.values, [tab]: {} } }); setMessage(null); }}>Bỏ bản nháp</Button>
          <FormActions><Button form="new-transaction" type="submit" disabled={!ready || isSubmitting}>{isSubmitting ? "Đang lưu…" : tab === "expense" ? "Lưu chi tiêu" : tab === "income" ? "Lưu thu nhập" : "Lưu giao dịch đổi tiền"}</Button></FormActions>
          </fieldset>
        </form>
      </div>
    </div>
  </AppPage>;
}
