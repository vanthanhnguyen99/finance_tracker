import Link from "next/link";
export default function ForgotPasswordPage() {
  return <main className="auth-page"><section className="auth-panel app-enter">
    <h1 className="text-2xl font-bold text-ink">Khôi phục tài khoản</h1>
    <p className="mt-4 text-sm leading-6 text-slate-600">Liên hệ quản trị viên qua kênh đã đăng ký để xác minh danh tính và nhận liên kết đặt lại mật khẩu. Liên kết chỉ dùng được một lần và có hiệu lực trong 15 phút.</p>
    <Link className="auth-link mt-6" href="/login">Quay lại đăng nhập</Link>
  </section></main>;
}
