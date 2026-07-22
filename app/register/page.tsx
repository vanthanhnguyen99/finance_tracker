"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function register() {
    setMessage(null);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName, email, password })
    });
    const payload = await res.json();
    if (!res.ok) {
      setMessage(payload.error ?? "Không thể đăng ký");
      return;
    }
    router.push("/login");
    router.refresh();
  }

  return (
    <main className="auth-page">
      <section className="auth-panel app-enter">
        <div className="auth-brand">
          <img src="/logo.svg" alt="" className="h-12 w-12" />
          <div>
            <p className="text-sm font-semibold text-primary-700">FinanceTracker</p>
            <p className="text-xs text-slate-500">Bắt đầu quản lý dòng tiền</p>
          </div>
        </div>
        <div>
          <p className="text-sm font-medium text-primary-600">Tạo tài khoản</p>
          <h1 className="mt-1 text-2xl font-bold text-ink">Bắt đầu theo dõi chi tiêu</h1>
          <p className="mt-2 text-sm leading-5 text-slate-500">Chỉ cần vài thông tin để thiết lập tài khoản của bạn.</p>
        </div>

        <form
          className="mt-7 grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            register();
          }}
        >
          <label className="form-label">
            Tên hiển thị
          <input
            className="input"
            autoComplete="name"
            placeholder="Tên của bạn"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            required
          />
          </label>
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
            Mật khẩu
          <input
            className="input"
            type="password"
            autoComplete="new-password"
            placeholder="Tạo mật khẩu"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          </label>
          <button className="button" type="submit">Tạo tài khoản</button>
          {message ? <div role="alert" className="alert border-red-200 bg-danger-light text-danger-dark">{message}</div> : null}
        </form>

        <div className="mt-6 border-t border-slate-100 pt-5 text-center text-sm text-slate-500">
          Đã có tài khoản?{" "}
          <Link className="font-semibold text-primary-600 hover:underline" href="/login">
            Đăng nhập
          </Link>
        </div>
      </section>
    </main>
  );
}
