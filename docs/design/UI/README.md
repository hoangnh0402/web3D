# Lab FourT: Thiết kế UI và prototype

Thiết kế giao diện cho bản đầu của Lab FourT, bám theo [bộ SRS](../../srs/README.md). Mã màn hình `SCR-nn` khớp với tài liệu 05 của SRS.

Phong cách theo mẫu khách chọn: thanh bên navy, nền lá nhiệt đới xanh trời sáng, thẻ kính xanh nhạt viền navy, nút bo tròn, đồng hồ vòng cung và thanh tiến độ.

## Nội dung thư mục

| Đường dẫn | Nội dung |
|---|---|
| `lab-fourt-prototype.html` | Prototype chạy được, gói trong một tệp, không cần cài đặt hay internet |
| `figma/desktop/` | 24 khung 1440 px dạng SVG để nhập vào Figma |
| `figma/mobile/` | 24 khung 390 px dạng SVG |
| `figma/states/` | 7 trạng thái của phòng tham vấn và hộp thoại |
| `screens/` | Ảnh JPG của toàn bộ các khung trên |
| `design-tokens.json` | Màu, bo góc, phông chữ |
| `prototype/` | Mã nguồn prototype (React, Three.js) và công cụ dựng tài sản |

## Mở prototype

Bấm đúp `lab-fourt-prototype.html`, tệp mở bằng Chrome, Edge, Firefox hoặc Safari. Tệp không gửi dữ liệu đi đâu. Tải lại trang sẽ đặt lại dữ liệu demo. Nên mở trên máy có card đồ họa để phòng 3D chạy mượt.

Nút **Demo** màu xanh dành cho người trình bày:

- Ngoài phòng tham vấn: đổi vai trò, mở bản đồ màn hình, đặt lại dữ liệu.
- Trong phòng tham vấn: giả lập mất kết nối, lỗi dịch vụ AI, từ chối micro, tín hiệu nguy cơ, thiết bị chạy chậm.

## Chuyển động

| Chỗ | Hiệu ứng |
|---|---|
| Chuyển trang | Nội dung trượt lên và mờ dần, thanh bên đứng yên. Ảnh thẻ ca phóng thành ảnh bìa ở trang chuẩn bị |
| Nội dung trang | Các thẻ xuất hiện lần lượt |
| Trang chủ | Đồng hồ vòng cung quét dần, số liệu đếm tăng, thanh tiến độ dài ra, vệt sáng lướt qua thẻ trọng tâm |
| Nền | Hai lớp lá đung đưa chậm và lệch nhẹ theo con trỏ, các vầng sáng màu trôi chậm phía trên |
| Điều hướng | Vệt sáng trượt theo mục đang chọn ở thanh bên và thanh dưới |
| Phòng tham vấn | Camera lướt vào phòng, bụi lấp lánh trong vệt nắng, nhân vật thở, chớp mắt và đổi tư thế theo cảm xúc |
| Hội thoại | Tin nhắn bật lên, thân chủ gõ chữ dần, vòng sóng quanh micro khi ghi âm |

Khi hệ điều hành bật chế độ giảm chuyển động, mọi hiệu ứng được tắt và chữ hiện ngay.

## Kịch bản trình bày cho khách, khoảng 7 phút

| Bước | Thao tác | Điểm cần nói |
|---|---|---|
| 1 | Đăng nhập, xem trang chủ sinh viên | Mỗi người có tài khoản và phân quyền riêng |
| 2 | Bắt đầu thực hành, xác nhận quy tắc, Bắt đầu phiên | Luôn nhắc đây là mô phỏng |
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
4. Nền lá, phòng 3D, ảnh nhân vật và các dải màu chuyển là ảnh nhúng.

Lưu ý khi nhập:

- Thiết kế dùng phông Be Vietnam Pro của Google Fonts, Figma có sẵn.
- Bóng đổ và hiệu ứng kính mờ không được xuất ra SVG, cần thêm lại trong Figma nếu muốn.
- Tương tác và chuyển động nằm ở prototype HTML, các khung trong Figma là tĩnh.
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

## Phòng và nhân vật 3D

- **Căn phòng:** nội thất Poly Haven (CC0), dựng sẵn bằng path tracing thành ảnh nền kèm đầu dò ánh sáng tại chỗ ngồi, nên nhân vật nhận đúng ánh sáng của phòng.
- **Nhân vật:** tả thực, hiện đại. Hà Linh lấy từ thư viện VALID (MIT), hai thân chủ còn lại lấy từ Microsoft Rocketbox (MIT). Thân và tóc nhân vật VALID được chia mịn lúc nạp (`prototype/src/room/smooth.ts`), khuôn mặt giữ lưới gốc.
- **Tư thế và biểu cảm:** dáng ngồi, tay đặt trên đùi, ánh nhìn và nhịp thở do IK tính lúc chạy (`prototype/src/room/rig.ts`). Khuôn mặt đổi biểu cảm và khẩu hình theo cảm xúc của thân chủ.

| Thân chủ | Ca | Nhân vật |
|---|---|---|
| Hà Linh | Áp lực học tập | VALID, nữ châu Á, áo thun và quần jean |
| Tuấn Kiệt | Khó khăn trong mối quan hệ | Rocketbox m10 |
| Mai Phương | Thích nghi với thay đổi | Rocketbox f08 |

## Giới hạn của prototype

- AI và nhận dạng giọng nói là giả lập theo kịch bản, không gọi dịch vụ thật. Micro không thật sự ghi âm.
- Dữ liệu là minh họa, nhân vật và lớp học đều hư cấu.
- Nội dung ca là bản nháp, chưa đối chiếu giáo trình (OI-02). Hướng dẫn an toàn là minh họa, chờ giảng viên xác nhận (OI-03).
- Nhân vật là bản prototype. Bản chính thức nên giao họa sĩ 3D hoàn thiện theo cùng phong cách (OI-10).
- Phòng 3D mới được thử trên trình duyệt dựng hình bằng phần mềm. Cần thử trên máy và điện thoại thật trước buổi demo.
- Dữ liệu chỉ nằm trong trình duyệt và mất khi tải lại trang.

## Dựng lại

```bash
cd prototype
npm install
npm run dev     # chạy thử
npm run build   # tạo dist/index.html, chép ra ../lab-fourt-prototype.html

# Tài sản, chỉ cần khi thay đổi
python tools/make-leaves.py src/assets                 # nền lá
python tools/fetch-characters.py src/assets/3d         # Hà Linh, thư viện VALID (MIT)
python tools/render-posters.py                         # ảnh 2D và thẻ ca, cần npm run dev
python tools/fetch-assets.py <raw>                     # tải nội thất Poly Haven
python tools/prepare-textures.py <raw> <tex>
node tools/build-assets.mjs <raw> <tex> <raw>          # gộp phòng
node tools/bake.mjs ...                                # dựng ảnh nền, xem đầu tệp
python tools/grade-plate.py ...                        # khử nhiễu, chỉnh màu ra room-plate.webp
```

Phiên bản thư viện theo tài liệu 06 của SRS.
