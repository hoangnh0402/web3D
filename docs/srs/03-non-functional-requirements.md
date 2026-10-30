# 03. Yêu cầu phi chức năng

Tài liệu gốc yêu cầu không đặt ngưỡng tùy ý khi chưa có dữ liệu nền. Vì vậy các con số dưới đây là **mục tiêu thiết kế** để định hướng phát triển, không phải tiêu chí nghiệm thu. Chúng được hiệu chỉnh sau khi đo trên máy chủ thật và thiết bị thật. Ngưỡng về mức độ hài lòng hoặc tỷ lệ hoàn thành của người dùng chỉ đặt sau đợt thử nghiệm.

## 1. Hiệu năng (PERF)

| Mã | Yêu cầu | Mục tiêu thiết kế |
|---|---|---|
| NFR-PERF-01 | API thông thường, không tính thời gian dịch vụ AI | P95 dưới 500 ms |
| NFR-PERF-02 | Tải màn hình ngoài phòng 3D trên mạng nội bộ | Dưới 2 giây |
| NFR-PERF-03 | Tải phòng 3D lần đầu trên mạng nội bộ | Dưới 10 giây, có tiến độ |
| NFR-PERF-04 | Tốc độ khung hình phòng 3D | 30 FPS trên điện thoại tầm trung tham chiếu, 60 FPS trên máy tính |
| NFR-PERF-05 | Dung lượng phòng và một nhân vật sau nén | Dưới 8 MB |
| NFR-PERF-06 | Độ phức tạp cảnh | Dưới 100.000 tam giác, dưới 60 lệnh vẽ, texture tối đa 1024 px |
| NFR-PERF-07 | Giao diện ngoài phòng 3D không tải thư viện 3D | Thư viện 3D nằm ở gói tách riêng |
| NFR-PERF-08 | Thời gian từ khi gửi lượt đến khi chữ đầu tiên hiện ra | Chờ thống nhất với đầu mối AI (OI-06) |

Thiết bị tham chiếu cho NFR-PERF-04 do QA và người phụ trách IT chọn từ thiết bị thực tế của sinh viên.

## 2. Tải và quy mô (SCALE)

| Mã | Yêu cầu | Mục tiêu thiết kế |
|---|---|---|
| NFR-SCALE-01 | Số tài khoản | 50 |
| NFR-SCALE-02 | Số phiên đồng thời mà phần web phải chịu được | 50, tức trường hợp xấu nhất là cả lớp cùng thực hành |
| NFR-SCALE-03 | Nâng quy mô không phải viết lại | Tách được API, worker và CSDL sang máy khác bằng cấu hình |

Giới hạn đồng thời thực tế của toàn hệ thống do dịch vụ AI và STT quyết định (OI-06).

## 3. Độ tin cậy (REL)

Tài liệu gốc yêu cầu "các ca tham vấn đảm bảo không bị đứt quãng, web ổn định". Các yêu cầu dưới đây cụ thể hóa điều đó.

| Mã | Yêu cầu |
|---|---|
| NFR-REL-01 | Mất mạng ngắn hoặc tải lại trang không làm mất lượt đã gửi (liên kết FR-SES-06). |
| NFR-REL-02 | Phản hồi AI đang tạo vẫn được máy chủ nhận và lưu kể cả khi trình duyệt đã mất kết nối. |
| NFR-REL-03 | Gửi lại một lượt do lỗi mạng không tạo lượt trùng. |
| NFR-REL-04 | Dịch vụ AI hoặc STT lỗi không làm sập phần web, không mất dữ liệu phiên và các chức năng khác vẫn dùng được. |
| NFR-REL-05 | Việc tạo báo cáo sống sót qua khởi động lại máy chủ. |
| NFR-REL-06 | Khi đổi chế độ 3D hoặc 2D, hoặc khi phòng 3D gặp lỗi đồ họa, hội thoại không bị ảnh hưởng. |
| NFR-REL-07 | Các dịch vụ tự khởi động lại khi lỗi hoặc khi máy chủ khởi động lại. |

## 4. Sao lưu và khôi phục (BAK)

| Mã | Yêu cầu | Mục tiêu thiết kế |
|---|---|---|
| NFR-BAK-01 | Sao lưu CSDL tự động hằng ngày | Mất tối đa 24 giờ dữ liệu |
| NFR-BAK-02 | Bản sao lưu nằm ngoài ổ đĩa chứa CSDL | Giữ ít nhất 14 bản gần nhất |
| NFR-BAK-03 | Khôi phục theo tài liệu hướng dẫn | Trong 4 giờ |
| NFR-BAK-04 | Thử khôi phục thật từ bản sao lưu trước khi nghiệm thu | Bắt buộc, có biên bản |

## 5. Bảo mật (SEC)

| Mã | Yêu cầu |
|---|---|
| NFR-SEC-01 | Toàn bộ truy cập đi qua HTTPS, kể cả trên mạng nội bộ. |
| NFR-SEC-02 | Mật khẩu được băm bằng Argon2id. |
| NFR-SEC-03 | Phiên đăng nhập dùng cookie `HttpOnly`, `Secure`, `SameSite`, có bảo vệ CSRF. |
| NFR-SEC-04 | Mọi dữ liệu đầu vào được kiểm tra ở máy chủ theo lược đồ. |
| NFR-SEC-05 | Có giới hạn tần suất cho đăng nhập, gửi lượt và nhận dạng giọng nói. |
| NFR-SEC-06 | Khóa bí mật chỉ nằm ở biến môi trường hoặc kho bí mật của máy chủ, không vào mã nguồn. |
| NFR-SEC-07 | Log không chứa khóa API, mật khẩu, cookie hay nội dung transcript. |
| NFR-SEC-08 | Kiểm tra quyền theo từng bản ghi, không chỉ theo vai trò, để sinh viên không mở được phiên của người khác bằng cách đổi mã trong URL. |
| NFR-SEC-09 | Nội dung từ AI và người dùng được hiển thị dưới dạng văn bản thuần, không diễn giải thành HTML. |
| NFR-SEC-10 | Các sự kiện đăng nhập, đổi quyền, đổi trạng thái dữ liệu, xuất báo cáo và đổi cấu hình được ghi nhật ký không sửa được từ giao diện. |
| NFR-SEC-11 | Cơ sở dữ liệu không mở cổng ra ngoài máy chủ. |

## 6. Quyền riêng tư (PRIV)

| Mã | Yêu cầu |
|---|---|
| NFR-PRIV-01 | Chỉ thu thập dữ liệu cần cho học tập. Tài khoản chỉ cần họ tên, tên đăng nhập, lớp. |
| NFR-PRIV-02 | Không dùng dữ liệu cá nhân của thân chủ thật để tạo ca. |
| NFR-PRIV-03 | Âm thanh chỉ đi qua hệ thống để nhận dạng, không ghi xuống đĩa ở phần web. |
| NFR-PRIV-04 | Sinh viên được thông báo rõ dữ liệu nào được lưu và ai xem được trước khi thực hành lần đầu. |
| NFR-PRIV-05 | Nếu dịch vụ AI hoặc STT đặt ngoài máy chủ local, phải công bố việc transcript rời khỏi hệ thống (OI-05). |

## 7. Tương thích (COMP)

| Mã | Yêu cầu |
|---|---|
| NFR-COMP-01 | Hỗ trợ hai phiên bản chính gần nhất của Chrome, Edge, Safari và Firefox trên máy tính. |
| NFR-COMP-02 | Hỗ trợ Safari trên iPad và iPhone, Chrome trên Android, ở hai phiên bản hệ điều hành chính gần nhất. |
| NFR-COMP-03 | Giao diện dùng được từ chiều rộng 360 px, ở cả màn hình dọc và ngang. |
| NFR-COMP-04 | Tính năng giọng nói được kiểm thử trên thiết bị thật, đặc biệt là iPhone và iPad. |
| NFR-COMP-05 | Hệ thống chạy đầy đủ khi không có internet, không tải phông chữ, bộ giải nén 3D hay thư viện từ CDN bên ngoài. Phần phụ thuộc dịch vụ AI do OI-05 quyết định. |

## 8. Khả năng dùng và tiếp cận (UX)

| Mã | Yêu cầu |
|---|---|
| NFR-UX-01 | Giao diện rõ ràng, ấm áp, chuyên nghiệp, không tạo cảm giác trò chơi giải trí. |
| NFR-UX-02 | Các nút Bắt đầu phiên, Kết thúc phiên và Xem báo cáo dễ nhận biết. |
| NFR-UX-03 | Giao diện dùng tiếng Việt, chuỗi văn bản được tập trung một nơi. |
| NFR-UX-04 | Đạt WCAG 2.2 mức AA ở độ tương phản và hỗ trợ bàn phím trên các màn hình 2D. |
| NFR-UX-05 | Toàn bộ nội dung hội thoại nằm trong HTML thông thường, không vẽ trong cảnh 3D, để đọc được bằng trình đọc màn hình. |
| NFR-UX-06 | Mọi thao tác có trạng thái tải, trạng thái lỗi và phản hồi rõ ràng. |

## 9. Bảo trì và vận hành (MNT)

| Mã | Yêu cầu |
|---|---|
| NFR-MNT-01 | Có README, tệp biến môi trường mẫu, hướng dẫn cài đặt, cập nhật, sao lưu và khôi phục. |
| NFR-MNT-02 | Có tài liệu API sinh tự động. |
| NFR-MNT-03 | Có hai môi trường thử nghiệm và chính thức, tách biệt dữ liệu. |
| NFR-MNT-04 | Toàn bộ hệ thống khởi động bằng một lệnh. |
| NFR-MNT-05 | Có log có cấu trúc và cảnh báo khi dịch vụ ngừng hoạt động. |
| NFR-MNT-06 | Thay đổi cấu trúc CSDL đi qua migration có phiên bản. |
| NFR-MNT-07 | Kiểm thử tự động bao phủ luồng chính, phân quyền, lưu dữ liệu và lỗi dịch vụ AI. |
| NFR-MNT-08 | Phát triển được phần web khi dịch vụ AI và STT chưa sẵn sàng, bằng dịch vụ giả lập. |
