"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function login() {
    setMessage(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const payload = await res.json();
    if (!res.ok) {
      setMessage(payload.error ?? "Đăng nhập thất bại");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <main className="auth-page">
      <section className="auth-panel app-enter">
        <div className="auth-brand">
          <img src="/logo.svg" alt="" className="h-12 w-12" />
          <div>
            <p className="text-sm font-semibold text-primary-700">FinanceTracker</p>
            <p className="text-xs text-slate-500">Chi tiêu rõ ràng, nhẹ đầu hơn</p>
          </div>
        </div>
        <div>
          <p className="text-sm font-medium text-primary-600">Chào mừng trở lại</p>
          <h1 className="mt-1 text-2xl font-bold text-ink">Đăng nhập</h1>
          <p className="mt-2 text-sm leading-5 text-slate-500">Tiếp tục theo dõi thu nhập và chi tiêu của bạn.</p>
        </div>

        <form
          className="mt-7 grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            login();
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
            Mật khẩu
          <input
            className="input"
            type="password"
            autoComplete="current-password"
            placeholder="Nhập mật khẩu"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          </label>
          <div className="-mt-2 text-right">
            <Link className="auth-link justify-end" href="/forgot-password">
            Quên mật khẩu? Gửi yêu cầu đặt lại
            </Link>
          </div>
          <button className="button" type="submit">Đăng nhập</button>
          {message ? <div role="alert" className="alert border-red-200 bg-danger-light text-danger-dark">{message}</div> : null}
        </form>

        <div className="mt-6 border-t border-slate-100 pt-5 text-center text-sm text-slate-500">
          Chưa có tài khoản?{" "}
          <Link className="font-semibold text-primary-600 hover:underline" href="/register">
            Đăng ký
          </Link>
        </div>
        <p className="mt-6 text-center text-xs text-slate-400">FinanceTracker · Phiên bản web</p>
      </section>
    </main>
  );
}
