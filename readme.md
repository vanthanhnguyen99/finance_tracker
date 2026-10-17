# Finance Tracker (DKK/VND)

Ứng dụng web quản lý thu/chi cá nhân, hỗ trợ 2 loại tiền tệ DKK và VND, có đổi tiền DKK → VND, thống kê theo thời gian. Hệ thống chạy bằng Docker + PostgreSQL, UI mobile‑first và đã Việt hóa toàn bộ giao diện.

---

## 1. Tính năng chính (đã triển khai)

- **Thu nhập**: hỗ trợ DKK/VND, có danh mục và ghi chú.
- **Chi tiêu**: hỗ trợ DKK/VND, danh mục cố định, ghi chú, phương thức thanh toán (mặc định tiền mặt, tùy chọn thẻ tín dụng).
- **Đổi tiền (DKK → VND)**: nhập số DKK đổi, số VND nhận, phí (DKK/VND), hệ thống tự tính tỷ giá.
- **Dashboard**:
  - Filter thời gian: Hôm nay / Tuần này / Tháng này / 7 ngày / 30 ngày
  - Hỗ trợ thêm khoảng ngày tùy chỉnh (`from`/`to`)
  - Tổng thu nhập, chi tiêu, số dư ví
  - Hiển thị số dư cả **Ví DKK** và **Ví VND** ở cụm card đầu trang
  - Expense breakdown theo danh mục + filter tiền tệ (DKK/VND)
  - Khi filter DKK: Exchange được tính như 1 loại chi tiêu “Chuyển đổi tiền tệ”
  - Tổng thu/chi và xu hướng theo kỳ dùng đơn vị tiền tệ chính của tài khoản
  - Khi đơn vị chính là DKK, tổng chi vẫn tính giao dịch đổi tiền theo logic hiện tại
  - Line `Chi tiêu` trong biểu đồ xu hướng chỉ tính transaction `EXPENSE` của đơn vị chính
- **Đơn vị tiền tệ chính theo tài khoản**:
  - Chọn DKK hoặc VND trong menu tài khoản, mặc định DKK
  - Form thêm giao dịch mặc định theo đơn vị tiền tệ chính
  - Tổng thu/chi/còn lại và biểu đồ xu hướng trên Dashboard ưu tiên đơn vị tiền tệ chính
  - Phân bổ chi tiêu mặc định theo đơn vị tiền tệ chính và vẫn có thể chuyển DKK/VND
- **Lịch sử giao dịch**:
  - Filter theo loại, tiền tệ, khoảng thời gian
  - Click để xem chi tiết (note, category, payment method, provider, fee)
  - Sửa / xóa giao dịch
  - Sửa Exchange: DKK đổi, VND nhận, phí và đơn vị phí (DKK/VND)
- **Đăng xuất**:
  - Có nút `Đăng xuất` rõ ràng ở các màn chính (Tổng quan / Thêm / Lịch sử)
- **Khôi phục mật khẩu qua liên kết dùng một lần**:
  - User liên hệ admin qua kênh đã đăng ký để xác minh danh tính
  - Admin cấp liên kết khôi phục có hiệu lực 15 phút; user tự đặt mật khẩu mới
  - Đổi mật khẩu thu hồi mọi session và liên kết khôi phục cũ
- **Admin backup/restore dữ liệu toàn hệ thống**:
  - Backup JSON toàn hệ thống (wallets, users, sessions, password reset requests, transactions, exchanges)
  - Restore từ file JSON với mode mặc định ghi đè toàn bộ dữ liệu hiện tại
- **Admin clear user data (giữ session)**:
  - Clear data nghiệp vụ của từng user hoặc toàn hệ thống từ admin app
  - Xóa transactions, exchanges, password reset requests; giữ nguyên tài khoản, sessions và wallets

---

## 2. Danh mục

**Thu nhập**:
- Lương
- Người eo gửi
- Người vay gửi

**Chi tiêu**:
- Tiền thuê nhà
- Đi chợ
- Tiền mừng
- Mua sắm
- Tín dụng
- Gửi về gia đình
- Khoản cho mượn
- Hoàn trả tiền mượn

---

## 3. Kiến trúc & Stack

- **Frontend**: Next.js 16 (App Router), TailwindCSS, React 19
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL + Prisma ORM
- **Deployment**: Docker + Docker Compose

Hướng dẫn bảo mật, khôi phục tài khoản và triển khai qua Cloudflare:
[security-deployment.md](docs/security-deployment.md).

---

## 4. Data Model (Prisma)

**Wallet**
- id
- name
- currency (DKK | VND)
- createdAt

**Transaction**
- id
- type (INCOME | EXPENSE | EXCHANGE)
- walletId
- amount (minor units)
- currency
- paymentMethod (optional: CASH | CREDIT_CARD, dùng cho chi tiêu)
- category (optional)
- note (optional)
- createdAt

**Exchange**
- id
- fromWalletId (DKK)
- toWalletId (VND)
- fromAmountDkk
- toAmountVnd
- effectiveRate
- feeAmount (optional)
- feeCurrency (optional)
- provider (optional)
- createdAt

---

## 5. Quy tắc nghiệp vụ

- **Income**: cộng vào ví theo currency.
- **Expense**:
  - Nếu `paymentMethod = CASH`: trừ khỏi ví, kiểm tra đủ số dư.
  - Nếu `paymentMethod = CREDIT_CARD`: ghi nhận chi tiêu thực tế nhưng **không trừ ví ngay**.
  - Giao dịch trả thẻ (danh mục `Tín dụng`, không phải `CREDIT_CARD`) chỉ dùng để giảm ví, **không cộng thêm vào thống kê chi tiêu** để tránh double count.
- **Exchange**: trừ DKK, cộng VND, lưu tỷ giá.
- **Fee**: hỗ trợ DKK/VND; khi sửa exchange, giữ nguyên phí và đơn vị phí nếu không thay đổi.

---

## 6. UI/UX

- Mobile‑first, thao tác 1 chạm
- Bottom nav: Tổng quan / Báo cáo / Thêm / Giao dịch / Ngân sách.
- Quy tắc cố định: nút **Thêm luôn lớn nhất và nằm chính giữa** thanh điều hướng (vị trí thứ 3 trong 5 mục); các mục còn lại nhỏ hơn.
- Báo cáo nằm giữa Tổng quan và Thêm, mở `/reports` với nội dung **Sắp ra mắt**.
- Tăng vùng chạm cho nút `Tổng quan` và `Lịch sử` trên bottom nav để thao tác tốt hơn trên iOS Safari
- Input tiền có format dấu phẩy khi nhập
- Thông báo lưu thành công màu xanh và tự ẩn sau 5s
- Logo custom: “Compass + Lightning + Coin Orbit”

---

## 7. Docker & Env

- Public: https://financetracker.wt.id.vn qua Cloudflare Tunnel.
- Origin: `192.168.10.160:5050`, chỉ nhận kết nối từ connector `192.168.10.177`.
- App không publish port; admin `127.0.0.1:6070`, PostgreSQL `127.0.0.1:4500`.
- Sao chép `.env.example` thành `.env`, dùng mật khẩu/token ngẫu nhiên và giữ file private.
- `DATABASE_URL` là owner dùng cho migration; `APP_DATABASE_URL` và
  `ADMIN_DATABASE_URL` là role runtime được cấp quyền hạn chế, sinh bởi script provisioning.
- Docker build dùng `npm ci` và lockfile. App/admin chạy non-root, read-only, tách secret.

## 8. Cách chạy lần đầu

```bash
npm ci
docker compose up -d db
docker compose run --rm --build migrate
node scripts/provision-runtime-roles.mjs
docker compose build app admin
./start.sh
```

Đọc [hướng dẫn triển khai](docs/security-deployment.md) trước khi áp dụng ở môi trường khác;
địa chỉ origin/connector và APP_ORIGINS phải khớp với hạ tầng thực tế.

## 9. Deployment (Production)

1. Tạo backup database, source/config và giữ image đang chạy để rollback.
2. Chạy các kiểm tra phù hợp, build trước: `docker compose build app admin migrate`.
3. Dừng app/admin để ngăn ghi đồng thời trong migration: `docker compose stop app admin`.
4. Chạy `docker compose run --rm --no-deps migrate` bằng owner riêng.
5. Chạy `docker compose up -d --no-deps app admin ingress` và kiểm tra domain, login/logout,
   cache, quyền database và các đường vào bị chặn.

Admin chỉ truy cập qua localhost hoặc SSH local forward; không route admin ra public.
Migrations dùng service `migrate`, không chạy Prisma CLI trong image app đã thu gọn.
Giữ file backup như dữ liệu nhạy cảm. Restore JSON không kích hoạt lại session cũ và
không chứa token khôi phục; tài khoản cần đăng nhập lại sau restore.

---

## 10. Ghi chú kỹ thuật

- Lưu tiền dạng integer (minor units): DKK = øre (×100), VND = nguyên.
- Các API `transactions`/`exchange` hỗ trợ create/update/delete.
- Dashboard dùng `noStore()` để luôn hiển thị dữ liệu mới.
- Điều hướng tab dùng URL ổn định, không gắn timestamp `refresh`. Bấm lại tab hiện tại để làm mới; sau thay đổi dữ liệu dùng `DataRefreshSync` và revalidation.
- Sau khi sửa/xóa transaction hoặc exchange, hệ thống `revalidatePath("/")` và `revalidatePath("/history")` để tránh stale data khi quay lại Tổng quan.
- API export CSV vẫn khả dụng: `GET /api/export/csv` (có auth, hỗ trợ filter `type/currency/start/end`).
- Tối ưu hiệu năng truy vấn:
  - Tính số dư ví bằng aggregate DB (không scan toàn bộ giao dịch/exchange trong app layer).
  - Giảm số query trùng ở Dashboard và thu gọn payload `select` ở Dashboard/Lịch sử.
  - Thêm index `Transaction_userId_type_currency_createdAt_idx` cho pattern lọc phổ biến.
- Timezone:
  - Hệ thống lấy timezone theo thiết bị người dùng (sync qua cookie `finance_tz`).
  - Áp dụng cho filter ngày ở Tổng quan/Lịch sử/API (`dashboard`, `transactions`, `export csv`) để tránh lệch ngày do UTC.
  - Nếu không có timezone từ thiết bị, fallback `UTC`.


---

## 11. Xác thực & Phân quyền (User Account + Admin Approval)

### 11.1 Tổng quan
- Người dùng tự **đăng ký tài khoản**.
- Tài khoản mới có trạng thái chờ duyệt (`PENDING`), chưa được dùng ngay.
- Chỉ tài khoản đã được admin duyệt và bật (`ACTIVE`) mới được đăng nhập và sử dụng hệ thống.
- Sau khi đăng nhập thành công, hệ thống quản lý trạng thái bằng session cookie.
- Trang/admin API được tách sang **admin app riêng** (port `6070`) để tăng bảo mật; web app chính không expose `/admin`.

### 11.2 Luồng đăng ký và duyệt tài khoản
- **Bước 1: User đăng ký**
  - Nhập thông tin tài khoản (ví dụ: tên hiển thị, email, mật khẩu hoặc thông tin định danh theo thiết kế).
  - Hệ thống lưu user với trạng thái `PENDING`.
- **Bước 2: Admin duyệt**
  - Admin xem danh sách tài khoản chờ duyệt.
  - Admin có thể Approve hoặc Reject.
- **Bước 3: Enable sử dụng**
  - Sau khi được approve, user ở trạng thái `ACTIVE`.
  - Chỉ user `ACTIVE` mới được phép đăng nhập và truy cập các trang nghiệp vụ.

### 11.7 Khôi phục mật khẩu
- `/forgot-password` hướng dẫn liên hệ admin qua kênh đã đăng ký.
- Sau khi xác minh độc lập, admin cấp liên kết dùng một lần, hết hạn sau 15 phút.
- User tự chọn mật khẩu mới tại `/reset-password`; thành công sẽ thu hồi mọi session.
- API reset/approve cũ trả 410 và không thay đổi dữ liệu xác thực.

### 11.3 Trạng thái user
- `PENDING`: đã đăng ký, đang chờ admin duyệt.
- `ACTIVE`: đã được admin duyệt và được phép đăng nhập/sử dụng.
- `DISABLED`: bị khóa, không được đăng nhập.
- `REJECTED` (tuỳ chọn): bị từ chối trong bước duyệt.

### 11.4 Quy tắc đăng nhập và điều hướng
- Nếu **chưa có session đăng nhập hợp lệ**: luôn điều hướng về trang `/login`.
- Nếu **đã có session đăng nhập hợp lệ**: vào trang tổng quan `/`.
- Nếu user không ở trạng thái `ACTIVE`: từ chối đăng nhập (hoặc thu hồi session hiện có).

### 11.5 Quyền admin
- Xem danh sách user.
- Duyệt / từ chối tài khoản đăng ký mới.
- Enable / Disable user.
- Xem trạng thái tài khoản và thời điểm cập nhật trạng thái.

### 11.6 Bảo mật
- Session cookie:
  - `HttpOnly`
  - `Secure`
  - `SameSite=Lax` (hoặc `Strict` nếu phù hợp)
- Rate limit:
  - Endpoint đăng ký
  - Endpoint đăng nhập
  - Endpoint admin approve/enable
- Audit log tối thiểu:
  - User đăng ký
  - Admin approve/reject/disable
  - Login success/failure

---

## 12. Gợi ý mở rộng (tuỳ chọn)
- PWA icons & favicon theo logo mới
- Backup tự động `pg_dump`
- Export CSV

### 12.1 Đề xuất cải tiến Dashboard Filter (Hôm nay / Tuần này / Tháng này)
- Giữ 3 mốc hiện tại nhưng bổ sung `7 ngày` và `30 ngày` (rolling window) để nhìn biến động rõ hơn.
- Mặc định chọn `Tháng này` thay vì `Hôm nay` để luôn có đủ dữ liệu khi mở app.
- Thêm so sánh với kỳ trước ngay dưới card tổng quan (ví dụ: `Chi tiêu +18% so với tuần trước`).
- Lưu lựa chọn filter gần nhất của user để lần mở sau giữ nguyên ngữ cảnh sử dụng.
- Hiển thị rõ phạm vi áp dụng của filter (các card tổng quan + breakdown), và ghi chú riêng chart 6 tháng là dữ liệu cố định theo tháng.

### 12.2 Tối ưu thao tác trên iOS Safari
- Dùng segmented control 1 hàng cho nhóm filter thời gian.
- Kích thước vùng chạm tối thiểu `44px` theo khuyến nghị iOS.
- Tránh đặt nút sát mép dưới; luôn chừa khoảng cách theo `safe-area-inset-bottom`.
- Giữ trạng thái query khi chuyển filter (không làm mất lựa chọn tiền tệ hoặc context hiện tại).

---

## 13. Cập nhật gần đây (đã triển khai)

### 13.1 Bottom Navigation
- `BottomNav` gồm 5 mục theo thứ tự: `Tổng quan / Báo cáo / Thêm / Giao dịch / Ngân sách`.
- Mục `Thêm` luôn ở chính giữa và có kích thước lớn nhất: nút tròn 56px, icon 28px; icon mục khác 24px. Giữ quy tắc này khi chỉnh layout.
- Mục `Báo cáo` ở bên trái nút Thêm, ngay sau Tổng quan; trang `/reports` hiện **Sắp ra mắt**.
- Sửa lỗi nav bar bị hở ở đáy màn hình iOS:
  - Ghim nav sát đáy (`bottom: 0`).
  - Dùng `padding-bottom: max(env(safe-area-inset-bottom), 8px)` để tránh đè thanh gesture.

### 13.2 Màn hình Thêm giao dịch
- Đổi thứ tự ưu tiên tab: `Chi tiêu > Thu nhập > Đổi tiền`.
- Tab mặc định khi mở trang: `Chi tiêu`.

### 13.3 Dashboard Filter & So sánh kỳ
- Mở rộng filter thời gian:
  - Preset: `Hôm nay`, `Tuần này`, `Tháng này`, `7 ngày`, `30 ngày`.
  - Thêm filter `Tùy chỉnh` theo khoảng ngày (`from`/`to`).
- Giữ ngữ cảnh query khi đổi filter (ví dụ `expenseCurrency`).
- Lưu filter gần nhất bằng `localStorage` để giữ thói quen dùng.
- Thêm so sánh với kỳ trước cho các chỉ số:
  - Thu nhập vs kỳ trước
  - Chi tiêu vs kỳ trước
  - Chênh lệch ròng vs kỳ trước

### 13.4 Dashboard Charts
- `Xu hướng theo kỳ lọc (DKK)` đã đổi sang biểu đồ **đường**.
- Giảm mật độ dữ liệu hiển thị còn khoảng **3 mốc** để dễ đọc trên iOS.
- Chart so sánh kỳ trước giữ 2 nhóm chính: `Thu nhập`, `Chi tiêu`.
- Chart `Chi tiêu trong kỳ` chỉ còn 1 line **Chi tiêu (DKK)**, và chỉ lấy transaction `EXPENSE` DKK.
- Line `Chi tiêu` của chart `Xu hướng theo kỳ lọc (DKK)` cũng chỉ lấy transaction `EXPENSE` DKK.
- Chart tổng quan tháng rút gọn còn `4 tháng gần nhất (DKK)` để giao diện gọn hơn.

### 13.5 Tối ưu hiển thị iOS Safari
- Bổ sung viewport cho thiết bị:
  - `width=device-width`, `initialScale=1`, `viewport-fit=cover`.
- Bật chống auto text zoom của Safari:
  - `-webkit-text-size-adjust: 100%`.
- Tối ưu safe-area trái/phải và khoảng cách mobile:
  - Dùng `env(safe-area-inset-left/right)` cho container.
- Giảm kích thước chart/card/spacings trên mobile để tránh cảm giác “quá to”.

### 13.6 Khôi phục mật khẩu an toàn
- Admin đã xác minh danh tính gọi `POST /api/users/:id/recovery-link` với `{identityVerified:true}`.
- User dùng `POST /api/auth/reset-password` với token ngẫu nhiên dùng một lần và mật khẩu 12–128 ký tự.
- Token lưu trong DB dưới dạng hash; liên kết hết hạn 15 phút, reset đồng thời chỉ một lần thành công.
- Thao tác đổi mật khẩu và thu hồi session được thực hiện trong cùng transaction.

### 13.7 Security & Dependencies
- Nâng cấp framework để xử lý các cảnh báo bảo mật đã biết:
  - `next` -> `16.4.2`
  - `react` / `react-dom` -> `19.3.1`
- Cập nhật thêm:
  - `postcss` -> `8.5.6`
  - `autoprefixer` -> `10.4.24`
- Bổ sung mitigation trong middleware: chặn request có header `x-middleware-subrequest` từ bên ngoài.

### 13.8 Export CSV, Logout và Icon
- Thêm nút `Xuất CSV` ở màn Lịch sử.
- Thêm nút `Đăng xuất` ở các màn chính.
- Thêm icon web/PWA dùng `public/logo.svg` (metadata + manifest).

### 13.9 Admin Backup & Restore System Data
- Admin app bổ sung thao tác cấp hệ thống:
  - `Backup toàn hệ thống (JSON)`: tải file backup đầy đủ.
  - `Restore toàn hệ thống từ file`: import lại toàn bộ dữ liệu từ file JSON backup.
  - `Clear user data (giữ session)`: xóa dữ liệu nghiệp vụ của toàn hệ thống nhưng không đăng xuất user hiện tại.
- API admin mới:
  - `GET /api/system/backup`
  - `POST /api/system/restore`
  - `POST /api/system/clear-user-data`
  - `POST /api/users/:id/clear-data`
- Phạm vi dữ liệu trong backup hệ thống:
  - `wallets`
  - `users` (gồm `displayName`, `email`, `status`, `note`, `passwordHash`, timestamps)
  - `sessions`
  - `passwordResetRequests`
  - `transactions`
  - `exchanges`
- Lưu ý bảo mật:
  - Backup **không** chứa mật khẩu gốc, chỉ chứa `passwordHash`.
  - Do có `passwordHash` và `session token`, file backup phải được lưu trữ/an toàn như dữ liệu nhạy cảm.
- Restore đang chạy theo mode mặc định `replace`:
  - Xóa dữ liệu hiện có ở các bảng nghiệp vụ chính.
  - Nạp lại dữ liệu từ file backup.

### 13.10 Admin Clear User Data
- Admin app hỗ trợ clear data theo 2 phạm vi:
  - Từng user: nút `Xóa data user` trên card user.
  - Toàn hệ thống: nút `Clear user data (giữ session)` ở cụm thao tác hệ thống.
- Phạm vi bị xóa:
  - `transactions`
  - `exchanges`
  - `passwordResetRequests`
- Phạm vi được giữ lại:
  - `users` / tài khoản đăng nhập
  - `sessions`
  - `wallets`
- API trả về số bản ghi đã xóa theo từng bảng để admin kiểm tra sau thao tác.

## Regression checks and deployment notes

- Run `npm test` for amount formatting, restore validation, and authentication rate-limit regressions.
- Run `TEST_DATABASE_URL=postgresql://...@127.0.0.1:<port>/finance_tracker_test npm run test:integration` against a **disposable** PostgreSQL database after running `DATABASE_URL=<test-url> npx prisma migrate deploy`. Integration checks clear this test database and exercise concurrent ledger writes and backup/restore.
- `npm run build` regenerates the Prisma client and checks the production build.
- Migration `20260213000000_restore_auth_baseline` recreates the missing authentication bootstrap for fresh installs. It is safe to apply to existing installations and does not change previously committed migration files. Run `npx prisma migrate deploy` before starting the updated app.
- The admin service is bound to `127.0.0.1:6070`; remote administration can use an SSH tunnel.
- The private app trusts only the ingress-overwritten `X-Real-IP`; nginx admits only the configured cloudflared connector. Never expose the app port directly when proxy trust is enabled.
- Ledger writes lock the user's database row so balance validation and the resulting write execute together. Backups use a repeatable-read snapshot; restores require a complete version-1 or version-2 system backup; version 2 also includes budgets.
- Exchange edits preserve both the fee amount and its currency. Fees can be edited in DKK or VND.

## Tìm kiếm nâng cao và ngân sách tháng

- **Lịch sử** (`/history`): tìm không dấu/không phân biệt hoa thường trong ghi chú, danh mục và nơi đổi tiền; lọc loại, tiền tệ, ngày, danh mục, phương thức và khoảng tiền. Bộ lọc nằm trên URL. Mỗi lần tải 30 mục; số lượng và tổng luôn tính trên toàn bộ kết quả. CSV xuất toàn bộ kết quả theo cùng bộ lọc.
- Khoảng tiền bắt buộc chọn tiền tệ. Với giao dịch đổi tiền, DKK so với số đem đổi, VND so với số nhận, không cộng phí. Chọn danh mục loại đổi tiền; chọn phương thức chỉ xét chi tiêu. Phương thức null cũ được coi là tiền mặt.
- **Ngân sách** (`/budgets`): hạn mức riêng mỗi tháng, mỗi tiền tệ; có tổng tháng, danh mục và chưa phân loại. Các hạn mức độc lập, không cộng chồng. Có sửa/xóa, sao chép tháng trước (giữ hạn mức đã tồn tại) và liên kết xem giao dịch liên quan.
- Chi tiêu tính ngân sách gồm tiền mặt và mua bằng thẻ; loại trả thẻ, đổi tiền và phí đổi. Các khoản EXPENSE khác, kể cả cho mượn/hoàn trả tiền mượn, vẫn được tính. Cảnh báo từ 80%, đạt 100% và vượt 100%; không chặn giao dịch.
- Tổng quan hiển thị ngân sách tổng của **tháng hiện tại**, theo tiền tệ chính, độc lập với bộ lọc dashboard. Thống kê dashboard cũ giữ nguyên quy tắc. Trong lịch sử thông thường, tổng khoản chi gồm cả trả thẻ; chế độ `expenseScope=budget` chỉ tính chi tiêu ngân sách.
- Ngày/tháng dùng múi giờ trình duyệt, mặc định UTC nếu chưa có cookie hợp lệ; DKK/VND không quy đổi hay cộng chung.

### API mới

- `GET /api/history`: `q`, `type=income|expense|exchange`, `currency`, `start`, `end`, `category`, `uncategorized=1`, `paymentMethod=CASH|CREDIT_CARD`, `minAmount`, `maxAmount`, `expenseScope=budget`, `cursor`. Giá trị tiền API dùng dấu chấm thập phân (DKK tối đa 2 chữ số, VND nguyên). Kết quả: `items`, `totalCount`, `summaryByCurrency` (minor units), `nextCursor`.
- `GET /api/budgets?month=YYYY-MM&currency=DKK|VND`; mặc định tháng hiện tại và tiền tệ chính.
- `POST /api/budgets`: `{month,currency,scope,category?,limitMajor}`; scope `TOTAL|CATEGORY|UNCATEGORIZED`.
- `PATCH /api/budgets/[id]`: `{limitMajor}`; `DELETE /api/budgets/[id]` chỉ xóa hạn mức.
- `POST /api/budgets/copy-previous`: `{month,currency}`; trả `{copied,skipped}`.
- API yêu cầu tài khoản active. Sai đầu vào trả 400; trùng ngân sách trả 409; ID không tồn tại/không thuộc user trả 404. API giao dịch cũ giữ tương thích.

### Migration và backup

- Chạy `npx prisma migrate deploy` trước khi khởi động bản mới. Migration thêm `unaccent`, bảng Budget và index phân trang; không tự tạo hạn mức, không sửa dữ liệu giao dịch cũ.
- Backup hệ thống mới xuất **version 2**, thêm `budgets` và `meta.budgetCount`. Restore nhận v1/v2, kiểm tra dữ liệu trước khi xóa/ghi và giữ cơ chế khóa giao dịch.
- Restore replace v1 khôi phục trạng thái không có ngân sách; append v1 giữ ngân sách hiện có. Append v2 bỏ qua mục trùng, không ghi đè hạn mức. Chỉ bản ứng dụng mới đọc được backup v2; giữ PostgreSQL dump để rollback đầy đủ.
- Integration suite phải chạy trên database riêng tên `finance_tracker_test`; bộ test có xóa dữ liệu. Kiểm tra trình duyệt dùng tài khoản và dữ liệu riêng, không dùng database production.


### Hiệu năng qua Cloudflare

- Các link đến dữ liệu cá nhân dùng `prefetch={false}` để tránh chạy truy vấn nền khi card vừa xuất hiện (đặc biệt các link Ngân sách trùng nhau trên Tổng quan).
- Bộ lọc và tab dùng URL ổn định. Chỉ refresh khi cần đồng bộ dữ liệu hoặc user bấm lại tab hiện tại; không thêm timestamp để phá cache điều hướng.
- Các truy vấn độc lập của Tổng quan chạy song song; thẻ ngân sách chỉ đọc hạn mức tổng và bỏ qua quét chi tiêu khi chưa có hạn mức phù hợp.
- Tái sử dụng `Intl.DateTimeFormat` theo múi giờ với tối đa 64 cấu hình; không cache số liệu tài chính. Tránh tạo lại formatter cho từng giao dịch trong vòng lặp dashboard.
- Cookie múi giờ tương đương như `Asia/Saigon` và `Asia/Ho_Chi_Minh` không gây render lại chỉ vì khác tên alias.
- Đo cả origin và URL Cloudflare với cùng tài khoản, bộ lọc và trạng thái cache. Đếm riêng request điều hướng, prefetch và refresh; không suy ra hiệu năng từ số file JS/font đã nằm trong disk cache.
- Giữ HTML/API tài chính theo từng tài khoản ở chế độ riêng tư; chỉ tài nguyên tĩnh có tên hash mới được cache dài hạn tại CDN. Không cấu hình Cache Everything cho trang/API có session.

## Liquid Glass UI (feature flag)

`GLASS_UI_ENABLED` defaults to `false`. Set it to `true` for the Apple-inspired
Liquid Glass presentation and recreate only the app service. Classic and glass use the same component
and financial logic. The finance routes share a persistent shell; transaction drafts
are kept per user/type within the browser tab, and History resumes filters, loaded
pages and scroll while invalidating stale data after mutations.

See [implementation, QA and rollout notes](docs/liquid-glass-qa.md) for the isolated
preview/test commands, rollback behavior and the required real-iPhone release checks.
Use `npm run lint` for the ESLint CLI and `npm run test:ui` for Chromium/WebKit tests
with `TEST_DATABASE_URL` set to the dedicated local test database.


### Appearance and accessibility

The account menu now includes **Giao diện** (Theo hệ thống / Sáng / Tối) and
**Hiệu ứng trong suốt** (Theo hệ thống / Tiêu chuẩn / Giảm trong suốt).
These browser preferences persist in non-sensitive cookies, default to the system,
and apply to every view, authentication page and dialog before paint. High contrast
forces opaque controls; reduced motion follows the OS. Financial cards and forms
always use solid surfaces. The center + is an action button separate from the four
navigation links. No database migration is required for these presentation changes.
