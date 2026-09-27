"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { formatAmountForInput, normalizeAmountForApi } from "@/lib/money";
import { ArrowLeftIcon, CalendarIcon, ChevronDownIcon } from "../components/AppIcons";
import { markFinanceDataChanged } from "../components/DataRefreshSync";

const tabs = [
  { key: "expense", label: "Chi tiêu" },
  { key: "income", label: "Thu nhập" },
  { key: "exchange", label: "Đổi tiền" },
] as const;

type TabKey = (typeof tabs)[number]["key"];

function getLocalDateTimeInputValue(date = new Date()) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function AddPage({ primaryCurrency }: { primaryCurrency: "DKK" | "VND" }) {
  const [tab, setTab] = useState<TabKey>("expense");
  const [message, setMessage] = useState<{ text: string; tone: "success" | "error" } | null>(null);
  const [logTimeExpanded, setLogTimeExpanded] = useState(false);
  const [logTimeValue, setLogTimeValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hideTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  function normalizeAmount(value: FormDataEntryValue | null) {
    const raw = typeof value === "string" ? value : "";
    return normalizeAmountForApi(raw);
  }

  function normalizeCreatedAtForApi(raw: string) {
    if (!raw) return undefined;
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return undefined;
    return parsed.toISOString();
  }

  function toggleLogTime() {
    setLogTimeExpanded((previous) => {
      const next = !previous;
      if (next) {
        setLogTimeValue(getLocalDateTimeInputValue());
      }
      return next;
    });
  }

  function renderLogTimeControl() {
    return (
      <div className="rounded-control border border-slate-200 bg-slate-50 p-3">
        <button
          type="button"
          onClick={toggleLogTime}
          className="flex min-h-11 w-full items-center justify-between rounded-lg px-1 text-left text-sm font-semibold text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300"
          aria-expanded={logTimeExpanded}
        >
          <span className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-slate-500" />
            {logTimeExpanded ? "Dùng thời gian tùy chỉnh" : "Chỉnh thời gian giao dịch"}
          </span>
          <ChevronDownIcon className={`h-5 w-5 text-slate-400 transition ${logTimeExpanded ? "rotate-180" : ""}`} />
        </button>
        {logTimeExpanded ? (
          <label className="form-label mt-3">
            Thời gian giao dịch
            <input
              className="input"
              name="createdAt"
              type="datetime-local"
              value={logTimeValue}
              onChange={(event) => setLogTimeValue(event.currentTarget.value)}
            />
          </label>
        ) : null}
      </div>
    );
  }

  function handleAmountInput(event: React.FormEvent<HTMLInputElement>) {
    const target = event.currentTarget;
    const raw = target.value;
    const formatted = formatAmountForInput(raw);
    if (raw !== formatted) {
      target.value = formatted;
    }
  }

  function handleAmountBlur(event: React.FocusEvent<HTMLInputElement>) {
    event.currentTarget.value = formatAmountForInput(event.currentTarget.value);
  }

  function handleAmountFocus(event: React.FocusEvent<HTMLInputElement>) {
    event.currentTarget.value = event.currentTarget.value.replace(/\./g, "");
  }

  async function submitTransaction(type: "INCOME" | "EXPENSE", currency: "DKK" | "VND", form: HTMLFormElement) {
    if (isSubmitting) return;
    const data = new FormData(form);
    const amountMajor = normalizeAmount(data.get("amount"));
    const note = data.get("note");
    const category = data.get("category");
    const paymentMethodRaw = data.get("paymentMethod");
    const paymentMethod = typeof paymentMethodRaw === "string" ? paymentMethodRaw : undefined;
    const createdAt = normalizeCreatedAtForApi(logTimeExpanded ? logTimeValue : "");

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          currency,
          amountMajor,
          note,
          category,
          ...(type === "EXPENSE" ? { paymentMethod } : {}),
          createdAt
        })
      });

      if (!res.ok) {
        const payload = await res.json();
        setMessage({ text: payload.error ?? "Không thể lưu giao dịch. Vui lòng thử lại.", tone: "error" });
        return;
      }

      form.reset();
      markFinanceDataChanged();
      setLogTimeExpanded(false);
      setLogTimeValue("");
      setMessage({ text: "Đã lưu giao dịch", tone: "success" });
      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => setMessage(null), 5000);
    } catch {
      setMessage({ text: "Không thể lưu giao dịch. Vui lòng kiểm tra kết nối.", tone: "error" });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitExchange(form: HTMLFormElement) {
    if (isSubmitting) return;
    const data = new FormData(form);
    const fromAmountDkk = normalizeAmount(data.get("fromAmountDkk"));
    const toAmountVnd = normalizeAmount(data.get("toAmountVnd"));
    const feeAmount = normalizeAmount(data.get("feeAmount"));
    const feeCurrency = data.get("feeCurrency");
    const provider = data.get("provider");
    const createdAt = normalizeCreatedAtForApi(logTimeExpanded ? logTimeValue : "");

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromAmountDkk,
          toAmountVnd,
          feeAmount: feeAmount || undefined,
          feeCurrency: feeAmount ? feeCurrency : undefined,
          provider,
          createdAt
        })
      });

      if (!res.ok) {
        const payload = await res.json();
        setMessage({ text: payload.error ?? "Không thể lưu giao dịch. Vui lòng thử lại.", tone: "error" });
        return;
      }

      form.reset();
      markFinanceDataChanged();
      setLogTimeExpanded(false);
      setLogTimeValue("");
      setMessage({ text: "Đã lưu giao dịch đổi tiền", tone: "success" });
      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => setMessage(null), 5000);
    } catch {
      setMessage({ text: "Không thể lưu giao dịch. Vui lòng kiểm tra kết nối.", tone: "error" });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="container-page app-enter pb-32 md:pb-10">
      <div className="hero-bar">
        <div className="flex min-w-0 items-center gap-2">
          <Link href="/" prefetch={false} className="icon-button -ml-2" aria-label="Quay lại tổng quan">
            <ArrowLeftIcon className="h-6 w-6" />
          </Link>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500">Thêm nhanh</p>
            <h1 className="truncate text-xl font-semibold text-ink">Giao dịch mới</h1>
          </div>
        </div>
        <span className="chip">DKK · VND</span>
      </div>

      <div className="mx-auto w-full max-w-xl">
        <div className="segmented-control mt-6 grid-cols-3" role="tablist" aria-label="Loại giao dịch">
          {tabs.map((item) => (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={tab === item.key}
              onClick={() => setTab(item.key)}
              className={`segmented-item ${tab === item.key ? "segmented-item-active" : ""}`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {message ? (
          <div
            role="status"
            aria-live="polite"
            className={`mt-4 alert ${message.tone === "success" ? "border-emerald-200 bg-success-light text-success-dark" : "border-red-200 bg-danger-light text-danger-dark"}`}
          >
            {message.text}
          </div>
        ) : null}

        {tab === "income" && (
          <form
            className="transaction-form mt-6"
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              const currency = (data.get("currency") as "DKK" | "VND") || primaryCurrency;
              submitTransaction("INCOME", currency, event.currentTarget);
            }}
          >
            <div>
              <h2 className="text-lg font-semibold text-ink">Thông tin khoản thu</h2>
              <p className="mt-1 text-sm text-slate-500">Ghi lại nguồn tiền vừa nhận.</p>
            </div>
            <label className="form-label">
              Số tiền
              <div className="grid grid-cols-[minmax(0,1fr)_108px] gap-2">
                <input
                  className="input money-value text-lg font-semibold"
                  name="amount"
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  autoFocus
                  required
                  onInput={handleAmountInput}
                  onBlur={handleAmountBlur}
                  onFocus={handleAmountFocus}
                />
                <select className="select" name="currency" defaultValue={primaryCurrency} aria-label="Tiền tệ">
                  <option value="DKK">DKK</option>
                  <option value="VND">VND</option>
                </select>
              </div>
            </label>
            <label className="form-label">
              Danh mục
              <select className="select" name="category" defaultValue="">
                <option value="">Chọn danh mục</option>
                <option value="Lương">Lương</option>
                <option value="Người eo gửi">Người eo gửi</option>
                <option value="Người vay gửi">Người vay gửi</option>
              </select>
            </label>
            <label className="form-label">
              Ghi chú <span className="font-normal text-slate-400">(không bắt buộc)</span>
              <input className="input" name="note" type="text" placeholder="Ví dụ: Lương tháng này" />
            </label>
            {renderLogTimeControl()}
            <div className="form-actions">
              <div className="form-actions-inner">
                <button className="button" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Đang lưu..." : "Lưu thu nhập"}
                </button>
              </div>
            </div>
          </form>
        )}

        {tab === "expense" && (
          <form
            className="transaction-form mt-6"
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              const currency = (data.get("currency") as "DKK" | "VND") || primaryCurrency;
              submitTransaction("EXPENSE", currency, event.currentTarget);
            }}
          >
            <div>
              <h2 className="text-lg font-semibold text-ink">Thông tin khoản chi</h2>
              <p className="mt-1 text-sm text-slate-500">Nhập số tiền trước, các mục còn lại có thể chọn nhanh.</p>
            </div>
            <label className="form-label">
              Số tiền
              <div className="grid grid-cols-[minmax(0,1fr)_108px] gap-2">
                <input
                  className="input money-value text-lg font-semibold"
                  name="amount"
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  autoFocus
                  required
                  onInput={handleAmountInput}
                  onBlur={handleAmountBlur}
                  onFocus={handleAmountFocus}
                />
                <select className="select" name="currency" defaultValue={primaryCurrency} aria-label="Tiền tệ">
                  <option value="DKK">DKK</option>
                  <option value="VND">VND</option>
                </select>
              </div>
            </label>
            <label className="form-label">
              Danh mục
              <select className="select" name="category" defaultValue="">
                <option value="">Chọn danh mục</option>
                <option value="Tiền thuê nhà">Tiền thuê nhà</option>
                <option value="Đi chợ">Đi chợ</option>
                <option value="Tiền mừng">Tiền mừng</option>
                <option value="Mua sắm">Mua sắm</option>
                <option value="Tín dụng">Tín dụng</option>
                <option value="Gửi về gia đình">Gửi về gia đình</option>
                <option value="Khoản cho mượn">Khoản cho mượn</option>
                <option value="Hoàn trả tiền mượn">Hoàn trả tiền mượn</option>
              </select>
            </label>
            <label className="form-label">
              Phương thức thanh toán
              <select className="select" name="paymentMethod" defaultValue="CASH">
                <option value="CASH">Tiền mặt</option>
                <option value="CREDIT_CARD">Thẻ tín dụng</option>
              </select>
            </label>
            <p className="rounded-control bg-primary-50 px-3 py-2 text-xs leading-5 text-primary-800">
              Nếu mua bằng thẻ, chọn <strong>Thẻ tín dụng</strong>. Khi trả thẻ cuối kỳ, dùng danh mục <strong>Tín dụng</strong> và phương thức <strong>Tiền mặt</strong>.
            </p>
            <label className="form-label">
              Ghi chú <span className="font-normal text-slate-400">(không bắt buộc)</span>
              <input className="input" name="note" type="text" placeholder="Ví dụ: Đi siêu thị" />
            </label>
            {renderLogTimeControl()}
            <div className="form-actions">
              <div className="form-actions-inner">
                <button className="button" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Đang lưu..." : "Lưu chi tiêu"}
                </button>
              </div>
            </div>
          </form>
        )}

        {tab === "exchange" && (
          <form
            className="transaction-form mt-6"
            onSubmit={(event) => {
              event.preventDefault();
              submitExchange(event.currentTarget);
            }}
          >
            <div>
              <h2 className="text-lg font-semibold text-ink">Đổi DKK sang VND</h2>
              <p className="mt-1 text-sm text-slate-500">Ghi lại số tiền gửi, số tiền nhận và phí giao dịch.</p>
            </div>
            <label className="form-label">
              Số DKK đổi
              <input
                className="input money-value text-lg font-semibold"
                name="fromAmountDkk"
                type="text"
                inputMode="decimal"
                placeholder="0 DKK"
                autoFocus
                required
                onInput={handleAmountInput}
                onBlur={handleAmountBlur}
                onFocus={handleAmountFocus}
              />
            </label>
            <label className="form-label">
              Số VND nhận
              <input
                className="input money-value text-lg font-semibold"
                name="toAmountVnd"
                type="text"
                inputMode="decimal"
                placeholder="0 VND"
                required
                onInput={handleAmountInput}
                onBlur={handleAmountBlur}
                onFocus={handleAmountFocus}
              />
            </label>
            <div className="grid grid-cols-[minmax(0,1fr)_132px] gap-2">
              <label className="form-label">
                Phí <span className="font-normal text-slate-400">(tùy chọn)</span>
                <input
                  className="input"
                  name="feeAmount"
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  onInput={handleAmountInput}
                  onBlur={handleAmountBlur}
                  onFocus={handleAmountFocus}
                />
              </label>
              <label className="form-label">
                Đơn vị phí
                <select className="select" name="feeCurrency" defaultValue="DKK">
                  <option value="DKK">DKK</option>
                  <option value="VND">VND</option>
                </select>
              </label>
            </div>
            <label className="form-label">
              Nhà cung cấp <span className="font-normal text-slate-400">(không bắt buộc)</span>
              <input className="input" name="provider" type="text" placeholder="Tên dịch vụ đổi tiền" />
            </label>
            {renderLogTimeControl()}
            <div className="form-actions">
              <div className="form-actions-inner">
                <button className="button" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Đang lưu..." : "Lưu giao dịch đổi tiền"}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
