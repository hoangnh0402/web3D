# Nhiệm vụ 01: Dựng nền móng sản phẩm

Đọc `AGENTS.md` ở thư mục gốc trước. Mọi quy tắc trong đó đều áp dụng cho nhiệm vụ này.

## Mục tiêu

Chuyển dự án từ prototype sang khung sản phẩm chạy được:

- Monorepo pnpm với `apps/web` (Next.js), `apps/api` (NestJS) và `packages/shared`.
- Cơ sở dữ liệu đầy đủ theo docs/srs/04.
- Đăng nhập và phân quyền hoạt động.
- Phòng 3D của prototype hiển thị được trong Next.js.
- Toàn hệ thống khởi động bằng Docker Compose.

Chưa làm hội thoại, báo cáo hay các màn hình nghiệp vụ khác. Đó là các nhiệm vụ sau.

## Phạm vi

### 1. Monorepo ở thư mục gốc

- `package.json` gốc: `"packageManager": "pnpm@12.18.0"`, `"engines": { "node": "24.22.2" }`, các script `dev`, `lint`, `typecheck`, `test`, `build` chạy cho mọi package.
- `pnpm-workspace.yaml` gồm `apps/*` và `packages/*`.
- `.nvmrc` ghi `24.22.2`. Tạo `tsconfig.base.json` (strict), cấu hình ESLint và Prettier dùng chung.
- `.gitignore` cho `node_modules`, `.next`, `dist`, `.env*` (trừ `.env.example`).
- Không đụng tới `docs/`.

### 2. `packages/shared`

- Lược đồ Zod và kiểu TypeScript dùng chung:
  - Vai trò `STUDENT | LECTURER | ADMIN`.
  - Đầu vào đăng nhập và đổi mật khẩu.
  - Người dùng hiện tại (`/auth/me`).
  - Mã kỹ năng (docs/srs/04 mục 2.1).
  - Cảm xúc thân chủ `NEUTRAL | ANXIOUS | SAD | TENSE | RELIEVED | HESITANT`.
- Quy tắc mật khẩu lấy theo docs/srs/03; tài liệu không nêu thì dùng tối thiểu 8 ký tự.

### 3. `apps/api` (NestJS)

- Cấu trúc module theo docs/srs/06 mục 5.1. Nhiệm vụ này chỉ cần làm thật các phần:
  - `auth`, `users` (đọc), `audit`, `health`.
  - Khung rỗng của `ai-gateway` với adapter `mock`.
- **Prisma 7.10.1:** schema đủ mọi bảng, trạng thái và ràng buộc ở docs/srs/04, gồm khóa duy nhất của `messages` và các chỉ mục ở docs/srs/06 mục 6. Tạo migration đầu tiên.
- **Seed** theo docs/srs/04 mục 6:
  - Một quản trị viên lấy từ biến môi trường `SEED_ADMIN_USERNAME`/`SEED_ADMIN_PASSWORD`, bật `must_change_password`.
  - Thêm một giảng viên và hai sinh viên mẫu, chỉ tạo khi `NODE_ENV !== 'production'`.
  - 3 ca mẫu ở trạng thái Nháp cho Hà Linh, Tuấn Kiệt, Mai Phương, có `avatar_key` lần lượt `a`, `b`, `c`.
  - Rubric 6 kỹ năng và tham số hệ thống mặc định.
- **Xác thực** theo docs/srs/02 mục 1 và docs/srs/03:
  - `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `POST /api/auth/change-password`.
  - Phiên lưu trong bảng `auth_sessions`, chỉ lưu hash của token. Cookie `HttpOnly`, `Secure`, `SameSite=Lax`.
  - Mật khẩu băm bằng Argon2id.
  - Khóa tạm tài khoản sau nhiều lần nhập sai liên tiếp; ngưỡng và thời gian lấy từ `system_settings`.
  - Phiên bị thu hồi ngay khi tài khoản bị khóa.
- Guard toàn cục: mọi route mặc định phải đăng nhập, mở ngoại lệ bằng decorator `@Public()`. Decorator `@Roles(...)` kiểm tra vai trò theo ma trận ở docs/srs/02 mục 14.
- Người dùng đang có `must_change_password` chỉ gọi được `me`, `logout`, `change-password`.
- **Hạ tầng chung:**
  - `ZodValidationPipe` tự viết, dùng lược đồ trong `packages/shared`.
  - Log bằng Pino, che trường nhạy cảm.
  - `@nestjs/throttler` cho route đăng nhập.
  - Swagger ở `/api/docs`, chỉ bật khi không phải môi trường production.
  - Ghi `audit_logs` cho đăng nhập thành công, thất bại, đăng xuất và đổi mật khẩu.
- **Health:** `GET /api/health` trả trạng thái API và CSDL.
- **Worker:** cùng mã nguồn, có điểm khởi động riêng (`main.worker.ts`), khởi tạo pg-boss trên schema riêng. Chưa cần tác vụ thật.
- **Kiểm thử bằng Vitest:**
  - Đơn vị: băm mật khẩu, khóa tài khoản, guard vai trò.
  - Tích hợp: login, me, logout và đổi mật khẩu lần đầu, chạy với PostgreSQL thật (Docker).

### 4. `apps/web` (Next.js App Router)

- Next.js 16.4.6, `output: 'standalone'`, Tailwind 4, shadcn/ui (chỉ sinh các thành phần cần dùng), TanStack Query, Zustand, React Hook Form.
- Font Be Vietnam Pro qua `@fontsource/be-vietnam-pro`, tự lưu trữ.
- **Giao diện:** chuyển design token và phong cách từ `docs/design/UI/prototype/src/app.css` sang Tailwind 4 (`@theme`):
  - Tông xanh dương sáng, nền tĩnh, không có hoạt ảnh nền.
  - Giữ nguyên màu và bo góc của prototype.
- **Màn hình:**
  - SCR-01 Đăng nhập và SCR-02 Đổi mật khẩu, giống bản trong `prototype/src/screens/auth.tsx`.
  - Ba trang chủ tạm theo vai trò: `/student`, `/lecturer`, `/admin`, mỗi trang có tiêu đề và nút đăng xuất.
- **Middleware của Next** chỉ chuyển hướng:
  - Chưa đăng nhập thì sang `/login`.
  - Cần đổi mật khẩu thì sang `/change-password`.
  - Quyền thật do API kiểm tra.
- Gọi API qua đường dẫn tương đối `/api`. Khi chạy dev, dùng `rewrites` của Next chuyển `/api` sang NestJS.
- **Phòng 3D:**
  - Chuyển `docs/design/UI/prototype/src/room/` sang `apps/web/src/features/room/`, gồm `Scene`, `Avatar`, `rig`, `smooth`, `assets`, `layout`. Chép tài sản trong `prototype/src/assets/3d/` và ảnh `room-*.jpg` sang `apps/web/public/3d/`.
  - Sửa `assets.ts`: tải tệp từ `/3d/...` bằng `fetch`, bỏ cách import kiểu Vite. Giữ cách giải nén gzip bằng `DecompressionStream`. Bộ giải nén meshopt lấy từ gói `three`, không tải từ CDN.
  - Thêm trang `/student/room-preview` (chỉ dành cho sinh viên) để hiển thị phòng 3D, chọn được thân chủ `a|b|c` và cảm xúc. Tải bằng `dynamic(..., { ssr: false })` trong error boundary riêng.
  - Khi không có WebGL thì hiện ảnh tĩnh `room-*.jpg`.
  - Hành vi phải giống prototype: tư thế, tay đặt trên đùi, nhịp thở, góc xoay camera.
- **Kiểm thử:**
  - Testing Library cho biểu mẫu đăng nhập: báo lỗi, khóa nút khi đang gửi.
  - Một kịch bản Playwright: đăng nhập, đổi mật khẩu lần đầu, vào trang chủ sinh viên, mở `/student/room-preview` thấy canvas.

### 5. `deploy/`

- `compose.yaml` gồm các dịch vụ:
  - `caddy:2.11.9`
  - `web`: Next standalone
  - `api`
  - `worker`
  - `postgres:18.6`: không mở cổng ra ngoài, có volume
  - `louislam/uptime-kuma:2.5.9`
- **Caddyfile:**
  - `/api/*` chuyển sang `api`, phần còn lại sang `web`.
  - Có HTTP/2. Tắt bộ đệm phản hồi cho đường dẫn SSE `/api/sessions/*/events`.
  - Môi trường dev dùng `tls internal`.
- Dockerfile nhiều tầng cho `web` và `api`, chạy bằng người dùng không phải root, dùng image `node:24.22.2-*`.
- `.env.example` liệt kê mọi biến môi trường, có chú thích tiếng Việt.
- `deploy/backup/`: script `pg_dump` hằng ngày, giữ số bản theo biến môi trường. Chỉ cần script và chú thích cách lên lịch.

### 6. Tài liệu

- `README.md` ở thư mục gốc, thêm phần "Phát triển", gồm:
  - Yêu cầu: Node 24.22.2, pnpm 12.18.0, Docker.
  - Các lệnh cài đặt, chạy dev, migration, seed, kiểm thử, build.
  - Cách chạy bằng Docker Compose.
  - Tài khoản mẫu ở môi trường dev.
- Giữ nguyên nội dung README hiện có.

## Tiêu chí hoàn thành

1. Năm lệnh kiểm tra trong `AGENTS.md` đều chạy qua, không cảnh báo TypeScript.
2. `docker compose -f deploy/compose.yaml up --build` khởi động đủ dịch vụ. Mở `https://localhost` đăng nhập được bằng tài khoản seed.
3. Người dùng sai vai trò gọi API của vai trò khác thì nhận 403. Chưa đăng nhập thì nhận 401.
4. Trang `/student/room-preview` hiển thị phòng 3D và nhân vật giống prototype.
5. Mọi phiên bản trong các `package.json` khớp đúng COPYRIGHT.md.

## Khi xong

Báo lại bằng tiếng Việt:

- Đã làm gì, theo từng mục ở trên.
- Kết quả của năm lệnh kiểm tra, dán phần cuối đầu ra.
- Những điểm làm khác yêu cầu hoặc chưa làm được, kèm lý do.
- Những chỗ tài liệu SRS chưa rõ mà bạn đã phải tự chọn cách làm.

Không commit.
