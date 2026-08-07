
## Điểm đang làm tốt

* Màu xanh primary nhất quán, phù hợp ứng dụng tài chính.
* Font Outfit hiển thị rõ và có cảm giác hiện đại.
* Touch target lớn, phù hợp WebView mobile.
* Card bo góc và border nhẹ đúng tinh thần Flat 2.0.
* Bottom navigation dễ hiểu.
* Thu nhập màu xanh, chi tiêu màu đỏ, semantic color hợp lý.
* Safe area phía trên và dưới đang được xử lý khá ổn.
* Các biểu đồ được chia thành section riêng, dễ mở rộng sau này.

## Các vấn đề nên ưu tiên sửa

### 1. Header đang chiếm quá nhiều chiều cao

Header gồm:

* Logo.
* “FinanceTracker”.
* “Tổng quan”.
* Nút thêm lớn.
* Nút đăng xuất.

Phần này cao gần 130–150px, chiếm nhiều diện tích trước khi người dùng thấy dữ liệu.

Nên rút lại thành:

```text
[Avatar/Logo] Tổng quan                   [⋯]
```

Hoặc:

```text
Xin chào, Thanh
Tổng quan tài chính                       [Avatar]
```

Tên `FinanceTracker` không cần xuất hiện ở mọi lần scroll. Có thể chỉ hiện ở splash, login hoặc sidebar desktop.

Chiều cao app bar đề xuất:

* Phần nội dung: `56–64px`.
* Tổng cả safe area: khoảng `100–110px`.
* Không nên vượt quá khoảng `120px`.

---

### 2. Nút “Thêm” bị lặp hai lần

Hiện có:

* Nút `+` lớn trên header.
* Nút `+ Thêm` ở bottom navigation.

Đây là cùng một hành động, gây dư thừa và làm header nặng hơn.

Em đề xuất:

* **Giữ nút Thêm ở bottom navigation.**
* Bỏ nút `+` trên header.
* Thay vị trí đó bằng avatar, notification hoặc menu ba chấm.

Bottom navigation là vị trí thuận tiện hơn cho thao tác một tay.

---

### 3. Icon đăng xuất không nên đặt trực tiếp ở dashboard

Icon bên cạnh nút thêm có hình giống đăng xuất. Đăng xuất là hành động ít dùng nhưng lại đang được đặt ở vị trí rất nổi bật, dễ bấm nhầm.

Nên chuyển vào:

```text
Avatar/Profile
└── Cài đặt
    └── Đăng xuất
```

Ở header chỉ nên có một trong các action:

* Avatar.
* Thông báo.
* Menu.
* Ẩn/hiện số dư.

---

### 4. Bộ lọc thời gian đang quá lớn đối với dashboard

Phần:

* Hôm nay.
* Tuần này.
* Tháng này.
* 7 ngày.
* Từ ngày.
* Đến ngày.
* Nút Xem.
* Banner phạm vi dữ liệu.

chiếm gần toàn bộ màn hình đầu tiên. Người dùng phải scroll rất xa mới thấy số dư và tình hình tài chính.

Đối với dashboard, filter nên thu gọn thành một hàng:

```text
[Tháng này ▼]              01/07 – 22/07
```

Khi bấm vào thì mở bottom sheet:

```text
Khoảng thời gian
○ Hôm nay
○ 7 ngày gần nhất
● Tháng này
○ Tháng trước
○ Tùy chỉnh
```

Nếu chọn “Tùy chỉnh” mới hiện hai date picker.

Như vậy màn hình đầu tiên sẽ hiển thị được ngay:

1. Khoảng thời gian.
2. Tổng số dư.
3. Tổng thu.
4. Tổng chi.

---

### 5. Thứ tự nội dung dashboard chưa tối ưu

Hiện wallet được đặt trước income/expense, sau đó mới đến chart. Ý tưởng đúng, nhưng mỗi wallet lại là một card rất lớn.

Dashboard nên ưu tiên:

```text
Khoảng thời gian
Tổng tài sản quy đổi
Thu nhập | Chi tiêu
Các ví
Xu hướng
Phân bổ chi tiêu
Giao dịch gần đây
```

Nếu không quy đổi DKK và VND thành một tổng chung, nên hiển thị các ví trong carousel ngang hoặc một card nhóm:

```text
Tài sản của tôi                         Xem tất cả

DKK                            32.825 kr
VND                         3.500.000 ₫
```

Không nhất thiết mỗi ví cần một card cao hơn 140px.

---

### 6. Card DKK đang quá nổi so với toàn bộ dashboard

Card DKK dùng nền xanh đậm full-card, còn VND nền trắng. Điều này khiến DKK có cảm giác là tài khoản chính, dù chưa rõ đó có phải chủ ý nghiệp vụ hay không.

Có hai hướng:

**Nếu DKK là ví chính:** giữ nền xanh nhưng giảm chiều cao, thêm nhãn “Ví chính”.

**Nếu hai ví ngang hàng:** dùng cùng một kiểu card, chỉ đánh dấu ví chính bằng badge hoặc border primary.

Ví dụ:

```text
Ví DKK                                  Ví chính
32.825,00 kr.
```

---

### 7. Định dạng tiền tệ chưa nhất quán

Hiện đang dùng:

```text
32.825,00 kr.
3.500.000 đ
0,00 kr.
```

Nên định nghĩa rõ theo locale.

Ví dụ với Danish locale:

```text
32.825,00 kr.
```

Với Vietnamese locale:

```text
3.500.000 ₫
```

Nên dùng ký hiệu `₫` thay vì chữ gạch dưới hoặc `đ` bị underline như trong ảnh.

Ngoài ra, dashboard đang hiển thị thu nhập và chi tiêu bằng DKK, trong khi có cả ví VND. Cần làm rõ:

```text
Thu nhập quy đổi
0,00 DKK
```

hoặc cho người dùng chọn currency tại section:

```text
Thu nhập                    [DKK ▼]
```

---

### 8. Card Thu nhập và Chi tiêu đang cao quá mức

Mỗi card chỉ có một label, một số và một icon nhưng chiều cao khoảng 180–190px.

Nên gộp thành một card hai cột:

```text
┌─────────────────────────────────┐
│ Thu nhập             Chi tiêu   │
│ 12.500 kr.           8.200 kr.  │
│ ↑ 8%                 ↓ 3%       │
└─────────────────────────────────┘
```

Trên màn hình khoảng 390px, mỗi cột vẫn đủ rộng.

Hoặc hai card nhỏ cạnh nhau:

```text
[ Thu nhập ]  [ Chi tiêu ]
```

Chiều cao đề xuất: `110–130px`.

---

### 9. Phần so sánh với kỳ trước nên gắn với KPI

Hiện có một card riêng:

```text
Thu nhập vs kỳ trước: 0%
Chi tiêu vs kỳ trước: 0%
Chênh lệch ròng vs kỳ trước: 0%
```

Thông tin này hơi giống dữ liệu kỹ thuật, chưa đủ trực quan.

Nên đưa trực tiếp vào card thu/chi:

```text
Thu nhập
12.500 kr.
↑ 8,2% so với kỳ trước
```

```text
Chi tiêu
8.200 kr.
↓ 3,4% so với kỳ trước
```

Phần chênh lệch ròng có thể đặt dưới tổng quan:

```text
Còn lại trong kỳ
4.300 kr. · Tăng 12% so với kỳ trước
```

Khi dữ liệu là `0%`, có thể hiển thị:

```text
Không thay đổi so với kỳ trước
```

thay vì lặp ba dòng `0%`.

---

### 10. Biểu đồ đang chiếm nhiều không gian khi không có dữ liệu

Các chart empty hiện vẫn giữ chiều cao lớn 350–500px và chỉ hiển thị một đường ngang ở cuối.

Đây là điểm cần sửa mạnh nhất ở phần dưới.

Khi không có dữ liệu, không nên render chart rỗng. Thay bằng empty state nhỏ:

```text
        [icon chart]
Chưa có dữ liệu trong kỳ này
Thêm giao dịch để xem xu hướng.
[Thêm giao dịch]
```

Chiều cao khoảng `180–220px`.

Ví dụ card “Phân bổ chi tiêu” hiện có donut màu xám rất lớn. Có thể thay bằng:

```text
Chưa có khoản chi trong kỳ đã chọn.
```

Không cần vòng tròn placeholder.

---

### 11. Có quá nhiều chart liên tiếp trên cùng dashboard

Hiện dashboard có:

* Xu hướng theo kỳ lọc.
* Chi tiêu trong kỳ.
* So sánh với kỳ trước.
* Phân bổ chi tiêu.
* Tổng quan theo tháng.

Đối với màn hình tổng quan mobile, đây là quá nhiều. Người dùng phải scroll rất dài.

Nên chỉ giữ tối đa ba khối:

1. **Xu hướng thu và chi.**
2. **Phân bổ chi tiêu.**
3. **Giao dịch gần đây.**

Các báo cáo nâng cao như so sánh kỳ trước và bốn tháng gần nhất nên chuyển sang màn hình **Báo cáo**.

Dashboard nên trả lời ba câu hỏi:

```text
Tôi đang có bao nhiêu tiền?
Kỳ này tôi thu và chi bao nhiêu?
Tiền đang được chi vào đâu?
```

---

### 12. Bottom navigation đang che một phần nội dung

Qua ảnh, một số card nằm sát phía sau bottom navigation. Có nguy cơ item cuối không thể scroll hoàn toàn lên trên thanh nav.

Main content nên có:

```css
padding-bottom:
  calc(var(--bottom-nav-height) + env(safe-area-inset-bottom) + 24px);
```

Ví dụ:

```css
padding-bottom: calc(88px + env(safe-area-inset-bottom));
```

Bottom nav cũng hơi cao. Có thể giảm nhẹ:

* Icon: `24px`.
* Nhãn: `12–13px`.
* Vùng nội dung: `64–68px`.
* Thêm safe area riêng phía dưới.

---

## Gợi ý cấu trúc dashboard mới

```text
┌──────────────────────────────────┐
│ [Logo] Tổng quan            [👤] │
└──────────────────────────────────┘

[ Tháng này ▼ ]     01/07 – 22/07

┌──────────────────────────────────┐
│ Tổng tài sản                     │
│ 32.825,00 DKK                    │
│ ≈ 119.000.000 VND                │
│ 2 ví                         ›    │
└──────────────────────────────────┘

┌────────────────┬─────────────────┐
│ Thu nhập       │ Chi tiêu       │
│ 0 DKK          │ 0 DKK          │
│ Không đổi      │ Không đổi      │
└────────────────┴─────────────────┘

Xu hướng thu và chi             [›]
┌──────────────────────────────────┐
│          Empty/chart             │
└──────────────────────────────────┘

Phân bổ chi tiêu                [›]
┌──────────────────────────────────┐
│          Empty/chart             │
└──────────────────────────────────┘

Giao dịch gần đây               Xem tất cả
┌──────────────────────────────────┐
│ Chưa có giao dịch                │
│ [Thêm giao dịch]                 │
└──────────────────────────────────┘

┌──────────────────────────────────┐
│ Tổng quan     [+ Thêm] Giao dịch │
└──────────────────────────────────┘
```

## Thông số visual nên điều chỉnh

| Thành phần       | Hiện tại cảm giác | Đề xuất                    |
| ---------------- | ----------------- | -------------------------- |
| Padding ngang    | Khoảng 16px       | Giữ 16px                   |
| Khoảng cách card | Hơi lớn           | 16–20px                    |
| Radius card      | Khoảng 18–22px    | 14–16px                    |
| Shadow           | Khá rõ            | Nhẹ hơn                    |
| Header           | Quá cao           | 56–64px chưa gồm safe area |
| Card ví          | Quá cao           | 120–140px                  |
| Card KPI         | Quá cao           | 110–130px                  |
| Chart card       | 350–500px         | 240–300px khi có data      |
| Empty chart      | Vẫn rất cao       | 180–220px                  |
| Section heading  | Tốt nhưng hơi lớn | 20–22px                    |
| Body text        | Khá lớn           | 14–16px                    |
| Bottom nav       | Hơi cao           | 64–68px + safe area        |

## Ưu tiên chỉnh theo thứ tự

**P0 — nên sửa ngay**

1. Bỏ nút thêm ở header.
2. Chuyển logout vào profile.
3. Thu gọn bộ lọc thời gian.
4. Không render chart lớn khi không có dữ liệu.
5. Bổ sung padding để bottom nav không che nội dung.

**P1 — cải thiện UX rõ rệt**

1. Gộp Thu nhập và Chi tiêu.
2. Thu nhỏ card wallet.
3. Chuyển chart nâng cao sang màn hình Báo cáo.
4. Chuẩn hóa định dạng DKK/VND.
5. Rút ngắn header.

**P2 — polish**

1. Giảm radius và shadow nhẹ.
2. Thống nhất badge style.
3. Cải thiện microcopy khi dữ liệu bằng 0.
4. Thêm trạng thái “Ví chính”.
5. Tối ưu typography cho các label phụ.

Sau khi xử lý các mục P0 và P1, màn hình đầu tiên có thể hiển thị ngay **số dư, thu nhập và chi tiêu**, thay vì người dùng phải scroll qua toàn bộ bộ lọc thời gian trước. Đây sẽ là cải thiện lớn nhất cho view này.
