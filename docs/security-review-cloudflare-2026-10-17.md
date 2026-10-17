# Rà soát bảo mật Finance Tracker qua Cloudflare

Ngày kiểm tra: 17/10/2026, múi giờ Việt Nam. Domain: https://financetracker.wt.id.vn/.

## Trạng thái sau khắc phục — đã triển khai ngày 17/10/2026

**9/9 phát hiện F1–F9 đã được xử lý trong bản đang chạy.** Các phần bên dưới mục
này là bằng chứng của snapshot trước sửa; số dòng tham chiếu có thể đã thay đổi.
Hướng dẫn hiện hành: [security-deployment.md](security-deployment.md).

| Phát hiện | Kết quả hiện tại |
|---|---|
| F1 | Next 16.4.2, React 19.3.1, Node runtime 24.22.0; audit toàn bộ và production đều 0 cảnh báo. Braces dùng bản vá source cục bộ có kiểm tra hồi quy, vì upstream chưa có bản vá. |
| F2 | Chỉ nhận raw token 64 ký tự hex, lookup digest duy nhất; không nhận hash/legacy làm token. Session cũ đã thu hồi. |
| F3 | Tắt reset/approve cũ; admin xác minh độc lập rồi cấp liên kết 15 phút, dùng một lần. Token hash trong DB, secret trong URL fragment. |
| F4 | Đổi password và thu hồi session/recovery token trong cùng transaction, dùng chung user-row lock với login. |
| F5 | Nginx chuẩn hóa X-Real-IP từ Cloudflare; app kiểm tra IP hợp lệ và giới hạn theo client/account/user. Không dùng chung unknown trên đường vào production hợp lệ. |
| F6 | App không publish port. Ingress 192.168.10.160:5050 chỉ cho connector 192.168.10.177 vào; LAN khác trả 403. Cookie production luôn __Host-session, Secure, HttpOnly. |
| F7 | App/admin UID 1000, read-only, drop capabilities, giới hạn tài nguyên; tách secret; role runtime không superuser/createdb/createrole/bypassrls và không được CREATE trong public schema. |
| F8 | Private/no-store cho HTML/API và CDN; xác minh hai tài khoản qua domain không lẫn session/data, response không cache HIT. |
| F9 | So sánh chính xác Origin cấu hình, chặn Origin thiếu/null/ngoại lai, không tin forwarded host; kiểm tra lại trong API handler. |

Các gia cố bổ sung cũng đã áp dụng: CSP nonce cho public app/script hash cho admin,
password mới 12–128 ký tự, thông báo auth hạn chế dò tài khoản, đọc JSON theo byte
thật và giới hạn trường, scrypt bất đồng bộ có giới hạn đồng thời, hạn mức API/CSV,
giới hạn list/export, admin UI không nhận password hash, backup restore không
kích hoạt lại session hoặc yêu cầu reset cũ.

Xác minh hoàn tất:

- 42 unit test và 33 kiểm tra tích hợp trên PostgreSQL riêng đều qua; lint, TypeScript/build, Docker build và nginx config đều qua.
- 26 kịch bản Chromium đã qua, gồm hai fixture gọi API được bổ sung Origin rồi chạy lại; 4 kịch bản WebKit đã qua.
- Image production non-root/read-only qua Chromium và WebKit trên HTTPS thử nghiệm: CSP/hydration, cookie Secure, năm trang, tạo/sửa/xóa giao dịch và ngân sách, API private và logout.
- Domain thật qua kiểm tra đăng nhập hai tài khoản tạm, hash-as-token bị từ chối, Origin giả/thiếu bị chặn, JSON null trả 400, reset cũ trả 410, recovery/replay, thu hồi session qua admin, logout và chặn LAN. Tài khoản/credential tạm đã xóa.
- Fingerprint toàn bộ Wallet/Transaction/Exchange/Budget/UserAllowlist trước và sau migration khớp; dữ liệu tài chính/tài khoản không đổi trong migration.
- Có backup trước sửa, dump mới nhất ngay trước migration và image rollback tại `backups/security-20261017T074629Z/`.

Các policy trong Cloudflare Dashboard chưa được thay đổi. Cấu hình live hiện tôn
trọng no-store; Access/MFA/WAF bổ sung vẫn là lựa chọn vận hành theo nhu cầu.

## Kết luận

Nên ưu tiên cập nhật Next.js, sửa xác thực session và luồng reset mật khẩu, sau đó thu hẹp đường vào origin và quyền của ứng dụng. Cloudflare Tunnel không thay thế xác thực, phân quyền, kiểm soát session hay giới hạn tài nguyên trong ứng dụng.

Đây là đánh giá code trong workspace, bao gồm thay đổi chưa commit, kết hợp kiểm tra runtime Docker và HTTP thực tế. Không sửa code ứng dụng, đổi cấu hình, restart dịch vụ hoặc thao tác tài khoản thật. Các tái hiện liên quan tài khoản dùng database giả trong process riêng. Không chạy tải tấn công/PoC CVE trên production.

## Các phát hiện ưu tiên

### F1 — Cao: Next.js đang chạy có nhiều advisory bảo mật mới

- Vị trí: `package.json:22`, `package-lock.json`; container app thực tế chạy `next@16.1.6`.
- `npm audit`: 16 package bị gắn advisory, gồm 1 critical, 13 high, 2 moderate. `npm audit --omit=dev`: 6 package, gồm 1 critical, 4 high, 1 moderate. Đây là số package bị đánh dấu, không phải số lỗ hổng đã khai thác được trên website.
- Next.js có các advisory DoS Server Components: [GHSA-q4gf-8mx6-v5v3](https://github.com/advisories/GHSA-q4gf-8mx6-v5v3), [GHSA-8h8q-6873-q5fj](https://github.com/advisories/GHSA-8h8q-6873-q5fj), cùng các advisory middleware/cache khác. App dùng App Router/RSC nên cần ưu tiên vá.
- Nhãn critical của audit bao gồm RCE trên Windows và Image Optimization/AVIF. Triển khai hiện tại dùng Linux, `images.unoptimized: true`, và kiểm tra `/_next/image` trả 404. Chưa có bằng chứng RCE tương ứng khai thác được trên cấu hình hiện tại.
- `cve_report.md` cũ nói Next 16.1.6 không có advisory trực tiếp đã không còn phản ánh kết quả audit mới.
- Khắc phục: cập nhật Next và dependency theo advisory hiện hành, đồng bộ phiên bản `eslint-config-next`, build và kiểm tra hồi quy rồi rebuild image. Registry tại lúc rà soát trả stable `16.4.2`; cần audit lại lockfile sau nâng cấp. Không dùng `npm audit fix --force` một cách tự động vì có đề xuất đổi major/downgrade không phù hợp.

### F2 — Cao, khi lộ dữ liệu session: hash trong database dùng được như bearer token

- Vị trí: `lib/auth.ts:84`, đặc biệt truy vấn `token: { in: [tokenHash, token] }` ở dòng 89.
- App lưu token dạng `sha256_v1:<digest>` nhưng nhánh tương thích legacy vẫn so sánh trực tiếp đầu vào với giá trị lưu. Nếu gửi chính chuỗi hash lấy từ database/backup trong cookie session, truy vấn vẫn tìm thấy session ACTIVE chưa hết hạn.
- Tái hiện với session giả: `authenticated=true`, đồng thời nhánh migration rehash chính hash đó. Không cần biết token gốc.
- Tác động: cơ chế hash session không bảo vệ được trước việc lộ bảng Session hoặc backup chứa session còn hạn. Đây không phải khả năng đăng nhập từ xa khi chưa có dữ liệu bị lộ.
- Khắc phục: chỉ nhận định dạng token thô hợp lệ do app phát hành, loại nhánh tìm plaintext sau khi chuyển đổi/revoke session legacy, và chỉ tra cứu digest của token đầu vào. Thêm kiểm tra hồi quy rằng hash lưu trong DB không thể đăng nhập.

### F3 — Cao, cần admin duyệt: reset mật khẩu không chứng minh quyền sở hữu email

- Vị trí: `app/api/auth/password-reset-request/route.ts:12`, `admin-server.mjs:1321`.
- Người chưa đăng nhập chỉ cần biết email ACTIVE để gửi mật khẩu do họ chọn. Endpoint xóa mọi yêu cầu PENDING cũ của user rồi lưu hash mật khẩu mới. Admin UI chỉ hiển thị yêu cầu mới và nút duyệt, không có bằng chứng sở hữu email.
- Tái hiện bằng DB giả: request không session trả 200, xóa yêu cầu PENDING trước đó và lưu hash xác minh được với mật khẩu do người gửi chọn.
- Tác động: nếu admin tin yêu cầu đó là của chủ tài khoản và duyệt, người gửi đăng nhập bằng mật khẩu họ đã chọn. Attacker cũng có thể thay thế yêu cầu hợp lệ đang chờ. Việc chiếm tài khoản không tự động xảy ra chỉ bằng gửi request.
- Khắc phục: dùng token reset ngẫu nhiên, hết hạn ngắn, một lần, gửi đến email đã xác minh; chỉ cho đặt mật khẩu sau khi chứng minh token. Nếu duy trì reset thủ công, admin phải xác minh người dùng qua kênh độc lập, vô hiệu hóa khả năng gửi mật khẩu thay cho email bất kỳ.

### F4 — Trung bình: đổi mật khẩu trực tiếp qua admin không thu hồi session

- Vị trí: `admin-server.mjs:1242`, `admin-server.mjs:1255`.
- Nhánh PATCH cập nhật `passwordHash`, nhưng chỉ xóa session khi gửi status khác ACTIVE. Đổi riêng password hoặc password cùng status ACTIVE đều giữ session cũ.
- Tái hiện với HTTP server admin và DB giả: `status=200`, `passwordChanged=true`, `revoked=false`.
- Tác động: session đã bị lấy vẫn hoạt động sau khi admin đổi mật khẩu, có thể đến 30 ngày theo thời hạn session. Nhánh duyệt password-reset riêng đã có xóa session.
- Khắc phục: cập nhật password và xóa toàn bộ session của user trong cùng transaction; kiểm tra cả tình huống login đồng thời với reset nếu cần đảm bảo thu hồi tuyệt đối.

### F5 — Trung bình: tất cả người dùng đang chia sẻ một bucket giới hạn đăng nhập

- Vị trí: `lib/rate-limit.ts:56`, `app/api/auth/login/route.ts:18`, `app/api/auth/register/route.ts:19`.
- Container thực tế chưa đặt `TRUST_PROXY`; `getClientIp()` trả `unknown` cho mọi người. Login giới hạn chung 40 request/10 phút, register 10/15 phút, reset 30/15 phút.
- Tái hiện process riêng: dùng hết bucket của client giả A khiến client giả B bị từ chối. Không tiêu hao hạn mức production.
- Tác động: người tấn công đổi email để dùng hết bucket chung và chặn người dùng khác. Giới hạn account 8/10 phút vẫn có tác dụng ngăn brute force một account.
- Khắc phục: đóng ingress trực tiếp trước; xác định IP từ header đã được proxy tin cậy ghi đè. Không chỉ bật `TRUST_PROXY=true` trong khi app còn nhận request trực tiếp. Code hiện lấy phần tử đầu `X-Forwarded-For`, cần xác minh toàn bộ chuỗi proxy; có thể chuẩn hóa từ `CF-Connecting-IP` tại proxy riêng sau khi bảo đảm chỉ Cloudflare vào được. Nếu chạy nhiều instance, dùng kho rate-limit chung thay cho Map trong RAM.

### F6 — Trung bình: origin truy cập được trực tiếp, cookie Secure phụ thuộc header

- Vị trí: `docker-compose.yml:28`, `app/api/auth/login/route.ts:77`.
- Docker và socket thực tế publish `0.0.0.0:5050` và `[::]:5050`; GET từ địa chỉ LAN `192.168.10.160:5050` nhận 307 về login. Admin 6070 và DB 4500 chỉ publish localhost; kết nối admin qua địa chỉ LAN bị từ chối.
- Tác động: máy trong LAN có thể gọi app bỏ qua các chính sách Cloudflare. Chưa xác minh cổng này có được NAT/mở ra Internet hay không.
- Login đặt `secure` dựa trên protocol/header `X-Forwarded-Proto`. Tái hiện handler với HTTP không header: cookie session thiếu Secure. Chưa thử login tài khoản thật để kiểm tra cookie trên domain công khai.
- Khắc phục nếu cloudflared chạy trên host này: publish app `127.0.0.1:5050:3000`, tunnel trỏ vào localhost. Nếu cloudflared chạy container/máy khác, dùng mạng riêng hoặc allowlist đúng connector thay cho mở mọi interface. Buộc Secure cho cookie production và cân nhắc tên `__Host-session`; xóa cookie cũ khi chuyển đổi. Nếu chặng connector-origin đi qua mạng không tin cậy, dùng HTTPS và xác minh chứng chỉ trên chặng đó.

### F7 — Trung bình, tăng mạnh hậu quả nếu app bị xâm nhập: quyền runtime quá rộng

- Vị trí: `docker-compose.yml:23`, `Dockerfile:17`, cấu hình role PostgreSQL thực tế.
- Truy vấn chỉ đọc `pg_roles` bằng chính kết nối Prisma của app trả `rolsuper=true`, `rolcreaterole=true`, `rolcreatedb=true`.
- App container chạy UID 0. App nhận chung `.env`, bao gồm `ADMIN_TOKEN` dù app public không cần token này. Image app chứa cả admin server và toàn bộ dev dependencies. Token admin không phải giá trị mặc định; không xuất giá trị secret trong báo cáo.
- Tác động: lỗi SQL injection/RCE hoặc đọc được môi trường của app có thể lan sang toàn bộ PostgreSQL cluster và chức năng admin. Chạy root trong container không tự động đồng nghĩa chiếm host.
- Khắc phục: role runtime chỉ có quyền dữ liệu cần dùng; role migration riêng; tách biến môi trường app/admin/db; chạy user không root; thu gọn dependency và cân nhắc read-only filesystem, drop capabilities, no-new-privileges phù hợp runtime.

### F8 — Trung bình, phụ thuộc cache rule: API dữ liệu cá nhân thiếu Cache-Control rõ ràng

- Vị trí tiêu biểu: `app/api/auth/session/route.ts:16`, `app/api/balances/route.ts:16`, các route history/budgets/dashboard/transactions.
- Handler session và balances với user giả trả 200 nhưng không có Cache-Control. Request chưa đăng nhập trên domain thực tế cũng không có header này. `dynamic = force-dynamic` kiểm soát cache/render trong Next, không phải chính sách cho mọi CDN/proxy ở phía trước.
- Hiện `/login` có `private, no-cache, no-store`; các request domain được quan sát đều `CF-Cache-Status: DYNAMIC`. Chưa có bằng chứng cache đang làm lộ dữ liệu. CSV thành công đã chủ động đặt `no-store`.
- Tác động: Cache Everything/Edge TTL/Worker cấu hình sai có thể cache JSON theo URL dùng chung và trả dữ liệu giữa tài khoản. API cũng có thể được browser/intermediary xử lý cache khác mong muốn.
- Khắc phục: đặt `Cache-Control: private, no-store` cho toàn bộ API nhạy cảm, gồm lỗi và response auth; Cloudflare Bypass Cache cho `/api/*` và các trang cá nhân. Chỉ cache dài hạn static asset có tên hash. Kiểm tra bằng hai tài khoản thử nghiệm sau khi sửa; không suy ra an toàn chỉ từ request chưa đăng nhập.

### F9 — Thấp, cần gia cố: Origin được so với header proxy chưa có ràng buộc tin cậy

- Vị trí: `middleware.ts:11`.
- Middleware chấp nhận Origin có host trùng `X-Forwarded-Host`, không phụ thuộc TRUST_PROXY; so sánh host thay vì toàn bộ origin gồm scheme. Thiếu Origin được chấp nhận.
- Tái hiện trực tiếp middleware: Origin lạ bị 403; cùng Origin đó kèm `X-Forwarded-Host` tương ứng lại đi qua.
- Đây là lỗi ở ranh giới tin cậy của kiểm tra Origin, chưa chứng minh khai thác CSRF trong browser: SameSite=Lax, CORS/preflight và việc trình duyệt không cho tùy ý đặt header vẫn là rào cản. Script HTTP tùy ý vượt kiểm tra này không tự có cookie nạn nhân.
- Khắc phục: allowlist origin cố định `https://financetracker.wt.id.vn`, chỉ dùng forwarded header sau khi ingress được khóa và proxy ghi đè. Thiết kế rõ cách xử lý thiếu Origin, Fetch Metadata hoặc CSRF token cho mutation dùng cookie.

## Các điểm cần gia cố bổ sung

- Public app chưa có Content-Security-Policy, xác nhận cả config và response `/login`. Chưa tìm thấy đường XSS trực tiếp: React escape dữ liệu; inline theme script là code tĩnh; admin escape các trường hiển thị. Nên thêm CSP có nonce/hash phù hợp Next và inline theme, `frame-ancestors 'none'`, `base-uri 'self'`, `form-action 'self'`; triển khai Report-Only trước nếu cần.
- Password tối thiểu 6 ký tự; register phản hồi email đã tồn tại, login phân biệt PENDING/DISABLED trước khi kiểm tra password. Đây là bề mặt dò tài khoản/trạng thái. Nên tăng độ dài tối thiểu và dùng thông báo lỗi chung phù hợp.
- Middleware giới hạn body 1 MiB bằng Content-Length; thiếu header thì bỏ qua kiểm tra. Chưa áp dụng cùng một bộ đọc body có giới hạn byte thật cho public API. Cần giới hạn khi đọc stream và trả lỗi 400 cho JSON sai/null, đặt độ dài tối đa cho email/password/displayName/note/category/provider.
- `scryptSync` chặn event loop khi hash/verify. Rate limit giúp hạn chế nhưng chưa có giới hạn riêng cho mọi mutation, CSV export hay truy vấn lấy toàn bộ giao dịch/exchange. Nên có hạn mức theo user, phân trang/stream phù hợp và giới hạn tài nguyên container; không chạy flood production để kiểm chứng.
- `/api/users` của admin dùng include trả cả passwordHash và hash reset không cần cho UI. Dùng select tối thiểu; backup chứa các hash này phải được bảo vệ như dữ liệu nhạy cảm. Không public admin qua tunnel như app thường; nếu cần truy cập từ xa, thêm Cloudflare Access/MFA và vẫn giữ xác thực admin.

## Những bảo vệ đã kiểm tra

- HTTP domain công khai trả 301 sang HTTPS; HTTPS có HSTS `max-age=2592000; includeSubDomains; preload`. Từ khóa preload không chứng minh domain đã được đưa vào danh sách preload của trình duyệt.
- `/` chưa đăng nhập trả 307 về `/login`. `/api/auth/session`, `/api/balances`, `/api/history`, `/api/budgets`, `/api/export/csv` trả 401 khi không có session.
- API tài chính kiểm tra session ACTIVE tại handler; layout tài chính kiểm tra lại ở server. Không chỉ dựa vào cookie tồn tại trong middleware.
- Các truy vấn/mutation giao dịch, exchange, history, budget được kiểm tra có ràng buộc userId; SQL tìm kiếm dùng Prisma.sql tham số hóa. Chưa thấy SQL injection/IDOR trong các đường đã đọc. Đây không phải chứng nhận không có mọi lỗ hổng.
- Session phát hành bằng 32 byte ngẫu nhiên; password dùng scrypt với salt riêng và timingSafeEqual; cookie thiết kế HttpOnly, SameSite=Lax. F2 và F6 làm giảm hiệu quả các bảo vệ tương ứng.
- CSV có escape công thức spreadsheet và no-store. Không phát hiện secret trong `.env` bị Git track; `.dockerignore` loại `.env` khỏi build context; GET origin `/.env` trả 404.
- Admin token runtime không dùng mặc định, dài 64 ký tự; DB không dùng mật khẩu mặc định. Không in secret, hash thật, email thật hoặc dữ liệu tài chính trong quá trình rà soát.

## Thứ tự xử lý đề xuất

1. Nâng Next/dependency và rebuild; sửa F2, F3, F4, thu hồi session cần thiết khi triển khai thay đổi xác thực.
2. Xác định nơi cloudflared chạy, khóa ingress origin, cấu hình cookie Secure và IP/rate-limit tin cậy.
3. Tách secret và role database; giảm quyền container.
4. Thêm no-store, thiết lập Bypass Cache, kiểm tra hai tài khoản thử; gia cố Origin/CSP/input.
5. Nếu đây là app cá nhân/nhóm nhỏ, cân nhắc Cloudflare Access với allowlist và MFA trước toàn bộ app. WAF/rate-limit ở edge bổ sung cho giới hạn trong ứng dụng.

## Bằng chứng và giới hạn

- `npm test`: 32/32 pass. Bộ test hiện tại chưa bắt các phát hiện xác thực mới nêu trên.
- Các proof process riêng xác nhận F2, F3, F4, F5, F9; handler giả xác nhận cache header 200 và cookie qua HTTP. Không ghi dữ liệu production.
- Docker/ss/HTTP LAN xác nhận bind cổng; runtime UID/env và query metadata pg_roles xác nhận F5/F7. Checksum admin-server, next.config và package.json khớp giữa workspace và app container; admin-server cũng khớp container admin.
- Domain public được kiểm tra bằng GET không session; HTTPS/TLS được HTTP client xác minh mặc định. Không thực hiện đăng nhập/đổi mật khẩu thật, không chứng minh khai thác CVE, không load-test, không chạy integration suite có xóa dữ liệu.
- Chưa có quyền đọc Cloudflare Dashboard/Zero Trust nên chưa xác minh connector location, Tunnel ingress, WAF, Cache Rules/Workers, Access policy hoặc cấu hình IP header. Header DYNAMIC là quan sát trên các response đã kiểm tra.
- Báo cáo không phải kết luận website đã bị xâm nhập; các mức độ có điều kiện đã ghi rõ điều kiện tương ứng.
