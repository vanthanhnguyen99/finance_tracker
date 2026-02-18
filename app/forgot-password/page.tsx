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
    <main className="container-page">
      <div className="hero-bar">
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-400">Tài khoản</p>
          <h1 className="text-lg font-semibold text-ink">Quên mật khẩu</h1>
        </div>
        <span className="chip">Admin duyệt</span>
      </div>

      <div className="mt-6 grid gap-4">
        <div className="card grid gap-3">
          <p className="text-sm text-slate-500">
            Nhập email và mật khẩu mới. Mật khẩu mới chỉ có hiệu lực sau khi admin duyệt.
          </p>
          <input
            className="input"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <input
            className="input"
            type="password"
            placeholder="Mật khẩu mới"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
          <input
            className="input"
            type="password"
            placeholder="Nhập lại mật khẩu mới"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
          <button className="button" type="button" onClick={submitRequest}>
            Gửi yêu cầu đặt lại mật khẩu
          </button>
          <Link className="text-sm font-semibold text-slate-500 underline" href="/login">
            Quay lại đăng nhập
          </Link>
          {message ? (
            <div
              className={`alert ${
                message.tone === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-rose-200 bg-rose-50 text-rose-700"
              }`}
            >
              {message.text}
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
