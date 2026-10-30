# 09. Quyết định, vấn đề mở và rủi ro

## 1. Quyết định đã chốt

| Mã | Quyết định | Nguồn |
|---|---|---|
| D-01 | Phòng 3D bắt buộc trong bản đầu, là trọng tâm dự án. Chế độ 2D chỉ là phương án dự phòng cho thiết bị yếu. | §17 câu 4 |
| D-02 | Giai đoạn đầu chưa dùng kính VR. | Chốt 30/10/2026 |
| D-03 | Bắt buộc có tài khoản và phân quyền đầy đủ, áp dụng cho mọi ca. | Chốt 30/10/2026 |
| D-04 | Dữ liệu không bị xóa hẳn sau 14 ngày. Hệ thống dùng xóa mềm và quản lý bằng trạng thái. Trong 14 ngày người dùng xem và xóa được. | Chốt 30/10/2026, §17 câu 7 |
| D-05 | Người dùng tương tác bằng hai hình thức: nói và nhập văn bản. AI phản hồi bằng văn bản hiển thị trên màn hình, không phát tiếng. | Chốt 30/10/2026 |
| D-06 | Hệ thống chạy local. | Chốt 30/10/2026 |
| D-07 | Phần AI và xử lý giọng nói do một đầu mối khác phụ trách. Nhóm web kết nối qua hợp đồng giao tiếp. | Chốt 30/10/2026 |
| D-08 | Điểm AI để sinh viên tự đánh giá và giúp giảng viên nắm năng lực, không dùng làm điểm học phần. | §17 câu 6 |
| D-09 | Bản đầu phục vụ tổng cộng 50 giảng viên và sinh viên. Nhóm sinh viên khởi nghiệp sở hữu và quản lý dự án. | §17 câu 1, 2 |
| D-10 | Sinh viên linh hoạt: tự chọn ca hoặc làm ca được giao. Ca Áp lực học tập được làm kịch bản trước. | §17 câu 5, comment |
| D-11 | Đã có người phụ trách IT và đã chốt ngân sách. Tên người và số tiền do đại diện dự án giữ, không ghi trong SRS. | Chốt 30/10/2026 |

## 2. Nội dung tài liệu gốc đã bị thay thế

| Đoạn trong tài liệu gốc | Nội dung cũ | Thay bằng |
|---|---|---|
| §1.1 | "Tích hợp kính thực tế ảo VR" | Chưa có trong bản đầu (D-02) |
| §2.3, §10 đoạn cuối, §18 | Ưu tiên bản lõi hoặc bản 2D, 3D làm sau | 3D nằm trong bản đầu và được làm từ M1 (D-01) |
| §4 bước 5, §16 giai đoạn 3 | Chỉ văn bản, giọng nói bổ sung sau | Nói và văn bản ngay từ đầu (D-05). AI phát tiếng vẫn để giai đoạn sau |
| §7 đoạn cuối | Giảng viên quyết định điểm chính thức cho học phần | Không áp dụng cho bản đầu (D-08) |
| §17 câu 3 | Giai đoạn đầu không yêu cầu tài khoản | Bắt buộc tài khoản (D-03) |
| §17 câu 7 | Sao lưu trong 14 ngày | Làm rõ thành xóa mềm theo trạng thái (D-04) |
| §17 câu 8 | Mục "Kỹ thuật – IT" bỏ trống, chưa có máy chủ | Đã có người phụ trách, chạy local (D-06, D-11) |
| §18, chân trang | Tên "Virtual Counseling Lab" | Tên thống nhất là Lab FourT |

## 3. Vấn đề mở

Cột **Mặc định** là cách SRS đang xử lý cho đến khi có câu trả lời, để việc phát triển không bị dừng. Cột **Hạn** là mốc cần có câu trả lời.

| Mã | Vấn đề | Mặc định | Người quyết định | Hạn |
|---|---|---|---|---|
| OI-01 | Thời hạn bàn giao bản đầu chưa có. | Chưa lập lịch theo ngày | Đại diện dự án | Trước M0 |
| OI-02 | Chưa có hai giáo trình để đối chiếu nội dung ca: *Tham vấn trong Công tác xã hội* (PGS.TS Nguyễn Hồi Loan), *Tham vấn tâm lí* (GS.TS Trần Thị Minh Đức). **Đang pending.** | Viết ca mẫu dạng nháp, chưa nghiệm thu | Giảng viên | Trước AT-21 |
| OI-03 | Chưa có quy trình xử lý nội dung nguy cơ cao: ai được báo, trong bao lâu, nội dung hướng dẫn an toàn, xử lý thế nào khi chính sinh viên có dấu hiệu khủng hoảng. **Đang pending để xác nhận.** | Hiển thị hướng dẫn cấu hình được và ghi sự kiện, chưa thông báo ai | Giảng viên, đại diện dự án | Trước M5 |
| OI-04 | "Chạy local" nghĩa là chỉ dùng trong mạng nội bộ, hay sinh viên cần truy cập từ nhà? Máy chủ có internet không? | Chỉ mạng nội bộ, máy chủ có internet | Người phụ trách IT | Trước M1 |
| OI-05 | Dịch vụ AI và STT chạy local hay gọi đám mây? Nếu đám mây, transcript rời khỏi hệ thống. | Coi như dịch vụ HTTP ngoài, truy cập được từ backend | Đầu mối AI/giọng nói | Trước M1 |
| OI-06 | Hợp đồng tại tài liệu 07, độ trễ, số phiên đồng thời. | Theo đề xuất tại tài liệu 07 | Đầu mối AI/giọng nói | M0 |
| OI-07 | Có cần xóa vĩnh viễn khi người dùng yêu cầu không? Hiện dữ liệu tồn tại vô thời hạn, trong khi §9.2 yêu cầu có thời hạn lưu và quy trình xóa, và cần đối chiếu quy định bảo vệ dữ liệu cá nhân hiện hành. | Không có xóa vĩnh viễn trên giao diện | Đại diện dự án | Trước M5 |
| OI-08 | Sinh viên có được xem và sửa văn bản nhận dạng trước khi gửi không? Sửa được thì giảm lỗi và đánh giá công bằng hơn, nhưng làm chậm nhịp hội thoại. | Có, sinh viên bấm Gửi để xác nhận | Giảng viên | M0 |
| OI-09 | Có lưu bản ghi âm không? Tài liệu gốc có ghi "ghi lại cuộc trò chuyện" và một comment gửi bên kỹ thuật. | Chỉ lưu văn bản, không lưu âm thanh | Đại diện dự án | M0 |
| OI-10 | Ai làm phòng và nhân vật 3D? Mỗi ca cần nhân vật riêng không? Điều khoản giấy phép của nguồn tài sản đã được kiểm tra chưa? | 1 phòng, nhân vật dùng chung, tự dựng | Đại diện dự án, Frontend/3D | Trước M1 |
| OI-11 | Giảng viên có được đọc transcript luyện tự do không? | Không, chỉ xem số liệu tổng hợp | Giảng viên | M0 |
| OI-12 | Sinh viên có được xóa phiên đã nộp không? | Được, bài nộp chuyển sang rút bài, Quản trị viên khôi phục được | Giảng viên | M3 |
| OI-13 | Cấu hình cụ thể của máy chủ local. | Theo ước tính tại tài liệu 06 mục 7.2 | Người phụ trách IT | Trước M1 |
| OI-14 | Xác nhận đề xuất công nghệ tại tài liệu 06. | Phát triển theo đề xuất | Người phụ trách IT | M0 |

## 4. Rủi ro

| Mã | Rủi ro | Tác động | Biện pháp |
|---|---|---|---|
| R-01 | Nhận dạng tiếng Việt sai, nhất là với giọng địa phương | Transcript sai, đánh giá sai | Cho sửa trước khi gửi, đánh dấu độ tin cậy thấp, không trừ điểm vì lỗi nhận dạng |
| R-02 | Máy chủ local là điểm lỗi duy nhất: hỏng ổ đĩa, mất điện, mất mạng | Dừng toàn hệ thống, trái yêu cầu không đứt quãng | Sao lưu ra ổ khác, thử khôi phục, UPS, tài liệu khôi phục |
| R-03 | HTTPS nội bộ cấu hình sai | Micro không chạy trên iPad và điện thoại | Xử lý ngay ở M1, kiểm thử trên thiết bị thật |
| R-04 | Phòng 3D chạy chậm trên điện thoại | Sinh viên khó thực hành | Ngân sách hiệu năng, ánh sáng nướng sẵn, chế độ nhẹ, đo từ M1 |
| R-05 | Dịch vụ AI chậm khi nhiều người dùng cùng lúc | Hội thoại ngắt quãng | Thống nhất giới hạn đồng thời, hàng đợi, hiển thị trạng thái chờ |
| R-06 | Dịch vụ AI, STT chậm tiến độ so với web | Không nghiệm thu được luồng đầy đủ | Hợp đồng sớm, adapter giả lập, mốc tích hợp cụ thể |
| R-07 | AI thiếu nhất quán hoặc ra khỏi vai | Mất tính thực tế | Hồ sơ có cấu trúc, bộ kiểm thử AI, rà soát chuyên môn |
| R-08 | Đánh giá AI thiếu công bằng | Người học hiểu sai năng lực | Rubric rõ, kiểm tra dẫn chứng, giảng viên điều chỉnh được |
| R-09 | Lộ dữ liệu, nhất là khi dữ liệu không bị xóa hẳn | Ảnh hưởng riêng tư và uy tín | Phân quyền, tối thiểu hóa dữ liệu, không lưu âm thanh, xử lý OI-07 |
| R-10 | Chi phí AI tăng, nếu dùng dịch vụ tính phí | Khó duy trì | Theo dõi mức dùng, hạn mức, giới hạn độ dài phiên |
| R-11 | Nhầm mô phỏng với tham vấn thật | Rủi ro đạo đức và an toàn | Cảnh báo ở nhiều màn hình, hoàn thành OI-03 trước khi có sinh viên thật |
| R-12 | Chất lượng nhân vật 3D thấp làm hỏng cảm giác chuyên nghiệp | Giảm giá trị nhập vai | Thử nghiệm mẫu nhân vật sớm với giảng viên, ưu tiên tối giản |
| R-13 | Quản trị viên không có nền tảng kỹ thuật | Lỗi vận hành | Trang quản trị đơn giản, tài liệu từng bước, người phụ trách IT hỗ trợ |
