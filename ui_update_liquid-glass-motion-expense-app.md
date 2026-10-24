# KẾ HOẠCH NÂNG CẤP UI/UX — LIQUID GLASS & MOTION

**Ứng dụng:** Web app quản lý thu chi cá nhân (ưu tiên Safari trên iPhone)\
**Loại tài liệu:** Kế hoạch thiết kế và triển khai kỹ thuật\
**Phiên bản:** 1.0 — 17/10/2026\
**Trạng thái:** Đề xuất để review và chia task\
**Đầu vào:** Ảnh chụp 5 view hiện tại: Tổng quan, Báo cáo, Thêm giao dịch, Giao dịch, Ngân sách.

> **Định hướng:** Chuyển giao diện hiện tại từ phong cách trắng/xám, card phẳng sang **Liquid Glass-inspired**, bổ sung animation nhẹ, nhất quán và có chủ đích. Đây là hiệu ứng web lấy cảm hứng từ ngôn ngữ Liquid Glass, **không phải** thành phần Liquid Glass native của iOS. Không thay đổi nghiệp vụ, dữ liệu, phép tính, loại tiền hoặc quy trình nhập giao dịch.

---

## 1. Mục tiêu và tiêu chí thành công

### 1.1. Mục tiêu

1. **Một hệ thống theme duy nhất:** Tất cả màn hình và component dùng cùng design tokens, nguyên tắc độ trong suốt, bo góc, viền, đổ bóng, typography và icon.
2. **Chuyển view mượt:** Khi chuyển giữa các tab Tổng quan / Báo cáo / Giao dịch / Ngân sách, có phản hồi tương tác và hiệu ứng chuyển cảnh tinh tế.
3. **Thêm giao dịch nhanh:** Nút `+` mở form theo chuyển động có định hướng, dễ quay lại, giữ dữ liệu form khi cần.
4. **Ưu tiên dữ liệu tài chính:** Số dư, thu nhập, chi tiêu, ngân sách và lỗi nhập liệu luôn rõ ràng, đọc được; hiệu ứng không gây phân tâm hoặc che thông tin.
5. **Đúng hành vi trên iPhone:** Thanh điều hướng tương thích safe area, bàn phím ảo, cuộn nội dung và thanh công cụ Safari.
6. **Khả năng tiếp cận và hiệu năng:** Hỗ trợ reduced motion, fallback khi thiếu backdrop blur / View Transitions API và chế độ nền ít trong suốt.

### 1.2. Success criteria / KPI nghiệm thu

| Nhóm | Tiêu chí |
|---|---|
| Consistency | 100% các view dùng token và component dùng chung; không còn màu sắc/box-shadow/radius hardcode rải rác |
| Navigation | Tab active dễ nhận biết; chuyển view không flash trắng, không nhảy layout, không mất trạng thái ngoài ý muốn |
| Motion | Phản hồi nhấn được cảm nhận ngay; hầu hết transition UI hoàn thành trong **120–320 ms** |
| Data readability | Chữ, số tiền, trường nhập có tương phản đạt **WCAG AA** theo kích thước tương ứng trong trạng thái sử dụng thực tế |
| iPhone | Không che nút lưu giao dịch/bottom tab bởi home indicator hoặc bàn phím; không bị giật khi cuộn |
| Performance | Mục tiêu **60 fps** trên thiết bị thử nghiệm đại diện đối với thao tác thường gặp; tránh long task và vùng blur lớn |
| Accessibility | `prefers-reduced-motion` hoạt động; điều hướng bằng bàn phím và VoiceOver dùng được; vùng nhấn mục tiêu tối thiểu **44 × 44 CSS px** |
| Regression | Giá trị VND/DKK, tổng thu/chi, bộ lọc, ngân sách, lưu giao dịch và biểu diễn số không thay đổi |

---

## 2. Phân tích hiện trạng từ screenshot

| View | Thành phần đã nhìn thấy | Vấn đề/cơ hội | Ưu tiên |
|---|---|---|---|
| **Tổng quan** | Header, chọn thời gian, số dư 2 ví, thu nhập/chi tiêu, ngân sách, bottom navigation | Nhiều card phẳng; phân cấp bề mặt chưa rõ | P0 |
| **Báo cáo** | Header, empty state “Sắp ra mắt”, bottom navigation | Cần nhất quán glass dù chưa có biểu đồ; không tạo hiệu ứng số liệu giả | P1 |
| **Thêm giao dịch** | Header, các tab Chi tiêu/Thu nhập/Đổi tiền, chọn số tiền/loại tiền/danh mục/phương thức/ghi chú, nút Lưu | Form dày đặc; cần chuyển tab nội bộ, focus/keyboard và CTA cố định tốt | P0 |
| **Giao dịch** | Tìm kiếm, bộ lọc nâng cao, áp dụng/đặt lại, xuất CSV, tóm tắt VND/DKK, danh sách | Cần expand/collapse mượt; giữ vị trí scroll/filter sau navigation | P0 |
| **Ngân sách** | Chọn tháng và tiền tệ, xem/thêm/sao chép ngân sách, empty state | Cần trạng thái chọn tháng, form, phản hồi khi tạo/copy; tránh animation số tiền | P0 |

**Nhận diện hiện tại cần giữ:** màu xanh dương cho CTA/tab active; thu nhập màu xanh lá, chi tiêu màu đỏ; cấu trúc 5 vị trí thanh nav gồm 4 view và nút `+` trung tâm.

**Không suy đoán từ ảnh:** framework (React/Vue/vanilla), cơ chế router, cấu trúc code, API/backend và hành vi của các màn hình chưa hiển thị. Cần audit repository trước khi sửa.

---

## 3. Nguyên tắc thiết kế Liquid Glass

### 3.1. Phân tầng (layering)

| Layer | Vai trò | Phương án |
|---|---|---|
| L0 — App background | Nền toàn bộ màn hình | Nền rất sáng (hoặc tối), có gradient tĩnh cực nhẹ để glass có chiều sâu |
| L1 — Content surfaces | Số dư, ngân sách, bảng giao dịch, form | **Ưu tiên nền solid / gần opaque** để nội dung tài chính dễ đọc |
| L2 — Glass surfaces | Top bar, bottom navigation, FAB container, menu nổi, segmented control | Nền bán trong suốt, blur vừa phải, viền highlight mảnh, bóng mềm |
| L3 — Overlays | Modal, bottom sheet, dropdown nổi | Glass có độ đục cao hơn L2; scrim nhẹ phía sau; đảm bảo focus |
| L4 — Interaction | Selected tab, focus ring, hover/pressed, toast | Brand tint vừa phải và motion thống nhất |

### 3.2. Quy tắc trực quan

- **Không phủ kính lên mọi card.** Glass nên tập trung vào lớp điều hướng và các bề mặt nổi; báo cáo tài chính và vùng nhập tiền dùng nền đủ đục.
- Blur vừa phải khoảng **10–18 px**, tùy thiết bị/hiệu năng; không chồng 2–3 lớp blur lên nhau.
- Viền kính mỏng cỡ **1 px**, dùng highlight sáng ở chế độ light và viền trung tính ở dark.
- Duy trì **một màu accent xanh dương** xuyên suốt. Màu trạng thái thu/chi luôn mang ý nghĩa ngữ nghĩa, không chỉ dùng màu để truyền thông tin.
- Góc bo theo scale; không tùy tiện tạo radius khác nhau ở từng view.
- Không dùng background chuyển động liên tục, parallax nặng, shimmer vô hạn, glow quá sáng hoặc khúc xạ giả 3D mạnh.
- Nếu tăng transparency làm giảm độ rõ, **chọn khả năng đọc và hiệu năng thay vì giữ hiệu ứng kính**.

### 3.3. Theme modes và cơ chế đồng bộ

**Đề xuất:** `glass-light` là giao diện đích ban đầu, `glass-dark` là biến thể dark cùng hệ thống token. Hệ thống có thể tạm giữ `classic` sau feature flag để rollback, **không** phát triển hai bộ component song song.

- `visualStyle`: `classic | glass` dùng cho rollout/feature flag; khi ổn định có thể bỏ `classic`.
- `colorMode`: `system | light | dark`, tùy user setting (nếu triển khai tùy chọn); `system` theo `prefers-color-scheme`.
- Chỉ có **một** `ThemeProvider`/theme controller ở cấp app shell, gắn `data-visual-style` và `data-color-mode` tại root.
- Chỉ component dùng semantic tokens (`--surface-*`, `--text-*`, `--border-*`, `--accent-*`...). Không đặt literal màu riêng cho từng trang.
- Lưu tùy chọn theme tại client; khi khởi tạo áp dụng theme sớm để tránh chớp light/dark. Kiểm tra SSR/hydration nếu app đang dùng SSR.
- Dialog, dropdown portal, toast, loading state và các view tạo trong tương lai **bắt buộc** kế thừa theme root.

---

## 4. Design tokens — nền tảng bắt buộc

> Các giá trị dưới đây là **điểm xuất phát** để prototype; cần đối chiếu contrast bằng UI thật trên iPhone và điều chỉnh trước release. Giá trị blur không phải yêu cầu bắt buộc trên thiết bị yếu.

### 4.1. Màu sắc và glass

| Token ngữ nghĩa | Light (đề xuất) | Dark (đề xuất) | Dùng cho |
|---|---|---|---|
| `--app-bg` | `#F3F6FC` | `#0E1524` | Nền toàn màn |
| `--surface-solid` | `#FFFFFF` | `#1B273A` | Card dữ liệu, nhập liệu |
| `--surface-glass` | `rgba(255,255,255,.78)` | `rgba(28,41,60,.82)` | Navigation/header/menu nổi |
| `--surface-elevated` | `rgba(255,255,255,.92)` | `rgba(30,43,61,.94)` | Popover/form overlay |
| `--glass-stroke` | `rgba(255,255,255,.85)` | `rgba(220,232,255,.17)` | Viền kính |
| `--border-subtle` | `#DDE5F1` | `#33445B` | Card, divider, input |
| `--text-primary` | `#172438` | `#F2F6FC` | Văn bản / số tiền |
| `--text-secondary` | `#536782` | `#C0CBDA` | Caption, hint |
| `--accent` | `#3158DA` | `#86A6FF` | Active, focus, action |
| `--accent-strong` | `#2449C4` | `#AAC0FF` | Nhấn mạnh khi đủ contrast |
| `--income` | `#137A47` | `#66D99B` | Thu nhập |
| `--expense` | `#BD353F` | `#FF9297` | Chi tiêu |

**Lưu ý:** `--accent` và các token chữ trên nền accent phải được chọn **theo cặp** trong kiểm thử contrast; không mặc định dùng chữ trắng trên `--accent` dark. Có thể tách `--text-on-accent`, `--focus-ring`, `--positive-bg`, `--negative-bg`.

### 4.2. Spacing, typography, shape, depth

| Nhóm | Token / giá trị gợi ý |
|---|---|
| Spacing | `4, 8, 12, 16, 20, 24, 32 px` |
| Radius | Input `12 px`; card `18 px`; panel/menu `20 px`; sheet `24 px`; FAB pill/circle |
| Font | System font stack `-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` |
| Type | Body ≥ `14 px`, label `13–14 px`, số tiền nổi bật `18–24 px` theo ngữ cảnh; cân nhắc Dynamic Type/text zoom |
| Border | `1 px` cho surface/input, focus ring đủ nhìn |
| Glass blur | Mặc định `14 px`, giảm `10 px` với màn hình/thiết bị thấp, bỏ blur khi fallback |
| Shadow | 1 mức shadow nhẹ cho glass, 1 mức cho sheet; tránh glow đậm |
| Tab bar | Chiều cao phần tương tác ≥ `64 px` (không tính safe area) |
| Tap target | ≥ `44 × 44 CSS px`; nút `+` mục tiêu `52–56 px` |

### 4.3. Motion tokens

```css
:root {
  --motion-fast: 140ms;
  --motion-base: 220ms;
  --motion-slow: 300ms;
  --ease-standard: cubic-bezier(0.2, 0, 0, 1);
  --ease-enter: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-exit: cubic-bezier(0.4, 0, 1, 1);
  --glass-blur: 14px;
}

@media (prefers-reduced-motion: reduce) {
  :root {
    --motion-fast: 0ms;
    --motion-base: 0ms;
    --motion-slow: 0ms;
  }
}
```

**Các motion primitive thống nhất:** `fade`, `fade-up`, `slide-up`, `scale-in`, `press-feedback`, `expand-collapse`. Mọi component tái sử dụng primitive này; không tự chọn duration/easing mới.

---

## 5. Motion specification theo sự kiện

| Sự kiện | Hiệu ứng | Duration | Quy tắc |
|---|---|---|---|
| Tap tab dưới cùng | Icon/tab highlight biến đổi nhẹ; background active đổi tint | 140–200 ms | Feedback ngay cả khi nội dung chưa render |
| Đổi view chính | Nội dung cũ fade-out nhẹ, nội dung mới fade-in + `translateY(6–10px)` | 180–240 ms | **Không** chuyển động cả thanh nav; chỉ nội dung đổi |
| Tap `+` | FAB phản hồi nhấn, mở view form bằng fade + slide-up ngắn | 240–300 ms | Khi đóng có reverse; giữ root shell nhất quán |
| Chuyển Chi tiêu / Thu nhập / Đổi tiền | Indicator của segmented control trượt, trường form cần thiết crossfade | 180–240 ms | Giữ vị trí khung form; không làm mất số tiền đã nhập ngoài chủ đích |
| Mở bộ lọc nâng cao | Panel expand + opacity; chevron xoay | 180–240 ms | Tránh làm giật scroll; thu hồi focus hợp lý |
| Mở chọn ví/tiền tệ/danh mục | Popover scale nhẹ hoặc bottom sheet slide-up | 180–280 ms | Một chuẩn duy nhất theo loại control |
| Nhấn CTA / Lưu | Press scale `0.98`, loading/disabled; thành công toast nhẹ | 100–180 ms press; 180–240 ms toast | Không double-submit; không che lỗi |
| Chọn tháng ngân sách | Picker mở theo component dùng chung, dữ liệu cập nhật ổn định | 180–240 ms | Không slide toàn bộ số tiền |
| Empty state | Fade-in một lần khi vào view | 180–220 ms | Không loop vô hạn |
| Validation error | Viền/hint hiện bằng opacity và translate ngắn | 120–180 ms | **Không shake mạnh**; focus trường lỗi đầu tiên |
| Loading danh sách | Skeleton tĩnh hoặc pulse rất nhẹ | Theo tải dữ liệu | Tránh giả lập dữ liệu tài chính; tắt animation khi reduced motion |

### 5.1. Chuyển tab: quy tắc hành vi

1. Chỉ chạy transition khi **thực sự đổi tab**; nhấn lại tab hiện tại không được nhấp nháy toàn trang (có thể cuộn đầu trang nếu thống nhất UX).
2. Giữ bottom navigation cố định, chỉ animate `<main>` hoặc vùng content tương ứng.
3. Khi truy vấn API chậm: hiển thị ngay trạng thái active và skeleton/phần tải, không giữ màn hình cũ bị đóng băng.
4. Người dùng bấm tab liên tục: hủy/ghi đè animation cũ một cách an toàn; kết quả luôn là tab cuối cùng được chọn.
5. Dữ liệu filter/scroll/search nên giữ theo tab nếu workflow cần; quyết định này phải có test.
6. **Không bắt buộc swipe ngang chuyển tab.** Cử chỉ sát mép màn hình dễ xung đột back/forward của Safari; chỉ thêm khi được kiểm thử riêng.

### 5.2. Mở/đóng form “Giao dịch mới”

**Ưu tiên UX:** Giữ thanh navigation của app (nếu chọn full-page) hoặc mở một full-screen overlay/sheet nhưng **chỉ chọn một pattern** theo router hiện hữu.

- Vào form: từ FAB, fade + slide-up `~280ms`; header có back/close rõ ràng.
- Trong form: segmented control chuyển trạng thái độc lập; các input không nhảy giật khi xuất hiện phần phụ thuộc.
- Keyboard mở: vùng nội dung cuộn được; CTA `Lưu chi tiêu` không bị che. Xử lý `visualViewport` khi cần, thay vì giả định 100vh luôn đúng.
- Thoát khi đã nhập dữ liệu: giữ draft hoặc xác nhận hủy nếu có nguy cơ mất dữ liệu (theo UX đã thống nhất).
- Sau lưu thành công: vô hiệu nút trong lúc submit, hiện thành công, điều hướng phù hợp và refresh số dư/tổng hợp/danh sách **bằng dữ liệu thật**.

---

## 6. Component system dùng chung

| Component | Yêu cầu Liquid Glass | Ghi chú kỹ thuật |
|---|---|---|
| `AppShell` | Background và theme root | Đảm bảo viewport, safe area, layout và scroll |
| `AppHeader` | Glass header, typographic scale thống nhất | Không hardcode chiều cao theo từng view |
| `BottomTabBar` | Glass nổi, active state rõ, FAB trung tâm | Đồng bộ vị trí, chiều cao, z-index; chỉ 1 instance |
| `GlassSurface` | Biến thể `nav`, `popover`, `overlay`, `subtle` | Không dùng cho mọi bảng số liệu |
| `DataCard` / `StatCard` | Nền gần opaque, shadow/radius chung | Bảo vệ độ rõ số dư và KPI |
| `Button` / `FAB` | Variants primary/secondary/ghost/critical | Focus/pressed/disabled/loading |
| `TextField` / `MoneyInput` | Nền input rõ, focus ring cùng brand | Không animate giá trị tiền, giữ locale/format |
| `Select` / `DatePicker` | Popover/sheet nhất quán | iPhone native picker nếu phù hợp, ưu tiên ổn định |
| `SegmentedControl` | Thanh active tint nhẹ, trượt mượt | Dùng cho tab Chi tiêu/Thu nhập/Đổi tiền |
| `FilterAccordion` | Expand/collapse đúng motion token | ARIA expanded; scroll ổn định |
| `Modal` / `BottomSheet` | Glass elevated + scrim | Focus trap, restore focus, Escape/back behavior |
| `Toast` / `Alert` | Bề mặt nổi dễ đọc | Không che CTA hay tab bar |
| `EmptyState` / `Skeleton` | Đồng bộ icon, màu, chuyển động | Bao gồm Báo cáo “Sắp ra mắt” |

**Quy ước:** Không để từng trang tự định nghĩa `button`, `card`, `select` và `modal`. Trang chỉ compose từ thư viện component dùng chung.

### 6.1. API component dự kiến (stack-agnostic)

```text
GlassSurface(variant, elevated?, interactive?)
AppHeader(title, leadingAction?, trailingAction?)
BottomTabBar(items, activeRoute, onNavigate, onAdd)
Button(variant, size, loading, disabled, onClick)
MoneyInput(value, currency, locale, onChange, error?)
TransitionContainer(routeKey, direction?, children)
BottomSheet(open, onClose, title, children)
```

Tên chỉ là đề xuất để chia ownership, không ép framework cụ thể.

---

## 7. Thiết kế chi tiết theo 5 view

### A. Tổng quan — P0

- Header và thanh nav cùng độ đục/blur/radius; tránh header kính nhưng tab bar nền solid không liên quan.
- Date range selector: surface rõ ràng; khi mở lịch dùng dropdown/sheet component dùng chung.
- Hai ô ví **VND/DKK**: card dạng solid/near-opaque, currency label và số dư có hierarchy nhất quán; không dùng blur làm chữ mất nét.
- Income/Expense: giữ màu ý nghĩa, có nhãn/chỉ số hỗ trợ; chỉ animate card vào một lần khi đổi view, **không đếm số tiền giả**.
- CTA “Thiết lập ngân sách”: button dùng chung, khi nhấn điều hướng đến Ngân sách theo motion chuẩn.

### B. Báo cáo — P1

- Empty state “Sắp ra mắt” có icon, text và khung sử dụng `DataCard`/`EmptyState` thống nhất.
- Fade-in nhẹ khi vào tab; **không** dựng chart chuyển động nếu tính năng chưa tồn tại.
- Khi có báo cáo tương lai: chart chỉ animate có giới hạn và có phiên bản giảm chuyển động.

### C. Thêm giao dịch — P0

- Header “Giao dịch mới” và currency indicator đồng nhất header ở các trang khác.
- Segmented control Chi tiêu/Thu nhập/Đổi tiền: active indicator trượt, không đổi toàn bộ theme của form theo loại giao dịch.
- `MoneyInput` phải nhận focus tốt trên iPhone; ưu tiên bàn phím số và xử lý decimal theo locale, không sửa format nghiệp vụ.
- Dropdown danh mục / payment method sử dụng cùng sheet/popover.
- Help hint cho thẻ tín dụng là surface tinted nhẹ, không bị chìm trong kính.
- Nút Lưu là primary CTA, sticky hoặc khu vực đáy an toàn tùy keyboard; hiển thị loading/success/error.

### D. Giao dịch — P0

- Search field và “Bộ lọc nâng cao” dùng component form chung.
- Expand/collapse bộ lọc bằng `FilterAccordion`; đừng animate bảng kết quả theo từng chữ nhập.
- Nút Áp dụng/Đặt lại/xuất CSV theo phân cấp: primary, secondary, tertiary.
- Khối tổng kết DKK/VND dùng `StatCard`, nền vững và typography tabular nums.
- Danh sách có skeleton/empty/error state; khi cập nhật kết quả có fade ngắn, giữ trải nghiệm cuộn.

### E. Ngân sách — P0

- Bộ chọn Tháng và Tiền tệ thống nhất component với Tổng quan/Form.
- Thêm/sao chép ngân sách mở form/sheet cùng motion và nền overlay.
- Empty state “Chưa đặt ngân sách” giữ độ tương phản đủ cao.
- Các thanh tiến độ ngân sách (khi có dữ liệu) được phép transition width nhẹ sau dữ liệu mới, **không** dùng chuyển động để che chậm tải.

---

## 8. Kiến trúc triển khai đề xuất

### 8.1. Nguồn sự thật của theme

```text
App Root
├── ThemeController / ThemeProvider
│   ├── Design Tokens (light/dark, glass/solid)
│   ├── Global Motion Preferences
│   └── Accessibility Preferences / Fallback
├── AppShell
│   ├── AppHeader
│   ├── RouteTransitionContainer
│   │   ├── OverviewView
│   │   ├── ReportsView
│   │   ├── AddTransactionView
│   │   ├── TransactionsView
│   │   └── BudgetView
│   ├── BottomTabBar
│   └── OverlayRoot (sheet, popover, toast, dialogs)
└── Shared UI Components
```

### 8.2. Gợi ý cấu trúc thư mục (điều chỉnh theo repository)

```text
src/
  styles/
    tokens.css
    themes.css
    glass.css
    motion.css
    global.css
  components/
    layout/AppShell.*
    navigation/BottomTabBar.*
    surfaces/GlassSurface.*
    surfaces/DataCard.*
    forms/MoneyInput.*
    forms/SegmentedControl.*
    overlays/BottomSheet.*
    feedback/Toast.*
  theme/ThemeProvider.*
  motion/RouteTransition.*
  tests/
    ui-theme/
    navigation/
    accessibility/
```

### 8.3. Strategy cho chuyển view

- **SPA:** Ưu tiên native `document.startViewTransition()` khi feature detection có hỗ trợ và khi router cho phép cập nhật DOM đúng vòng đời; fallback CSS/JS đơn giản dùng opacity + transform.
- **MPA:** Có thể đánh giá cross-document view transitions cho trang **cùng origin**, nhưng đây là progressive enhancement; không buộc dùng để release.
- Không được chạy **hai** animation trùng nhau (View Transitions API + CSS enter/exit) cho cùng một route.
- Chỉ dùng view-transition-name cho thành phần thật sự cần shared-element; tránh animate snapshot của cả trang chứa input đang focus.

Pseudocode:

```js
function transitionTo(updateView) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion || typeof document.startViewTransition !== 'function') {
    updateView();
    return;
  }
  document.startViewTransition(() => updateView());
}
```

> Pseudocode này chưa thay thế tích hợp router thực tế. Nếu router update async, phải tích hợp theo hướng dẫn framework/router để snapshot đúng thời điểm.

### 8.4. Progressive enhancement / fallback bắt buộc

```css
.glass-surface {
  background: var(--surface-solid); /* fallback rõ ràng */
  border: 1px solid var(--border-subtle);
}

@supports ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .glass-surface {
    background: var(--surface-glass);
    -webkit-backdrop-filter: blur(var(--glass-blur));
    backdrop-filter: blur(var(--glass-blur));
    border-color: var(--glass-stroke);
  }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

**Reduced transparency:** Có thể áp dụng `@media (prefers-reduced-transparency: reduce)` ở môi trường hỗ trợ, nhưng **không được phụ thuộc duy nhất** vào media query này vì hỗ trợ trình duyệt còn hạn chế. Cung cấp fallback opaque mặc định, cân nhắc app setting “Giảm hiệu ứng kính” nếu cần.

---

## 9. Quy tắc iPhone / Safari và hiệu năng

### 9.1. Safe area & keyboard

- Trong HTML đảm bảo `meta viewport` phù hợp; với giao diện full-bleed cân nhắc `viewport-fit=cover` và **phải** tự bù safe area.
- Bottom tab bar: khoảng cách đáy tính bằng `env(safe-area-inset-bottom)`; vùng tương tác không đè home indicator.
- Content phải có bottom padding đủ chiều cao bar + safe area để item cuối luôn cuộn tới được.
- `100dvh`/`svh` có fallback phù hợp; thử nghiệm khi thanh công cụ Safari ẩn/hiện.
- Khi bàn phím mở, đảm bảo `MoneyInput`, dropdown và nút lưu không bị che; tránh fixed footer ép trên bàn phím khi chiều cao viewport thay đổi.
- Không vô hiệu pinch zoom / text zoom; kiểm thử cỡ chữ lớn, autofill và biểu mẫu dài.

### 9.2. Hạn chế gây giật

- Chỉ animate **`transform` và `opacity`** khi có thể; hạn chế chuyển động bằng `top`, `left`, `height`, `box-shadow`, `backdrop-filter` theo mỗi frame.
- Đối với accordion: nếu cần animate kích thước, dùng phương án đo layout cẩn thận hoặc CSS grid và test Safari; không animate `height: auto` một cách thiếu kiểm soát.
- Blur **một lớp** cho tab bar/header/popover; không tạo glass lặp trong danh sách hàng trăm giao dịch.
- Tránh dùng `will-change` đại trà; thêm tạm khi cần và gỡ sau animation.
- Không render lại toàn bộ danh sách giao dịch khi tab active animation thay đổi.
- Với thiết bị chậm: bật `reduced-effects` flag => ít blur, không shared-element, chỉ fade nhanh.
- Kiểm tra công cụ Performance/Web Inspector trên **iPhone thật**; mục tiêu không có scroll jank hoặc layout shift đáng kể.

### 9.3. Tính đúng đắn của app tài chính

- Không animate bằng cách nội suy/đếm tiền từ giá trị cũ sang mới nếu không có yêu cầu; tránh gây hiểu nhầm về số dư.
- Giữ định dạng VND (`đ`), DKK (`kr.`), dấu phân cách hàng nghìn, số thập phân và kết quả đổi tiền như hiện tại.
- Theme không được thay đổi công thức, currency conversion, logic thẻ tín dụng hoặc trạng thái thanh toán.
- Trạng thái lỗi/đang lưu/đã lưu rõ ràng; không phát sinh ghi nhận trùng giao dịch do double tap.
- Trong animation chuyển trang phải chặn tương tác ở view cũ khi nó không còn active; không che giấu lỗi server.

---

## 10. Lộ trình triển khai theo phase

> Effort mang tính **ước lượng sơ bộ cho 1 developer frontend**, phụ thuộc codebase, mức độ tái sử dụng component và kiểm thử trên thiết bị thật.

| Phase | Công việc | Deliverable | Ước lượng | Ưu tiên |
|---|---|---|---|---|
| **0 — Audit & baseline** | Xác định stack/router, inventory component/CSS, screenshot baseline, audit 5 luồng tài chính | Component map, baseline test, danh sách rủi ro | 0.5–1 ngày | P0 |
| **1 — Theme foundation** | Design tokens, light/dark + fallback, `GlassSurface`, AppShell, global CSS, CSS scope | UI primitives và theme controller dùng chung | 1.5–2.5 ngày | P0 |
| **2 — Navigation & motion** | Header, tab bar, FAB, route transition, reduced motion, xử lý rapid taps | 5 view chuyển ổn định; nav glass thống nhất | 1.5–2 ngày | P0 |
| **3 — Screens migration** | Chuẩn hóa cards, form, filter, CTA, input/sheet, empty states cho 5 view | Mọi màn hình dùng component chung | 2–3 ngày | P0 |
| **4 — iPhone QA & polish** | Safari keyboard/safe area, dark mode, VoiceOver, contrast, performance, regression | QA report, fix list, video before/after | 1.5–2.5 ngày | P0 |
| **5 — Release** | Feature flag, staging, rollout, monitoring, cleanup | Release an toàn, rollback plan | 0.5–1 ngày | P0 |

**Tổng dự kiến:** Khoảng **7.5–12 ngày công**; không bao gồm refactor lớn, dựng chức năng Báo cáo mới hoặc tái thiết kế backend.

### 10.1. Thứ tự ưu tiên MVP

**P0 — Bắt buộc trước release**

- Shared theme tokens + GlassSurface và solid fallback.
- Header + BottomTabBar + FAB nhất quán trên 5 view.
- Chuyển tab và mở/đóng form mềm, không mất dữ liệu.
- Form giao dịch, tiền tệ và nút lưu dùng được với bàn phím iPhone.
- Reduced motion, contrast, safe area, test giao dịch/ngân sách.

**P1 — Nên có trong cùng đợt nếu đủ thời gian**

- Glass cho dropdown/sheet/toast; accordion filter mượt; dark mode hoàn chỉnh.
- Skeleton và transition tinh tế khi cập nhật dữ liệu thật.
- Instrumentation/logs cho animation lỗi/long task.

**P2 — Sau khi đã đo hiệu năng**

- Shared-element transition có chọn lọc; tùy chọn giảm hiệu ứng kính trong UI.
- Haptic feedback (chỉ khi có API hỗ trợ và phù hợp; không cần để hoàn thành web app).

---

## 11. Task breakdown để tạo issue / giao coding agent

- [ ] **UI-01 — Audit hiện trạng:** Xác định routing, component trùng lặp, CSS global, portal, browser target, ảnh baseline.
- [ ] **UI-02 — Implement design tokens:** Light/dark semantic variables, spacing/radius/shadow/motion; lint/review rule không hardcode visual style trong view.
- [ ] **UI-03 — Theme controller:** Áp dụng root theme; theo system/manual, lưu cài đặt, tránh flash theme lúc boot.
- [ ] **UI-04 — Shared surfaces:** `GlassSurface`, `DataCard`, `Button`, focus/disabled/loading; test contrast.
- [ ] **UI-05 — Navigation shell:** `AppHeader`, `BottomTabBar`, FAB; safe area, scroll padding, z-index; dùng chung mọi trang.
- [ ] **UI-06 — Route animations:** Transition primitive, feature detect View Transitions API, rapid taps, history/back, reduced motion.
- [ ] **UI-07 — Transaction form:** Segmented control, money input, select/sheet, bàn phím, sticky CTA, save lifecycle.
- [ ] **UI-08 — Transaction list:** Search/filter expand-collapse, stable result area, summary card, export state.
- [ ] **UI-09 — Overview/Budget/Report:** Chuẩn hóa KPI, ngân sách, date picker và empty state.
- [ ] **UI-10 — Accessibility QA:** VoiceOver, contrast AA, focus/order, reduced motion, tap target, text zoom.
- [ ] **UI-11 — Device QA & performance:** Safari iPhone thật; keyboard/scroll/back; long task, paint/blur optimization.
- [ ] **UI-12 — Rollout:** Screenshot/video comparison, regression, staging, feature flag và rollback.

### 11.1. Definition of Done cho mỗi task UI

- Có screenshot **light và dark** (nếu dark mode đã được bật trong scope của phase).
- Không có giá trị visual hardcoded ngoài token hoặc ngoại lệ đã được ghi rõ.
- Có trạng thái default / active / pressed / disabled / loading / error khi component hỗ trợ.
- Reduced motion và fallback không blur hoạt động.
- Test được trên viewport nhỏ và Safari iPhone thật (ít nhất cho task navigation/form/overlay).
- Không sửa nghiệp vụ tài chính trừ khi là bug được tách task riêng.

---

## 12. Ma trận kiểm thử và kịch bản nghiệm thu

| Test | Thao tác | Kết quả mong đợi |
|---|---|---|
| TAB-01 | Chuyển tuần tự 4 tab, sau đó bấm ngược | Header/nav active nhất quán, content transition mượt, không flash |
| TAB-02 | Bấm liên tục các tab trong 2 giây | Chỉ tab cuối active; không chồng animation hoặc mất route |
| TAB-03 | Cuộn dài ở Giao dịch, sang Ngân sách và quay lại | Scroll/filter khôi phục theo quy tắc UX đã xác định |
| ADD-01 | Bấm `+`, chọn Chi tiêu/Thu nhập/Đổi tiền | Motion thống nhất; form không đổi layout bất thường |
| ADD-02 | Nhập tiền, bật keyboard, cuộn và nhấn lưu | Trường nhập và CTA sử dụng được; không bị home indicator che |
| ADD-03 | Submit chậm, bấm Lưu 2 lần | Không tạo 2 giao dịch; loading/response rõ ràng |
| ADD-04 | Nhập dở, thoát form và quay lại | Không mất dữ liệu ngoài chủ đích; có hành vi confirm phù hợp |
| TXN-01 | Mở/đóng bộ lọc nâng cao | Mượt, đúng ARIA expanded và focus, không giật scroll |
| TXN-02 | Tìm kiếm, lọc, xuất CSV | Kết quả/data/CSV giống phiên bản cũ |
| BUD-01 | Đổi tháng/tiền tệ, thêm/copy ngân sách | Theme nhất quán, số tiền và hành vi đúng |
| RPT-01 | Mở view Báo cáo chưa triển khai | Empty state đúng, không biểu đồ/dữ liệu giả |
| THEME-01 | Đổi light/dark (nếu bật), reload, đổi tab, mở modal | Tất cả thành phần theo cùng theme; không có flash sai theme |
| A11Y-01 | Bật Reduce Motion trên iPhone | Không còn slide/scale gây khó chịu; vẫn thao tác được |
| A11Y-02 | Bật cỡ chữ lớn, VoiceOver, focus tab | Nhãn đọc được, control không chồng lấn, focus hợp lý |
| FALLBACK-01 | Giả lập không hỗ trợ blur/View Transitions API | Có nền opaque, chuyển view vẫn hoạt động |
| PERF-01 | Cuộn danh sách dài, mở filter, mở/đóng form | Không giật thấy rõ; kiểm tra frame time/paint thực tế |

**Thiết bị/viewport gợi ý:** tối thiểu 320 / 375 / 393 / 430 CSS px, cả iPhone có home indicator và thiết bị màn nhỏ; Safari thường và chế độ Add to Home Screen/PWA nếu app hỗ trợ. Test dark mode, zoom/text size, portrait và keyboard; landscape là kiểm thử bổ sung tùy scope.

---

## 13. Rủi ro và quyết định kỹ thuật

| Rủi ro | Tác động | Giải pháp |
|---|---|---|
| Blur nhiều vùng khi scroll | Giật / hao pin | Chỉ blur header/nav/overlay, fallback opaque trên máy yếu |
| Kính làm số tiền khó đọc | Sai nhận thức tài chính | Card solid/near-opaque; kiểm tra tương phản thực tế |
| Các view dùng CSS riêng | Theme lệch từng màn | Shared tokens + shared components + QA 5 view |
| View transitions không đồng nhất giữa browser/loại route | Chuyển trang lỗi | Feature detect + fallback CSS; test Safari thật |
| iOS keyboard che CTA | Không lưu được giao dịch | Safe area + dynamic viewport + focus/scroll strategy |
| Route animation trùng với data fetching | Flicker/nhảy giao diện | Tách UI transition khỏi state mạng; skeleton ổn định |
| Double tap khi lưu | Giao dịch trùng | Submit state + idempotency/back-end guard nếu có |
| Animation chạm browser swipe-back | Điều hướng khó đoán | Không ưu tiên gesture ngang; tôn trọng system navigation |
| Dark mode chỉ thay nền | Các dialog, chart, dropdown lệch màu | Portal root theo theme, regression matrix |

### Các quyết định cần chốt ở Phase 0

1. App là SPA hay MPA? Framework/router đang dùng là gì?
2. Form `+` là **route full page** hay **full-screen overlay**? Chọn một để animation/back behavior thống nhất.
3. Có triển khai **dark mode** trong release này hay chỉ ưu tiên glass-light trước? Theme token nên chuẩn bị cả hai.
4. Khi quay về tab Giao dịch, có giữ bộ lọc/vị trí cuộn không?
5. Có PWA/Add to Home Screen hay chỉ Safari tab thường? Nếu có, thêm QA standalone.

**Đề xuất mặc định khi chưa chốt:** Giữ architecture/router hiện tại, chỉ nâng presentation; `glass-light` là bản đầu tiên, theme/token thiết kế sẵn cho dark; không đổi API/luồng giao dịch.

---

## 14. Release checklist

### Trước merge

- [ ] Review design tokens và component API trước khi sửa hàng loạt màn hình.
- [ ] Demo 5 view với cùng theme (cả các dialog và menus).
- [ ] Test thủ công nghiệp vụ thu/chi, đổi tiền DKK/VND, ngân sách, tìm kiếm, CSV.
- [ ] Run accessibility checks và kiểm tra contrast, reduced motion.
- [ ] Không có overflow ngang, nav che content, layout jump khi keyboard mở.
- [ ] Test hiệu năng trên iPhone thật; giảm blur/motion nếu có regression.

### Rollout

1. Đưa lên **staging** với feature flag `glass_ui_enabled` (giữ option rollback).
2. QA screenshot comparison và video recording các transition chính.
3. Bật một phần hoặc toàn bộ người dùng tùy hệ thống triển khai.
4. Theo dõi lỗi JS, số lần submit thất bại, thời gian phản hồi và feedback về motion.
5. Khi ổn định, xoá CSS/theme cũ bị trùng và chốt tokens làm chuẩn cho màn hình mới.

---

## 15. Kết quả bàn giao mong đợi

1. **Một theme system chung:** token light/dark, glass/solid, typography, spacing, state và motion.
2. **Một bộ shared components:** header, bottom nav, FAB, button, data card, glass surface, form control, sheet, feedback.
3. **Năm view được migrate**, không còn giao diện lệch tone.
4. **Animation nhất quán**, có feature detection, reduced motion và fallback hiệu năng.
5. **Biên bản QA iPhone Safari**: hình trước/sau, video, checklist test và vấn đề còn tồn tại.
6. **Release plan an toàn**, có thể rollback khi phát sinh lỗi nghiệp vụ hoặc hiệu năng.

### Thứ tự thực thi khuyến nghị

**Theme tokens → AppShell + Nav/FAB → Route motion → Form giao dịch → Transaction/Budget/Overview/Report → iPhone QA → Release.**

Điều quan trọng nhất: **Liquid Glass chỉ là lớp trình bày, còn tính rõ ràng và chính xác của thông tin tài chính phải được ưu tiên tuyệt đối.**

---

## Tham khảo kỹ thuật

- MDN — View Transition API: https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API
- MDN — `Document.startViewTransition()`: https://developer.mozilla.org/en-US/docs/Web/API/Document/startViewTransition
- MDN — `prefers-reduced-transparency` (limited availability): https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-transparency
- MDN — `prefers-reduced-motion`: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion

**Ghi chú:** Tương thích API/CSS phụ thuộc phiên bản trình duyệt trên thiết bị thực tế; mọi hiệu ứng đều phải có fallback khi feature không được hỗ trợ.
