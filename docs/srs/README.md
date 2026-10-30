# Lab FourT: Đặc tả yêu cầu phần mềm (SRS)

| Thông tin | Nội dung |
|---|---|
| Sản phẩm | Lab FourT, Phòng thực hành tham vấn ảo |
| Phạm vi tài liệu | Bản đầu tiên của nền tảng web 3D |
| Phiên bản tài liệu | 1.0, phát hành để rà soát |
| Ngày phát hành | 30/10/2026 |
| Tài liệu gốc | `knowledge_base/docs/Bản thảo Lab FourT 1 (1).docx` |

## Tóm tắt

Lab FourT là website để sinh viên luyện kỹ năng tham vấn với thân chủ do AI đóng vai, trong một phòng tham vấn 3D chạy trên trình duyệt. Sinh viên trao đổi bằng giọng nói hoặc văn bản, AI phản hồi bằng văn bản trên màn hình. Sau phiên, sinh viên xem transcript, nhận báo cáo theo rubric và viết phản tư. Giảng viên tạo ca, giao bài, xem kết quả và bổ sung nhận xét.

Bản đầu phục vụ tổng cộng 50 giảng viên và sinh viên, yêu cầu tài khoản và phân quyền đầy đủ, chạy trên máy chủ local, chưa dùng kính VR. Phần AI và xử lý giọng nói do một đầu mối khác phụ trách và kết nối qua hợp đồng giao tiếp tại [tài liệu 07](07-ai-voice-interface.md).

## Bộ tài liệu

| Tệp | Nội dung | Người đọc chính |
|---|---|---|
| [01-overview.md](01-overview.md) | Mục đích, phạm vi, tác nhân, ràng buộc, thuật ngữ | Tất cả |
| [02-functional-requirements.md](02-functional-requirements.md) | Yêu cầu chức năng và ma trận phân quyền | Lập trình viên, QA, giảng viên |
| [03-non-functional-requirements.md](03-non-functional-requirements.md) | Hiệu năng, độ tin cậy, bảo mật, tương thích | Lập trình viên, QA, IT |
| [04-data-model.md](04-data-model.md) | Mô hình dữ liệu, trạng thái, xóa mềm | Backend, IT |
| [05-ui-and-flows.md](05-ui-and-flows.md) | Danh sách màn hình, bố cục, luồng nghiệp vụ | UX/UI, frontend, giảng viên |
| [06-technology-proposal.md](06-technology-proposal.md) | Đề xuất công nghệ FE, BE, DB, kiến trúc, triển khai | Lập trình viên, IT |
| [07-ai-voice-interface.md](07-ai-voice-interface.md) | Hợp đồng giao tiếp với dịch vụ AI và giọng nói | Backend, đầu mối AI/giọng nói |
| [08-acceptance-and-traceability.md](08-acceptance-and-traceability.md) | Mốc bàn giao, kịch bản nghiệm thu, truy vết về tài liệu gốc | QA, đại diện dự án |
| [09-decisions-and-open-issues.md](09-decisions-and-open-issues.md) | Quyết định đã chốt, vấn đề mở, rủi ro | Đại diện dự án, tất cả |

Đại diện dự án nên đọc [tài liệu 09](09-decisions-and-open-issues.md) trước, vì đó là nơi cần xác nhận các giả định và trả lời vấn đề còn mở.

## Thứ tự ưu tiên của nguồn yêu cầu

Tài liệu gốc có nhiều chỗ mâu thuẫn do được bổ sung qua nhiều đợt. Khi hai nguồn khác nhau, nguồn đứng trước được áp dụng:

1. Các quyết định chốt ngày 30/10/2026.
2. Câu trả lời tại mục 17 của tài liệu gốc và các comment trong tệp Word.
3. Phần thân của tài liệu gốc.

Danh sách các đoạn trong tài liệu gốc đã bị thay thế nằm ở [tài liệu 09, mục 2](09-decisions-and-open-issues.md#2-nội-dung-tài-liệu-gốc-đã-bị-thay-thế).

## Quy ước mã

| Tiền tố | Ý nghĩa |
|---|---|
| `FR-<NHÓM>-nn` | Yêu cầu chức năng |
| `NFR-<NHÓM>-nn` | Yêu cầu phi chức năng |
| `SCR-nn` | Màn hình |
| `AT-nn` | Kịch bản nghiệm thu |
| `D-nn` | Quyết định đã chốt |
| `OI-nn` | Vấn đề mở |
| `R-nn` | Rủi ro |

Mức ưu tiên:

- **M (Must):** bắt buộc để nghiệm thu bản đầu.
- **S (Should):** nên có, được phép lùi nếu đại diện dự án đồng ý.
- **L (Later):** để sau bản đầu, chỉ ghi lại để thiết kế không chặn hướng phát triển.
