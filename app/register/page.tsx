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
    <main className="container-page">
      <div className="hero-bar">
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-400">Tài khoản</p>
          <h1 className="text-lg font-semibold text-ink">Đăng ký</h1>
        </div>
        <span className="chip">Session</span>
      </div>

      <div className="mt-6 grid gap-4">
        <div className="card grid gap-3">
          <input
            className="input"
            placeholder="Tên hiển thị"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
          />
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
          <button className="button" type="button" onClick={register}>Tạo tài khoản</button>
          <Link className="text-sm font-semibold text-slate-500 underline" href="/login">
            Đã có tài khoản? Đăng nhập
          </Link>
          {message ? <div className="alert">{message}</div> : null}
        </div>
      </div>
    </main>
  );
}
