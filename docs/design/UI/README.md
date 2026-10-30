# Lab FourT: Thiết kế UI và prototype

Thiết kế giao diện cho bản đầu của Lab FourT, bám theo [bộ SRS](../../srs/README.md). Mã màn hình `SCR-nn` khớp với tài liệu 05 của SRS.

## Nội dung thư mục

| Đường dẫn | Nội dung |
|---|---|
| `lab-fourt-prototype.html` | Prototype chạy được, gói trong một tệp, không cần cài đặt hay internet |
| `figma/desktop/` | 24 khung 1440 px dạng SVG để nhập vào Figma |
| `figma/mobile/` | 24 khung 390 px dạng SVG |
| `figma/states/` | 7 trạng thái của phòng tham vấn và hộp thoại |
| `screens/` | Ảnh PNG của toàn bộ các khung trên |
| `design-tokens.json` | Màu, bo góc, phông chữ |
| `prototype/` | Mã nguồn prototype (React, Three.js) |

## Mở prototype

Bấm đúp `lab-fourt-prototype.html`, tệp mở bằng Chrome, Edge, Firefox hoặc Safari. Tệp không gửi dữ liệu đi đâu. Tải lại trang sẽ đặt lại dữ liệu demo.

Nút **Demo** màu vàng dành cho người trình bày:

- Ngoài phòng tham vấn: đổi vai trò, mở bản đồ màn hình, đặt lại dữ liệu.
- Trong phòng tham vấn: giả lập mất kết nối, lỗi dịch vụ AI, từ chối micro, tín hiệu nguy cơ, thiết bị chạy chậm.

## Kịch bản trình bày cho khách, khoảng 7 phút

| Bước | Thao tác | Điểm cần nói |
|---|---|---|
| 1 | Đăng nhập, xem trang chủ sinh viên | Mỗi người có tài khoản và phân quyền riêng |
| 2 | Chuẩn bị thực hành, xác nhận quy tắc, Bắt đầu phiên | Luôn nhắc đây là mô phỏng |
| 3 | Kéo chuột để xoay góc nhìn | Phòng 3D chạy ngay trên trình duyệt, không cần cài đặt |
| 4 | Nhấn micro, nhấn dừng, sửa văn bản, Gửi | Sinh viên nói hoặc nhập văn bản, AI trả lời bằng chữ |
| 5 | Nhập "Vậy em nên cố gắng học thêm" | Thân chủ thu lại khi bị khuyên nhủ, tạo tình huống học tập |
| 6 | Demo, Mất kết nối 3 giây | Phiên không đứt quãng, không mất lượt |
| 7 | Bấm nút 2D | Thiết bị yếu vẫn thực hành được |
| 8 | Kết thúc phiên, xem báo cáo, bấm vào một dẫn chứng | Mỗi đánh giá gắn với câu nói cụ thể |
| 9 | Viết phản tư, nộp bài | Điểm AI để tự đánh giá, không phải điểm học phần |
| 10 | Demo, Giảng viên, Tiến độ lớp, Xem xét | Đánh giá của giảng viên lưu tách khỏi đề xuất của AI |
| 11 | Demo, Quản trị viên, Dữ liệu phiên | Dữ liệu chỉ xóa mềm, quản lý bằng trạng thái |

## Nhập vào Figma

Figma không có định dạng tệp mở để tạo `.fig` từ bên ngoài, nên thiết kế được xuất ra SVG giữ nguyên lớp.

1. Mở một tệp Figma mới.
2. Kéo các tệp `.svg` trong `figma/desktop`, `figma/mobile`, `figma/states` vào canvas. Có thể kéo nhiều tệp một lúc.
3. Mỗi tệp thành một khung. Chữ, hình khối và biểu tượng sửa được, tên lớp lấy theo thành phần giao diện.
4. Phòng 3D và ảnh nhân vật là ảnh nhúng.

Lưu ý khi nhập:

- Thiết kế dùng hai phông Google Fonts là Be Vietnam Pro và Bricolage Grotesque, Figma có sẵn cả hai.
- Bóng đổ không được xuất ra SVG, cần thêm lại trong Figma nếu muốn.
- Tương tác nằm ở prototype HTML, các khung trong Figma là tĩnh.
- Để có component và Auto Layout đúng chuẩn, có thể dùng plugin chuyển HTML sang Figma trên `lab-fourt-prototype.html`, hoặc dựng lại component từ `00-he-thong-thiet-ke.svg`.

## Danh sách khung

| Mã | Màn hình | Vai trò |
|---|---|---|
| 00 | Hệ thống thiết kế | |
| SCR-01, 02 | Đăng nhập, đổi mật khẩu lần đầu | Tất cả |
| SCR-03 đến 10 | Trang chủ, thư viện ca, chuẩn bị, phòng tham vấn, báo cáo, transcript, phản tư, lịch sử | Sinh viên |
| SCR-11 đến 16 | Tổng quan, ca mô phỏng, soạn ca, giao bài, tiến độ, xem xét, thống kê | Giảng viên |
| SCR-17 đến 22 | Tài khoản, lớp, dữ liệu phiên, cấu hình, trạng thái hệ thống, nhật ký | Quản trị viên |
| SCR-06a đến 06f | Hướng dẫn lần đầu, ghi âm, xác nhận văn bản, tín hiệu an toàn, chế độ 2D, xác nhận kết thúc | Sinh viên |
| SCR-10a | Xác nhận xóa phiên | Sinh viên |

## Giới hạn của prototype

- AI và nhận dạng giọng nói là giả lập theo kịch bản, không gọi dịch vụ thật. Micro không thật sự ghi âm.
- Dữ liệu là minh họa, nhân vật và lớp học đều hư cấu.
- Nội dung ca là bản nháp, chưa đối chiếu giáo trình (OI-02). Hướng dẫn an toàn là minh họa, chờ giảng viên xác nhận (OI-03).
- Nhân vật và căn phòng dựng bằng hình khối để không phụ thuộc tài sản có giấy phép. Bản thật cần tài sản 3D hoàn thiện theo OI-10.
- Dữ liệu chỉ nằm trong trình duyệt và mất khi tải lại trang.

## Dựng lại prototype

```bash
cd prototype
npm install
npm run dev     # chạy thử
npm run build   # tạo dist/index.html
```

Phiên bản thư viện theo tài liệu 06 của SRS.
