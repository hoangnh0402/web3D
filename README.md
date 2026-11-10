# web3D

Lab FourT: website luyện kỹ năng tham vấn tâm lý với thân chủ AI trong phòng 3D trên trình duyệt.

- Yêu cầu: [docs/srs/](docs/srs/)
- Công nghệ và phiên bản: [COPYRIGHT.md](COPYRIGHT.md)
- Prototype giao diện đã duyệt: [docs/design/UI/](docs/design/UI/)

## Cấu trúc

```text
apps/web          Next.js: giao diện và phòng 3D
apps/api          NestJS: API (src/main.ts) và worker (src/main.worker.ts)
packages/shared   Lược đồ Zod và kiểu dữ liệu dùng chung
deploy/           Docker Compose, Caddyfile, Dockerfile, sao lưu
```

## Phát triển

Cần Node.js 24 (máy chủ dùng 24.22.2, xem `.nvmrc`), pnpm 12.18.0 và Docker.

pnpm của máy có thể khác 12.18.0. Dùng đúng phiên bản bằng `npx pnpm@12.18.0 <lệnh>` hoặc `corepack enable` để Node tự chọn theo `packageManager`.

```bash
# 1. Cài thư viện
pnpm install

# 2. Chạy PostgreSQL cho môi trường dev (cổng 127.0.0.1:55432)
docker compose -f deploy/compose.dev.yaml up -d

# 3. Cấu hình
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# 4. Tạo bảng và dữ liệu ban đầu
pnpm --filter @lab-fourt/shared build
pnpm db:migrate
pnpm db:seed

# 5. Chạy API (cổng 4000) và web (cổng 3000)
pnpm dev
```

Mở http://localhost:3000. Next chuyển `/api` sang NestJS. Tài liệu API (Swagger) ở http://localhost:4000/api/docs.

### Tài khoản ở môi trường dev

| Tên đăng nhập | Vai trò | Mật khẩu ban đầu |
|---|---|---|
| `admin` | Quản trị viên | Giá trị `SEED_ADMIN_PASSWORD` trong `apps/api/.env` |
| `giangvien` | Giảng viên | `LabFourT2026` |
| `sinhvien1`, `sinhvien2` | Sinh viên | `LabFourT2026` |

Mọi tài khoản phải đổi mật khẩu ở lần đăng nhập đầu. Tài khoản thử chỉ được tạo khi `NODE_ENV` khác `production`.

### Kiểm tra

```bash
pnpm lint
pnpm typecheck
pnpm test        # gồm kiểm thử tích hợp với CSDL labfourt_test (TEST_DATABASE_URL), bị tạo lại mỗi lần chạy
pnpm build
```

Kiểm thử đầu cuối bằng Playwright cần PostgreSQL dev đang chạy và đã `pnpm build`:

```bash
PLAYWRIGHT_CHANNEL=msedge pnpm e2e   # dùng Edge có sẵn; bỏ biến này thì cần `npx playwright install chromium`
```

### Gọi API

Mọi yêu cầu thay đổi dữ liệu (POST, PUT, PATCH, DELETE) phải có header `X-Requested-With: lab-fourt` để chống CSRF. Thiếu header thì API trả 403.

## Triển khai bằng Docker Compose

```bash
cp deploy/.env.example deploy/.env      # đổi toàn bộ mật khẩu, đặt SITE_ADDRESS
docker compose -f deploy/compose.yaml --env-file deploy/.env up -d --build
docker compose -f deploy/compose.yaml --env-file deploy/.env run --rm api npx prisma db seed   # chỉ lần đầu
```

- Mở `https://<SITE_ADDRESS>`. Với `localhost`, Caddy tự cấp chứng chỉ nội bộ nên trình duyệt sẽ cảnh báo lần đầu.
- API tự chạy migration khi khởi động. PostgreSQL không mở cổng ra ngoài.
- Uptime Kuma chỉ mở ở `http://127.0.0.1:3001` trên máy chủ.
- Sao lưu hằng ngày: xem hướng dẫn trong [deploy/backup/backup.sh](deploy/backup/backup.sh).
- Micro chỉ hoạt động qua HTTPS. Cách cấp chứng chỉ trên mạng nội bộ xem [docs/srs/06](docs/srs/06-technology-proposal.md) mục 7.1.
