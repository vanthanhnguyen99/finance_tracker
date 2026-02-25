"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatAmountForInput, normalizeAmountForApi } from "@/lib/money";

export type HistoryItem =
  | {
      id: string;
      type: "INCOME" | "EXPENSE";
      createdAt: string;
      description: string;
      detail: string;
      note?: string | null;
      category?: string | null;
      paymentMethod?: "CASH" | "CREDIT_CARD" | null;
      currency: "DKK" | "VND";
      amountMajor: number;
    }
  | {
      id: string;
      type: "EXCHANGE";
      createdAt: string;
      description: string;
      detail: string;
      provider?: string | null;
      fee?: string | null;
      fromAmountDkk?: number;
      toAmountVnd?: number;
      feeAmountDkk?: number;
    };

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(date));
}

function paymentMethodLabel(value: "CASH" | "CREDIT_CARD" | null | undefined) {
  return value === "CREDIT_CARD" ? "Thẻ tín dụng" : "Tiền mặt";
}

export function HistoryList({ items }: { items: HistoryItem[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  function handleAmountInput(event: React.FormEvent<HTMLInputElement>) {
    const target = event.currentTarget;
    const raw = target.value;
    const formatted = formatAmountForInput(raw);
    if (raw !== formatted) {
      target.value = formatted;
    }
  }

  function handleAmountFocus(event: React.FocusEvent<HTMLInputElement>) {
    event.currentTarget.value = event.currentTarget.value.replace(/\./g, "");
  }

  function normalizeAmount(value: FormDataEntryValue | null) {
    const raw = typeof value === "string" ? value : "";
    return normalizeAmountForApi(raw);
  }

  async function deleteItem(item: HistoryItem) {
    if (!confirm("Xoá giao dịch này?")) return;
    const endpoint = item.type === "EXCHANGE" ? `/api/exchange/${item.id}` : `/api/transactions/${item.id}`;
    await fetch(endpoint, { method: "DELETE" });
    router.refresh();
  }

  async function saveEdit(item: Extract<HistoryItem, { type: "INCOME" | "EXPENSE" }>, form: HTMLFormElement) {
    const data = new FormData(form);
    const amountMajor = normalizeAmount(data.get("amount"));
    const note = data.get("note");
    const category = data.get("category");
    const currency = data.get("currency");
    const paymentMethodRaw = data.get("paymentMethod");
    const paymentMethod = typeof paymentMethodRaw === "string" ? paymentMethodRaw : undefined;
    setSaving(true);
    const res = await fetch(`/api/transactions/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amountMajor,
        note,
        category,
        currency,
        ...(item.type === "EXPENSE" ? { paymentMethod } : {})
      })
    });
    setSaving(false);
    if (!res.ok) {
      const payload = await res.json();
      alert(payload.error ?? "Cập nhật thất bại");
      return;
    }
    setEditingId(null);
    router.refresh();
  }

  async function saveExchangeEdit(item: Extract<HistoryItem, { type: "EXCHANGE" }>, form: HTMLFormElement) {
    const data = new FormData(form);
    const fromAmountDkk = normalizeAmount(data.get("fromAmountDkk"));
    const toAmountVnd = normalizeAmount(data.get("toAmountVnd"));
    const feeAmount = normalizeAmount(data.get("feeAmount"));
    setSaving(true);
    const res = await fetch(`/api/exchange/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fromAmountDkk,
        toAmountVnd,
        feeAmount: feeAmount || undefined
      })
    });
    setSaving(false);
    if (!res.ok) {
      const payload = await res.json();
      alert(payload.error ?? "Cập nhật thất bại");
      return;
    }
    setEditingId(null);
    router.refresh();
  }

  return (
    <div className="mt-6 grid gap-3">
      {items.length === 0 ? (
        <div className="card text-sm text-slate-500">Chưa có giao dịch.</div>
      ) : (
        items.map((item) => {
          const isOpen = openId === item.id;
          return (
            <div key={item.id} className="card text-left">
              <button
                type="button"
                onClick={() => setOpenId(isOpen ? null : item.id)}
                className="w-full text-left"
              >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-ink">{item.description}</p>
                <span className="text-xs text-slate-400">{formatDate(item.createdAt)}</span>
              </div>
              <p
                className={`mt-2 text-lg font-semibold ${
                  item.type === "INCOME"
                    ? "text-emerald-600"
                    : item.type === "EXPENSE"
                      ? "text-rose-500"
                      : "text-ink"
                }`}
              >
                {item.detail}
              </p>
              </button>
              {isOpen ? (
                <div className="mt-3 grid gap-3 text-xs text-slate-500">
                  {editingId === item.id ? (
                    <form
                      className="grid gap-2"
                      onSubmit={(event) => {
                        event.preventDefault();
                        if (item.type === "EXCHANGE") {
                          saveExchangeEdit(item, event.currentTarget);
                        } else {
                          saveEdit(item, event.currentTarget);
                        }
                      }}
                    >
                      {item.type === "EXCHANGE" ? (
                        <>
                          <label className="grid gap-1 text-[10px] uppercase tracking-wide text-slate-400">
                            DKK đổi
                            <input
                              className="input"
                              name="fromAmountDkk"
                              type="text"
                              inputMode="decimal"
                              defaultValue={formatAmountForInput(String(item.fromAmountDkk ?? 0))}
                              required
                              onInput={handleAmountInput}
                              onFocus={handleAmountFocus}
                            />
                          </label>
                          <label className="grid gap-1 text-[10px] uppercase tracking-wide text-slate-400">
                            VND nhận
                            <input
                              className="input"
                              name="toAmountVnd"
                              type="text"
                              inputMode="decimal"
                              defaultValue={formatAmountForInput(String(item.toAmountVnd ?? 0))}
                              required
                              onInput={handleAmountInput}
                              onFocus={handleAmountFocus}
                            />
                          </label>
                          <label className="grid gap-1 text-[10px] uppercase tracking-wide text-slate-400">
                            Phí (DKK)
                            <input
                              className="input"
                              name="feeAmount"
                              type="text"
                              inputMode="decimal"
                              defaultValue={formatAmountForInput(String(item.feeAmountDkk ?? 0))}
                              onInput={handleAmountInput}
                              onFocus={handleAmountFocus}
                            />
                          </label>
                        </>
                      ) : (
                        <>
                          <label className="grid gap-1 text-[10px] uppercase tracking-wide text-slate-400">
                            Số tiền ({item.currency})
                            <input
                              className="input"
                              name="amount"
                              type="text"
                              inputMode="decimal"
                              defaultValue={formatAmountForInput(String(item.amountMajor))}
                              required
                              onInput={handleAmountInput}
                              onFocus={handleAmountFocus}
                            />
                          </label>
                          <label className="grid gap-1 text-[10px] uppercase tracking-wide text-slate-400">
                            Tiền tệ
                            <select className="select" name="currency" defaultValue={item.currency}>
                              <option value="DKK">DKK</option>
                              <option value="VND">VND</option>
                            </select>
                          </label>
                          <label className="grid gap-1 text-[10px] uppercase tracking-wide text-slate-400">
                            Danh mục
                            {item.type === "EXPENSE" ? (
                              <select className="select" name="category" defaultValue={item.category ?? ""}>
                                <option value="">Chọn danh mục</option>
                                <option value="Tiền thuê nhà">Tiền thuê nhà</option>
                                <option value="Mua sắm">Mua sắm</option>
                                <option value="Tín dụng">Tín dụng</option>
                                <option value="Gửi về gia đình">Gửi về gia đình</option>
                                <option value="Khoản cho mượn">Khoản cho mượn</option>
                                <option value="Hoàn trả tiền mượn">Hoàn trả tiền mượn</option>
                              </select>
                            ) : (
                              <select className="select" name="category" defaultValue={item.category ?? ""}>
                                <option value="">Chọn danh mục</option>
                                <option value="Lương">Lương</option>
                                <option value="Người eo gửi">Người eo gửi</option>
                                <option value="Người vay gửi">Người vay gửi</option>
                              </select>
                            )}
                          </label>
                          {item.type === "EXPENSE" ? (
                            <label className="grid gap-1 text-[10px] uppercase tracking-wide text-slate-400">
                              Thanh toán
                              <select className="select" name="paymentMethod" defaultValue={item.paymentMethod ?? "CASH"}>
                                <option value="CASH">Tiền mặt</option>
                                <option value="CREDIT_CARD">Thẻ tín dụng</option>
                              </select>
                            </label>
                          ) : null}
                          <label className="grid gap-1 text-[10px] uppercase tracking-wide text-slate-400">
                            Ghi chú
                            <input className="input" name="note" defaultValue={item.note ?? ""} />
                          </label>
                        </>
                      )}
                      <div className="flex gap-2">
                        <button className="button" type="submit" disabled={saving}>
                          {saving ? "Đang lưu..." : "Lưu"}
                        </button>
                        <button
                          className="button"
                          type="button"
                          onClick={(event) => {
                            setEditingId(null);
                          }}
                        >
                          Huỷ
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="grid gap-2">
                      {"category" in item && item.category ? (
                        <div><span className="font-semibold text-slate-400">Danh mục:</span> {item.category}</div>
                      ) : null}
                      {item.type === "EXPENSE" && "paymentMethod" in item ? (
                        <div><span className="font-semibold text-slate-400">Thanh toán:</span> {paymentMethodLabel(item.paymentMethod)}</div>
                      ) : null}
                      {"note" in item && item.note ? (
                        <div><span className="font-semibold text-slate-400">Ghi chú:</span> {item.note}</div>
                      ) : null}
                      {item.type === "EXCHANGE" && "provider" in item && item.provider ? (
                        <div><span className="font-semibold text-slate-400">Nhà cung cấp:</span> {item.provider}</div>
                      ) : null}
                      {item.type === "EXCHANGE" && "fee" in item && item.fee ? (
                        <div><span className="font-semibold text-slate-400">Phí:</span> {item.fee}</div>
                      ) : null}
                      <div className="mt-2 flex gap-2">
                        <button
                          className="button"
                          type="button"
                          onClick={(event) => {
                            setEditingId(item.id);
                          }}
                        >
                          Sửa
                        </button>
                        <button
                          className="button"
                          type="button"
                          onClick={(event) => {
                            deleteItem(item);
                          }}
                        >
                          Xoá
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          );
        })
      )}
    </div>
  );
}
