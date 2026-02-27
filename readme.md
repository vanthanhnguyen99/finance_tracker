# Finance Tracker (DKK/VND)

Ứng dụng web quản lý thu/chi cá nhân, hỗ trợ 2 loại tiền tệ DKK và VND, có đổi tiền DKK → VND, thống kê theo thời gian. Hệ thống chạy bằng Docker + PostgreSQL, UI mobile‑first và đã Việt hóa toàn bộ giao diện.

---

## 1. Tính năng chính (đã triển khai)

- **Thu nhập**: hỗ trợ DKK/VND, có danh mục và ghi chú.
- **Chi tiêu**: hỗ trợ DKK/VND, danh mục cố định, ghi chú, phương thức thanh toán (mặc định tiền mặt, tùy chọn thẻ tín dụng).
- **Đổi tiền (DKK → VND)**: nhập số DKK đổi, số VND nhận, phí (DKK), hệ thống tự tính tỷ giá.
- **Dashboard**:
  - Filter thời gian: Hôm nay / Tuần này / Tháng này / 7 ngày / 30 ngày
  - Hỗ trợ thêm khoảng ngày tùy chỉnh (`from`/`to`)
  - Tổng thu nhập, chi tiêu, số dư ví
  - Hiển thị số dư cả **Ví DKK** và **Ví VND** ở cụm card đầu trang
  - Expense breakdown theo danh mục + filter tiền tệ (DKK/VND)
  - Khi filter DKK: Exchange được tính như 1 loại chi tiêu “Chuyển đổi tiền tệ”
  - Chart `Chi tiêu trong kỳ (DKK)` chỉ thể hiện transaction `EXPENSE` DKK (không cộng exchange)
  - Ở chart `Xu hướng theo kỳ lọc (DKK)`, line `Chi tiêu` cũng chỉ tính transaction `EXPENSE` DKK
  - Monthly overview 4 tháng gần nhất (DKK)
- **Lịch sử giao dịch**:
  - Filter theo loại, tiền tệ, khoảng thời gian
  - Click để xem chi tiết (note, category, payment method, provider, fee)
  - Sửa / xóa giao dịch
  - Sửa Exchange: DKK đổi, VND nhận, phí (DKK)
- **Đăng xuất**:
  - Có nút `Đăng xuất` rõ ràng ở các màn chính (Tổng quan / Thêm / Lịch sử)
- **Quên mật khẩu (cần admin duyệt)**:
  - User gửi yêu cầu đặt mật khẩu mới từ màn `Quên mật khẩu`
  - Admin duyệt/từ chối yêu cầu trên admin app
  - Chỉ sau khi duyệt, mật khẩu mới mới có hiệu lực
- **Admin backup/restore dữ liệu toàn hệ thống**:
  - Backup JSON toàn hệ thống (wallets, users, sessions, password reset requests, transactions, exchanges)
  - Restore từ file JSON với mode mặc định ghi đè toàn bộ dữ liệu hiện tại

---

## 2. Danh mục

**Thu nhập**:
- Lương
- Người eo gửi
- Người vay gửi

**Chi tiêu**:
- Tiền thuê nhà
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
- **Fee**: hiện tại xử lý phí theo DKK (khi edit exchange).

---

## 6. UI/UX

- Mobile‑first, thao tác 1 chạm
- Bottom nav: Tổng quan / Thêm / Lịch sử
- Tăng vùng chạm cho nút `Tổng quan` và `Lịch sử` trên bottom nav để thao tác tốt hơn trên iOS Safari
- Input tiền có format dấu phẩy khi nhập
- Thông báo lưu thành công màu xanh và tự ẩn sau 5s
- Logo custom: “Compass + Lightning + Coin Orbit”

---

## 7. Docker & Env

**Ports**
- Web: `5050`
- Postgres: `4500`
- Admin App (local only): `127.0.0.1:6070`

**Scripts**
- `./start.sh` — chạy Docker Compose
- `./stop.sh` — dừng Docker Compose

**Dependency lock (khuyến nghị bắt buộc cho Docker build)**
- Dự án dùng `package-lock.json`.
- Trong Dockerfile, stage cài dependency ưu tiên `npm ci` khi có lockfile để build deterministic.

**.env**
```
DATABASE_URL=postgresql://expense_user:<password>@db:5432/expense_db
POSTGRES_USER=expense_user
POSTGRES_PASSWORD=<password>
POSTGRES_DB=expense_db
```

---

## 8. Cách chạy

```bash
./start.sh
```

Chạy migrate lần đầu:

```bash
docker compose run --rm app npx prisma migrate dev --name init
```

Truy cập:
- Web: `http://<host>:5050`
- Admin: `http://127.0.0.1:6070` (nhập `ADMIN_TOKEN`, không expose public)
- Login: `http://<host>:5050/login`

---

## 9. Deployment (Production)

### 9.1 Chuẩn bị server
- OS khuyến nghị: Ubuntu 22.04+.
- Cài Docker + Docker Compose plugin.
- Mở firewall:
  - Public: `80`, `443` (cho reverse proxy).
  - Chỉ nội bộ/local: `6070` (admin app), `4500` (Postgres, nếu không cần thì không expose).

### 9.2 Cấu hình biến môi trường
- Tạo/cập nhật file `.env` trước khi deploy:
  - `DATABASE_URL`
  - `POSTGRES_USER`
  - `POSTGRES_PASSWORD`
  - `POSTGRES_DB`
  - `ADMIN_TOKEN` (bắt buộc, đủ mạnh)
- Không commit `.env` lên git.

### 9.3 Deploy lần đầu
```bash
docker compose build
./start.sh
docker compose run --rm app npx prisma migrate deploy
```

Kiểm tra:
```bash
docker compose ps
docker compose logs app --tail=100
docker compose logs admin --tail=100
```

### 9.4 Reverse proxy + HTTPS
- Khuyến nghị đặt Nginx/Caddy phía trước app `5050`.
- Route public domain về `app:3000` (container web).
- Admin app giữ local-only (`127.0.0.1:6070`) để không expose ra internet.

Ví dụ Nginx (rút gọn):
```nginx
server {
  listen 80;
  server_name your-domain.com;
  return 301 https://$host$request_uri;
}

server {
  listen 443 ssl;
  server_name your-domain.com;

  ssl_certificate /path/fullchain.pem;
  ssl_certificate_key /path/privkey.pem;

  location / {
    proxy_pass http://127.0.0.1:5050;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto https;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
}
```

### 9.5 Cập nhật phiên bản
```bash
git pull
docker compose build
./stop.sh
./start.sh
docker compose run --rm app npx prisma migrate deploy
```

### 9.6 Backup/Restore
- Backup nhanh:
```bash
docker compose exec -T db pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > backup.sql
```
- Restore:
```bash
cat backup.sql | docker compose exec -T db psql -U "$POSTGRES_USER" "$POSTGRES_DB"
```

---

## 10. Ghi chú kỹ thuật

- Lưu tiền dạng integer (minor units): DKK = øre (×100), VND = nguyên.
- Các API `transactions`/`exchange` hỗ trợ create/update/delete.
- Dashboard dùng `noStore()` để luôn hiển thị dữ liệu mới.
- Điều hướng tab `/` và `/history` dùng query `refresh` để luôn lấy dữ liệu mới khi chuyển tab.
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

### 11.7 Luồng quên mật khẩu (Admin Approval)
- User vào trang `/forgot-password`, nhập email và mật khẩu mới.
- Hệ thống tạo yêu cầu reset mật khẩu ở trạng thái `PENDING`.
- Admin vào admin app để:
  - Approve: áp dụng mật khẩu mới cho user và thu hồi toàn bộ session hiện tại.
  - Reject: từ chối yêu cầu, mật khẩu cũ tiếp tục có hiệu lực.
- Khi yêu cầu chưa được duyệt, mật khẩu mới chưa thể đăng nhập.

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
- Điều chỉnh `BottomNav` theo layout 3 mục: `Tổng quan / Thêm / Lịch sử`.
- Mục `Thêm` đặt ở giữa, dạng nút nổi (floating) để nổi bật hơn.
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

### 13.6 Quên mật khẩu cần admin duyệt
- Thêm trang `Quên mật khẩu` tại `/forgot-password`.
- Thêm API user gửi yêu cầu reset:
  - `POST /api/auth/password-reset-request`
- Admin app hỗ trợ duyệt/từ chối từng yêu cầu reset mật khẩu:
  - `POST /api/password-reset-requests/:id/approve`
  - `POST /api/password-reset-requests/:id/reject`
- Khi duyệt yêu cầu:
  - Cập nhật `passwordHash` mới cho user.
  - Thu hồi toàn bộ session đang mở của user để đảm bảo an toàn.

### 13.7 Security & Dependencies
- Nâng cấp framework để xử lý các cảnh báo bảo mật đã biết:
  - `next` -> `16.1.6`
  - `react` / `react-dom` -> `19.2.4`
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
- API admin mới:
  - `GET /api/system/backup`
  - `POST /api/system/restore`
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
