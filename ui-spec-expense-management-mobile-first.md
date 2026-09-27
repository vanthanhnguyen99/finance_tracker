# ĐẶC TẢ UI — ỨNG DỤNG QUẢN LÝ CHI TIÊU

**Phiên bản:** 1.0  
**Định hướng thiết kế:** Mobile-first Minimal UI + Flat 2.0 + Native-like Layout  
**Nền tảng chính:** WebView trên điện thoại, PWA và trình duyệt mobile  
**Tech stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 3, `clsx`, Google Font “Outfit”

---

## 1. Mục tiêu tài liệu

Tài liệu này định nghĩa tiêu chuẩn UI cho ứng dụng quản lý chi tiêu cá nhân, nhằm bảo đảm:

- Giao diện dễ hiểu ngay từ lần sử dụng đầu tiên.
- Thao tác thuận tiện bằng một tay trên điện thoại.
- Có cảm giác gần giống ứng dụng native dù chạy trong WebView.
- Hiển thị tốt trên màn hình nhỏ, tablet và desktop.
- Tải nhanh, ít hiệu ứng nặng và không phụ thuộc vào component library bên ngoài.
- Dễ mở rộng, tái sử dụng component và duy trì tính nhất quán trong codebase.
- Hỗ trợ dark mode về sau mà không phải thiết kế lại toàn bộ hệ thống.

---

## 2. Bối cảnh kỹ thuật

### 2.1. Tech stack hiện tại

- **Framework:** Next.js 16, App Router (`app/`)
- **UI library:** React 19
- **Ngôn ngữ:** TypeScript + TSX
- **Styling:** Tailwind CSS 3, PostCSS, Autoprefixer
- **Class composition:** `clsx`
- **Font:** Google Font `Outfit`
- **Thiết kế:** Responsive, mobile-first, custom components, custom Tailwind classes
- **PWA:** Có manifest, viewport, safe-area và icon
- **Không sử dụng:** shadcn/ui, MUI, Ant Design, Chakra UI hoặc icon library riêng

### 2.2. Ràng buộc kỹ thuật

1. Component phải được xây dựng nội bộ bằng React và Tailwind CSS.
2. Không thêm UI library nếu chưa được đánh giá rõ về bundle size và tính cần thiết.
3. Icon ưu tiên:
   - SVG inline.
   - SVG component nội bộ.
   - Icon hệ thống từ bộ asset của project.
4. Mọi layout phải được thiết kế mobile-first.
5. Mọi màn hình phải hoạt động tốt trong WebView có:
   - Safe area.
   - Thanh trạng thái.
   - Bàn phím ảo.
   - Chiều cao viewport thay đổi.
6. Không dùng hiệu ứng blur hoặc shadow nặng trên diện rộng.
7. Không dùng hover làm tín hiệu tương tác chính vì thiết bị cảm ứng không có hover.

---

## 3. Nguyên tắc thiết kế tổng thể

## 3.1. Mobile-first

Thiết kế bắt đầu từ màn hình rộng khoảng 320–430px, sau đó mới mở rộng lên tablet và desktop.

Ưu tiên:

- Bố cục một cột.
- Một mục tiêu chính trên mỗi màn hình.
- Hành động chính nằm trong vùng ngón cái dễ chạm.
- Các nội dung quan trọng xuất hiện trước.
- Hạn chế bảng nhiều cột trên mobile.
- Tránh thao tác phụ thuộc vào hover.

## 3.2. Minimal UI

Giao diện tối giản nhưng không trống trải.

Quy tắc:

- Chỉ dùng thành phần cần thiết cho tác vụ.
- Không dùng quá nhiều màu nhấn.
- Không dùng nhiều kiểu border, shadow hoặc radius khác nhau.
- Hạn chế decorative element không mang ý nghĩa.
- Ưu tiên typography và khoảng trắng để tạo phân cấp.

## 3.3. Flat 2.0

Dùng giao diện phẳng nhưng vẫn tạo được phân cấp bằng:

- Border nhẹ.
- Background khác cấp độ.
- Shadow rất nhẹ.
- Trạng thái pressed rõ.
- Elevation chỉ xuất hiện tại modal, bottom sheet hoặc floating action.

Không sử dụng:

- Bóng đổ dày.
- Gradient nặng.
- Hiệu ứng 3D.
- Neumorphism.
- Glassmorphism trên vùng nội dung chính.

## 3.4. Native-like layout

Giao diện cần tạo cảm giác như một ứng dụng mobile:

- Top app bar.
- Bottom navigation.
- Bottom sheet.
- Sticky action.
- Pull-to-refresh giả lập khi phù hợp.
- Haptic feedback từ native bridge nếu WebView hỗ trợ.
- Các transition ngắn và có mục đích.
- Hành vi back thống nhất với nút Back của thiết bị.

---

## 4. Kiến trúc thông tin

## 4.1. Các module chính

1. **Tổng quan**
   - Số dư hiện tại.
   - Tổng thu.
   - Tổng chi.
   - Ngân sách còn lại.
   - Giao dịch gần đây.
   - Cảnh báo vượt ngân sách.

2. **Giao dịch**
   - Danh sách giao dịch.
   - Tìm kiếm.
   - Lọc theo thời gian, loại và danh mục.
   - Thêm, sửa, xóa giao dịch.
   - Giao dịch định kỳ.

3. **Ngân sách**
   - Ngân sách theo tháng.
   - Ngân sách theo danh mục.
   - Tiến độ sử dụng.
   - Cảnh báo gần vượt hoặc vượt ngân sách.

4. **Báo cáo**
   - Biểu đồ chi tiêu.
   - So sánh theo thời gian.
   - Phân bố theo danh mục.
   - Xu hướng thu và chi.

5. **Tài khoản**
   - Hồ sơ.
   - Tiền tệ.
   - Ngôn ngữ.
   - Chế độ hiển thị.
   - Dữ liệu và bảo mật.
   - Xuất dữ liệu.
   - Đăng xuất.

## 4.2. Điều hướng cấp cao

Bottom navigation gồm tối đa 5 mục:

| Mục | Nhãn | Vai trò |
|---|---|---|
| 1 | Tổng quan | Màn hình mặc định |
| 2 | Giao dịch | Xem và quản lý giao dịch |
| 3 | Thêm | Hành động chính |
| 4 | Ngân sách | Quản lý ngân sách |
| 5 | Báo cáo | Phân tích chi tiêu |

Mục **Tài khoản** được truy cập từ avatar hoặc menu ở top app bar để tránh bottom navigation quá tải.

### Quy tắc

- Bottom navigation luôn cố định dưới cùng trên mobile.
- Tôn trọng `safe-area-inset-bottom`.
- Nút “Thêm” có thể nổi bật hơn nhưng không được phá vỡ cân bằng bố cục.
- Không hiển thị bottom navigation trong:
  - Màn hình tạo/sửa giao dịch.
  - Modal toàn màn hình.
  - Luồng onboarding.
  - Màn hình đăng nhập.

---

## 5. Design system

## 5.1. Màu sắc

### 5.1.1. Màu thương hiệu

Màu primary nên mang cảm giác tin cậy, rõ ràng và phù hợp lĩnh vực tài chính.

Đề xuất:

```ts
primary: {
  50:  "#EEF5FF",
  100: "#D9E8FF",
  200: "#B9D4FF",
  300: "#8DB8FF",
  400: "#5E93FF",
  500: "#3B6FF5",
  600: "#2F56D8",
  700: "#2945AF",
  800: "#273C8A",
  900: "#26366D"
}
```

### 5.1.2. Màu semantic

```ts
success: {
  light: "#EAF8F0",
  main:  "#2E9D62",
  dark:  "#217548"
}

danger: {
  light: "#FDECEC",
  main:  "#DC4C4C",
  dark:  "#A93434"
}

warning: {
  light: "#FFF6E1",
  main:  "#E59A24",
  dark:  "#A86B11"
}

info: {
  light: "#EAF4FF",
  main:  "#3A7BD5",
  dark:  "#275BA3"
}
```

### 5.1.3. Màu trung tính

```ts
neutral: {
  0:   "#FFFFFF",
  50:  "#F8F9FB",
  100: "#F0F2F5",
  200: "#E1E5EA",
  300: "#CBD1D9",
  400: "#98A1AD",
  500: "#6F7885",
  600: "#515965",
  700: "#383E47",
  800: "#252A31",
  900: "#171A1F"
}
```

### 5.1.4. Ý nghĩa màu trong nghiệp vụ

- **Thu nhập:** success.
- **Chi tiêu:** neutral hoặc danger nhẹ.
- **Vượt ngân sách:** danger.
- **Gần vượt ngân sách:** warning.
- **Đang trong giới hạn:** success.
- **Thông tin trung tính:** info.
- Không dùng chỉ màu để truyền đạt trạng thái; luôn có text, icon hoặc label đi kèm.

---

## 5.2. Typography

Font chính: `Outfit`.

### Thang chữ

| Token | Kích thước | Line-height | Weight | Mục đích |
|---|---:|---:|---:|---|
| `display-lg` | 32px | 40px | 700 | Số dư hoặc KPI lớn |
| `heading-xl` | 24px | 32px | 700 | Tiêu đề màn hình |
| `heading-lg` | 20px | 28px | 600 | Tiêu đề section |
| `heading-md` | 18px | 26px | 600 | Tiêu đề card |
| `body-lg` | 16px | 24px | 400 | Nội dung chính |
| `body-md` | 14px | 20px | 400 | Nội dung phổ thông |
| `body-sm` | 12px | 18px | 400 | Caption, metadata |
| `label-lg` | 16px | 20px | 600 | Nút chính |
| `label-md` | 14px | 18px | 600 | Tab, filter |
| `label-sm` | 12px | 16px | 600 | Badge |

### Quy tắc typography

- Không dùng text nhỏ hơn 12px.
- Nội dung nhập liệu tối thiểu 16px để tránh browser tự zoom trên iOS.
- Số tiền sử dụng `font-variant-numeric: tabular-nums`.
- Số âm phải có dấu `-` và semantic color.
- Tiêu đề không dùng quá ba cấp độ trong cùng một màn hình.

---

## 5.3. Spacing

Dùng hệ spacing theo bội số 4px:

```text
0   = 0px
1   = 4px
2   = 8px
3   = 12px
4   = 16px
5   = 20px
6   = 24px
8   = 32px
10  = 40px
12  = 48px
16  = 64px
```

Quy tắc:

- Padding ngang màn hình mobile: 16px.
- Khoảng cách giữa các section: 24–32px.
- Khoảng cách trong card: 16px.
- Khoảng cách giữa label và input: 8px.
- Khoảng cách giữa các form field: 16px.
- Không dùng giá trị spacing tùy ý nếu chưa cần thiết.

---

## 5.4. Border radius

| Token | Giá trị | Sử dụng |
|---|---:|---|
| `radius-sm` | 8px | Badge, input nhỏ |
| `radius-md` | 12px | Input, button, list item |
| `radius-lg` | 16px | Card |
| `radius-xl` | 20px | Modal hoặc bottom sheet |
| `radius-full` | 9999px | Avatar, chip, FAB |

Không sử dụng quá nhiều kiểu radius trên cùng màn hình.

---

## 5.5. Border

- Border mặc định: `1px solid neutral-200`.
- Border focus: `2px solid primary-500`.
- Border error: `1px solid danger-main`.
- Divider: `1px solid neutral-100`.
- Không dùng border đậm cho mọi card.

---

## 5.6. Shadow

```css
--shadow-sm: 0 1px 2px rgba(17, 24, 39, 0.06);
--shadow-md: 0 4px 12px rgba(17, 24, 39, 0.10);
--shadow-lg: 0 12px 32px rgba(17, 24, 39, 0.16);
```

Sử dụng:

- `shadow-sm`: card nổi nhẹ.
- `shadow-md`: sticky action hoặc dropdown.
- `shadow-lg`: modal, bottom sheet.
- Không dùng shadow trên mọi section.

---

## 5.7. Motion

### Thời lượng

| Motion | Thời lượng |
|---|---:|
| Press feedback | 80–120ms |
| Component transition | 150–200ms |
| Page transition | 200–250ms |
| Bottom sheet | 250–300ms |
| Toast | 200–250ms |

### Easing

```css
cubic-bezier(0.2, 0, 0, 1)
```

### Quy tắc

- Animation phải hỗ trợ hiểu trạng thái.
- Không animate layout lớn liên tục.
- Không dùng parallax.
- Tôn trọng `prefers-reduced-motion`.
- Skeleton chỉ dùng khi tải trên 300ms.
- Loading nhanh dưới 300ms nên dùng trạng thái disabled hoặc spinner nhỏ.

---

## 6. Layout nền tảng

## 6.1. App shell

Cấu trúc đề xuất:

```tsx
<AppShell>
  <TopAppBar />
  <main>
    {children}
  </main>
  <BottomNavigation />
</AppShell>
```

### App shell trên mobile

- Chiều rộng: 100%.
- Min-height: `100dvh`.
- Background: `neutral-50`.
- Nội dung có padding dưới đủ cho bottom navigation.
- Tôn trọng:
  - `env(safe-area-inset-top)`.
  - `env(safe-area-inset-bottom)`.

Ví dụ:

```css
.app-shell {
  min-height: 100dvh;
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
}
```

## 6.2. Content container

```tsx
<div className="mx-auto w-full max-w-screen-sm px-4">
  {children}
</div>
```

Breakpoints:

| Breakpoint | Chiều rộng |
|---|---:|
| Mobile nhỏ | 320–374px |
| Mobile chuẩn | 375–430px |
| Mobile lớn | 431–767px |
| Tablet | 768–1023px |
| Desktop | từ 1024px |

Trên desktop:

- Content chính giới hạn khoảng 960–1200px.
- Có thể chuyển bottom navigation thành sidebar.
- Không kéo card toàn chiều ngang nếu nội dung quá thưa.

---

## 7. Component specification

## 7.1. Top App Bar

### Thành phần

- Nút Back hoặc avatar.
- Tiêu đề.
- Một hoặc hai hành động phụ.
- Có thể sticky.

### Kích thước

- Chiều cao nội dung: 56px.
- Touch target icon: tối thiểu 44×44px.
- Padding ngang: 8–16px.

### Trạng thái

- Default.
- Scrolled: thêm background đặc và border-bottom.
- Search mode.
- Selection mode.

### Quy tắc

- Không đặt quá hai action icon bên phải.
- Tiêu đề dài phải truncate.
- Không hiển thị logo lớn trong mọi màn hình.

---

## 7.2. Bottom Navigation

### Kích thước

- Chiều cao tối thiểu: 64px, chưa tính safe area.
- Icon: 22–24px.
- Nhãn: 11–12px.
- Touch target: tối thiểu 48×48px.

### Trạng thái

- Active.
- Inactive.
- Pressed.
- Disabled nếu cần.

### Visual

- Background trắng hoặc neutral-0.
- Border-top neutral-200.
- Active dùng primary-600.
- Inactive dùng neutral-500.
- Không dùng shadow mạnh.

---

## 7.3. Button

### Variants

1. `primary`
2. `secondary`
3. `outline`
4. `ghost`
5. `danger`
6. `icon`

### Sizes

| Size | Height | Padding |
|---|---:|---:|
| `sm` | 36px | 12px |
| `md` | 44px | 16px |
| `lg` | 52px | 20px |

### Trạng thái

- Default.
- Pressed.
- Focus-visible.
- Disabled.
- Loading.
- Success tạm thời nếu cần.

### Quy tắc

- Mỗi màn hình chỉ có một primary action nổi bật.
- Button full-width được ưu tiên trong form mobile.
- Không dùng text “OK” nếu có thể dùng động từ rõ nghĩa như “Lưu giao dịch”.
- Loading không làm thay đổi chiều rộng button.

---

## 7.4. Input

### Các loại

- Text.
- Number.
- Currency.
- Date.
- Select.
- Search.
- Textarea.
- Password.
- Segmented choice.

### Cấu trúc

```text
Label
Input
Helper hoặc error text
```

### Kích thước

- Chiều cao: 48–52px.
- Font input: tối thiểu 16px.
- Padding ngang: 12–16px.

### Trạng thái

- Default.
- Focus.
- Filled.
- Error.
- Disabled.
- Read-only.

### Quy tắc

- Placeholder không thay cho label.
- Keyboard phù hợp:
  - Số tiền: `inputMode="decimal"`.
  - Số lượng: `inputMode="numeric"`.
  - Email: `type="email"`.
- Số tiền hiển thị định dạng nhưng không làm người dùng khó chỉnh sửa.
- Error text đặt ngay dưới field.

---

## 7.5. Currency Input

Đây là component nghiệp vụ quan trọng.

### Yêu cầu

- Hỗ trợ VND mặc định.
- Không hiển thị số thập phân với VND.
- Có thể đổi currency trong cài đặt.
- Tự thêm dấu phân cách hàng nghìn khi blur.
- Cho phép nhập nhanh.
- Giá trị lưu nội bộ là số nguyên theo đơn vị nhỏ nhất.
- Hỗ trợ số âm trong flow điều chỉnh dữ liệu, nhưng không mặc định cho người dùng phổ thông.

### Hiển thị

```text
1.250.000 ₫
```

hoặc:

```text
₫1.250.000
```

Tùy locale và cấu hình.

---

## 7.6. Card

### Variants

- Summary card.
- Transaction card.
- Budget card.
- Insight card.
- Empty-state card.

### Style mặc định

- Background trắng.
- Border neutral-200.
- Radius 16px.
- Padding 16px.
- Shadow rất nhẹ hoặc không shadow.

### Quy tắc

- Không bọc mọi thứ trong card.
- Section liên tiếp có thể dùng list với divider thay vì nhiều card.
- Card phải có hierarchy rõ giữa title, value và metadata.

---

## 7.7. Transaction List Item

### Nội dung

- Icon danh mục.
- Tên giao dịch.
- Danh mục hoặc tài khoản.
- Ngày giờ.
- Số tiền.
- Trạng thái đồng bộ nếu có.

### Cấu trúc

```text
[Icon]  Tên giao dịch                -120.000 ₫
        Danh mục · Hôm nay, 09:30
```

### Quy tắc

- Khoản chi dùng dấu âm.
- Khoản thu dùng dấu cộng hoặc màu success.
- Item có chiều cao tối thiểu 64px.
- Không hiển thị quá nhiều metadata.
- Swipe action chỉ dùng nếu WebView hỗ trợ ổn định; luôn có phương án thay thế qua menu.

---

## 7.8. Category Icon

Vì project không dùng icon library riêng, category icon nên là SVG nội bộ.

### Quy tắc

- Kích thước icon: 20–24px.
- Container: 40×40px.
- Background category dùng màu pastel.
- Không dùng quá 12 màu category.
- Luôn có fallback icon.
- Icon phải có `aria-hidden` nếu chỉ mang tính trang trí.

---

## 7.9. Chip và Filter

### Dùng cho

- Khoảng thời gian.
- Danh mục.
- Loại thu/chi.
- Tài khoản.
- Trạng thái.

### Kích thước

- Chiều cao 32–36px.
- Padding ngang 12px.
- Radius full.

### Trạng thái

- Unselected.
- Selected.
- Disabled.

### Quy tắc

- Không hiển thị hơn 5–6 chip cùng hàng nếu không scroll ngang.
- Có nút “Bộ lọc” mở bottom sheet cho filter phức tạp.
- Luôn có cách reset filter.

---

## 7.10. Tabs

Dùng khi các nội dung cùng cấp trong một màn hình.

Ví dụ:

- Thu / Chi.
- Tuần / Tháng / Năm.
- Đang hoạt động / Đã kết thúc.

### Quy tắc

- Tối đa 3–4 tab trên mobile.
- Tab bar có thể scroll ngang nếu bắt buộc.
- Không dùng tab để thay thế navigation chính.
- Trạng thái active phải rõ bằng màu và indicator.

---

## 7.11. Bottom Sheet

Dùng cho:

- Chọn danh mục.
- Chọn tài khoản.
- Bộ lọc.
- Xác nhận hành động.
- Menu phụ.

### Yêu cầu

- Bo góc phía trên 20px.
- Có drag handle.
- Padding đáy theo safe area.
- Có thể đóng bằng:
  - Vuốt xuống.
  - Chạm overlay.
  - Nút đóng.
  - Nút Back.
- Không dùng bottom sheet cho form quá dài; khi đó dùng page toàn màn hình.

---

## 7.12. Modal

Trên mobile, ưu tiên full-screen modal hoặc bottom sheet.

Modal giữa màn hình chỉ dùng cho:

- Xác nhận xóa.
- Cảnh báo quan trọng.
- Thông báo ngắn.

### Quy tắc

- Tối đa hai action.
- Action nguy hiểm đặt rõ ràng.
- Không đóng modal chỉ bằng icon mơ hồ.
- Focus phải được giữ trong modal trên desktop.

---

## 7.13. Toast

Dùng để phản hồi ngắn:

- Đã lưu giao dịch.
- Đã xóa.
- Đồng bộ thất bại.
- Không có kết nối.

### Quy tắc

- Hiển thị 2–4 giây.
- Không dùng toast thay cho error cần người dùng xử lý.
- Trên mobile đặt phía trên bottom navigation.
- Hỗ trợ action “Hoàn tác” sau khi xóa.

---

## 7.14. Progress Bar

Dùng cho ngân sách.

### Trạng thái màu

- 0–69%: success hoặc primary.
- 70–89%: warning.
- 90–100%: danger nhẹ.
- Trên 100%: danger rõ.

### Quy tắc

- Luôn hiển thị cả giá trị đã dùng và giới hạn.
- Không truyền đạt trạng thái chỉ bằng màu.
- Có label phần trăm hoặc số tiền.

---

## 7.15. Empty State

Mỗi danh sách phải có empty state.

### Thành phần

- Icon hoặc illustration SVG đơn giản.
- Tiêu đề ngắn.
- Mô tả một câu.
- Một hành động chính.

Ví dụ:

```text
Chưa có giao dịch
Thêm giao dịch đầu tiên để bắt đầu theo dõi chi tiêu.
[Thêm giao dịch]
```

---

## 7.16. Skeleton

Dùng cho:

- Dashboard.
- Danh sách giao dịch.
- Báo cáo.
- Ngân sách.

### Quy tắc

- Skeleton phải gần giống layout thật.
- Không shimmer quá mạnh.
- Dừng animation khi `prefers-reduced-motion`.
- Không hiển thị skeleton cho thao tác rất nhanh.

---

## 8. Đặc tả màn hình

## 8.1. Màn hình đăng nhập

### Mục tiêu

Đăng nhập nhanh, rõ và ít nhiễu.

### Bố cục

1. Logo nhỏ.
2. Tiêu đề chào mừng.
3. Form đăng nhập.
4. Nút đăng nhập.
5. Link quên mật khẩu.
6. Link đăng ký nếu có.
7. Thông tin phiên bản hoặc pháp lý ở cuối.

### Quy tắc

- Không có bottom navigation.
- Button đăng nhập full-width.
- Hiển thị lỗi ngay tại field hoặc alert.
- Hỗ trợ autofill.
- Hỗ trợ password manager.
- Khi bàn phím mở, button vẫn có thể truy cập.

---

## 8.2. Onboarding

### Số bước

Tối đa 3–4 bước:

1. Chọn tiền tệ.
2. Chọn mục tiêu theo dõi.
3. Thiết lập ngân sách tháng.
4. Hoàn tất.

### Quy tắc

- Cho phép bỏ qua các bước không bắt buộc.
- Hiển thị progress.
- Không yêu cầu quá nhiều thông tin.
- Sau onboarding đưa về dashboard.

---

## 8.3. Dashboard / Tổng quan

### Thứ tự nội dung

1. Top app bar.
2. Card số dư.
3. Tổng thu và tổng chi.
4. Tiến độ ngân sách tháng.
5. Quick actions.
6. Giao dịch gần đây.
7. Insight hoặc cảnh báo.

### Card số dư

Hiển thị:

- Nhãn “Số dư hiện tại”.
- Giá trị lớn.
- Mức thay đổi so với tháng trước.
- Nút ẩn/hiện số dư nếu cần.

### Quick actions

Tối đa 3–4 action:

- Thêm khoản chi.
- Thêm khoản thu.
- Chuyển khoản.
- Quét hóa đơn, nếu có.

### Giao dịch gần đây

- Hiển thị 5–8 item.
- Có link “Xem tất cả”.
- Nhóm theo ngày nếu cần.

### Responsive

- Mobile: một cột.
- Tablet: summary và budget có thể đặt hai cột.
- Desktop: sidebar và dashboard grid tối đa 3 cột.

---

## 8.4. Danh sách giao dịch

### Thành phần

- Top app bar.
- Search.
- Filter chips.
- Tổng thu và chi trong khoảng thời gian.
- Danh sách nhóm theo ngày.
- Floating hoặc sticky add button.

### Filter mặc định

- Tháng hiện tại.
- Tất cả loại.
- Tất cả danh mục.
- Tất cả tài khoản.

### Trạng thái

- Loading.
- Empty.
- Có dữ liệu.
- Search không có kết quả.
- Offline.
- Error.

### Pagination

Ưu tiên infinite scroll hoặc “Tải thêm”.

Không tải toàn bộ lịch sử ngay lần đầu.

---

## 8.5. Thêm giao dịch

Đây là màn hình quan trọng nhất.

### Cấu trúc đề xuất

1. Segmented control: Chi / Thu / Chuyển khoản.
2. Số tiền.
3. Danh mục.
4. Tài khoản.
5. Ngày.
6. Ghi chú.
7. Hình ảnh hóa đơn, tùy chọn.
8. Giao dịch định kỳ, tùy chọn.
9. Nút “Lưu giao dịch”.

### Quy tắc UX

- Focus mặc định vào số tiền.
- Numeric keyboard mở ngay.
- Nút lưu sticky phía dưới.
- Cho phép chọn danh mục bằng bottom sheet.
- Không yêu cầu ghi chú.
- Giá trị mặc định:
  - Ngày hiện tại.
  - Tài khoản gần nhất.
  - Loại giao dịch gần nhất hoặc “Chi”.
- Sau khi lưu:
  - Hiển thị toast.
  - Quay lại màn hình trước hoặc reset form theo flow.
- Ngăn submit nhiều lần.
- Xử lý offline nếu app có local storage.

---

## 8.6. Chi tiết giao dịch

### Nội dung

- Số tiền.
- Loại giao dịch.
- Danh mục.
- Tài khoản.
- Ngày giờ.
- Ghi chú.
- Hóa đơn.
- Trạng thái đồng bộ.
- Metadata cần thiết.

### Action

- Sửa.
- Xóa.
- Nhân bản.
- Chia sẻ, nếu có.

### Xóa

- Hiển thị confirmation.
- Có “Hoàn tác” qua toast nếu kỹ thuật hỗ trợ.
- Không xóa ngay chỉ bằng swipe.

---

## 8.7. Ngân sách

### Danh sách ngân sách

Mỗi budget card hiển thị:

- Danh mục.
- Đã sử dụng.
- Hạn mức.
- Phần trăm.
- Progress bar.
- Trạng thái.

### Hành động

- Thêm ngân sách.
- Sửa ngân sách.
- Tắt ngân sách.
- Xem giao dịch liên quan.

### Màn hình tạo ngân sách

Fields:

- Danh mục.
- Hạn mức.
- Chu kỳ.
- Ngày bắt đầu.
- Cảnh báo.
- Chuyển phần dư sang kỳ sau, nếu hỗ trợ.

---

## 8.8. Báo cáo

### Nguyên tắc

Báo cáo phải dễ đọc trên mobile, tránh nhồi quá nhiều biểu đồ.

### Thứ tự

1. Chọn khoảng thời gian.
2. KPI chính.
3. Biểu đồ thu/chi.
4. Chi tiêu theo danh mục.
5. Xu hướng.
6. Insight.

### Biểu đồ

- Dùng SVG hoặc thư viện chart nhẹ nếu project chấp thuận.
- Không phụ thuộc vào tooltip hover.
- Cho phép tap vào data point.
- Có legend rõ.
- Có phiên bản text hoặc bảng dữ liệu hỗ trợ accessibility.
- Không dùng pie chart với quá 5–6 nhóm.
- “Khác” gom các danh mục nhỏ.

### Mobile

- Mỗi chart một khối.
- Không đặt hai chart cạnh nhau.
- Chiều cao chart khoảng 220–280px.
- Filter thời gian đặt trong tabs hoặc bottom sheet.

---

## 8.9. Tài khoản và cài đặt

### Nhóm cài đặt

1. Hồ sơ.
2. Tiền tệ và định dạng.
3. Giao diện.
4. Thông báo.
5. Bảo mật.
6. Dữ liệu.
7. Hỗ trợ.
8. Đăng xuất.

### Pattern

- List item 52–60px.
- Có icon, label, value hiện tại và chevron.
- Dangerous action đặt riêng ở cuối.
- Không dùng card cho từng row.

---

## 9. Trạng thái hệ thống

## 9.1. Loading

- Button loading: spinner + disabled.
- Page loading: skeleton.
- Refresh: indicator ở top.
- Không khóa toàn màn hình nếu chỉ một vùng đang tải.

## 9.2. Error

Error phải gồm:

- Điều gì xảy ra.
- Người dùng có thể làm gì.
- Nút thử lại nếu phù hợp.

Ví dụ:

```text
Không thể tải giao dịch
Vui lòng kiểm tra kết nối và thử lại.
[Thử lại]
```

## 9.3. Offline

Hiển thị banner nhỏ:

```text
Bạn đang ngoại tuyến. Thay đổi sẽ được đồng bộ khi có mạng.
```

Quy tắc:

- Không chặn thao tác nếu app hỗ trợ offline.
- Hiển thị trạng thái “Chờ đồng bộ” trên giao dịch.
- Khi online lại, phản hồi đồng bộ thành công hoặc thất bại.

## 9.4. Empty

Phân biệt:

- Chưa có dữ liệu.
- Không có kết quả tìm kiếm.
- Không có dữ liệu trong khoảng thời gian.
- Dữ liệu bị lọc hết.

---

## 10. WebView-specific requirements

## 10.1. Safe area

Tất cả phần sticky hoặc fixed phải dùng safe area:

```css
padding-bottom: calc(16px + env(safe-area-inset-bottom));
```

Bottom navigation:

```css
height: calc(64px + env(safe-area-inset-bottom));
padding-bottom: env(safe-area-inset-bottom);
```

## 10.2. Dynamic viewport

Dùng `100dvh` thay cho chỉ `100vh`.

```css
min-height: 100dvh;
```

## 10.3. Bàn phím ảo

- Form không để action bị che bởi keyboard.
- Sticky button có thể chuyển thành flow bình thường khi keyboard mở.
- Scroll field đang focus vào vùng nhìn thấy.
- Không khóa body scroll sai cách.
- Không reset form khi WebView thay đổi viewport.

## 10.4. Native back

Back button phải ưu tiên:

1. Đóng modal.
2. Đóng bottom sheet.
3. Thoát selection mode.
4. Quay lại route trước.
5. Chỉ thoát ứng dụng khi ở root screen.

## 10.5. External links

- Link bên ngoài phải mở bằng browser hệ thống hoặc native bridge.
- Không điều hướng WebView nội bộ sang trang không thuộc ứng dụng.
- Hiển thị xác nhận nếu link có rủi ro rời flow quan trọng.

## 10.6. File upload và camera

Nếu hỗ trợ ảnh hóa đơn:

- Cho phép camera và thư viện ảnh.
- Hiển thị preview.
- Nén ảnh trước upload.
- Có progress.
- Có khả năng retry.
- Có fallback khi permission bị từ chối.

## 10.7. Haptic feedback

Nếu native bridge hỗ trợ:

- Light impact khi chọn tab hoặc toggle.
- Medium impact khi thêm giao dịch thành công.
- Warning feedback khi thao tác nguy hiểm.
- Không lạm dụng.

---

## 11. Responsive behavior

## 11.1. Mobile

- Một cột.
- Bottom navigation.
- Header sticky.
- Action full-width.
- Bottom sheet thay dropdown.
- List thay table.

## 11.2. Tablet

- Có thể dùng hai cột.
- Bottom navigation có thể giữ hoặc chuyển sang navigation rail.
- Modal không nhất thiết full-screen.
- Filter panel có thể hiển thị cạnh nội dung.

## 11.3. Desktop

- Sidebar cố định.
- Top header.
- Content max-width.
- Dashboard grid.
- Table cho danh sách giao dịch.
- Hover chỉ là hỗ trợ thêm, không phải tín hiệu duy nhất.

---

## 12. Accessibility

## 12.1. Touch target

- Tối thiểu 44×44px.
- Khuyến nghị 48×48px.
- Khoảng cách giữa hai action nhỏ tối thiểu 8px.

## 12.2. Contrast

- Text thường: tối thiểu 4.5:1.
- Text lớn: tối thiểu 3:1.
- UI component quan trọng: tối thiểu 3:1.

## 12.3. Keyboard

Trên desktop và thiết bị có bàn phím:

- Có focus-visible rõ.
- Thứ tự tab hợp lý.
- Esc đóng modal.
- Enter submit form khi phù hợp.
- Không dùng `outline: none` nếu không có focus style thay thế.

## 12.4. Screen reader

- Icon button phải có `aria-label`.
- Form field có label thật.
- Error dùng `aria-describedby`.
- Modal dùng role phù hợp.
- Toast quan trọng dùng live region.
- Chart có summary text.

## 12.5. Motion

Tôn trọng:

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 13. Dark mode

Dark mode không bắt buộc cho phiên bản đầu nhưng token phải sẵn sàng.

### Nguyên tắc

- Không dùng pure black toàn màn hình.
- Background chính: gần `#121418`.
- Surface: `#1A1D23`.
- Border: `#2B3038`.
- Text primary: `#F4F5F7`.
- Text secondary: `#AEB5BF`.
- Giảm độ bão hòa semantic color.
- Shadow ít hiệu quả hơn; ưu tiên border và surface level.

### Implementation

Dùng CSS variable và Tailwind mapping:

```css
:root {
  --color-bg: 248 249 251;
  --color-surface: 255 255 255;
  --color-text: 23 26 31;
}

.dark {
  --color-bg: 18 20 24;
  --color-surface: 26 29 35;
  --color-text: 244 245 247;
}
```

---

## 14. Tailwind architecture

## 14.1. Theme extension

```ts
// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-outfit)", "sans-serif"],
      },
      colors: {
        primary: {
          50: "#EEF5FF",
          100: "#D9E8FF",
          200: "#B9D4FF",
          300: "#8DB8FF",
          400: "#5E93FF",
          500: "#3B6FF5",
          600: "#2F56D8",
          700: "#2945AF",
          800: "#273C8A",
          900: "#26366D",
        },
      },
      borderRadius: {
        card: "1rem",
        control: "0.75rem",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(17, 24, 39, 0.06)",
        sheet: "0 12px 32px rgba(17, 24, 39, 0.16)",
      },
    },
  },
  plugins: [],
};

export default config;
```

## 14.2. Utility classes dùng chung

Có thể định nghĩa trong `globals.css`:

```css
@layer components {
  .page-container {
    @apply mx-auto w-full max-w-screen-sm px-4;
  }

  .surface-card {
    @apply rounded-card border border-neutral-200 bg-white p-4 shadow-soft;
  }

  .control-base {
    @apply min-h-12 rounded-control border border-neutral-200 bg-white px-4 text-base outline-none transition;
  }

  .control-focus {
    @apply focus-visible:border-primary-500 focus-visible:ring-2 focus-visible:ring-primary-100;
  }

  .tap-target {
    @apply inline-flex min-h-11 min-w-11 items-center justify-center;
  }
}
```

## 14.3. Dùng `clsx`

Ví dụ Button:

```tsx
import clsx from "clsx";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center rounded-control font-semibold transition",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300",
        "disabled:cursor-not-allowed disabled:opacity-50",
        {
          "bg-primary-600 text-white active:bg-primary-700":
            variant === "primary",
          "bg-neutral-100 text-neutral-900 active:bg-neutral-200":
            variant === "secondary",
          "bg-transparent text-neutral-700 active:bg-neutral-100":
            variant === "ghost",
          "bg-red-600 text-white active:bg-red-700":
            variant === "danger",
          "h-9 px-3 text-sm": size === "sm",
          "h-11 px-4 text-sm": size === "md",
          "h-13 px-5 text-base": size === "lg",
        },
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? "Đang xử lý..." : children}
    </button>
  );
}
```

---

## 15. Cấu trúc component đề xuất

```text
components/
├── app-shell/
│   ├── app-shell.tsx
│   ├── top-app-bar.tsx
│   ├── bottom-navigation.tsx
│   └── page-container.tsx
├── ui/
│   ├── button.tsx
│   ├── icon-button.tsx
│   ├── input.tsx
│   ├── currency-input.tsx
│   ├── textarea.tsx
│   ├── card.tsx
│   ├── badge.tsx
│   ├── chip.tsx
│   ├── tabs.tsx
│   ├── progress-bar.tsx
│   ├── bottom-sheet.tsx
│   ├── modal.tsx
│   ├── toast.tsx
│   ├── skeleton.tsx
│   └── empty-state.tsx
├── transaction/
│   ├── transaction-item.tsx
│   ├── transaction-list.tsx
│   ├── transaction-form.tsx
│   ├── category-picker.tsx
│   └── transaction-summary.tsx
├── budget/
│   ├── budget-card.tsx
│   ├── budget-list.tsx
│   └── budget-form.tsx
├── report/
│   ├── report-summary.tsx
│   ├── expense-chart.tsx
│   └── category-breakdown.tsx
└── icons/
    ├── home-icon.tsx
    ├── transaction-icon.tsx
    ├── add-icon.tsx
    ├── budget-icon.tsx
    └── report-icon.tsx
```

---

## 16. Quy tắc đặt tên

### Component

- PascalCase.
- Tên phản ánh vai trò, không phản ánh style tạm thời.

Đúng:

```text
TransactionItem
BudgetProgress
CategoryPicker
```

Không nên:

```text
BlueCard
RoundedBox
PrettyButton
```

### Props

- Boolean bắt đầu bằng `is`, `has`, `can`, `should`.
- Event bắt đầu bằng `on`.
- Variant dùng union type.

Ví dụ:

```ts
interface TransactionItemProps {
  transaction: Transaction;
  isSelected?: boolean;
  onPress?: () => void;
  onEdit?: () => void;
}
```

---

## 17. Performance

## 17.1. Bundle

- Không thêm dependency chỉ để dùng một component nhỏ.
- SVG icon nên tree-shakable hoặc nội bộ.
- Chart library phải lazy-load.
- Modal hoặc report nặng có thể dynamic import.

## 17.2. Image

- Dùng Next Image khi phù hợp.
- Receipt image cần thumbnail.
- Nén trước upload.
- Lazy-load ảnh ngoài viewport.

## 17.3. List

- Chỉ virtualize khi danh sách đủ lớn.
- Dùng pagination hoặc infinite load.
- Memoization chỉ dùng khi có lợi đo được.
- Key phải ổn định.

## 17.4. WebView

- Giảm animation.
- Tránh backdrop blur.
- Tránh nhiều fixed element chồng nhau.
- Hạn chế reflow khi keyboard mở.
- Kiểm tra trên thiết bị Android tầm trung.

---

## 18. Nội dung và microcopy

### Nguyên tắc

- Dùng câu ngắn.
- Dùng động từ rõ.
- Tránh thuật ngữ tài chính khó hiểu nếu không cần.
- Không đổ lỗi cho người dùng.
- Error phải hướng dẫn cách xử lý.

### Ví dụ

| Không nên | Nên dùng |
|---|---|
| Invalid amount | Số tiền chưa hợp lệ |
| Submit | Lưu giao dịch |
| Delete item? | Xóa giao dịch này? |
| Something went wrong | Không thể lưu giao dịch. Vui lòng thử lại. |
| No data | Chưa có giao dịch trong tháng này |

---

## 19. Quy tắc dữ liệu tài chính

1. Số tiền phải dùng định dạng locale.
2. Không dùng số thực dấu phẩy động cho tính toán tiền.
3. Số âm và số dương phải phân biệt rõ.
4. Luôn hiển thị đơn vị tiền tệ khi có thể gây nhầm lẫn.
5. Không cắt mất chữ số quan trọng.
6. Số tiền lớn có thể viết gọn trong chart, nhưng phải có giá trị đầy đủ khi tap.
7. Khi xóa hoặc thay đổi giao dịch ảnh hưởng báo cáo, cần cập nhật UI ngay hoặc hiển thị trạng thái đang đồng bộ.

---

## 20. Acceptance criteria

## 20.1. Toàn cục

- [ ] Giao diện sử dụng tốt ở chiều rộng 320px.
- [ ] Không có horizontal scroll ngoài các vùng chủ động scroll.
- [ ] Tất cả action chính có touch target tối thiểu 44×44px.
- [ ] Nội dung không bị bottom navigation che.
- [ ] Hoạt động đúng với safe area.
- [ ] Hoạt động đúng khi bàn phím ảo mở.
- [ ] Không phụ thuộc vào hover.
- [ ] Focus-visible hoạt động trên desktop.
- [ ] Contrast đạt tiêu chuẩn.
- [ ] Có loading, empty và error state.
- [ ] Không dùng icon không có nhãn truy cập.
- [ ] Không thêm UI library bên ngoài.

## 20.2. Màn hình thêm giao dịch

- [ ] Focus vào số tiền khi mở.
- [ ] Bàn phím số được sử dụng.
- [ ] Có thể nhập và sửa số tiền dễ dàng.
- [ ] Nút lưu không bị keyboard che.
- [ ] Submit nhiều lần bị ngăn chặn.
- [ ] Có phản hồi thành công.
- [ ] Có validation rõ ràng.
- [ ] Có thể quay lại mà không mất dữ liệu ngoài ý muốn.

## 20.3. Danh sách giao dịch

- [ ] Nhóm theo ngày rõ ràng.
- [ ] Khoản thu và chi dễ phân biệt.
- [ ] Filter có thể reset.
- [ ] Search không làm giật layout.
- [ ] Có empty state cho không có kết quả.
- [ ] Có phương án tải thêm dữ liệu.

## 20.4. Ngân sách

- [ ] Tiến độ hiển thị cả số tiền và phần trăm.
- [ ] Gần vượt và vượt ngân sách có trạng thái riêng.
- [ ] Không dùng chỉ màu để báo trạng thái.
- [ ] Tap vào card mở chi tiết hoặc giao dịch liên quan.

---

## 21. Kiểm thử thiết bị

Tối thiểu kiểm thử trên:

- iPhone màn hình nhỏ.
- iPhone màn hình chuẩn.
- Android 360×800.
- Android 412×915.
- Tablet 768px.
- Chrome desktop.
- Safari iOS trong WebView.
- Chrome Android WebView.

Tình huống cần kiểm thử:

- Font scale hệ thống lớn.
- Dark mode.
- Mạng chậm.
- Offline.
- Keyboard mở.
- Xoay màn hình.
- Safe area có notch.
- Dữ liệu số tiền rất lớn.
- Tên danh mục dài.
- Danh sách hàng nghìn giao dịch.

---

## 22. Definition of Done cho component UI

Một component được xem là hoàn tất khi:

1. Có TypeScript props rõ ràng.
2. Có default, hover nếu phù hợp, pressed, focus, disabled và loading state.
3. Hoạt động trên mobile và desktop.
4. Có accessibility attributes.
5. Không chứa business logic không liên quan.
6. Có test hoặc Storybook tương đương nếu project áp dụng.
7. Không tạo layout shift.
8. Không làm tăng bundle size bất hợp lý.
9. Tuân thủ token màu, spacing, typography và radius.
10. Được kiểm tra trong WebView thật hoặc môi trường mô phỏng gần tương đương.

---

## 23. Phạm vi UI phiên bản đầu

### Bắt buộc

- App shell.
- Đăng nhập.
- Dashboard.
- Danh sách giao dịch.
- Thêm, sửa và xóa giao dịch.
- Danh mục.
- Ngân sách cơ bản.
- Báo cáo theo tháng.
- Cài đặt cơ bản.
- Loading, empty, error và offline states.
- Responsive mobile-first.
- Safe area và keyboard handling.

### Có thể để sau

- Dark mode hoàn chỉnh.
- Quét hóa đơn.
- Animation nâng cao.
- Haptic feedback.
- Giao dịch định kỳ phức tạp.
- Đồng bộ nhiều thiết bị.
- Biểu đồ nâng cao.
- Personalization.
- AI insight.

---

## 24. Kết luận thiết kế

UI của ứng dụng quản lý chi tiêu nên được triển khai theo công thức:

```text
Mobile-first
+ Minimal UI
+ Flat 2.0
+ Native-like navigation
+ Data hierarchy rõ ràng
+ Component nội bộ nhẹ
+ Tối ưu WebView
```

Giao diện không cần gây ấn tượng bằng hiệu ứng phức tạp. Giá trị cốt lõi là:

- Nhập giao dịch nhanh.
- Đọc số liệu dễ.
- Biết tiền đang được chi vào đâu.
- Nhận biết sớm nguy cơ vượt ngân sách.
- Thao tác ổn định trên điện thoại.
- Có cảm giác nhất quán như một ứng dụng native.
