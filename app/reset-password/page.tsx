"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
export default function ResetPasswordPage() {
  const [token, setToken] = useState("");
  const tokenCaptured = useRef(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    // Strict Mode replays this effect after the first pass removes the fragment.
    if (tokenCaptured.current) return;
    tokenCaptured.current = true;
    setToken(new URLSearchParams(location.hash.slice(1)).get("token") ?? "");
    history.replaceState(null, "", location.pathname);
  }, []);
  async function submit() {
    if (password !== confirm) { setMessage("Mật khẩu nhập lại không khớp."); return; }
    setBusy(true);
    try {
      const response = await fetch("/api/auth/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, newPassword: password }) });
      const body = await response.json();
      if (response.ok) { setDone(true); setToken(""); setPassword(""); setConfirm(""); setMessage("Đã đổi mật khẩu. Hãy đăng nhập lại."); }
      else setMessage(body.error ?? "Không thể đặt lại mật khẩu.");
    } catch { setMessage("Không thể kết nối. Vui lòng thử lại."); }
    finally { setBusy(false); }
  }
  return <main className="auth-page"><section className="auth-panel app-enter">
    <h1 className="text-2xl font-bold text-ink">Đặt lại mật khẩu</h1>
    {!done && <form className="mt-6 grid gap-4" onSubmit={event => { event.preventDefault(); void submit(); }}>
      <label className="form-label">Mật khẩu mới<input className="input" type="password" autoComplete="new-password" minLength={12} maxLength={128} value={password} onChange={event => setPassword(event.target.value)} required /></label>
      <label className="form-label">Nhập lại mật khẩu<input className="input" type="password" autoComplete="new-password" minLength={12} maxLength={128} value={confirm} onChange={event => setConfirm(event.target.value)} required /></label>
      <button className="button" disabled={busy || !token}>Đặt lại mật khẩu</button>
      {!token && <p>Liên kết không hợp lệ. Hãy liên hệ quản trị viên.</p>}
    </form>}
    {message && <p className="mt-4" role="status">{message}</p>}
    <Link className="auth-link mt-6" href="/login">Đăng nhập</Link>
  </section></main>;
}
