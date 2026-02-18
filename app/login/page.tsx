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
    <main className="container-page">
      <div className="hero-bar">
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-400">Tài khoản</p>
          <h1 className="text-lg font-semibold text-ink">Đăng nhập</h1>
        </div>
        <span className="chip">Session</span>
      </div>

      <div className="mt-6 grid gap-4">
        <div className="card grid gap-3">
          <input
            className="input"
            placeholder="Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <input
            className="input"
            type="password"
            placeholder="Mật khẩu"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <button className="button" type="button" onClick={login}>Đăng nhập</button>
          <Link className="text-sm font-semibold text-slate-500 underline" href="/forgot-password">
            Quên mật khẩu? Gửi yêu cầu đặt lại
          </Link>
          <Link className="text-sm font-semibold text-slate-500 underline" href="/register">
            Chưa có tài khoản? Đăng ký
          </Link>
          {message ? <div className="alert">{message}</div> : null}
        </div>
      </div>
    </main>
  );
}
