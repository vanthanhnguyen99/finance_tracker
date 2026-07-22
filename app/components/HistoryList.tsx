"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatAmountForInput, normalizeAmountForApi } from "@/lib/money";
import { ChevronDownIcon, ExchangeIcon, ExpenseIcon, IncomeIcon, PlusIcon } from "./AppIcons";

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
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(date));
}

function formatTime(date: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(date));
}

function getDayKey(date: string) {
  const value = new Date(date);
  return `${value.getFullYear()}-${value.getMonth()}-${value.getDate()}`;
}

function formatDayLabel(date: string) {
  const value = new Date(date);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (value.toDateString() === today.toDateString()) return "Hôm nay";
  if (value.toDateString() === yesterday.toDateString()) return "Hôm qua";

  return new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: value.getFullYear() === today.getFullYear() ? undefined : "numeric"
  }).format(value);
}

function displayAmount(item: HistoryItem) {
  if (item.type === "INCOME") return `+${item.detail}`;
  if (item.type === "EXPENSE") return `-${item.detail}`;
  return item.detail;
}

function itemTitle(item: HistoryItem) {
  if (item.type === "EXCHANGE") return item.provider || "Đổi DKK sang VND";
  return item.category || item.description;
}

function itemTypeLabel(item: HistoryItem) {
  if (item.type === "INCOME") return "Thu nhập";
  if (item.type === "EXPENSE") return "Chi tiêu";
  return "Đổi tiền";
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

  const groupedItems = items.reduce<
    { key: string; label: string; items: HistoryItem[] }[]
  >((groups, item) => {
    const key = getDayKey(item.createdAt);
    const lastGroup = groups[groups.length - 1];
    if (lastGroup?.key === key) {
      lastGroup.items.push(item);
      return groups;
    }
    groups.push({ key, label: formatDayLabel(item.createdAt), items: [item] });
    return groups;
  }, []);

  return (
    <section className="mt-6" aria-labelledby="transaction-list-title">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 id="transaction-list-title" className="text-lg font-semibold text-ink">Danh sách giao dịch</h2>
          <p className="text-sm text-slate-500">Chạm vào một giao dịch để xem chi tiết.</p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="empty-state">
          <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 text-primary-600">
            <ExchangeIcon className="h-6 w-6" />
          </span>
          <h3 className="text-lg font-semibold text-ink">Chưa có giao dịch</h3>
          <p className="mt-1 max-w-sm text-sm leading-5 text-slate-500">
            Thêm giao dịch đầu tiên để bắt đầu theo dõi dòng tiền.
          </p>
          <Link href="/add" className="primary-pill mt-5">
            <PlusIcon className="h-5 w-5" />
            Thêm giao dịch
          </Link>
        </div>
      ) : (
        <div className="grid gap-6">
          {groupedItems.map((group) => (
            <div key={group.key}>
              <h3 className="mb-2 text-sm font-semibold capitalize text-slate-600">{group.label}</h3>
              <div className="overflow-hidden rounded-card border border-slate-200 bg-white shadow-soft">
                {group.items.map((item, index) => {
                  const isOpen = openId === item.id;
                  const ItemIcon = item.type === "INCOME" ? IncomeIcon : item.type === "EXPENSE" ? ExpenseIcon : ExchangeIcon;
                  const iconTone =
                    item.type === "INCOME"
                      ? "bg-success-light text-success-dark"
                      : item.type === "EXPENSE"
                        ? "bg-danger-light text-danger-dark"
                        : "bg-primary-50 text-primary-700";
                  const amountTone =
                    item.type === "INCOME"
                      ? "text-success-dark"
                      : item.type === "EXPENSE"
                        ? "text-danger-dark"
                        : "text-primary-700";

                  return (
                    <div key={item.id} className={index > 0 ? "border-t border-slate-100" : ""}>
                      <button
                        type="button"
                        onClick={() => setOpenId(isOpen ? null : item.id)}
                        className="flex min-h-20 w-full items-center gap-3 px-4 py-3 text-left transition active:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-300"
                        aria-expanded={isOpen}
                        aria-controls={`transaction-${item.id}`}
                      >
                        <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconTone}`}>
                          <ItemIcon className="h-5 w-5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-ink">{itemTitle(item)}</span>
                          <span className="mt-0.5 block truncate text-xs text-slate-500">
                            {itemTypeLabel(item)} · {formatTime(item.createdAt)}
                          </span>
                        </span>
                        <span className="flex max-w-[46%] shrink-0 items-center gap-1.5 text-right">
                          <span className={`money-value break-words text-sm font-semibold leading-5 ${amountTone}`}>
                            {displayAmount(item)}
                          </span>
                          <ChevronDownIcon className={`h-4 w-4 shrink-0 text-slate-400 transition ${isOpen ? "rotate-180" : ""}`} />
                        </span>
                      </button>

                      {isOpen ? (
                        <div id={`transaction-${item.id}`} className="border-t border-slate-100 bg-slate-50 px-4 py-4">
                          {editingId === item.id ? (
                            <form
                              className="grid gap-4"
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
                                  <label className="form-label">
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
                                  <label className="form-label">
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
                                  <label className="form-label">
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
                                  <label className="form-label">
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
                                  <label className="form-label">
                                    Tiền tệ
                                    <select className="select" name="currency" defaultValue={item.currency}>
                                      <option value="DKK">DKK</option>
                                      <option value="VND">VND</option>
                                    </select>
                                  </label>
                                  <label className="form-label">
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
                                    <label className="form-label">
                                      Thanh toán
                                      <select className="select" name="paymentMethod" defaultValue={item.paymentMethod ?? "CASH"}>
                                        <option value="CASH">Tiền mặt</option>
                                        <option value="CREDIT_CARD">Thẻ tín dụng</option>
                                      </select>
                                    </label>
                                  ) : null}
                                  <label className="form-label">
                                    Ghi chú
                                    <input className="input" name="note" defaultValue={item.note ?? ""} />
                                  </label>
                                </>
                              )}
                              <div className="grid grid-cols-2 gap-2">
                                <button className="button" type="submit" disabled={saving}>
                                  {saving ? "Đang lưu..." : "Lưu thay đổi"}
                                </button>
                                <button className="button button-secondary" type="button" onClick={() => setEditingId(null)}>
                                  Hủy
                                </button>
                              </div>
                            </form>
                          ) : (
                            <div>
                              <dl className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                                <div>
                                  <dt className="text-xs text-slate-400">Thời gian</dt>
                                  <dd className="mt-0.5 font-medium text-slate-700">{formatDate(item.createdAt)}</dd>
                                </div>
                                {"category" in item && item.category ? (
                                  <div>
                                    <dt className="text-xs text-slate-400">Danh mục</dt>
                                    <dd className="mt-0.5 font-medium text-slate-700">{item.category}</dd>
                                  </div>
                                ) : null}
                                {item.type === "EXPENSE" && "paymentMethod" in item ? (
                                  <div>
                                    <dt className="text-xs text-slate-400">Thanh toán</dt>
                                    <dd className="mt-0.5 font-medium text-slate-700">{paymentMethodLabel(item.paymentMethod)}</dd>
                                  </div>
                                ) : null}
                                {"note" in item && item.note ? (
                                  <div>
                                    <dt className="text-xs text-slate-400">Ghi chú</dt>
                                    <dd className="mt-0.5 font-medium text-slate-700">{item.note}</dd>
                                  </div>
                                ) : null}
                                {item.type === "EXCHANGE" && item.provider ? (
                                  <div>
                                    <dt className="text-xs text-slate-400">Nhà cung cấp</dt>
                                    <dd className="mt-0.5 font-medium text-slate-700">{item.provider}</dd>
                                  </div>
                                ) : null}
                                {item.type === "EXCHANGE" && item.fee ? (
                                  <div>
                                    <dt className="text-xs text-slate-400">Phí</dt>
                                    <dd className="mt-0.5 font-medium text-slate-700">{item.fee}</dd>
                                  </div>
                                ) : null}
                              </dl>
                              <div className="mt-4 grid grid-cols-2 gap-2">
                                <button className="button button-secondary" type="button" onClick={() => setEditingId(item.id)}>
                                  Sửa
                                </button>
                                <button className="button button-ghost text-danger-dark" type="button" onClick={() => deleteItem(item)}>
                                  Xóa
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
