# Hướng dẫn cho agent lập trình

Lab FourT là website luyện kỹ năng tham vấn tâm lý: sinh viên trò chuyện với thân chủ AI trong một phòng 3D trên trình duyệt. Hệ thống chạy trên máy chủ local của đơn vị.

## Nguồn sự thật

Đọc trước khi viết mã, theo thứ tự ưu tiên:

1. [docs/srs/09-decisions-and-open-issues.md](docs/srs/09-decisions-and-open-issues.md): các quyết định đã chốt và vấn đề còn mở.
2. [COPYRIGHT.md](COPYRIGHT.md): công nghệ, thư viện và phiên bản được phép dùng. Ưu tiên hơn docs/srs/06 ở mọi điểm khác nhau (ví dụ frontend là Next.js, không phải Vite).
3. [docs/srs/](docs/srs/): yêu cầu chức năng (02), phi chức năng (03), mô hình dữ liệu (04), giao diện và luồng (05), hợp đồng AI và giọng nói (07), tiêu chí nghiệm thu (08).
4. [docs/design/UI/prototype](docs/design/UI/prototype): prototype giao diện và phòng 3D đã được khách duyệt. Giữ nguyên thiết kế, màu sắc và hành vi khi chuyển sang sản phẩm.

Những quyết định dễ làm sai nếu chỉ đọc tài liệu gốc:

- Mọi ca đều cần tài khoản và phân quyền theo vai trò (sinh viên, giảng viên, quản trị viên).
- Sinh viên nói hoặc gõ; AI chỉ trả lời bằng văn bản trên màn hình. Không có TTS, không khớp môi.
- Dữ liệu quá 14 ngày không xóa cứng mà chuyển trạng thái (xóa mềm).
- Phòng 3D bắt buộc ở v1; chế độ 2D chỉ là phương án dự phòng cho máy yếu. Không có VR ở v1.
- Dịch vụ AI và nhận dạng giọng nói do bên khác làm. Web chỉ tích hợp qua adapter, có bản giả lập (`mock`).

## Quy tắc mã nguồn

- Monorepo pnpm: `apps/web` (Next.js), `apps/api` (NestJS, gồm API và worker), `packages/shared` (lược đồ Zod, kiểu dùng chung), `deploy/` (Docker Compose, Caddyfile, sao lưu).
- Chỉ dùng thư viện có trong COPYRIGHT.md, ghim đúng phiên bản chính xác (không `^`, không `~`, không `latest`). Cần thêm thư viện thì dừng lại và báo, không tự thêm.
- TypeScript strict ở mọi package.
- Next.js chỉ làm giao diện. Nghiệp vụ, truy cập dữ liệu và phân quyền nằm ở NestJS. Không viết nghiệp vụ trong Server Actions hay Route Handlers.
- Phòng 3D tải bằng `dynamic(..., { ssr: false })` trong error boundary riêng. Hội thoại không được phụ thuộc vào phòng 3D.
- Không gọi dịch vụ hay CDN bên ngoài lúc chạy. Font, bộ giải nén 3D và tài sản đều tự lưu trữ.
- Toàn bộ chữ hiển thị cho người dùng là tiếng Việt có dấu.
- Không ghi log mật khẩu, token, nội dung hội thoại hay âm thanh.

## Kiểm tra trước khi báo xong

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Lệnh nào lỗi thì sửa cho qua, hoặc báo rõ lệnh nào lỗi và vì sao. Không bỏ qua bài kiểm tra cho qua chuyện.

## Git

- Không commit, không push, không tạo nhánh. Chủ dự án xem và duyệt trên máy local trước.
- Không sửa `docs/srs/`, `COPYRIGHT.md` và `docs/design/UI/prototype/` trừ khi yêu cầu nói rõ.
