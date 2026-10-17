# APPLE LIQUID GLASS — DEEP RESEARCH & DESIGN SPECIFICATION

**Ứng dụng:** Web app quản lý chi tiêu cá nhân (iPhone Safari-first)\
**Mục đích:** Tài liệu nghiên cứu + đặc tả thiết kế/thực thi để đưa giao diện web theo ngôn ngữ Apple Liquid Glass\
**Phiên bản:** 1.0\
**Ngày cập nhật:** 17/10/2026\
**Đầu vào:** Ảnh chụp 5 màn hình hiện có: Tổng quan, Báo cáo, Thêm giao dịch, Giao dịch, Ngân sách.\
**Tài liệu liên quan:** `ke-hoach-liquid-glass-motion-expense-app.md` (kế hoạch triển khai tổng quan).\
**Phạm vi:** UI/UX/theme/motion/front-end; **không** thiết kế lại logic thu chi, đổi tiền, hạch toán ví hay ngân sách.

> **Tuyên bố về độ chính xác:** Đây là **bản thiết kế web lấy cảm hứng và tuân thủ các nguyên lý HIG của Apple**, không phải bản triển khai native Liquid Glass được Apple cấp API cho Safari. Các giá trị CSS dưới đây là **đề xuất thử nghiệm**, không phải thông số nội bộ hoặc token chính thức của Apple. Tài liệu phân biệt rõ **[APPLE]** (hướng dẫn/chức năng do Apple công bố), **[WEB]** (khả năng nền tảng web được tài liệu hóa) và **[ĐỀ XUẤT]** (quyết định của dự án).

---

## Mục lục

1. Kết luận nghiên cứu và định hướng thiết kế
2. Nguồn nghiên cứu, phương pháp và mức độ tin cậy
3. Apple Liquid Glass thật sự là gì?
4. Nguyên tắc Apple: vị trí sử dụng, biến thể, màu sắc và vật liệu
5. Giới hạn giữa Liquid Glass native và web CSS
6. Kiến trúc giao diện và thứ bậc các lớp
7. Design language: màu, kiểu chữ, hình học, chiều sâu
8. Design tokens áp dụng thống nhất toàn app
9. Component specification và state contract
10. Đặc tả 5 màn hình hiện hữu
11. Interaction & motion theo phong cách Apple
12. Responsive, safe area và ứng xử khi nhập liệu trên iPhone
13. Accessibility, contrast và fallback
14. Hướng dẫn triển khai front-end với CSS/JS mẫu
15. Performance và progressive enhancement
16. QA, kiểm thử chấp nhận và regression tài chính
17. Quy trình rollout và định nghĩa hoàn thành
18. Các quyết định mở, điều không nên làm
19. Danh sách nguồn tham khảo chính thức

---

## 1. Kết luận nghiên cứu và định hướng thiết kế

### 1.1. Kết luận cốt lõi

**Apple Liquid Glass không đồng nghĩa với “mọi thứ là kính mờ”.** Tư duy thiết kế của Apple là một **functional layer** chứa navigation và những control nổi phía **trên lớp nội dung**. Vật liệu này phản ứng theo nội dung đằng sau, kích thước, chuyển động và cài đặt accessibility. Trong khi đó, nội dung chính cần giữ rõ ràng, tĩnh và dễ đọc. [S1], [S2], [S3]

**[ĐỀ XUẤT] Định hướng áp dụng cho app tài chính:**

- **Glass thật nổi bật tại:** floating bottom navigation; các control trên header; nút `+` mở form; menu và popover; panel lựa chọn ngắn; toolbar/action row dùng chung.
- **Không dùng glass để bao nội dung tài chính:** số dư ví, bảng thu/chi, kết quả tìm kiếm, form nhập số, ngân sách và chi tiết giao dịch. Chúng dùng surface rắn hoặc standard surface tương phản cao.
- **Chỉ một điểm primary blue mỗi ngữ cảnh:** accent xanh dương chủ đạo dùng cho CTA quan trọng hoặc active tab, không phủ xanh hàng loạt điều khiển.
- **Chuyển động có nguyên nhân:** nút nào mở UI nào phải có liên hệ thị giác. Mở form từ `+` phải trông như một bề mặt được sinh ra từ hành động đó, không phải mọi thành phần đều slide ngẫu nhiên.
- **Đúng với tính chất web:** có blur, translucency, edge highlight, shadow, morph nhẹ; **không cam kết** tái tạo được hệ thống lensing/refraction/rendering tương tác thời gian thực của native Apple.

### 1.2. “Apple-like” hơn khi nào?

| Cách làm sai thường gặp | Cách làm gần HIG Apple | Lý do |
|---|---|---|
| Tất cả card đều `backdrop-filter: blur(...)` | Chỉ navigation/control nổi dùng glass; card thông tin dùng solid | Phân biệt lớp điều khiển và lớp nội dung |
| Nút nào cũng nền kính màu xanh | Chỉ selected item / primary action nhận accent | Giữ thứ bậc và focus |
| Blur 30–50px trên toàn bộ màn hình | Blur có phạm vi hẹp, có fallback, kiểm thử thiết bị thật | Tốt cho chữ, pin, scroll |
| Cố tình làm chữ mờ để thấy nền | Chữ và số được bảo vệ bởi nền đủ đục | Dữ liệu tài chính cần ưu tiên đọc chính xác |
| Glass phủ glass khi popup mở | Cho lớp cũ lùi hoặc giảm hiện diện, chỉ một mặt kính nổi có ý nghĩa | Tránh xung đột vật liệu |
| Đổ bóng, glow, phản xạ chạy vô hạn | Điểm sáng ngắn khi chạm; chuyển động chỉ phục vụ trạng thái | Phản hồi xúc giác thay vì trang trí |
| Hiệu ứng thay đổi thuật toán tính toán | Giữ nguyên business/data semantics | Không được ảnh hưởng tính đúng đắn của tiền |

### 1.3. Xếp hạng ưu tiên

- **P0:** Theme tokens + AppShell + floating navigation + hành vi `+` + contrast/fallback.
- **P1:** Shared sheet/popover/segmented controls + chuyển view/form + 5 trang thống nhất.
- **P2:** Edge highlight tương tác, shared-element morph nâng cao sau khi đo hiệu năng.
- **Không ưu tiên:** shader khúc xạ WebGL/WebGPU, motion theo cảm biến máy, shimmer liên tục.

---

## 2. Nguồn nghiên cứu, phương pháp và mức độ tin cậy

### 2.1. Phân loại bằng chứng

- **[APPLE]** Apple HIG (Materials, Color, Tab bars, Motion, Branding), tài liệu Adopting Liquid Glass, video WWDC25 “Meet Liquid Glass”, “Get to know the new design system”, “Build a SwiftUI/UIKit app with the new design”.
- **[WEB]** MDN: `backdrop-filter`, `prefers-reduced-motion`, `prefers-contrast`, `prefers-reduced-transparency`, `env(safe-area-inset-*)`; W3C WCAG 2.2 về tương phản và kích thước vùng nhấn.
- **[ĐỀ XUẤT]** Mọi thông số blur, opacity, thời lượng animation, breakpoint, cấu trúc component, test threshold và kiến trúc token trong tài liệu này. Những thông số này cần xác nhận bằng prototype trên iPhone thực.

### 2.2. Những điều chưa biết

Từ screenshot **không suy luận** được framework (React/Vue/Svelte/vanilla), router, cơ chế cập nhật theme, ứng dụng có PWA hay không, browser target tối thiểu, source code, cấu trúc component, tính năng chưa hiển thị. Cần audit repository trước khi áp dụng CSS hoặc cấu trúc component vào project thật.

### 2.3. Bản cập nhật Apple đã dùng

Các hướng dẫn Apple HIG đã có cập nhật Liquid Glass trong 2025; trang HIG Tab Bars ghi nhận cập nhật tới **08/06/2026**. Nghiên cứu này tổng hợp tài liệu có thể truy cập vào **17/10/2026**; **không giả định** rằng iOS Safari tự đem Liquid Glass native vào DOM của web app. [S4]

---

## 3. Apple Liquid Glass thật sự là gì?

### 3.1. Một “digital material”, không chỉ là frosted blur

Apple giới thiệu Liquid Glass năm 2025 như một ngôn ngữ chung trên các nền tảng iOS, iPadOS, macOS, watchOS và tvOS. Apple mô tả đây là vật liệu số mang tính trong mờ, chuyển động linh hoạt và có tương tác ánh sáng/phản xạ/khúc xạ. [S1], [S5]

**Các đặc tính chính và mức web có thể mô phỏng:**

| Đặc tính | [APPLE] Hành vi material native | [ĐỀ XUẤT] Tái hiện hợp lý trên web | Mức tương đồng |
|---|---|---|---|
| Translucency | Nội dung bên dưới đi xuyên qua vật liệu một phần | Nền RGBA + `backdrop-filter` trên lớp nổi | Tương đối cao |
| Background blur / luminance | Điều chỉnh mờ, sáng/tối theo môi trường phía sau | Blur + tint có kiểm soát, light/dark theo theme | Trung bình |
| Lensing / refraction | Bẻ cong, tập trung ánh sáng theo hình học vật liệu | Edge highlight / gradient; không giả làm refraction vật lý | Thấp–trung bình |
| Specular/highlights | Các điểm phản chiếu đổi theo tương tác/ánh sáng | Viền sáng, pseudo-element highlight rất nhẹ, ngắn | Trung bình |
| Depth / shadows | Bóng thay đổi theo bối cảnh và kích thước | 2–3 mức elevation token tĩnh | Trung bình |
| Interactive fluidity | Co giãn/biến hình và phản ứng dưới ngón tay | `transform`, opacity, border-radius, shared-element animation | Trung bình |
| Adaptive legibility | Tự điều chỉnh sáng/tối/độ mờ của vật liệu và glyph | Theme semantic + nền đục dần + contrast test | Trung bình |
| System accessibility | Hệ thống native thích ứng Reduce Transparency/Contrast/Motion | CSS media queries + app-level setting + fallback | Theo trình duyệt |

**Điểm kỹ thuật cần nhớ:** `backdrop-filter: blur(...)` chỉ lọc những pixel được vẽ **sau** element. Nó không tự bẻ cong tia sáng, không tự suy ra vùng sáng/tối bên dưới, không tự tạo hiệu ứng phản chiếu vật lý như các engine native của Apple. [S6]

### 3.2. Phản ứng với tương tác

Apple nhấn mạnh bốn nét: **direct manipulation** (cảm giác phản hồi ngay dưới ngón tay), **transformation** (điều khiển có thể biến hình để tiết lộ UI), **adaptivity** (thích ứng ngữ cảnh), **restraint** (sử dụng đúng nơi). [S2]

Ứng dụng của anh nên hiện thực bằng:

1. **Press feedback tức thì:** nút giảm scale rất ít, highlight cạnh sáng trong thời gian ngắn.
2. **Origin-aware presentation:** popover sinh gần button; bottom sheet hình thành từ khu vực nút hành động khi hợp lý.
3. **Reversible transition:** mở/đóng tương ứng; khi chuyển view liên tục animation cũ bị thay thế sạch.
4. **Resting state yên tĩnh:** không có sóng ánh sáng chạy liên tục; mọi trạng thái bình thường đều đẹp ngay cả khi animation tắt.

### 3.3. Layer size ảnh hưởng vật liệu

Theo Apple, control nhỏ và panel lớn không cần cùng mức trong suốt. Menu/panel lớn thường cần tách khỏi background mạnh hơn để chữ vẫn rõ. Hiệu ứng kính càng lớn, yêu cầu clarity càng cao. [S2], [S3]

**[ĐỀ XUẤT] Ánh xạ trên web:**

- **Compact floating control:** opacity vừa phải, blur 10–16px, viền sáng rõ.
- **Floating tab bar:** opacity trung bình–cao, blur 12–18px, edge fade ở phần content ngay dưới.
- **Popover có danh sách lựa chọn:** opacity cao, blur vừa, shadow đậm hơn, label đủ tương phản.
- **Full-screen transaction form:** chính form là **content surface solid**, không phải một tấm kính lớn.

---

## 4. Nguyên tắc Apple: vị trí sử dụng, biến thể, màu sắc và vật liệu

### 4.1. Functional layer khác content layer

**[APPLE]** HIG Materials phân biệt Liquid Glass ở lớp chức năng (navigation/controls) với standard materials dùng cho content. HIG còn cảnh báo không dùng glass quá nhiều hoặc chồng vật liệu glass lên nhau. [S3]

**[ĐỀ XUẤT] Quy tắc vật liệu của app:**

| Vị trí | Vật liệu | Quy định |
|---|---|---|
| App background | `canvas` (solid, có thể gradient rất nhẹ) | Không blur nền toàn màn |
| Card số dư, thống kê, ngân sách | `content-solid` | Không xuyên thấu dữ liệu tài chính |
| Input số tiền, ghi chú, lịch sử | `input/content-solid` | Nền tĩnh, tập trung đọc và nhập |
| Header nổi / toolbar | `glass-regular` | Chỉ nếu thật sự nổi trên scroll content; tránh header kính + child kính |
| Tab bar | `glass-regular` | Một bề mặt kính cho cả thanh |
| FAB `+` | `glass-prominent-accent` hoặc solid/tinted CTA | Không đặt thêm một parent glass riêng nếu khiến kính chồng kính |
| Compact popover | `glass-regular-strong` | Một bề mặt chứa danh sách, item bên trong không phải từng tấm kính |
| Modal scrim | solid alpha | Làm rõ modal, không chồng blur toàn màn nếu không cần |
| Full-screen form | `content-solid` | Form chính không phải Liquid Glass layer |
| Error/toast | `content-elevated` | Ưu tiên khả năng đọc |

### 4.2. Regular và Clear

**[APPLE]** HIG mô tả hai biến thể native:

- **Regular:** trường hợp mặc định, độ mờ/sáng tối được điều chỉnh để tối ưu độ rõ của chữ, icon, control.
- **Clear:** trong hơn, dành cho ngữ cảnh nội dung media giàu hình ảnh; thường cần xử lý dimming để đảm bảo chữ nổi lên. Không trộn tùy tiện hai biến thể trong cùng nhóm glass. [S2], [S3]

**[ĐỀ XUẤT] Với web app chi tiêu:** **mặc định chỉ dùng `regular`**. Không cần thêm chế độ `clear` ở 5 màn hình hiện tại vì nội dung phần lớn là chữ/số, không phải nền ảnh/video. Nếu thêm màn hình biên lai/ảnh trong tương lai, cần review riêng có cần clear hay không.

### 4.3. Màu sắc: không nên kính xanh ở khắp nơi

**[APPLE]** Liquid Glass thường lấy màu từ nội dung phía sau; màu accent chỉ nên dùng để nhấn mạnh điểm cần chú ý, như primary action hoặc tab được chọn. Việc tint mọi control làm suy yếu phân cấp. [S7]

**[ĐỀ XUẤT] Bộ vai trò màu:**

- **Brand:** xanh dương hiện tại, chuẩn hóa bằng token `--color-accent`.
- **Semantic income:** xanh lá, đi kèm ký hiệu `+`, nhãn “Thu nhập”.
- **Semantic expense:** đỏ, đi kèm `-`, nhãn “Chi tiêu”.
- **Neutral:** text/biểu tượng cho điều hướng chưa active.
- **Critical:** đỏ dùng có kiểm soát cho lỗi thao tác, không nhầm với khoản chi tài chính.
- **Transparent white/black:** chỉ là vật liệu nền, không phải màu brand.

**Một màn hình / một nhiệm vụ / một CTA nổi bật.** Ví dụ: ở form giao dịch, CTA “Lưu chi tiêu” được nhấn mạnh; các nút chọn category/currency không nên cùng độ nổi.

### 4.4. Hình học Apple: concentricity

**[APPLE]** Apple dùng mối quan hệ bán kính giữa các vùng chứa và nút bên trong để tạo hình khối nhất quán; góc ngoài và góc trong phải có nhịp độ, không bo mỗi phần một kiểu. [S8]

**[ĐỀ XUẤT] Thực hiện bằng hệ scale:**

- Control nhỏ: 12px
- Input / segmented: 14px
- Content card: 18px
- Popover: 20px
- Bottom sheet: 26px
- Floating dock: 26–30px hoặc capsule tùy hình học thực tế
- FAB: circle 52–56px

Các con số trên không phải radius của Apple. Chúng là scale riêng cần review bằng iPhone screenshot ở 100% zoom.

### 4.5. Cấu trúc bottom tab và nút cộng

**[APPLE]** Tab bar là thành phần để **điều hướng giữa những mục cấp cao**, không phải vùng chứa action. [S4]

**[ĐỀ XUẤT]** Thanh hiện tại có 5 vị trí thị giác nhưng chỉ có **4 navigation destinations**:

1. Tổng quan
2. Báo cáo
3. **Nút hành động `+` (không phải tab)**
4. Giao dịch
5. Ngân sách

Nên tách semantic thành `<nav>` cho 4 destination và một `<button>` độc lập cho `+`, dù về bố cục người dùng vẫn thấy dấu cộng ở trung tâm. Điều này hỗ trợ VoiceOver, `aria-current="page"`, focus, routing và test chính xác hơn.

---

## 5. Giới hạn giữa Liquid Glass native và web CSS

### 5.1. Có thể và không thể

| Mục tiêu | Web CSS/JS có thể thực hiện? | Ghi chú |
|---|---|---|
| Nền bán trong suốt | Có | RGBA/modern CSS color |
| Blur nội dung phía sau | Có, khi trình duyệt hỗ trợ | `backdrop-filter`, prefix fallback |
| Shadow mềm / border light | Có | Không nên quá nặng |
| Gradient highlight trên mép | Có | `::before` hoặc `inset box-shadow` |
| Theme sáng/tối | Có | `prefers-color-scheme` + manual override |
| Morph nút sang sheet | Có thể mô phỏng | FLIP/WAAPI hoặc lib motion nếu thực sự cần |
| Thanh nổi theo safe area | Có | `env(safe-area-inset-bottom)` |
| Giảm chuyển động | Có | `prefers-reduced-motion` |
| Giảm transparency theo OS trên mọi browser | **Không đảm bảo** | Media query hỗ trợ giới hạn; nên có tùy chọn trong app |
| Native lensing/refraction vật lý tự động | **Không** bằng blur CSS thuần | Shader/custom rendering chỉ mô phỏng, chi phí cao |
| Native Liquid Glass của iOS tự áp vào DOM | **Không** | Native SwiftUI/UIKit APIs không phải CSS APIs |

**Không dùng API SwiftUI `glassEffect`, `GlassEffectContainer`, `UIGlassEffect` trong kế hoạch web.** Chỉ có thể dùng nếu sản phẩm chuyển sang native app hoặc có native shell tương ứng. [S9]

### 5.2. Không có “giá trị chuẩn Apple CSS”

Apple không công bố một bộ CSS `blur: 15px`, `opacity: 0.75`, `border-radius: 22px` đủ để tạo Liquid Glass giống hệt hệ thống. Vì vậy:

- Đặt tên `apple-inspired`, không gọi “Apple Liquid Glass native” trong code/documentation.
- Mọi token có thể tinh chỉnh tùy nền, kích thước và thiết bị.
- Không mang hình PNG mờ có viền giả thủy tinh thay cho element động.
- Không giả lập “refraction chính xác theo thời gian thực” bằng lời quảng bá nếu thực tế chỉ là blur.

---

## 6. Kiến trúc giao diện và thứ bậc các lớp

### 6.1. Mô hình phân tầng

```text
                       INTERACTION PLANE
     ┌───────────────────────────────────────────────┐
 L5  │ Modal focus / transient overlay               │  dialog, sheet
     ├───────────────────────────────────────────────┤
 L4  │ Floating controls — LIQUID GLASS INSPIRED     │  dock, toolbar, FAB, menu
     ├───────────────────────────────────────────────┤
 L3  │ Content actions                               │  button, input, filter
     ├───────────────────────────────────────────────┤
 L2  │ Financial content — SOLID                     │  wallet, transaction, budget
     ├───────────────────────────────────────────────┤
 L1  │ App canvas / decorative light                 │  solid, subtle background
     └───────────────────────────────────────────────┘
```

**Quan trọng:** L3 không có nghĩa mỗi input là glass. Mô hình trên diễn tả vai trò giao diện, còn material được quyết định bằng component contract.

### 6.2. Nguyên tắc trật tự chồng lớp

- Chỉ **một** floating dock; không tạo footer gradient khác nằm chồng lên mặt kính bằng thuộc tính blur riêng.
- Khi mở modal full-screen: dock có thể ẩn hoàn toàn, hoặc giữ một shell cố định, nhưng không vừa hiện dock bên dưới vừa có một dock khác trong modal.
- Khi popover hiển thị phía trên dock: popover có thể che dock một phần; dock bên dưới nên giảm độ nổi/đóng nếu gây cạnh kính đè nhau.
- Mọi portal/modal phải lấy token theme chung, không dùng nền hardcode.
- Không dùng z-index tùy tiện: `base=0`, `sticky=10`, `dock=30`, `popover=40`, `scrim=50`, `modal=60`, `toast=70` là ví dụ scale cần mapping vào codebase.

### 6.3. Layout và scroll

- Scroll ở content layer; header/dock nổi tách khỏi scroll container theo thiết kế.
- Nội dung có khoảng đệm cuối đủ để hàng cuối không bị dock phủ.
- Vùng ngay bên dưới dock có **edge fade rất nhẹ** hoặc surface solid thích ứng để hạn chế chữ chạy xuyên qua label nav.
- Không lạm dụng `position: fixed` cho các form input vì Safari bàn phím ảo có thể thay đổi visual viewport.

---

## 7. Design language: màu, kiểu chữ, hình học, chiều sâu

### 7.1. Nhận diện

**[ĐỀ XUẤT]** Giữ trục thị giác nền trắng/xám sáng + xanh dương từ screenshot; nâng cấp cảm giác “nhẹ, chính xác, đáng tin” thay vì “kính tương lai”. Dữ liệu tiền không nên nằm trên nền kính trong suốt.

- Nhãn thu/chi rõ nghĩa, font có độ đậm khác nhau.
- Số tiền dùng `font-variant-numeric: tabular-nums` tại vùng phải so sánh cột.
- Luôn hiển thị tiền tệ VND/DKK đầy đủ; `kr.` và `đ` rõ ràng theo locale/định dạng hiện tại.
- Nút trong trạng thái disabled không dựa vào opacity mờ quá mức để xác định có bấm được hay không.

### 7.2. Typography

**[ĐỀ XUẤT]** Sử dụng system font stack của nền tảng khi app trên iOS:

```css
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
```

Đặt body tiêu chuẩn khoảng 16px; secondary label thường 13–14px khi ngữ cảnh cho phép; tiêu đề 20–24px; số tiền quan trọng 22–28px tùy không gian. **Không** khóa kích thước bằng cách cấm zoom. Input số tiền cần tránh tình trạng text quá nhỏ làm Safari tự zoom; nên bắt đầu 16px. Không phải hệ cỡ chữ chính thức của Apple. [S10]

### 7.3. Shadows, strokes, highlights

Một vật liệu nổi dùng tối đa:

1. **Backdrop/fill:** tạo sự xuyên thấu có kiểm soát.
2. **Edge:** đường viền sáng hoặc inset highlight để cho cảm giác có độ dày.
3. **Shadow:** một bóng mềm tách control khỏi content.
4. **Press highlight:** ánh sáng chỉ kích hoạt khi người dùng tương tác.

Không nên thêm 5 shadow, 3 gradient, texture noise chạy liên tục trên cùng một control.

---

## 8. Design tokens áp dụng thống nhất toàn app

### 8.1. Cấu trúc token theo ngữ nghĩa

**[ĐỀ XUẤT]** Kiến trúc 3 lớp để tránh hardcode:

```text
Primitive tokens   → color/spacing/radius/motion theo con số
Semantic tokens    → canvas, content, text, glass, action, income, expense
Component tokens   → dock, header, sheet, fab, input, transaction row
```

Không tạo hai bộ UI riêng cho light/dark. Chỉ thay token semantic. Các thông số dưới đây là **starting values để prototype**, chưa qua đo contrast toàn bộ trạng thái.

### 8.2. Bảng biến thiết kế

| Nhóm | Token | Light | Dark | Ghi chú |
|---|---|---|---|---|
| Background | `--ui-canvas` | `#F4F6FB` | `#101622` | Không blur toàn màn |
| Content | `--ui-surface` | `#FFFFFF` | `#1B2637` | Wallet, transaction, form |
| Elevated content | `--ui-elevated` | `#FFFFFF` | `#223047` | Tooltip/error/toast |
| Text | `--ui-text` | `#172239` | `#F4F6FB` | Primary |
| Secondary text | `--ui-muted` | `#52627C` | `#C4CEE0` | Text phụ; kiểm contrast |
| Border | `--ui-border` | `#DEE5EF` | `#3A4960` | Inputs/cards |
| Glass fill | `--glass-fill` | `rgb(255 255 255 / .78)` | `rgb(28 39 56 / .84)` | Regular-inspired |
| Glass stroke | `--glass-stroke` | `rgb(255 255 255 / .86)` | `rgb(255 255 255 / .16)` | Cạnh kính |
| Glass inset | `--glass-inset` | `rgb(255 255 255 / .70)` | `rgb(255 255 255 / .08)` | Highlight |
| Accent | `--ui-accent` | `#3158DA` | `#89A8FF` | Cần kiểm cặp chữ |
| On accent | `--ui-on-accent` | `#FFFFFF` | `#101622` | Không luôn chọn trắng |
| Income | `--ui-income` | `#137A47` | `#69DEA0` | Semantic |
| Expense | `--ui-expense` | `#B83B47` | `#FF9AA1` | Semantic |
| Shadow | `--glass-shadow` | `0 10px 28px rgb(20 35 65 / .12)` | `0 14px 32px rgb(0 0 0 / .32)` | Chỉ floating |

| Dimension | Value gợi ý | Component |
|---|---|---|
| `--radius-control` | 14px | input, dropdown |
| `--radius-card` | 18px | card tài chính |
| `--radius-popover` | 20px | menu nổi |
| `--radius-dock` | 28px | thanh điều hướng |
| `--radius-sheet` | 26px | bottom sheet |
| `--height-target` | 44px | vùng chạm ưu tiên iPhone |
| `--height-fab` | 56px | nút `+` |
| `--space-step` | 4px | spacing base |
| `--blur-glass` | 14px | thử nghiệm trên iPhone |
| `--motion-fast` | 140ms | press/selection |
| `--motion-standard` | 220ms | tab/popover |
| `--motion-sheet` | 300ms | sheet |

### 8.3. Chế độ theme tối thiểu

- **Appearance:** `system | light | dark`.
- **Transparency:** `system | standard | reduced` (manual reduced phải luôn hoạt động, dù CSS media chưa được hỗ trợ).
- **Motion:** `system | reduced` (có thể chỉ cần theo OS nếu không muốn thêm setting; luôn hỗ trợ CSS query).
- **Feature flag rollout:** `classic | apple-inspired-glass` (tạm thời; bỏ sau khi release ổn định).

**Không** tạo từng setting của theme ở từng view. Root controller lưu state + cung cấp semantic token qua CSS data attributes; portal gắn ngoài main tree vẫn phải được style.

### 8.4. Nguồn chân lý duy nhất

```text
User/System Preferences
          ↓
   Theme Resolver
          ↓
    App Root Attributes
          ↓
  Shared CSS Design Tokens
          ↓
 Components → Screens → Modal/Portal/Toast
```

**Acceptance:** đổi chế độ sáng/tối một lần, cả 5 màn hình, overlay, select, popover, toast và state loading đổi cùng một hệ; không flash giao diện cũ khi đổi route.

---

## 9. Component specification và state contract

| Component | Style | Motion | Accessibility | Tái sử dụng |
|---|---|---|---|---|
| `AppShell` | canvas; một hệ theme | không animate toàn shell | heading/main landmark | mọi view |
| `FloatingTabDock` | `glass-regular` | active marker 180–220ms | nav + 4 links + current page | mọi view chính |
| `AddTransactionFAB` | primary accent / glass-prominent-inspired | press 100–140ms; expand origin | button, aria-label “Thêm giao dịch” | shell |
| `FloatingHeader` | glass nếu floating; ngược lại solid | scroll-aware nhẹ | toolbar semantics hợp lý | theo view |
| `ContentCard` | solid | không transform khi cập nhật số tiền | section label rõ | Tổng quan, Ngân sách |
| `FinancialValue` | solid context | không count-up ngẫu nhiên | đọc được dấu & tiền tệ | toàn app |
| `SegmentedControl` | neutral track, selected indicator | slide/crossfade 160–220ms | tab/radio đúng semantic | form |
| `GlassPopover` | glass regular mạnh hơn dock | anchor-scale 180–230ms | focus/escape/return focus | chọn category/currency |
| `BottomSheet` | sheet solid/elevated + glass toolbar tùy trường hợp | slide & scale nhẹ | focus trap, aria-modal nếu modal | filter / select |
| `TransactionFilter` | content-solid | expand 180–240ms | `aria-expanded` | Giao dịch |
| `TransactionRow` | content-solid | press highlight 100–140ms | đọc amount + currency | Giao dịch |
| `BudgetProgress` | content-solid | chỉ motion nhẹ khi thay đổi theo hành động | nhãn %, số cụ thể | Ngân sách |
| `Toast` | elevated solid | fade/translate 150–200ms | `role=status` hoặc alert | toàn app |
| `EmptyState` | solid | fade-in một lần | không che CTA | Báo cáo, Ngân sách |

### 9.1. State phải được đặc tả chung

Mọi interactive component tối thiểu có: `default`, `hover` (desktop), `pressed`, `focus-visible`, `selected` (nếu có), `disabled`, `loading`, `error` (nếu có), `reduced-motion`, `reduced-transparency`, `light`, `dark`. Chưa đủ bộ state thì chưa xem là component dùng chung hoàn chỉnh.

### 9.2. Tránh bẫy “glass-in-glass”

Ví dụ dock đã là một mặt kính; icon/tab-item bên trong không tạo thêm `backdrop-filter`. Item active dùng background tint mỏng hoặc foreground màu xanh, **không** phải một mặt kính blur thứ hai. Tương tự với danh sách tùy chọn trong glass popover.

---

## 10. Đặc tả 5 màn hình hiện hữu

> Đặc tả dựa trên screenshot, không tự giả định màn hình/flow ẩn. Những tính năng chưa tồn tại không được làm “giả có” chỉ để demo UI.

### 10.1. Tổng quan

**Các khối đã thấy:** header “Tổng quan”, filter theo khoảng ngày, card 2 ví (VND, DKK), thu nhập/chi tiêu, ngân sách tháng, floating navigation.

| Thành phần | Style đích | Tương tác |
|---|---|---|
| Header | title rõ; avatar/biểu tượng tùy layout, toolbar không đè content | cố định hoặc scroll-aware |
| Chọn tháng/ngày | input/picker trên solid surface; menu tháng nổi có thể glass | popover từ trigger hoặc native picker |
| Số dư theo ví | `ContentCard` trắng/tối, số tiền nổi bật, VND/DKK tách bạch | khi đổi kỳ: dữ liệu cập nhật không count-up |
| Thu nhập/Chi tiêu | 2 card solid có semantic color dễ đọc | không nhấp nháy số |
| Ngân sách | content surface solid; CTA nếu chưa thiết lập | CTA theo primary action |
| Bottom dock | một bề mặt glass nổi | current tab nhận màu xanh và indicator tinh tế |

**Visual contract:** một screen có thể có nhiều card nhưng **chỉ một glass dock**, không phủ cùng material lên các card.

**Edge cases:** số tiền quá dài (triệu/tỷ), số âm, 0 VND, 0,00 kr., locale dấu phẩy/chấm, 1 hoặc nhiều ví, loading riêng từng widget, offline/error, số dư che bởi thanh cuối.

### 10.2. Báo cáo

**Hiện trạng:** “Sắp ra mắt”.

- `EmptyState` solid đặt tại vùng content chính; không cần tấm kính mờ bao cả placeholder.
- Header/dock giống các màn hình khác 100%.
- Không dựng chart giả hoặc animation số liệu giả chỉ để lấp đầy.
- Nếu sau này có chart, chart nằm **content layer**, filter/bar điều khiển chart mới có thể dùng floating glass một cách chọn lọc.
- `Sắp ra mắt` là trạng thái thật, không tự tạo scheduling/reminder khi chưa có sản phẩm tương ứng.

### 10.3. Thêm giao dịch

**Các khối đã thấy:** 3 trạng thái Chi tiêu/Thu nhập/Đổi tiền, nhập số tiền, tiền tệ VND/DKK, category, payment method, ghi chú, nút “Lưu chi tiêu”.

| Thành phần | Style đích | Lý do |
|---|---|---|
| Header “Giao dịch mới” | giản lược, có back/cancel tường minh | người dùng hiểu đang ở task riêng |
| Segmented control | track neutral; thumb indicator, không 3 glass surfaces | đỡ rối ở màn hình nhiều form |
| Input số tiền | nền rắn + focus ring xanh | chính xác, dễ đọc |
| Currency selector | input solid, popover glass nếu custom | không lẫn giá trị với background |
| Category/Payment | input solid; picker có pattern chung | thống nhất view |
| Ghi chú | textarea solid | đủ tương phản |
| CTA “Lưu ...” | nút primary nổi rõ; dock có thể ẩn | ưu tiên hoàn thành nhiệm vụ |

**Interaction contract:**

1. Tap nút `+` → phản hồi ngay → mở màn thêm giao dịch (pattern full-screen route hoặc sheet thống nhất với router).
2. Di chuyển focus nhập số tiền mà không bị header/dock hoặc keyboard che.
3. Đổi loại giao dịch → indicator slide nhẹ; chỉ cập nhật field tương ứng, không vô tình xóa input hợp lệ.
4. Select category/tiền tệ → menu có anchor rõ; nếu menu quá dài, đổi sang bottom sheet scroll được.
5. `Lưu` → disabled/loading ngay để chặn double submit; thành công hiển thị phản hồi và trở về view đúng.
6. Nếu user đóng khi có thay đổi chưa lưu → confirm mất dữ liệu **nếu sản phẩm hiện tại có yêu cầu này**; không tự phát sinh logic mới không được duyệt.

**Dữ liệu đặc thù:** nếu payment method là thẻ tín dụng hoặc có giao dịch chuyển đổi tiền, tuyệt đối không thay đổi quy tắc hạch toán/logic tính số dư từ việc redesign form.

### 10.4. Giao dịch

**Các khối đã thấy:** ô search, bộ lọc nâng cao, áp dụng/đặt lại, xuất CSV, số kết quả, tổng kết VND/DKK, lịch sử.

- Search/filter/CSV đặt trong **content layer**, có thể dùng popover glass cho bộ lọc nâng cao nếu ít mục.
- Dành priority cho khối **177 kết quả / đang hiển thị 30**: dòng metadata rõ và không bị thu nhỏ vì hiệu ứng.
- Accordion của bộ lọc expand/collapse nhẹ; focus vẫn có thể dùng keyboard/VoiceOver.
- Tóm tắt thu/chi VND và DKK dùng card solid khác biệt phân cấp.
- Export CSV là action bình thường; không biến thành prominent glass button như nút cộng.
- Khi chuyển qua trang khác rồi quay lại, thống nhất chính sách giữ search/filter/scroll position, không phụ thuộc animation mount/unmount.
- Danh sách dài phải cuộn mượt; disable CSS blur ở từng row. Chỉ dock nằm trên content đang cuộn.

**Các case cần test:** 0/1/177/1000 kết quả, filter hiển thị nhiều dòng, VND có dấu ngăn cách, DKK `kr.`, CSV có dấu tiếng Việt, loading/error export, hidden keyboard.

### 10.5. Ngân sách

**Các khối đã thấy:** chọn tháng, tiền tệ, xem ngân sách, thêm ngân sách, sao chép tháng trước, empty state.

- Header + dock dùng cùng component toàn app.
- Bộ chọn tháng & tiền tệ là input solid; chỉ menu tháng/tiền tệ nổi mới có thể sử dụng glass.
- `Thêm ngân sách` là CTA primary theo ngữ cảnh; `Sao chép tháng trước` là secondary outlined hoặc neutral.
- Empty state solid với 1 lời kêu gọi rõ; không dựng viền kính dày quanh thông báo trống.
- Nếu ngân sách có tiến độ: biểu diễn số thực, không hoạt họa tiến độ từ 0 mỗi lần chuyển tab.
- Đổi tháng/tiền tệ cần giữ ngữ nghĩa trạng thái trống/tháng chưa cài ngân sách khác nhau.

---

## 11. Interaction & motion theo phong cách Apple

### 11.1. Motion principle

**[APPLE]** Motion hướng đến cung cấp phản hồi, mô tả quan hệ giữa UI và bối cảnh, tránh làm người dùng mất định hướng. Liquid Glass native thể hiện cảm giác tương tác trực tiếp và fluid morphing. [S2], [S11]

**[ĐỀ XUẤT]** Motion của web app nên theo hệ token, không lấy preset “spring” mặc định cho mọi thứ.

| Hành động | Duration đích | Easing gợi ý | Scope | Luật |
|---|---:|---|---|---|
| Press/release control | 100–140ms | ease-out | chính control | không delay phản hồi |
| Active tab marker | 160–220ms | cubic smooth | marker/glyph | không làm dock chạy |
| Chuyển screen top-level | 180–240ms | ease-out | nội dung chính | dock/header không remount liên tục |
| Popover nhỏ | 160–220ms | ease-out | popover có transform origin | xuất hiện gần trigger |
| Filter accordion | 180–240ms | ease-in-out | nội dung panel | không che focus |
| Mở sheet | 240–320ms | ease-out/spring có kiểm soát | sheet | không overshoot nhiều |
| Đóng sheet | 180–260ms | ease-in | sheet | reverse hợp lý |
| Form segmented | 160–220ms | ease-out | thumb + thay đổi form | dữ liệu quan trọng không animate |
| Save success toast | 150–220ms | ease-out | toast | không chặn route |
| Skeleton/loading | ưu tiên tĩnh | — | content | không giả số liệu |

**Lưu ý:** Duration này là tiêu chí engineering thử nghiệm, không phải timing chuẩn của Apple.

### 11.2. Tab transitions

- Tab mới active **ngay lập tức** sau chạm; network load không khóa marker.
- Nếu content đã cache: một fade + translateY(4–8px) rất nhẹ.
- Nếu đang tải: hiển thị layout skeleton tĩnh/khung dữ liệu; không flash trắng.
- Nếu tap qua 3 tab liên tục: hủy animation cũ; cuối cùng render đúng tab mới nhất.
- Navigation bằng history back/forward phải cập nhật selected state chính xác; không chỉ điều khiển local tab state.
- Hạn chế animation toàn viewport theo chiều ngang vì dễ xung đột cảm giác back gesture Safari.

### 11.3. Nút `+` sang màn hình thêm giao dịch

**Mục tiêu:** sự kiện `+` liên hệ trực tiếp với view giao dịch mới.

**Mức 1 (mặc định an toàn):** nút press scale nhẹ; content sheet/route xuất hiện từ vùng dưới màn bằng opacity + translateY; focus đặt vào tiêu đề hoặc trường phù hợp sau khi animation ổn định.

**Mức 2 (nâng cao nếu đo hiệu năng đạt):** tạo một shared-element pseudo surface bắt đầu tại vị trí nút `+`, scale/morph thành top của sheet, sau đó hiển thị nội dung. Không làm biến đổi DOM control khi focus đang ở input; không scale cả typography.

**Fallback:** nếu `prefers-reduced-motion`, tắt morph và chỉ thay trạng thái hiển thị tức thì/very short fade.

### 11.4. Menu và popover

- Nguồn gốc chuyển động luôn ở trigger; `transform-origin` gần nút mở.
- Nên dùng popover cho 1–8 lựa chọn ngắn, bottom sheet cho danh sách dài/phức tạp; đây là gợi ý, phải phù hợp behavior hiện hữu.
- Không phải tất cả menu đều trong suốt: category nhiều chữ dùng nền đục hơn.
- Escape/outside click đóng popover; focus quay lại trigger; chặn menu nằm ngoài visual viewport.

### 11.5. Chuyển tiền/đổi tiền

- Chuyển form Chi tiêu ↔ Thu nhập ↔ Đổi tiền phải giữ mapping rõ giữa loại giao dịch và label.
- Không chạy count-up animation lên số tiền đã nhập.
- Không chuyển động làm nhầm `100.000 đ` thành `100.000 kr.` trong lúc đổi currency.
- Số liệu quan trọng chỉ cập nhật khi dữ liệu mới đã xác định xong; status loading cần rõ.

---

## 12. Responsive, safe area và ứng xử khi nhập liệu trên iPhone

### 12.1. Môi trường browser web

**[WEB]** `env(safe-area-inset-bottom)` cung cấp khoảng cách bảo vệ nội dung khỏi vùng bo góc/home indicator tùy browser/viewport. [S12]

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
```

**Chỉ dùng nếu đã đánh giá layout edge-to-edge.** App chạy trong Safari tab (với browser chrome) có khác biệt với PWA standalone; không mặc định chúng có cùng safe-area values.

### 12.2. Floating dock

**[ĐỀ XUẤT]** Tab bar thực thi như một floating capsule bám đáy, cách mép ngang 12–16px trên iPhone:

- Thêm bottom offset dựa trên `env(safe-area-inset-bottom)`.
- Content có `padding-bottom` tương ứng **dock height + offset + safe area**; tránh dùng chỉ một giá trị cố định.
- Trên màn hình hẹp, 4 destination labels có thể cần điều chỉnh khoảng cách/size; kiểm tra 320px layout và iPhone text scaling.
- Nếu form full-screen mở, dock điều hướng chính có thể ẩn để dành chỗ CTA form, nhưng không tự phá lịch sử tab của người dùng.
- Tránh `overflow: hidden` ở ancestor chứa glass dock nếu cắt bóng/blur.

### 12.3. Keyboard trong màn hình thêm giao dịch

- Khi keyboard xuất hiện, ưu tiên field đang focus và CTA lưu không bị che.
- Dùng strategy layout thích hợp với visual viewport / browser engine; **không tin** rằng một CSS fixed footer luôn đúng trong mọi tổ hợp iOS Safari/PWA.
- Test nhập số tiền và textarea ghi chú với bàn phím tiếng Việt, keyboard đề xuất, autofill và thay đổi chiều cao viewport.
- Không bắt buộc tự động focus input khi mở nếu nó khiến keyboard che nội dung hoặc cắt transition; đo UX thực tế trước.
- Hạn chế animation `height` toàn body khi keyboard đang mở.

### 12.4. Desktop/iPad

- Tablet/desktop có thể giữ same theme và component semantics, nhưng dock có thể chuyển thành navigation rail/sidebar khi rộng.
- Không đặt một thanh bottom dock rộng tới 1200px.
- Hover affordance riêng; touch target vẫn đủ lớn.
- Không triển khai sidebar native Liquid Glass cho web bằng API native; dùng CSS strategy riêng.

---

## 13. Accessibility, contrast và fallback

### 13.1. Contrast là điều kiện bắt buộc

**[WEB]** WCAG 2.2 AA đặt ngưỡng contrast cho chữ thông thường tối thiểu **4.5:1**, chữ lớn **3:1**; nên hướng đến tương phản biểu tượng/control rõ ràng và kiểm tra trạng thái focus, selected, disabled đúng vai trò. [S13]

**Đối với kính**, không thể kiểm một mẫu background tĩnh là đủ. Phải kiểm nhiều bối cảnh:

1. Dock trên nền trắng trống.
2. Dock khi content có chữ đậm bên dưới.
3. Dock khi cuộn qua card màu xanh/đỏ.
4. Popover phía trên card số tiền.
5. Dark mode.
6. Tăng cỡ chữ / bold text.

Nếu một trạng thái không đạt, **tăng opacity vật liệu, làm rõ scrim, hoặc dùng solid fallback**, thay vì thay ngẫu nhiên màu chữ theo pixel dưới nền.

### 13.2. Target size

**[WEB]** WCAG 2.2 AA SC 2.5.8 quy định tối thiểu thường là **24 × 24 CSS px** hoặc các ngoại lệ dựa trên khoảng cách; **[ĐỀ XUẤT]** riêng app touch-first nên đặt mục tiêu **44 × 44 CSS px** cho nút điều khiển thường xuyên bấm. Không mô tả 44px là ngưỡng WCAG AA bắt buộc. [S14]

### 13.3. Motion preference

```css
@media (prefers-reduced-motion: reduce) {
  .motion-enabled,
  .motion-enabled::before,
  .motion-enabled::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

Trong production nên áp dụng theo lớp/utility và CSS variables thay vì tắt toàn bộ hiệu ứng toàn app một cách mù quáng. [S15]

### 13.4. Reduced transparency

**[WEB]** `prefers-reduced-transparency` vẫn có độ hỗ trợ không đồng đều/experimental trong hệ sinh thái browser; không được dựa hoàn toàn vào nó. [S16]

**Giải pháp 3 tầng:**

1. Media query nếu browser có hỗ trợ.
2. `prefers-contrast: more` → tăng opacity/border cho glass.
3. Nút setting “Giảm hiệu ứng trong suốt” trong app → bật solid fallback, lưu preference.

Ở iOS native, hệ thống có thể tự thích ứng chính xác theo setting; **web của anh cần tự quản lý fallback**.

### 13.5. Semantic và VoiceOver

- `<nav aria-label="Điều hướng chính">` cho bốn destinations.
- `aria-current="page"` cho tab đang ở trang hiện tại.
- Nút `+`: `<button aria-label="Thêm giao dịch">` không dùng `role=tab`.
- Khi sheet mở, đặt focus hợp lý; khi đóng, trả focus về trigger nếu còn.
- Các số tiền dùng nhãn currency có thể đọc rõ; không chỉ dựa vào dấu `+`/`-` hay màu.
- Menu dropdown thông báo selected item chính xác, keyboard focus không nhảy lung tung.

---

## 14. Hướng dẫn triển khai front-end với CSS/JS mẫu

> Ví dụ code minh họa phần **web**, không phụ thuộc React/Vue. Developer cần ghép vào framework hiện tại và kiểm tra DOM/cascade thực tế. Đoạn code được cố ý giữ đơn giản, **không** phải thư viện Liquid Glass hoàn chỉnh.

### 14.1. Theme tokens CSS mẫu

```css
:root {
  color-scheme: light;
  --ui-canvas: #f4f6fb;
  --ui-surface: #fff;
  --ui-elevated: #fff;
  --ui-text: #172239;
  --ui-muted: #52627c;
  --ui-border: #dee5ef;
  --ui-accent: #3158da;
  --ui-on-accent: #fff;
  --glass-fill: rgb(255 255 255 / 78%);
  --glass-stroke: rgb(255 255 255 / 86%);
  --glass-inner-light: rgb(255 255 255 / 70%);
  --glass-shadow: 0 10px 28px rgb(20 35 65 / 12%);
  --glass-blur: 14px;
  --radius-card: 18px;
  --radius-dock: 28px;
  --radius-control: 14px;
  --motion-fast: 140ms;
  --motion-standard: 220ms;
  --ease-fluid: cubic-bezier(.2, 0, 0, 1);
}

:root[data-color-mode="dark"] {
  color-scheme: dark;
  --ui-canvas: #101622;
  --ui-surface: #1b2637;
  --ui-elevated: #223047;
  --ui-text: #f4f6fb;
  --ui-muted: #c4cee0;
  --ui-border: #3a4960;
  --ui-accent: #89a8ff;
  --ui-on-accent: #101622;
  --glass-fill: rgb(28 39 56 / 84%);
  --glass-stroke: rgb(255 255 255 / 16%);
  --glass-inner-light: rgb(255 255 255 / 8%);
  --glass-shadow: 0 14px 32px rgb(0 0 0 / 32%);
}

body {
  margin: 0;
  background: var(--ui-canvas);
  color: var(--ui-text);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
}

.financial-card {
  background: var(--ui-surface);
  color: var(--ui-text);
  border: 1px solid var(--ui-border);
  border-radius: var(--radius-card);
}

.financial-amount { font-variant-numeric: tabular-nums; }
```

**Quan trọng với `system`:** CSS ở trên mô tả chỉ `light/dark` đã được resolve. JS theme resolver phải áp dụng `data-color-mode` theo preference ngay trước first meaningful paint (nếu app SSR, phải có cơ chế tránh mismatch), hoặc dùng `@media (prefers-color-scheme: dark)` làm nguồn chân lý đồng nhất.

### 14.2. Mặt kính duy nhất có fallback

```css
.glass-surface {
  position: relative;
  isolation: isolate;
  border: 1px solid var(--glass-stroke);
  background: var(--glass-fill);
  color: var(--ui-text);
  box-shadow: var(--glass-shadow),
              inset 0 1px 0 var(--glass-inner-light);
}

/* Chỉ kích hoạt blur nếu tính năng có sẵn. */
@supports ((-webkit-backdrop-filter: blur(1px)) or (backdrop-filter: blur(1px))) {
  .glass-surface:not([data-no-blur="true"]) {
    -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(1.12);
    backdrop-filter: blur(var(--glass-blur)) saturate(1.12);
  }
}

/* Fallback for browser no blur / manual transparency reduction. */
@supports not ((-webkit-backdrop-filter: blur(1px)) or (backdrop-filter: blur(1px))) {
  .glass-surface { background: var(--ui-elevated); }
}

:root[data-transparency="reduced"] .glass-surface {
  background: var(--ui-elevated);
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
  border-color: var(--ui-border);
}

@media (prefers-reduced-transparency: reduce), (prefers-contrast: more) {
  :root:not([data-transparency="standard"]) .glass-surface {
    background: var(--ui-elevated);
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
    border-color: var(--ui-border);
  }
}
```

**Giải thích:**

- `saturate(1.12)` chỉ mô phỏng màu vật liệu, không phải glass của Apple.
- `isolation: isolate` không bảo đảm mọi cấu trúc nested backdrop-filter đều đúng; cần review thực tế backdrop roots/cascade. [S6]
- Nếu blur không có, nền cần **thật sự opaque**, không được để chữ chạy xuyên qua.
- Không gắn `.glass-surface` lên toàn bộ component lồng nhau.

### 14.3. Edge highlight nhẹ — không animation vô hạn

```css
.glass-surface::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background: linear-gradient(
    145deg,
    rgb(255 255 255 / 16%),
    transparent 40%,
    transparent 75%,
    rgb(255 255 255 / 6%)
  );
  opacity: .65;
}

.glass-control {
  -webkit-tap-highlight-color: transparent;
  transition: transform var(--motion-fast) ease-out;
}

.glass-control:active { transform: scale(.975); }
.glass-control:focus-visible { outline: 2px solid var(--ui-accent); outline-offset: 3px; }

@media (prefers-reduced-motion: reduce) {
  .glass-control { transition: none; }
  .glass-control:active { transform: none; }
}
```

Không dùng pseudo-element này nếu design khiến header nhiều chữ trở nên lấp lánh/khó đọc. Không cố “reflect” theo gyroscope.

### 14.4. Dock và safe-area

```css
:root {
  --dock-height: 70px;
  --dock-gap: 10px;
}

.app-main {
  padding-bottom: calc(
    var(--dock-height) + var(--dock-gap) * 2 + env(safe-area-inset-bottom, 0px)
  );
}

.floating-dock {
  position: fixed;
  z-index: 30;
  left: 12px;
  right: 12px;
  bottom: calc(var(--dock-gap) + env(safe-area-inset-bottom, 0px));
  min-height: var(--dock-height);
  border-radius: var(--radius-dock);
}

/* Dock is one glass platter. Child tab items MUST NOT backdrop-blur. */
.floating-dock .nav-item {
  min-width: 0;
  min-height: 44px;
  background: transparent;
  border: 0;
  color: var(--ui-muted);
}

.floating-dock .nav-item[aria-current="page"] {
  color: var(--ui-accent);
  font-weight: 600;
}
```

**Cảnh báo kiến trúc:** các công thức `--dock-height` ở trên là ví dụ cho **một kích thước thiết kế cố định**. Nếu dock co giãn theo cỡ chữ / viewport, cần đo chiều cao thực tế hoặc đặt layout không overlay; nếu không hàng cuối có thể bị che. Header/footer trong các browser viewport khác nhau cũng phải được test.

### 14.5. Theme resolver — hợp đồng, không khóa framework

```ts
// Pseudocode/TypeScript contract — adapt to actual framework.
type Appearance = "system" | "light" | "dark";
type Transparency = "system" | "standard" | "reduced";
type VisualStyle = "classic" | "apple-inspired-glass";

type ThemeSettings = {
  appearance: Appearance;
  transparency: Transparency;
  visualStyle: VisualStyle;
};

// Resolve "system" to light/dark via matchMedia, then place
// data-color-mode="light|dark" on <html> before visual paint.
// Ensure changes propagate to portals / dialogs / toast roots.
// Store settings if current product policy allows.
// Do not put account/financial data in theme localStorage.
```

**Acceptance:** không có class `bg-white`, `glass-blue`, `dark-card` rải rác hardcode làm mỗi page khác tone; cho phép utility CSS nhưng semantic surface phải lấy từ token chung.

### 14.6. Motion orchestration

- Với router có sẵn, dùng cơ chế transition phù hợp framework; chỉ animate content pane, không unmount toàn `AppShell` khi đổi route.
- `document.startViewTransition` có thể dùng như progressive enhancement khi engine/framework phù hợp, nhưng **không** là dependency bắt buộc; cần kiểm compatibility và focus/history trên Safari mục tiêu trước khi chọn.
- Với shared-element morph nâng cao, animation nên dựa trên transform/opacity; tránh animate `width/height/top/left` của toàn trang hoặc thay đổi layout nặng trong mỗi frame.
- Nếu component đang được người dùng thao tác, animation phải interruptible: nhấn tiếp luôn dẫn đến trạng thái cuối đúng.

---

## 15. Performance và progressive enhancement

### 15.1. Rủi ro điển hình

1. **Backdrop blur diện rộng:** tốn chi phí compositing/raster, dễ giật khi scroll qua nhiều dữ liệu.
2. **Kính chồng kính:** vừa sai hierarchy vừa khó debug backdrop roots.
3. **Multiple shadows và filters:** làm tăng chi phí cho layer lớn.
4. **Animated gradient/blur liên tục:** tiêu hao pin mà không hỗ trợ task tài chính.
5. **Scroll listeners cập nhật style mỗi pixel:** rất dễ jank ở màn Giao dịch dài.
6. **Router animation remount:** mất state filter, focus/scroll.

### 15.2. Performance budget đề xuất

Đây là mục tiêu nghiệm thu trên tập máy thử nghiệm, **không phải lời bảo đảm browser luôn giữ frame rate**.

| Hạng mục | Mục tiêu |
|---|---|
| Scroll 30+ transaction rows | Mượt ở mức cảm nhận; cố gắng hướng tới 60fps trên iPhone đại diện |
| Dock movement | Không re-layout toàn màn khi scroll |
| Press state | Phản hồi ngay, không đợi API |
| View transition | Chỉ transform/opacity ở các thành phần cần thiết |
| Low power/reduced motion | Không có transition/animation không cần thiết |
| Fallback | Không blur vẫn dùng được và vẫn đẹp |
| Dữ liệu loading | Không lag input tiền hoặc chặn nhấn Lưu |

### 15.3. Tiến trình progressive enhancement

```text
Base layer (solid, fully functional)
    ↓ browser supports backdrop-filter?
Yes → enable moderate blur on floating controls only
    ↓ user chooses reduced transparency / high contrast?
Yes → restore solid elevated surfaces
    ↓ performance passes on target iPhone?
Yes → enable subtle highlight + shared-element motion
No  → keep simple transition; never sacrifice input correctness
```

**Chỉ chọn 1–2 surface kính xuất hiện thường xuyên trong một viewport.** Đây là guideline thực dụng cho sản phẩm, không phải giới hạn kỹ thuật của Apple.

---

## 16. QA, kiểm thử chấp nhận và regression tài chính

### 16.1. Ma trận kiểm thử tối thiểu

| Dimension | Test values |
|---|---|
| iPhone browser | Safari trên iPhone chạy OS thực tế của nhóm người dùng; ít nhất 1 máy màn nhỏ + 1 máy màn lớn |
| Container | Safari tab; PWA standalone nếu app hỗ trợ PWA |
| Appearance | light / dark / system |
| Transparency | standard / reduced |
| Motion | standard / reduced |
| Text | mặc định / chữ lớn / bold nếu có |
| Screen | 5 views × trạng thái có dữ liệu/không có dữ liệu |
| Keyboard | số tiền / category / ghi chú / nút Lưu |
| Network | bình thường / chậm / offline-error |
| Data | VND / DKK / 0 / âm / số rất dài |

### 16.2. Test cases chức năng

**NAV-01** Chạm mỗi tab dưới; chỉ destination thực sự được chọn có `aria-current` và nội dung chính đúng.

**NAV-02** Chạm `+`; form mở, back đóng/đi về đúng vị trí, `+` không bị hiểu là tab active.

**NAV-03** Chạm tab liên tục 5 lần; không màn trắng, không sai marker, không animation bị mắc kẹt.

**THEME-01** Chuyển light ↔ dark trên 5 trang; không có component/modal/toast lạc màu.

**THEME-02** Bật reduced transparency; dock, menu, header không còn xuyên thấu, chữ rõ.

**A11Y-01** Reduced motion tắt morph/slide không thiết yếu nhưng menu/form vẫn hoạt động.

**A11Y-02** VoiceOver đọc tên destination/tab active và nút thêm giao dịch chính xác.

**INPUT-01** Nhập tiền VND/DKK với keyboard iPhone; nút Lưu/field focus không bị che.

**TXN-01** Giữ trạng thái search/filter khi qua lại màn hình theo policy đã thống nhất.

**TXN-02** Export CSV không đổi dữ liệu/dấu/định dạng so với trước.

**BUDGET-01** Đổi tháng/tiền tệ, thêm/copy ngân sách giữ business semantics.

**VISUAL-01** Scroll qua text, card, background: dock vẫn đọc được.

**VISUAL-02** Mở popover trên dock: không có hiệu ứng glass chồng glass gây loạn.

**PERF-01** Cuộn màn Giao dịch chứa 177 kết quả/hơn 30 row render; profile browser performance.

**REG-01** So sánh trước/sau tổng thu, tổng chi, số dư theo ví, budget summary cho cùng fixture dữ liệu.

### 16.3. Định nghĩa hoàn thành (Definition of Done)

- [ ] Apple material placement đúng: glass chỉ ở functional controls.
- [ ] Không có nested backdrop-filter gây glass-on-glass.
- [ ] Có root theme resolver, semantic/component tokens và docs quy định.
- [ ] Mọi view có light/dark đồng bộ, cả overlay/empty/loading/error states.
- [ ] Selected nav rõ, action `+` semantic riêng.
- [ ] Trạng thái reduced transparency và motion hoạt động.
- [ ] Nội dung thực tế trên iPhone đạt contrast mục tiêu qua các nền kiểm thử.
- [ ] Safe area/home indicator/keyboard không che UI thao tác.
- [ ] Không mất state hoặc tạo double-submit khi animation.
- [ ] VND/DKK, số dư, thu/chi, ngân sách, CSV và logic tính tiền không đổi.
- [ ] Performance đo trên iPhone thật và có phương án tắt hiệu ứng quá nặng.
- [ ] Có screenshots/video before–after cho 5 màn, cả light & dark.

---

## 17. Quy trình rollout và định nghĩa hoàn thành

| Phase | Đầu ra | Điều kiện kết thúc |
|---|---|---|
| **0 — Audit codebase** | component inventory, route map, theme inventory, target Safari versions | xác định framework + các giới hạn |
| **1 — Visual prototype** | sample dock, FAB, popover, 1 content card, 1 sheet light/dark | được duyệt visual direction trên iPhone thật |
| **2 — Design system** | tokens, `GlassSurface`, `ContentCard`, `ThemeResolver`, motion primitives | stories/tests cho state matrix |
| **3 — App shell** | header/dock/FAB/route transitions | tất cả 4 tab + action hoạt động ổn |
| **4 — 5 view migration** | apply common components, loại hardcode từng trang | parity nghiệp vụ & visual QA |
| **5 — A11y/perf stabilization** | reduced motion/transparency, contrast, safe area, benchmark | QA matrix đạt |
| **6 — Controlled rollout** | feature flag, logging visual issues, rollback plan | team xác nhận release |

**Chú ý về chồng lấn kế hoạch trước:** tài liệu trước là *implementation plan* tổng thể; tài liệu hiện tại là **nguyên lý Apple + visual design spec + browser/QA contract**. Khi hai tài liệu có trị số CSS khác nhau, dùng bản mới làm cơ sở **prototype** rồi chốt token sau đo đạc, không giữ song song hai bộ token.

### 17.1. Task cho design

1. Figma/file thiết kế có palette light/dark và hai trạng thái transparency.
2. Component kit cho dock, FAB, popover, sheet, card, input, segmented.
3. 5 view annotated với nơi dùng glass vs solid.
4. Motion storyboard cho `+` → form, mở filter, switch tab.
5. Accessibility color audit cho số tiền và nền phía sau dock.

### 17.2. Task cho engineering

1. Audit CSS và các điểm đặt z-index/portal hiện có.
2. Tạo semantic tokens và theme resolver.
3. Xây dựng reusable `GlassSurface` có solid fallback.
4. Tách semantic nav tab vs nút action `+`.
5. Migrate từng màn hình vào shared component library.
6. Tạo motion helpers với reduced-motion handling.
7. Test Safari/keyboard/visual viewport và long list performance.
8. Screenshot regression và chức năng hạch toán.

---

## 18. Các quyết định mở, điều không nên làm

### 18.1. Quyết định cần chốt sau khi đọc repository

- **Router:** form Giao dịch mới là route riêng hay modal/sheet? (Không đổi UX chỉ để có morph.)
- **Theme settings:** có giao diện settings sẵn hay cần thêm nơi chỉnh appearance/transparency?
- **Device support:** iOS/Safari phiên bản nhỏ nhất đang hỗ trợ?
- **PWA:** app có được “Add to Home Screen” hay chỉ chạy Safari tab?
- **Framework:** chọn animation utility/framework hiện có; không cài dependency mới nếu chỉ cần CSS.
- **Navigation height:** thiết kế compact/minimizable dock có phù hợp số lượng tab, ngữ nghĩa tài chính và safe-area không?
- **Style review:** bộ token prototype được ký duyệt bởi ai sau kiểm tra trên máy thật?

### 18.2. Không nên làm

- Không tô glass lên tất cả card chỉ vì theme name.
- Không làm nền gradient đổi màu liên tục hoặc parallax theo cuộn.
- Không dùng clear glass cho số dư hoặc bảng giao dịch.
- Không dùng `filter: blur(...)` trực tiếp trên text/form làm giảm readability; dùng `backdrop-filter` chỉ trên surface cần thiết.
- Không trộn regular/clear tùy tiện hoặc blur parent cùng blur child.
- Không dùng một ảnh screenshot iOS làm texture glass giả.
- Không tuyên bố “Apple native Liquid Glass” trong CSS web.
- Không dùng lối tắt “đổi tất cả `background-color` thành `rgba`”.
- Không làm lại state management hay hạch toán khi task chỉ yêu cầu chuyển theme/motion.

### 18.3. Recommendation cuối cùng

**Chọn phiên bản “Apple-inspired Liquid Glass — restrained finance UI”.** Ở app quản lý chi tiêu, sự tin cậy đến từ số tiền rõ ràng và thao tác ổn định, không phải lượng kính trên màn hình. Trải nghiệm Apple-like mạnh nhất sẽ đến từ **floating functional layer + controls nhất quán + typography có phân cấp + motion gắn với hành động + fallback/accessibility nghiêm túc**.

---

## 19. Nguồn tham khảo chính thức và cách dùng

> Các nguồn bên dưới ưu tiên Apple Developer, Apple Newsroom, MDN, W3C. Thời điểm đối chiếu: **17/10/2026**. Các liên kết có thể thay đổi theo bản cập nhật HIG. Số trong ngoặc vuông `[S#]` liên kết tới luận điểm ở các chương.

| ID | Nguồn | Điều rút ra |
|---|---|---|
| **S1** | [Apple Newsroom: Apple introduces a new software design (09/06/2025)](https://www.apple.com/vn/newsroom/2025/06/apple-introduces-a-delightful-and-elegant-new-software-design/) | Vật liệu Liquid Glass và ngôn ngữ chung trên nhiều nền tảng |
| **S2** | [WWDC25: Meet Liquid Glass](https://developer.apple.com/videos/play/wwdc2025/219/) | Lensing, phản ứng trực tiếp, adaptivity, regular/clear, glass-on-glass, hierarchy |
| **S3** | [Apple HIG: Materials](https://developer.apple.com/design/human-interface-guidelines/materials) | Liquid Glass cho functional layer, standard materials cho content |
| **S4** | [Apple HIG: Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars) | Tab dùng navigation; tab bar nổi; change log 2025–2026 |
| **S5** | [Apple Developer: Liquid Glass overview](https://developer.apple.com/documentation/technologyoverviews/liquid-glass) | Hệ thống APIs native, design principles |
| **S6** | [MDN: CSS `backdrop-filter`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/backdrop-filter) | Giới hạn lọc backdrop, backdrop roots, hỗ trợ browser |
| **S7** | [Apple HIG: Color — Liquid Glass color](https://developer.apple.com/design/human-interface-guidelines/color) | Tint có chọn lọc, foreground legibility |
| **S8** | [WWDC25: Get to know the new design system](https://developer.apple.com/videos/play/wwdc2025/356/) | Hình học, cấu trúc, grouping controls, concentricity |
| **S9** | [Apple Developer: Adopting Liquid Glass](https://developer.apple.com/documentation/technologyoverviews/adopting-liquid-glass) | API/khuyến nghị áp dụng vào app native và kiểm thử accessibility |
| **S10** | [Apple HIG: Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility) | Typography, cỡ chữ lớn và legibility |
| **S11** | [Apple HIG: Motion](https://developer.apple.com/design/human-interface-guidelines/motion) | Motion có ý nghĩa, phản hồi tương tác, giảm khó chịu |
| **S12** | [MDN: Using CSS environment variables](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Environment_variables/Using) | `env(safe-area-inset-*)` |
| **S13** | [W3C: Understanding WCAG 2.2 — Contrast (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum) | 4.5:1 chữ bình thường, 3:1 chữ lớn |
| **S14** | [W3C: Understanding WCAG 2.2 — Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum) | 24px AA và các ngoại lệ; project chọn mục tiêu 44px |
| **S15** | [MDN: `prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/%40media/prefers-reduced-motion) | Hỗ trợ giảm animation |
| **S16** | [MDN: `prefers-reduced-transparency`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/%40media/prefers-reduced-transparency) | Hỗ trợ không đồng đều, cần manual fallback |
| **S17** | [MDN: `prefers-contrast`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/%40media/prefers-contrast) | Ngữ cảnh người dùng yêu cầu tăng contrast |
| **S18** | [WWDC25: Build a SwiftUI app with the new design](https://developer.apple.com/videos/play/wwdc2025/323/) | Ví dụ tab bar, sheet và custom glass trên native (để tham khảo, không copy API sang web) |
| **S19** | [WWDC25: Build a UIKit app with the new design](https://developer.apple.com/videos/play/wwdc2025/284/) | Navigation / toolbar / modal patterns ở native |
| **S20** | [Apple HIG: Branding](https://developer.apple.com/design/human-interface-guidelines/branding) | Hạn chế dùng brand color tràn lan; ưu tiên tính nhất quán |

---

## Phụ lục A — Mini-brief để giao coding agent

```text
Task: Adopt an Apple-inspired Liquid Glass design language across the existing
mobile-first expense management web app, following the accompanying design spec.

Requirements:
1) FIRST audit framework, router, current components, theme architecture and target Safari support.
2) Preserve ALL finance logic (VND/DKK, wallet balances, transfer, budgets, CSV) unchanged.
3) Use Glass ONLY for the functional control/navigation layer; keep financial data cards and forms solid.
4) Use a single shared token system for light/dark/transparency/motion and all overlays.
5) Separate the centered + add-transaction ACTION from the four semantic NAV tabs.
6) Build a reusable GlassSurface with opaque fallback and reduced transparency support.
7) Add subtle, interruptible, accessible transitions; never block input/navigation.
8) Test on real iPhone Safari, include safe area and keyboard scenarios.
9) Provide screenshots and a checklist for all five screens in light and dark modes.
10) Report any assumptions or conflicts with existing product behavior BEFORE changing them.

Do not claim native Apple Liquid Glass equivalence from CSS blur.
```

## Phụ lục B — Mapping ngắn giữa hai tài liệu

| Tài liệu trước (implementation plan) | Tài liệu chuyên sâu này |
|---|---|
| Lộ trình thực thi / phases | Phương pháp Apple + lý do tại sao mỗi lớp dùng/không dùng glass |
| Chuyển view và animation ở mức tổng quan | Motion contract chi tiết, origin-aware, reduced-motion |
| Theme tokens khởi điểm | Token semantics/material variants/fallback chi tiết |
| QA chức năng rộng | QA đặc thù glass, Safari, contrast và iPhone |
| Tương thích 5 view | Component mapping từng màn theo Apple HIG |

**Phiên bản tài liệu: 1.0 — Research-backed design specification, không phải xác nhận đã triển khai trong repository.**
