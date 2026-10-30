# 08. Nghiệm thu và truy vết

## 1. Mốc bàn giao

Tài liệu gốc xếp 3D ở giai đoạn sau bản lõi. Vì 3D nay là bắt buộc (D-01), phần rủi ro nhất được làm trước. Mốc 1 chứng minh phòng 3D, micro và HTTPS chạy được trên máy chủ local và thiết bị thật trước khi xây các màn hình còn lại. Thời lượng từng mốc lập sau khi có thời hạn (OI-01).

| Mốc | Nội dung | Điều kiện hoàn thành | Tương ứng giai đoạn gốc |
|---|---|---|---|
| M0 | Chốt yêu cầu, thiết kế | Rà soát xong SRS, có wireframe, chốt hợp đồng AI bản đầu | 1, 2 |
| M1 | Bộ khung kỹ thuật | Phòng 3D bản thô, hội thoại với AI giả lập, micro qua HTTPS, chạy trên máy chủ local và điện thoại thật | 3, 4 |
| M2 | Luồng sinh viên | Tài khoản, phân quyền, ca, phiên, transcript, báo cáo, phản tư, chế độ nhẹ | 3 |
| M3 | Luồng giảng viên và quản trị | Soạn ca, giao bài, nộp bài, xem xét, thống kê, trang quản trị, xóa mềm | 4 |
| M4 | Tích hợp và kiểm thử | Nối AI và STT thật, phòng 3D hoàn chỉnh, kiểm thử chức năng, bảo mật, thiết bị, tải, khôi phục | 5 |
| M5 | Thử nghiệm người dùng | Nhóm nhỏ sinh viên và giảng viên dùng thử, có báo cáo cải tiến | 6 |
| M6 | Bàn giao | Sửa lỗi, hoàn thiện tài liệu, triển khai chính thức | 7 |

Điều kiện chặn:

- OI-03 (quy trình nguy cơ cao) phải đóng trước M5, vì đó là lúc có sinh viên thật.
- OI-02 (giáo trình) phải đóng trước khi nghiệm thu nội dung ca tại AT-21.
- OI-04, OI-05 phải đóng trước M1, vì chúng ảnh hưởng HTTPS và kiến trúc mạng.

## 2. Kịch bản nghiệm thu

Tiêu chí bắt buộc theo mục 17 câu 9 của tài liệu gốc là: nội dung ca đúng giáo trình, ca tham vấn không đứt quãng, web ổn định, giao diện dễ nhìn và dễ thao tác. Các kịch bản dưới đây cụ thể hóa những tiêu chí đó và các tiêu chí ở mục 12.

| Mã | Kịch bản | Kết quả mong đợi | Yêu cầu |
|---|---|---|---|
| AT-01 | Sinh viên đi hết luồng bằng văn bản: đăng nhập, tự chọn ca, thực hành trong phòng 3D, kết thúc, xem transcript và báo cáo, phản tư | Hoàn tất, dữ liệu được lưu đúng. Nhân vật đổi trạng thái theo lượt, luôn có nhãn mô phỏng, không gửi được lượt mới khi AI đang trả lời | FR-AUTH-01, FR-CASE-01, FR-CASE-03, FR-ASG-03, FR-SES-01, FR-SES-03, FR-SES-04, FR-SES-10, FR-3D-01, FR-3D-02, FR-3D-03, FR-3D-07, FR-CONV-01, FR-CONV-06, FR-CONV-07, FR-CONV-11, FR-SAFE-03, FR-RPT-01, FR-RPT-03, FR-RPT-04, FR-RPT-07, FR-RPT-08, FR-REF-01 |
| AT-02 | Lặp lại AT-01 bằng giọng nói trên máy tính, iPad, iPhone, Android, xen kẽ với nhập văn bản | Micro hoạt động, văn bản nhận dạng hiện ra, AI phản hồi bằng chữ, không có âm thanh lưu trên máy chủ, lượt ghi đúng hình thức nhập | FR-CONV-02, FR-CONV-03, FR-CONV-04, FR-CONV-09, FR-CONV-10, FR-3D-05, NFR-COMP-04 |
| AT-03 | Từ chối quyền micro, sau đó thực hành | Có hướng dẫn, phiên tiếp tục bằng văn bản | FR-CONV-05 |
| AT-04 | Ngắt mạng và tải lại trang giữa phiên, cả khi AI đang trả lời | Quay lại đúng phiên, không mất và không trùng lượt | FR-SES-05, FR-SES-06, NFR-REL-01, NFR-REL-02, NFR-REL-03 |
| AT-05 | Dịch vụ AI lỗi hoặc quá thời gian, cả khi đang hội thoại và khi tạo báo cáo | Có thông báo, thử lại được, không mất dữ liệu. Báo cáo lỗi được Quản trị viên chạy lại | FR-CONV-08, FR-RPT-02, NFR-REL-04 |
| AT-06 | Dịch vụ STT lỗi | Có thông báo, chuyển được sang nhập văn bản | FR-CONV-08 |
| AT-07 | Tắt WebGL hoặc giả lập FPS thấp | Hệ thống đề xuất 2D, chuyển không gián đoạn phiên | FR-3D-08, FR-3D-09, NFR-REL-06 |
| AT-08 | Dùng điện thoại dọc, mở bàn phím ảo | Ô nhập và tin nhắn cuối vẫn thấy, 3D không che hội thoại | FR-3D-06, NFR-COMP-03 |
| AT-09 | Sinh viên A đổi mã trong URL để mở phiên sinh viên B | Bị từ chối, được ghi nhận | FR-AUTH-07, NFR-SEC-08 |
| AT-10 | Giảng viên mở bài của lớp mình không phụ trách, hoặc transcript luyện tự do | Bị từ chối | FR-AUTH-07, mục 14 tài liệu 02 |
| AT-11 | Xem báo cáo, bấm dẫn chứng; giả lập AI trả dẫn chứng không có thật | Tới đúng lượt; dẫn chứng giả bị loại và kỹ năng bị đánh dấu | FR-RPT-05, FR-RPT-06 |
| AT-12 | Giảng viên nhận xét và đổi mức | Đánh giá AI còn nguyên, hai bên hiển thị tách biệt | FR-LEC-03, FR-LEC-04 |
| AT-13 | Sinh viên xóa phiên, Quản trị viên khôi phục | Phiên ẩn với sinh viên, còn trong CSDL kèm transcript và báo cáo, khôi phục được, có nhật ký | FR-DATA-01, FR-DATA-02, FR-DATA-04, FR-DATA-06 |
| AT-14 | Giả lập thời gian qua 14 ngày | Phiên chuyển Đã lưu trữ, dữ liệu còn nguyên | FR-DATA-03 |
| AT-15 | Giao bài, sinh viên thấy bài và nộp, giảng viên mở bài đã nộp, sinh viên rút bài | Tiến độ cập nhật đúng, cần phản tư trước khi nộp | FR-ASG-01, FR-ASG-02, FR-ASG-04, FR-REF-02, FR-LEC-01, FR-LEC-02 |
| AT-16 | Dịch vụ AI trả tín hiệu nguy cơ | Hướng dẫn an toàn hiện ra, sự kiện được ghi | FR-SAFE-01, FR-SAFE-02 |
| AT-17 | Kiểm tra gói frontend và lưu lượng mạng | Không có khóa bí mật, trình duyệt không gọi trực tiếp AI | FR-ADM-02, NFR-SEC-06 |
| AT-18 | Khôi phục thật từ bản sao lưu | Hệ thống chạy lại đúng dữ liệu, có biên bản | NFR-BAK-03, NFR-BAK-04 |
| AT-19 | Thử tải 50 phiên đồng thời với AI giả lập | Không lỗi, đạt mục tiêu thiết kế hoặc có số đo để hiệu chỉnh | NFR-SCALE-02, NFR-PERF-01 |
| AT-20 | Ngắt internet của máy chủ và thiết bị, dùng AI giả lập | Toàn bộ giao diện và phòng 3D vẫn tải được | NFR-COMP-05 |
| AT-21 | Giảng viên đối chiếu 3 ca mẫu với hai giáo trình | Có biên bản xác nhận. Chờ OI-02 | FR-CASE-09, FR-CASE-10 |
| AT-22 | Chạy bộ tình huống kiểm thử AI | AI giữ vai, nhất quán, không tự chẩn đoán. Do đầu mối AI thực hiện | Tài liệu 07 |
| AT-23 | Người dùng mới hoàn thành luồng chính với hướng dẫn ngắn | Quan sát trong đợt thử nghiệm, chưa đặt ngưỡng số | NFR-UX-02, FR-SES-02 |
| AT-24 | Thu thập phản hồi về tính hữu ích của báo cáo | Có báo cáo thử nghiệm, chưa đặt ngưỡng số | FR-RPT-03 |
| AT-25 | Quản trị viên tạo tài khoản, người dùng đổi mật khẩu lần đầu, nhập sai nhiều lần, Quản trị viên đặt lại mật khẩu rồi khóa tài khoản | Không tự đăng ký được, bắt buộc đổi mật khẩu, bị khóa tạm khi sai nhiều lần, khóa tài khoản làm mất đăng nhập ngay | FR-AUTH-02, FR-AUTH-03, FR-AUTH-04, FR-AUTH-05, FR-AUTH-06, FR-USR-01 |
| AT-26 | Tạo lớp, gán giảng viên, thêm và bớt sinh viên | Giảng viên chỉ thấy và chỉ quản lý lớp mình phụ trách | FR-USR-03, FR-USR-04 |
| AT-27 | Giảng viên tạo ca, xuất bản, sửa rồi xuất bản lại, sao chép, lưu trữ | Sinh viên không thấy ca nháp, phiên cũ vẫn gắn phiên bản cũ | FR-CASE-04, FR-CASE-05, FR-CASE-06, FR-CASE-07, FR-CASE-08 |
| AT-28 | Để phiên chạy đến hết giờ, và để một phiên khác không hoạt động | Có cảnh báo, hết giờ tự kết thúc và lưu; phiên không hoạt động chuyển Bỏ dở, transcript còn nguyên | FR-SES-07, FR-SES-08 |
| AT-29 | Giảng viên xem thống kê kỹ năng của lớp có phiên đã nộp và phiên luyện tự do | Số liệu đúng, không mở được nội dung phiên luyện tự do | FR-LEC-05 |
| AT-30 | Quản trị viên xem trạng thái dịch vụ, mức dùng AI, nhật ký, rồi đổi giới hạn tần suất | Số liệu đúng, dịch vụ ngừng được hiển thị, giới hạn mới có hiệu lực | FR-ADM-03, FR-ADM-04, FR-ADM-05, FR-ADM-06 |

## 3. Sản phẩm bàn giao

| Sản phẩm | Mốc |
|---|---|
| Bộ SRS đã thống nhất, sơ đồ luồng, bản thiết kế giao diện | M0 |
| Hợp đồng giao tiếp AI và STT đã xác nhận | M0 |
| Website thử nghiệm có URL thống nhất | M1 |
| Thư viện ca khởi đầu và hướng dẫn cho giảng viên | M3 |
| Hội thoại, transcript, rubric, báo cáo, phản tư | M4 |
| Dashboard giảng viên và phân quyền | M3 |
| Mã nguồn, hướng dẫn cài đặt, cấu hình mẫu, tài liệu API | M6 |
| Bộ kiểm thử, báo cáo lỗi, hướng dẫn triển khai, sao lưu, khôi phục | M4, M6 |
| Tài liệu hướng dẫn sinh viên, giảng viên, quản trị viên | M6 |

## 4. Truy vết về tài liệu gốc

| Mục tài liệu gốc | Xử lý trong SRS |
|---|---|
| §1 Tổng quan | Tài liệu 01 |
| §2.2 Mục tiêu cụ thể | FR-3D, FR-CONV, FR-RPT, FR-LEC, NFR-SEC |
| §2.3 Nguyên tắc thiết kế | FR-RPT-05, tài liệu 07 mục 1. Phần về 3D đã thay thế bởi D-01 |
| §3 Đối tượng sử dụng | Tài liệu 01 mục 4, bổ sung Quản trị viên |
| §4 Trải nghiệm người dùng | Tài liệu 05 mục 3. Bước 5 đã thay thế bởi D-05 |
| §5.1 Chức năng sinh viên | FR-CASE, FR-SES, FR-3D, FR-CONV, FR-RPT, FR-REF |
| §5.2 Chức năng giảng viên | FR-CASE, FR-ASG, FR-LEC |
| §5.3 Chức năng IT, quản trị | FR-ADM, FR-USR, NFR-BAK, NFR-SEC, NFR-MNT |
| §6.1 Thành phần ca | FR-CASE-05, tài liệu 04 mục 5 |
| §6.2 Nguyên tắc phản hồi AI | Tài liệu 07 mục 1, FR-SAFE |
| §6.3 Ba ca mẫu | FR-CASE-09 |
| §7 Đánh giá và báo cáo | FR-RPT, tài liệu 04 mục 2.1, tài liệu 07 mục 4 |
| §8 Giao diện | Tài liệu 05, NFR-UX |
| §9 Yêu cầu kỹ thuật | Tài liệu 03, tài liệu 06 |
| §9.1 Dữ liệu chính | Tài liệu 04 |
| §9.2 Quy tắc dữ liệu, bảo mật | NFR-SEC, NFR-PRIV, NFR-BAK, FR-RPT-06. Thời hạn lưu xem OI-07 |
| §10 Kế hoạch triển khai | Mục 1 tài liệu này, thứ tự đã điều chỉnh theo D-01 |
| §11 Phân công | Giữ nguyên theo tài liệu gốc, bổ sung đầu mối AI/giọng nói (D-07) |
| §12 Tiêu chí thành công | Mục 2 tài liệu này |
| §13 Rủi ro | Tài liệu 09 mục 4 |
| §14 Ngân sách | Đã chốt, không ghi số liệu trong SRS (D-11) |
| §15 Sản phẩm bàn giao | Mục 3 tài liệu này |
| §16 Định hướng phát triển | Tài liệu 01 mục 3.2. Giọng nói đầu vào đã chuyển vào bản đầu |
| §17 Câu hỏi chốt | Tài liệu 09 mục 1 |
| Comment trong tệp Word | D-05, D-10, FR-ADM-01, FR-SES-05 |
