# Báo cáo CVE cho `finance-tracker`

> Nguồn input: `package.json` anh gửi (Next.js + React 19 + Prisma). Báo cáo này dựa trên kiểm tra public advisories (Next.js/Vercel + React blog + Snyk package pages). Với npm ecosystem, CVE có thể nằm ở **transitive dependencies** (phụ thuộc gián tiếp) trong lockfile, nên phần “Checklist” ở cuối là bước chốt để ra kết luận cuối cùng theo `package-lock.json`/`pnpm-lock.yaml`.

---

## 1) `next` `^16.1.6`

### CVE/Advisory liên quan

* **CVE-2026-23864 (DoS – React/Next RSC)**: ảnh hưởng Next.js dùng App Router/RSC trong các dải **< 16.1.5**; bản vá cho nhánh 16.1 là **16.1.5+**.

  * Advisory: GHSA-h25m-26qc-wcjf (Next.js)
  * Netlify security note (tổng hợp dải ảnh hưởng + bản vá)

* **CVE-2025-66478 (RCE – “React2Shell”, liên quan RSC protocol)**: Next.js publish blog + guidance nâng cấp.

* **CVE-2025-59471 (DoS – Image Optimizer + `remotePatterns`)** và **CVE-2025-59472 (DoS – PPR + minimal mode)**: Vercel đăng summary + hướng giảm thiểu.

### Đánh giá theo version của anh

* Anh đang dùng **16.1.6** ⇒ **>= 16.1.5** nên **không nằm trong dải bị ảnh hưởng của CVE-2026-23864** theo bảng bản vá.
* Snyk cũng ghi nhận **no known direct vulns** ở `next@16.1.6`.

### Hướng giải quyết

* **Giữ Next >= 16.1.5** (hiện đang OK). Nếu có thể, **update lên bản patch mới nhất trong line 16.x** để an toàn.
* Nếu app có dùng `images.remotePatterns`:

  * Siết/giảm `remotePatterns`, hoặc tạm tắt tối ưu ảnh external.
  * Thêm **rate limit**/WAF cho `/_next/image` ở reverse proxy.
* Nếu bật **PPR + minimal mode**:

  * Update Next.
  * Tạm tắt PPR/minimal mode nếu chưa update kịp.

---

## 2) `react` `^19.2.4` và `react-dom` `^19.2.4`

### CVE/Advisory liên quan (RSC)

* **CVE-2025-55182 (RCE – React Server Components)**: có bản vá backport (19.0.1 / 19.1.2 / 19.2.1).
* **CVE-2025-55183 (Source code exposure – RSC)** và **DoS advisories** (bao gồm CVE-2026-23864 theo tổng hợp): React blog hướng dẫn nâng cấp lên bản đã vá.

### Đánh giá theo version của anh

* Anh đang dùng **19.2.4** ⇒ theo note tổng hợp dải ảnh hưởng, 19.2.4 là bản vá cho nhánh 19.2 đối với DoS (19.2.0–19.2.3 → fixed 19.2.4).
* Snyk cũng ghi nhận **no known direct vulns** cho `react@19.2.4` và `react-dom@19.2.4`.

### Hướng giải quyết

* Chốt lại bằng cách kiểm tra các package RSC phụ trợ (có thể nằm trong cây dependency):

  * `npm ls react-server-dom-webpack react-server-dom-parcel react-server-dom-turbopack`
  * Mục tiêu: **>= 19.2.4** (hoặc theo guidance mới nhất của React/Next).

---

## 3) `@prisma/client` `^5.20.0` và `prisma` `^5.20.0`

### Tình trạng CVE

* Trên các trang tổng quan public (Snyk overview), **không thấy CVE trực tiếp nổi bật** gắn với `prisma@5.20.0` tại thời điểm kiểm tra.
* Tuy nhiên Prisma thường kéo nhiều dependency build/runtime ⇒ **transitive vulnerabilities** có thể xuất hiện theo lockfile.

### Hướng giải quyết

* Chạy `npm audit`/`pnpm audit` theo lockfile thực tế.
* Nếu dính CVE do phụ thuộc gián tiếp:

  * Update minor/patch Prisma.
  * Dùng `overrides` (npm) hoặc `resolutions` (yarn/pnpm) để pin dependency bị dính.

---

## 4) `tailwindcss` `^3.4.7`

### Tình trạng CVE

* Snyk cho `tailwindcss@3.4.7`: **no known vulnerabilities**.

### Hướng giải quyết

* Nếu audit báo CVE: thường là do dependency gián tiếp (ví dụ `caniuse-lite`), xử bằng update lockfile hoặc overrides.

---

## 5) `postcss` `^8.5.6` và `autoprefixer` `^10.4.24`

### Tình trạng CVE

* Snyk ghi nhận: **no known security issues** cho versions nêu trên.

### Hướng giải quyết

* Nếu audit báo: xử theo package bị nêu trong report (đa phần là transitive).

---

## 6) `clsx` `^2.1.1`

### Tình trạng CVE

* Snyk cho `clsx@2.1.1`: **no known vulnerabilities**.

### Hướng giải quyết

* Không cần thay đổi gấp vì security.
* Nếu policy nội bộ yêu cầu “actively maintained”, cân nhắc thay thế (không phải bắt buộc).

---

## 7) `typescript` `^5.5.4` + `@types/*`

### Tình trạng CVE

* Không thấy CVE trực tiếp nổi bật cho `typescript@5.5.4` trong các nguồn tra nhanh.

### Hướng giải quyết

* Nếu audit báo thì xử theo dependency cụ thể bị report (thường không phải TS compiler).

---

# Checklist để chốt theo lockfile (khuyến nghị)

1. Cài đúng cây phụ thuộc theo lockfile:

   * `npm ci`

2. Audit bảo mật:

   * `npm audit`
   * Nếu cần: `npm audit --json`

3. Kiểm tra cụ thể các package RSC:

   * `npm ls react-server-dom-webpack react-server-dom-parcel react-server-dom-turbopack`

4. Nếu có CVE trong transitive deps:

   * Update patch/minor của package gốc kéo dependency đó.
   * Hoặc áp `overrides`/`resolutions` để pin phiên bản đã vá.

---

## Link nguồn tham chiếu (public)

* Next.js advisory: GHSA-h25m-26qc-wcjf (DoS RSC)
* Next.js blog: CVE-2025-66478
* Vercel changelog: CVE-2025-59471 / CVE-2025-59472 summaries
* React blog: RSC vulnerability posts (RCE/DoS/source exposure)
* Snyk
