# Q&A chốt yêu cầu Lab FourT

Cập nhật: 30/10/2026

Ghi lại các câu hỏi phát sinh sau khi đọc tài liệu `docs/Bản thảo Lab FourT 1 (1).docx` và câu trả lời của phía dự án. Các quyết định chính thức được đưa vào `docs/srs/09-decisions-and-open-issues.md`.

## 1. Đã trả lời

| # | Câu hỏi | Trả lời | Ghi vào SRS |
|---|---|---|---|
| 1 | Bản đầu có dùng kính VR không? Tài liệu gốc mục 1.1 ghi có, mục 16 xếp vào giai đoạn sau. | Giai đoạn đầu chưa có kính VR. | D-02 |
| 2 | Giai đoạn đầu không yêu cầu tài khoản, vậy giao bài, dashboard giảng viên và quy tắc "sinh viên chỉ xem phiên của mình" nhận diện người dùng thế nào? | Yêu cầu có tài khoản, phân quyền đầy đủ. | D-03 |
| 3 | Dữ liệu có bị xóa hẳn sau 14 ngày không? | Không bị xóa hẳn. Dạng xóa mềm, có thể đặt status để quản lý. | D-04 |
| 4 | Comment "ghi lại cuộc trò chuyện" và "ưu tiên giọng nói" nghĩa là gì? Chỉ lưu transcript hay lưu cả ghi âm? | Người dùng có 2 hình thức tương tác là nói và nhập text. AI phản hồi bằng cách hiển thị text ra màn hình. Việc lưu ghi âm chưa được trả lời trực tiếp (xem mục 2, câu 7). | D-05 |
| 5 | Câu 8 của tài liệu gốc còn thiếu người phụ trách IT, thời hạn, máy chủ và ngân sách. | Đã có người phụ trách IT, đã chốt ngân sách và chạy local. Thời hạn chưa được nhắc tới (xem mục 2, câu 1). | D-06, D-11 |
| 6 | Hai giáo trình dùng để nghiệm thu nội dung ca chưa có trong `knowledge_base`. | Có thể pending. | OI-02 |
| 7 | Quy trình xử lý tình huống nguy cơ cao chưa được mô tả. | Có thể pending để xác nhận. | OI-03 |
| 8 | Phần nào do nhóm web làm? | Nhóm web làm web 3D. Phần AI và xử lý giọng nói do người khác làm. | D-07 |

## 2. Chưa trả lời, tạm bỏ qua

Các câu hỏi dưới đây được đặt ra khi bàn giao SRS. Phía dự án yêu cầu tạm bỏ qua để ưu tiên thiết kế UI. Thiết kế đang dùng cột **Tạm dùng**.

| # | Câu hỏi | Tạm dùng | Mã SRS |
|---|---|---|---|
| 1 | Thời hạn bàn giao bản đầu là khi nào? | Chưa lập lịch theo ngày | OI-01 |
| 2 | Tên người phụ trách IT và số tiền ngân sách đã chốt là gì? | Không ghi trong SRS | D-11 |
| 3 | Có cần xóa vĩnh viễn theo yêu cầu không? Với xóa mềm, dữ liệu sẽ tồn tại vô thời hạn. | Không có xóa vĩnh viễn trên giao diện | OI-07 |
| 4 | "Chạy local" là chỉ dùng trong mạng nội bộ, hay sinh viên cần truy cập từ nhà? | Chỉ mạng nội bộ | OI-04 |
| 5 | Dịch vụ AI và giọng nói chạy local hay đám mây? | Coi như dịch vụ HTTP ngoài | OI-05 |
| 6 | Sinh viên có được xem và sửa văn bản nhận dạng trước khi gửi không? | Có, sinh viên bấm Gửi để xác nhận | OI-08 |
| 7 | Có lưu bản ghi âm không? | Chỉ lưu văn bản, không lưu âm thanh | OI-09 |
| 8 | Giảng viên có được đọc transcript luyện tự do không? | Không, chỉ xem số liệu tổng hợp | OI-11 |
| 9 | Sinh viên có được xóa phiên đã nộp không? | Được, bài nộp chuyển sang rút bài | OI-12 |

## 3. Cách hiểu đã áp dụng

- "AI phản hồi bằng cách hiển thị tech" được hiểu là hiển thị văn bản, nên AI không phát tiếng và nhân vật 3D không cần khớp môi.
- "Chạy local" được hiểu là máy chủ đặt trong mạng nội bộ.
