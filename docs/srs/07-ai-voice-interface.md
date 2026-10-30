# 07. Giao tiếp với dịch vụ AI và giọng nói

**Trạng thái: đề xuất của nhóm web, chờ đầu mối AI/giọng nói xác nhận (OI-06).** Tài liệu này định nghĩa ranh giới giữa hai bên để mỗi bên phát triển độc lập. Đầu mối AI/giọng nói toàn quyền chọn mô hình và cách xây dựng dịch vụ. Nhóm web chỉ cần giao diện bên dưới, hoặc một giao diện tương đương đã thống nhất.

## 1. Phân chia trách nhiệm

| Việc | Nhóm web | Đầu mối AI/giọng nói |
|---|---|---|
| Lưu ca, phiên, transcript, trạng thái | Chịu trách nhiệm | |
| Soạn câu lệnh hệ thống, giữ AI đúng vai thân chủ | | Chịu trách nhiệm |
| Tiết lộ thông tin dần, nhất quán, không chẩn đoán | | Chịu trách nhiệm |
| Phát hiện nguy cơ, trả tín hiệu | | Chịu trách nhiệm |
| Hiển thị hướng dẫn an toàn, ghi sự kiện | Chịu trách nhiệm | |
| Chấm theo rubric, đề xuất dẫn chứng | | Chịu trách nhiệm |
| Kiểm tra dẫn chứng có thật trong phiên | Chịu trách nhiệm | |
| Nhận dạng tiếng Việt | | Chịu trách nhiệm |
| Ghi âm, xin quyền micro | Chịu trách nhiệm | |
| Bộ kiểm thử chất lượng AI | | Chịu trách nhiệm |
| Khóa bí mật, giới hạn tần suất với người dùng | Chịu trách nhiệm | |

## 2. Nguyên tắc chung

- Giao tiếp qua HTTP giữa backend và dịch vụ. Trình duyệt không gọi trực tiếp.
- Xác thực bằng header `Authorization: Bearer <khóa dịch vụ>`.
- Dữ liệu dùng JSON, mã hóa UTF-8, trừ phần tải âm thanh.
- Dịch vụ không lưu trạng thái giữa các lượt. Mỗi yêu cầu mang đủ ngữ cảnh.
- Mọi yêu cầu có `requestId`. Gọi lại với cùng `requestId` không được tính là một lượt mới.
- Không gửi họ tên hay tên đăng nhập của sinh viên sang dịch vụ. Backend chỉ gửi mã phiên.

## 3. Hội thoại với thân chủ AI

`POST /v1/client-turns`

```json
{
  "requestId": "0192f0a0-7c2e-7e1a-9d3b-3c1f0e6b1a10",
  "sessionId": "0192f09f-1111-7000-8000-000000000001",
  "caseProfile": { "...": "Theo tài liệu 04, mục 5" },
  "clientState": { "...": "Do dịch vụ trả về ở lượt trước, backend giữ nguyên" },
  "history": [
    { "seq": 1, "speaker": "STUDENT", "content": "Chào bạn, hôm nay bạn muốn chia sẻ điều gì?" },
    { "seq": 2, "speaker": "CLIENT", "content": "Dạ... em cũng không biết bắt đầu từ đâu." }
  ],
  "utterance": { "seq": 3, "content": "Mình sẵn sàng lắng nghe, bạn cứ kể từ từ.", "inputMode": "VOICE" }
}
```

Dịch vụ trả về luồng `text/event-stream`:

```text
event: delta
data: {"text":"Dạ, "}

event: delta
data: {"text":"dạo này em thấy mệt lắm."}

event: done
data: {"text":"Dạ, dạo này em thấy mệt lắm.","emotion":"ANXIOUS","clientState":{"...":"..."},"riskFlag":null,"usage":{"model":"...","inputTokens":1200,"outputTokens":24}}
```

Nếu chưa trả dần được, dịch vụ trả JSON một lần với nội dung của sự kiện `done`. Backend chấp nhận cả hai.

| Trường của `done` | Bắt buộc | Mô tả |
|---|---|---|
| `text` | Có | Toàn bộ lời thân chủ. Đây là nội dung được lưu vào transcript |
| `emotion` | Không | Một trong `NEUTRAL`, `ANXIOUS`, `SAD`, `TENSE`, `RELIEVED`, `HESITANT`, dùng để chọn tư thế nhân vật |
| `clientState` | Có | Trạng thái do dịch vụ tự định nghĩa, backend lưu và gửi lại nguyên vẹn |
| `riskFlag` | Có | `null` hoặc `{ "level": "HIGH", "reason": "..." }` |
| `usage` | Không | Số liệu sử dụng phục vụ FR-ADM-04 |

## 4. Đánh giá sau phiên

`POST /v1/assessments`

```json
{
  "requestId": "0192f0a1-2222-7000-8000-000000000002",
  "sessionId": "0192f09f-1111-7000-8000-000000000001",
  "caseProfile": { "...": "..." },
  "rubric": { "skills": ["ACTIVE_LISTENING", "OPEN_QUESTIONS", "EMPATHY", "SUMMARIZING", "AUTONOMY", "ETHICS_SAFETY"], "levels": [1, 2, 3, 4] },
  "transcript": [
    { "seq": 1, "speaker": "STUDENT", "content": "...", "inputMode": "VOICE", "sttConfidence": 0.82 }
  ]
}
```

Phản hồi:

```json
{
  "summary": "Tóm tắt ngắn diễn biến phiên",
  "scores": [
    {
      "skill": "EMPATHY",
      "level": 3,
      "rationale": "Vì sao đạt mức này",
      "evidence": [{ "seq": 3, "quote": "Mình sẵn sàng lắng nghe" }]
    },
    { "skill": "SUMMARIZING", "level": null, "rationale": "Chưa đủ dữ liệu", "evidence": [] }
  ],
  "strengths": ["..."],
  "improvements": [{ "point": "...", "alternativePhrase": "..." }],
  "reflectionQuestions": ["..."],
  "practiceGoals": ["..."],
  "limitationNote": "Phiên ngắn nên một số kỹ năng chưa đủ dữ liệu",
  "usage": { "model": "...", "inputTokens": 5000, "outputTokens": 700 }
}
```

Quy tắc:

- `level` là 1 đến 4, hoặc `null` khi chưa đủ dữ liệu.
- Mỗi `level` khác `null` phải có ít nhất một `evidence`.
- `quote` phải trích đúng nội dung của lượt `seq`. Backend đối chiếu và loại dẫn chứng không khớp (FR-RPT-06).
- Không trừ điểm vì lỗi nhận dạng: các lượt `sttConfidence` thấp cần được xem xét thận trọng.
- Đánh giá chạy ở nền, thời gian xử lý có thể dài hơn hội thoại.

## 5. Nhận dạng giọng nói

`POST /v1/stt`, dạng `multipart/form-data`:

| Trường | Mô tả |
|---|---|
| `audio` | Tệp âm thanh, định dạng `audio/webm;codecs=opus` hoặc `audio/mp4` |
| `language` | `vi` |
| `requestId` | Mã yêu cầu |
| `sessionId` | Mã phiên |

Phản hồi:

```json
{ "text": "Mình sẵn sàng lắng nghe.", "confidence": 0.91, "durationSeconds": 3.2, "usage": { "model": "..." } }
```

- Dịch vụ phải nhận được cả hai định dạng vì Safari cũ không ghi được WebM. Nếu không làm được, cần báo sớm để trình duyệt tự chuyển sang PCM 16 kHz, một kênh.
- Độ dài mỗi đoạn tối đa 120 giây (cấu hình được).
- Dịch vụ không được lưu âm thanh sau khi xử lý (OI-09).
- `confidence` không bắt buộc, nhưng nên có để phục vụ FR-RPT-09.
- Nhận dạng theo luồng để hiện chữ khi đang nói là phần mở rộng sau bản đầu.

## 6. Kiểm tra trạng thái

`GET /health` trả về:

```json
{ "status": "ok", "version": "1.0.0", "model": "..." }
```

Backend gọi định kỳ để hiển thị trên trang trạng thái (FR-ADM-03).

## 7. Xử lý lỗi

| Mã HTTP | Ý nghĩa | Backend xử lý |
|---|---|---|
| 400 | Yêu cầu sai cấu trúc | Không thử lại, ghi log |
| 401 | Sai khóa dịch vụ | Không thử lại, báo Quản trị viên |
| 408, 504 | Quá thời gian | Thử lại |
| 429 | Quá tải, có header `Retry-After` | Chờ rồi thử lại |
| 500, 502, 503 | Lỗi dịch vụ | Thử lại theo thời gian chờ tăng dần |

| Tham số | Giá trị đề xuất | Trạng thái |
|---|---|---|
| Thời gian chờ chữ đầu tiên | 15 giây | Chờ thống nhất |
| Thời gian chờ toàn bộ lượt | 60 giây | Chờ thống nhất |
| Thời gian chờ STT | 15 giây | Chờ thống nhất |
| Thời gian chờ đánh giá | 180 giây | Chờ thống nhất |
| Số lần thử lại với hội thoại | 2 | Chờ thống nhất |
| Số lần thử lại với đánh giá | 3 | Chờ thống nhất |

Lỗi trong khi đang trả dần được trả bằng sự kiện `error`. Backend thử lại toàn bộ lượt với cùng `requestId` và thay thế phần chữ đã hiển thị.

## 8. Yêu cầu đối với dịch vụ

| Hạng mục | Câu hỏi cần trả lời |
|---|---|
| Vị trí chạy | Chạy local hay gọi dịch vụ đám mây? Nếu đám mây, transcript có rời khỏi hệ thống (OI-05) |
| Độ trễ | Thời gian tới chữ đầu tiên thường là bao lâu? |
| Đồng thời | Xử lý được bao nhiêu phiên cùng lúc? Hệ thống cần cho 50 phiên |
| Chất lượng | Bộ tình huống kiểm thử gồm những gì? Dùng để nghiệm thu AT-22 |
| Chi phí | Có trả về số liệu sử dụng và đơn giá không? |
| Phiên bản | Khi đổi mô hình, báo trước như thế nào? |

## 9. Dịch vụ giả lập

Nhóm web tự xây bản giả lập trong adapter `mock`, chọn bằng biến môi trường `AI_PROVIDER=mock`. Bản giả lập trả lời theo kịch bản cố định, mô phỏng được độ trễ, trả dần, lỗi, quá thời gian và tín hiệu nguy cơ. Nhờ đó phần web được phát triển và kiểm thử khi dịch vụ thật chưa sẵn sàng.

Mốc tích hợp: khi dịch vụ thật có điểm cuối đầu tiên, hai bên chạy một phiên đầu cuối trên môi trường thử nghiệm và chốt tài liệu này thành phiên bản chính thức.
