# 02. Yêu cầu chức năng

Cột **Nguồn** chỉ về mục của tài liệu gốc (`§`) hoặc quyết định đã chốt (`D-nn`). Ý nghĩa mức ưu tiên xem tại [README](README.md#quy-ước-mã).

## 1. Xác thực (AUTH)

| Mã | Yêu cầu | Ưu tiên | Nguồn |
|---|---|---|---|
| FR-AUTH-01 | Người dùng phải đăng nhập bằng tên đăng nhập và mật khẩu trước khi dùng mọi chức năng, kể cả các ca cơ bản. | M | D-03 |
| FR-AUTH-02 | Hệ thống không có đăng ký công khai. Tài khoản do Quản trị viên tạo. | M | D-03 |
| FR-AUTH-03 | Người dùng phải đổi mật khẩu ở lần đăng nhập đầu và có thể tự đổi mật khẩu sau đó. | M | §9 |
| FR-AUTH-04 | Quản trị viên đặt lại được mật khẩu người dùng. Chức năng này không phụ thuộc email vì hệ thống chạy local. | M | D-06 |
| FR-AUTH-05 | Phiên đăng nhập có thời hạn, đăng xuất được, và bị thu hồi ngay khi tài khoản bị khóa. | M | §9 |
| FR-AUTH-06 | Tài khoản bị khóa tạm thời sau nhiều lần nhập sai mật khẩu liên tiếp. | M | §9 |
| FR-AUTH-07 | Mọi API phải kiểm tra quyền ở máy chủ theo ma trận tại mục 14. | M | D-03, §9.2 |

## 2. Người dùng và lớp (USR)

| Mã | Yêu cầu | Ưu tiên | Nguồn |
|---|---|---|---|
| FR-USR-01 | Quản trị viên tạo, sửa, khóa và vô hiệu hóa tài khoản, gán vai trò Sinh viên, Giảng viên hoặc Quản trị viên. | M | §5.3 |
| FR-USR-02 | Quản trị viên nhập hàng loạt tài khoản từ tệp CSV, có báo lỗi theo từng dòng. | S | §5.3 |
| FR-USR-03 | Quản trị viên tạo lớp/nhóm và gán giảng viên phụ trách. | M | §5.2 |
| FR-USR-04 | Quản trị viên và giảng viên phụ trách thêm, bớt sinh viên trong lớp. | M | §5.2 |

## 3. Ca mô phỏng (CASE)

| Mã | Yêu cầu | Ưu tiên | Nguồn |
|---|---|---|---|
| FR-CASE-01 | Thư viện ca hiển thị thẻ ca gồm tên, mô tả, kỹ năng trọng tâm, độ khó và trạng thái thực hành của sinh viên. | M | §8 |
| FR-CASE-02 | Sinh viên lọc được ca theo kỹ năng, độ khó và trạng thái. | S | §8 |
| FR-CASE-03 | Trang chuẩn bị hiển thị bối cảnh, mục tiêu học tập, vai trò, thời lượng dự kiến và quy tắc mô phỏng. | M | §4, §5.1 |
| FR-CASE-04 | Giảng viên tạo, chỉnh sửa, sao chép và lưu trữ ca. | M | §5.2 |
| FR-CASE-05 | Hồ sơ ca có đủ 8 thành phần: bối cảnh, vấn đề chính, mục tiêu học tập, tính cách/giao tiếp, thông tin chưa chia sẻ, diễn biến cảm xúc, ranh giới và an toàn, tiêu chí đánh giá. | M | §6.1 |
| FR-CASE-06 | Mỗi ca có các cấu hình: độ khó, kỹ năng trọng tâm, thời lượng tối đa, nhân vật 3D, rubric. | M | §5.2 |
| FR-CASE-07 | Ca có các trạng thái Nháp, Đã xuất bản, Đã lưu trữ. Sinh viên chỉ thấy ca đã xuất bản. | M | §5.2 |
| FR-CASE-08 | Mỗi lần xuất bản tạo một phiên bản không đổi. Phiên thực hành gắn với phiên bản đã dùng, nên sửa ca không làm thay đổi phiên cũ. | M | §9.1 |
| FR-CASE-09 | Hệ thống có sẵn 3 ca mẫu: Áp lực học tập, Khó khăn trong mối quan hệ, Thích nghi với thay đổi. Ca Áp lực học tập được làm kịch bản trước. | M | §6.3, comment |
| FR-CASE-10 | Ca có dấu hiệu thẩm định nội dung, để phân biệt ca đã và chưa đối chiếu giáo trình. | S | §17 câu 9 |

## 4. Giao bài và nộp bài (ASG)

| Mã | Yêu cầu | Ưu tiên | Nguồn |
|---|---|---|---|
| FR-ASG-01 | Giảng viên giao ca cho lớp, nhóm hoặc từng sinh viên và đặt hạn hoàn thành. | M | §5.2 |
| FR-ASG-02 | Sinh viên thấy danh sách bài được giao, hạn và trạng thái trên trang chủ. | M | §5.1 |
| FR-ASG-03 | Sinh viên được tự chọn ca để luyện tập ngoài các bài được giao. | M | §17 câu 5 |
| FR-ASG-04 | Sinh viên chọn một phiên đã hoàn thành để nộp cho bài được giao. | M | §4 |
| FR-ASG-05 | Sinh viên vẫn nộp được sau hạn, và bài nộp được đánh dấu trễ. | S | §5.2 |

## 5. Phiên thực hành (SES)

| Mã | Yêu cầu | Ưu tiên | Nguồn |
|---|---|---|---|
| FR-SES-01 | Sinh viên phải xác nhận đã đọc quy tắc mô phỏng trước khi bắt đầu phiên. | M | §5.1 |
| FR-SES-02 | Lần thực hành đầu tiên có hướng dẫn ngắn, bỏ qua được. | M | §8.1 |
| FR-SES-03 | Trong phiên luôn hiển thị trạng thái phiên, thời gian đã dùng, nút Kết thúc phiên và thông báo khi dữ liệu đang lưu. | M | §5.1, §8.1 |
| FR-SES-04 | Kết thúc phiên phải có bước xác nhận. | M | §5.1 |
| FR-SES-05 | Mỗi lời sinh viên và mỗi phản hồi hoàn chỉnh của AI được lưu ở máy chủ ngay khi nhận được. | M | §17 câu 9 |
| FR-SES-06 | Khi mất kết nối hoặc tải lại trang, sinh viên quay lại đúng phiên, thấy đủ hội thoại và không mất lượt nào. | M | §17 câu 9 |
| FR-SES-07 | Phiên có giới hạn thời lượng theo cấu hình của ca, có cảnh báo trước khi hết giờ, hết giờ thì tự kết thúc và lưu. | M | §13 |
| FR-SES-08 | Phiên không hoạt động quá thời gian cấu hình chuyển sang trạng thái Bỏ dở, transcript vẫn được giữ. | M | §9.1 |
| FR-SES-09 | Mỗi sinh viên chỉ có một phiên đang chạy tại một thời điểm. Khi mở phiên mới, hệ thống đề nghị quay lại phiên đang chạy. | S | Thiết kế |
| FR-SES-10 | Nhãn "môi trường mô phỏng" luôn hiển thị trong phòng tham vấn. | M | §13 |

## 6. Phòng tham vấn 3D (3D)

| Mã | Yêu cầu | Ưu tiên | Nguồn |
|---|---|---|---|
| FR-3D-01 | Phòng tham vấn 3D là chế độ mặc định, với góc nhìn người tham vấn và thân chủ ngồi đối diện. | M | D-01, §5.1 |
| FR-3D-02 | Người dùng điều khiển được góc nhìn cơ bản bằng chuột, cảm ứng và bàn phím, trong giới hạn không làm mất thân chủ khỏi khung hình. | M | §5.1 |
| FR-3D-03 | Thân chủ có các trạng thái hoạt ảnh: chờ, lắng nghe, suy nghĩ, phản hồi. | M | §2.2 |
| FR-3D-04 | Thân chủ thể hiện cảm xúc cơ bản theo tín hiệu `emotion` từ dịch vụ AI. Thiếu tín hiệu thì dùng trạng thái trung tính. | S | §6.1 |
| FR-3D-05 | Phản hồi của thân chủ hiển thị bằng văn bản trên màn hình, không phát tiếng và không có khớp môi. | M | D-05 |
| FR-3D-06 | Phòng 3D không che khuất khung hội thoại trên màn hình nhỏ. | M | §8.1 |
| FR-3D-07 | Khi tải phòng 3D có hiển thị tiến độ, và sinh viên không phải chờ tải lại ở các lần vào sau. | M | §9 |
| FR-3D-08 | Hệ thống đề xuất chuyển sang chế độ nhẹ 2D khi thiết bị không hỗ trợ WebGL 2, mất ngữ cảnh đồ họa, hoặc tốc độ khung hình thấp kéo dài. | M | §8.1, §13 |
| FR-3D-09 | Người dùng tự chuyển giữa 3D và 2D bất kỳ lúc nào. Việc chuyển không làm gián đoạn phiên hay mất hội thoại. | M | §8.1 |

## 7. Hội thoại (CONV)

| Mã | Yêu cầu | Ưu tiên | Nguồn |
|---|---|---|---|
| FR-CONV-01 | Sinh viên nhập văn bản để gửi lời nói của mình. | M | D-05 |
| FR-CONV-02 | Sinh viên nói qua micro theo thao tác nhấn để nói, nhấn để dừng. | M | D-05, comment |
| FR-CONV-03 | Hai hình thức có sẵn trong cùng một phiên và đổi được ở từng lượt. Nút micro được làm nổi bật. | M | D-05, comment |
| FR-CONV-04 | Sau khi nhận dạng, văn bản hiện trong ô nhập để sinh viên sửa nếu sai rồi bấm gửi (OI-08). | M | Đề xuất |
| FR-CONV-05 | Hệ thống xin quyền micro ở lần dùng đầu. Nếu bị từ chối hoặc không có micro, hệ thống hướng dẫn cách cấp quyền và sinh viên vẫn tiếp tục bằng văn bản. | M | §9 |
| FR-CONV-06 | Phản hồi của AI hiển thị dần trên màn hình, kèm trạng thái đang trả lời. Nếu dịch vụ AI không trả dần thì hiển thị một lần. | M | D-05 |
| FR-CONV-07 | Hội thoại trong phiên phân biệt rõ lời người học và lời thân chủ AI. | M | §5.1 |
| FR-CONV-08 | Khi dịch vụ AI hoặc STT lỗi, hệ thống báo rõ, giữ nguyên nội dung sinh viên đã nói hoặc nhập, và cho thử lại mà không tạo lượt trùng. | M | §9, §17 câu 9 |
| FR-CONV-09 | Hệ thống không lưu âm thanh sau khi nhận dạng xong, chỉ lưu văn bản (OI-09). | M | §9.2 |
| FR-CONV-10 | Với mỗi lượt của sinh viên, hệ thống lưu hình thức nhập, độ tin cậy nhận dạng (nếu có) và việc sinh viên có sửa văn bản hay không. | M | Thiết kế |
| FR-CONV-11 | Sinh viên không gửi được lượt mới khi AI đang trả lời lượt trước. | M | Thiết kế |

## 8. An toàn (SAFE)

| Mã | Yêu cầu | Ưu tiên | Nguồn |
|---|---|---|---|
| FR-SAFE-01 | Khi dịch vụ AI báo tín hiệu nguy cơ, hệ thống hiển thị hướng dẫn an toàn và ghi sự kiện an toàn gắn với lượt hội thoại. | M | §6.2 |
| FR-SAFE-02 | Nội dung hướng dẫn an toàn được cấu hình trên trang quản trị, không viết cứng trong mã nguồn. | M | §6.2 |
| FR-SAFE-03 | Cảnh báo "đây là mô phỏng, không phải tham vấn thật" xuất hiện ở trang chuẩn bị, phòng tham vấn và báo cáo. | M | §13 |
| FR-SAFE-04 | Sự kiện an toàn được chuyển cho giảng viên phụ trách theo quy trình giám sát. Chi tiết chờ OI-03. | S | §6.2 |

## 9. Báo cáo sau phiên (RPT)

| Mã | Yêu cầu | Ưu tiên | Nguồn |
|---|---|---|---|
| FR-RPT-01 | Khi kết thúc phiên, hệ thống tạo báo cáo ở nền. Sinh viên thấy trạng thái đang xử lý và không mất báo cáo nếu rời trang. | M | §4 |
| FR-RPT-02 | Việc tạo báo cáo tự thử lại khi lỗi. Nếu vẫn lỗi, phiên ghi trạng thái lỗi và Quản trị viên chạy lại được. | M | §9 |
| FR-RPT-03 | Báo cáo gồm: tóm tắt diễn biến, mức theo từng kỹ năng, dẫn chứng, 2 đến 3 điểm làm tốt, 2 đến 3 điểm cần cải thiện kèm cách diễn đạt thay thế, câu hỏi phản tư, mục tiêu luyện tập, ghi chú giới hạn. | M | §7.1 |
| FR-RPT-04 | Đánh giá theo 6 nhóm kỹ năng và thang 4 mức. Kỹ năng không đủ dữ liệu được ghi "chưa đủ dữ liệu", không gán mức. | M | §7 |
| FR-RPT-05 | Mỗi mức đánh giá có ít nhất một dẫn chứng từ hội thoại. Bấm vào dẫn chứng sẽ tới đúng lượt trong transcript. | M | §2.3, §7.1 |
| FR-RPT-06 | Máy chủ kiểm tra mọi dẫn chứng có thật trong phiên. Dẫn chứng không khớp bị loại và kỹ năng đó bị đánh dấu cần xem lại. | M | §9.2 |
| FR-RPT-07 | Báo cáo ghi rõ đây là đề xuất của AI để tự đánh giá, không phải điểm học phần. | M | D-08 |
| FR-RPT-08 | Sinh viên xem lại transcript sau phiên, có phân biệt người nói. | M | §5.1 |
| FR-RPT-09 | Lượt có nhận dạng độ tin cậy thấp được đánh dấu trong transcript để người đọc biết văn bản có thể sai so với lời nói. | S | Thiết kế |

## 10. Phản tư (REF)

| Mã | Yêu cầu | Ưu tiên | Nguồn |
|---|---|---|---|
| FR-REF-01 | Sinh viên trả lời các câu hỏi phản tư sau khi xem báo cáo, lưu nháp được. | M | §4, §5.1 |
| FR-REF-02 | Bài được giao chỉ nộp được khi đã có phản tư. | M | §4 |

## 11. Giảng viên (LEC)

| Mã | Yêu cầu | Ưu tiên | Nguồn |
|---|---|---|---|
| FR-LEC-01 | Giảng viên xem tiến độ hoàn thành theo lớp và theo bài được giao. | M | §5.2 |
| FR-LEC-02 | Giảng viên mở transcript và báo cáo của bài đã nộp để đối chiếu đánh giá với hội thoại. | M | §5.2 |
| FR-LEC-03 | Giảng viên bổ sung nhận xét và mức đánh giá riêng. Đánh giá của giảng viên lưu tách biệt, không ghi đè đề xuất của AI. | M | §5.2, §7 |
| FR-LEC-04 | Sinh viên thấy nhận xét của giảng viên, có ghi rõ người nhận xét và thời điểm. | M | §5.2 |
| FR-LEC-05 | Giảng viên xem thống kê theo kỹ năng của lớp để điều chỉnh định hướng giảng dạy. | M | §17 câu 6 |
| FR-LEC-06 | Giảng viên xuất báo cáo tổng hợp theo phạm vi quyền. Thao tác xuất được ghi nhật ký. | S | §5.2 |

## 12. Quản lý dữ liệu theo trạng thái (DATA)

Chi tiết trạng thái và quy tắc hiển thị nằm tại [tài liệu 04](04-data-model.md#3-xóa-mềm-và-thời-hạn-14-ngày).

| Mã | Yêu cầu | Ưu tiên | Nguồn |
|---|---|---|---|
| FR-DATA-01 | Mỗi phiên có trạng thái bản ghi: Đang hiệu lực, Đã lưu trữ, Đã xóa. Transcript, báo cáo và phản tư đi theo phiên. | M | D-04 |
| FR-DATA-02 | Trong 14 ngày sau khi phiên kết thúc, sinh viên xem được và xóa được phiên của mình. Xóa ở đây là xóa mềm. | M | §17 câu 7, D-04 |
| FR-DATA-03 | Sau 14 ngày, tác vụ định kỳ chuyển phiên sang Đã lưu trữ. Dữ liệu không bị xóa vĩnh viễn. | M | D-04 |
| FR-DATA-04 | Quản trị viên xem được phiên ở mọi trạng thái và đổi được trạng thái, kể cả khôi phục. | M | D-04 |
| FR-DATA-05 | Thời hạn 14 ngày là tham số trên trang quản trị. | S | Thiết kế |
| FR-DATA-06 | Mọi lần đổi trạng thái được ghi vào nhật ký kiểm toán, gồm người thực hiện, thời điểm, trạng thái trước và sau. | M | §9.1 |
| FR-DATA-07 | Thống kê tổng hợp của giảng viên vẫn tính phiên Đã lưu trữ, nhưng không mở được nội dung của phiên đó. | S | D-04 |

## 13. Quản trị (ADM)

| Mã | Yêu cầu | Ưu tiên | Nguồn |
|---|---|---|---|
| FR-ADM-01 | Trang quản trị có các màn hình tài khoản, lớp, trạng thái dữ liệu, cấu hình và nhật ký, dùng được mà không cần kiến thức kỹ thuật. | M | §5.3, comment |
| FR-ADM-02 | Cấu hình địa chỉ dịch vụ AI và STT ở máy chủ. Khóa bí mật không bao giờ trả về trình duyệt, chỉ hiển thị trạng thái đã cấu hình. | M | §5.3, §9 |
| FR-ADM-03 | Trang trạng thái hiển thị tình trạng API, CSDL, dịch vụ AI, dịch vụ STT và lần sao lưu gần nhất. | M | §5.3, §8 |
| FR-ADM-04 | Theo dõi mức sử dụng AI theo ngày, theo ca, và chi phí nếu dịch vụ AI cung cấp số liệu. | M | §5.3 |
| FR-ADM-05 | Xem và lọc nhật ký kiểm toán. | M | §5.3 |
| FR-ADM-06 | Đặt giới hạn tần suất yêu cầu và độ dài phiên mặc định. | M | §5.3, §13 |

## 14. Ma trận phân quyền

Chú thích: **Có** là được phép; **Của mình** là chỉ trên dữ liệu của chính người đó; **Trong phạm vi** là chỉ với lớp mà giảng viên phụ trách; **Tổng hợp** là chỉ xem số liệu thống kê; **Không** là bị từ chối.

| Chức năng | Sinh viên | Giảng viên | Quản trị viên |
|---|---|---|---|
| Xem ca đã xuất bản | Có | Có | Có |
| Tạo, sửa, xuất bản, lưu trữ ca | Không | Có | Không |
| Quản lý tài khoản | Không | Không | Có |
| Tạo lớp, gán giảng viên | Không | Không | Có |
| Thêm, bớt sinh viên trong lớp | Không | Trong phạm vi | Có |
| Giao bài | Không | Trong phạm vi | Không |
| Thực hành ca | Có | Có, để thử ca | Không |
| Xem phiên, transcript, báo cáo khi Đang hiệu lực | Của mình | Bài đã nộp, trong phạm vi | Có |
| Xem phiên luyện tự do của sinh viên | Của mình | Tổng hợp | Có |
| Xóa mềm phiên | Của mình, trong 14 ngày | Không | Có |
| Xem phiên Đã lưu trữ hoặc Đã xóa | Không | Không | Có |
| Đổi trạng thái bản ghi, khôi phục | Không | Không | Có |
| Nhận xét, đánh giá của giảng viên | Không | Trong phạm vi | Không |
| Xem thống kê lớp | Không | Trong phạm vi | Có |
| Xuất báo cáo | Không | Trong phạm vi | Có |
| Cấu hình hệ thống, xem nhật ký | Không | Không | Có |

Giảng viên không đọc được transcript luyện tự do. Lý do là tài liệu gốc đặt mục tiêu "môi trường ít áp lực", và sinh viên sẽ khó luyện thoải mái nếu biết mọi lần thử đều bị đọc. Điểm này cần giảng viên xác nhận (OI-11).
