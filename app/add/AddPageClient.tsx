"use client";

import { useEffect, useRef, useState } from "react";
import { formatAmountForInput, normalizeAmountForApi } from "@/lib/money";
import { LogoutButton } from "../components/LogoutButton";

const tabs = [
  { key: "expense", label: "Chi tiêu" },
  { key: "income", label: "Thu nhập" },
  { key: "exchange", label: "Đổi tiền" },
] as const;

type TabKey = (typeof tabs)[number]["key"];

export default function AddPage() {
  const [tab, setTab] = useState<TabKey>("expense");
  const [message, setMessage] = useState<{ text: string; tone: "success" | "error" } | null>(null);
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
    const data = new FormData(form);
    const amountMajor = normalizeAmount(data.get("amount"));
    const note = data.get("note");
    const category = data.get("category");

    const res = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        currency,
        amountMajor,
        note,
        category
      })
    });

    if (!res.ok) {
      const payload = await res.json();
      setMessage({ text: payload.error ?? "Failed", tone: "error" });
      return;
    }

    form.reset();
      setMessage({ text: "Lưu thành công", tone: "success" });
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setMessage(null), 5000);
  }

  async function submitExchange(form: HTMLFormElement) {
    const data = new FormData(form);
    const fromAmountDkk = normalizeAmount(data.get("fromAmountDkk"));
    const toAmountVnd = normalizeAmount(data.get("toAmountVnd"));
    const feeAmount = normalizeAmount(data.get("feeAmount"));
    const feeCurrency = data.get("feeCurrency");
    const provider = data.get("provider");

    const res = await fetch("/api/exchange", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fromAmountDkk,
        toAmountVnd,
        feeAmount: feeAmount || undefined,
        feeCurrency: feeAmount ? feeCurrency : undefined,
        provider
      })
    });

    if (!res.ok) {
      const payload = await res.json();
      setMessage({ text: payload.error ?? "Failed", tone: "error" });
      return;
    }

    form.reset();
    setMessage({ text: "Lưu đổi tiền thành công", tone: "success" });
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setMessage(null), 5000);
  }

  return (
    <main className="container-page">
      <div className="hero-bar">
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-400">Thêm nhanh</p>
          <h1 className="text-lg font-semibold text-ink">Giao dịch mới</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="chip">DKK / VND</span>
          <LogoutButton />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {tabs.map((item) => (
          <button
            key={item.key}
            onClick={() => setTab(item.key)}
            className={`rounded-full border px-4 py-2 text-xs font-semibold ${
              tab === item.key
                ? "border-transparent bg-ink text-white"
                : "border-slate-200 text-slate-500"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {message ? (
        <div
          className={`mt-4 alert ${message.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}
        >
          {message.text}
        </div>
      ) : null}

      {tab === "income" && (
        <form
          className="mt-6 grid gap-4 card"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            const currency = (data.get("currency") as "DKK" | "VND") || "DKK";
            submitTransaction("INCOME", currency, event.currentTarget);
          }}
        >
          <p className="text-sm font-semibold text-ink">Thu nhập</p>
          <div className="grid grid-cols-2 gap-2">
            <input
              className="input"
              name="amount"
              type="text"
              inputMode="decimal"
              placeholder="Số tiền"
              required
              onInput={handleAmountInput}
              onBlur={handleAmountBlur}
              onFocus={handleAmountFocus}
            />
            <select className="select" name="currency" defaultValue="DKK">
              <option value="DKK">DKK</option>
              <option value="VND">VND</option>
            </select>
          </div>
          <select className="select" name="category" defaultValue="">
            <option value="">Chọn danh mục</option>
            <option value="Lương">Lương</option>
            <option value="Người eo gửi">Người eo gửi</option>
            <option value="Người vay gửi">Người vay gửi</option>
          </select>
          <input className="input" name="note" type="text" placeholder="Ghi chú (tuỳ chọn)" />
          <button className="button" type="submit">Lưu thu nhập</button>
        </form>
      )}

      {tab === "expense" && (
        <form
          className="mt-6 grid gap-4 card"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            const currency = (data.get("currency") as "DKK" | "VND") || "DKK";
            submitTransaction("EXPENSE", currency, event.currentTarget);
          }}
        >
          <p className="text-sm font-semibold text-ink">Chi tiêu</p>
          <div className="grid grid-cols-2 gap-2">
            <input
              className="input"
              name="amount"
              type="text"
              inputMode="decimal"
              placeholder="Số tiền"
              required
              onInput={handleAmountInput}
              onBlur={handleAmountBlur}
              onFocus={handleAmountFocus}
            />
            <select className="select" name="currency" defaultValue="DKK">
              <option value="DKK">DKK</option>
              <option value="VND">VND</option>
            </select>
          </div>
          <select className="select" name="category" defaultValue="">
            <option value="">Chọn danh mục</option>
            <option value="Tiền thuê nhà">Tiền thuê nhà</option>
            <option value="Mua sắm">Mua sắm</option>
            <option value="Tín dụng">Tín dụng</option>
            <option value="Gửi về gia đình">Gửi về gia đình</option>
            <option value="Khoản cho mượn">Khoản cho mượn</option>
            <option value="Hoàn trả tiền mượn">Hoàn trả tiền mượn</option>
          </select>
          <input className="input" name="note" type="text" placeholder="Ghi chú (tuỳ chọn)" />
          <button className="button" type="submit">Lưu chi tiêu</button>
        </form>
      )}

      {tab === "exchange" && (
        <form
          className="mt-6 grid gap-4 card"
          onSubmit={(event) => {
            event.preventDefault();
            submitExchange(event.currentTarget);
          }}
        >
          <p className="text-sm font-semibold text-ink">Đổi DKK → VND</p>
          <input
            className="input"
            name="fromAmountDkk"
            type="text"
            inputMode="decimal"
            placeholder="DKK đổi"
            required
            onInput={handleAmountInput}
            onBlur={handleAmountBlur}
            onFocus={handleAmountFocus}
          />
          <input
            className="input"
            name="toAmountVnd"
            type="text"
            inputMode="decimal"
            placeholder="VND nhận"
            required
            onInput={handleAmountInput}
            onBlur={handleAmountBlur}
            onFocus={handleAmountFocus}
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              className="input"
              name="feeAmount"
              type="text"
              inputMode="decimal"
              placeholder="Phí (tuỳ chọn)"
              onInput={handleAmountInput}
              onBlur={handleAmountBlur}
              onFocus={handleAmountFocus}
            />
            <select className="select" name="feeCurrency" defaultValue="DKK">
              <option value="DKK">Phí bằng DKK</option>
              <option value="VND">Phí bằng VND</option>
            </select>
          </div>
          <input className="input" name="provider" type="text" placeholder="Nhà cung cấp (tuỳ chọn)" />
          <button className="button" type="submit">Lưu đổi tiền</button>
        </form>
      )}
    </main>
  );
}
