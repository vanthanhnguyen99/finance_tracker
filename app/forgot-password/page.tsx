"use client";

import Link from "next/link";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<{ text: string; tone: "success" | "error" } | null>(null);

  async function submitRequest() {
    setMessage(null);
    if (newPassword !== confirmPassword) {
      setMessage({ text: "Mật khẩu nhập lại không khớp", tone: "error" });
      return;
    }

    const res = await fetch("/api/auth/password-reset-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, newPassword })
    });

    const payload = await res.json();
    if (!res.ok) {
      setMessage({ text: payload.error ?? "Không thể gửi yêu cầu", tone: "error" });
      return;
    }

    setMessage({ text: payload.message ?? "Yêu cầu đã được gửi.", tone: "success" });
    setNewPassword("");
    setConfirmPassword("");
  }

  return (
    <main className="auth-page">
      <section className="auth-panel app-enter">
        <div className="auth-brand">
          <img src="/logo.svg" alt="" className="h-12 w-12" />
          <div>
            <p className="text-sm font-semibold text-primary-700">FinanceTracker</p>
            <p className="text-xs text-slate-500">Khôi phục quyền truy cập</p>
          </div>
        </div>
        <div>
          <p className="text-sm font-medium text-primary-600">Hỗ trợ tài khoản</p>
          <h1 className="mt-1 text-2xl font-bold text-ink">Đặt lại mật khẩu</h1>
          <p className="mt-2 text-sm leading-5 text-slate-500">
            Nhập email và mật khẩu mới. Thay đổi sẽ có hiệu lực sau khi quản trị viên duyệt.
          </p>
        </div>

        <form
          className="mt-7 grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            submitRequest();
          }}
        >
          <label className="form-label">
            Email
          <input
            className="input"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="ban@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          </label>
          <label className="form-label">
            Mật khẩu mới
          <input
            className="input"
            type="password"
            autoComplete="new-password"
            placeholder="Nhập mật khẩu mới"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            required
          />
          </label>
          <label className="form-label">
            Nhập lại mật khẩu
          <input
            className="input"
            type="password"
            autoComplete="new-password"
            placeholder="Nhập lại mật khẩu mới"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
          />
          </label>
          <button className="button" type="submit">
            Gửi yêu cầu đặt lại mật khẩu
          </button>
          {message ? (
            <div
              role="status"
              aria-live="polite"
              className={`alert ${
                message.tone === "success"
                  ? "border-emerald-200 bg-success-light text-success-dark"
                  : "border-red-200 bg-danger-light text-danger-dark"
              }`}
            >
              {message.text}
            </div>
          ) : null}
        </form>

        <div className="mt-6 border-t border-slate-100 pt-5 text-center">
          <Link className="auth-link justify-center" href="/login">
            Quay lại đăng nhập
          </Link>
        </div>
      </section>
    </main>
  );
}
