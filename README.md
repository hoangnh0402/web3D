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

Mọi tài khoản phải đổi mật khẩu ở lần đăng nhập đầu. Tài khoản thử chỉ được tạo khi `NODE_ENV` khác `production`. Cách cấp tài khoản cho người dùng thật xem mục [Người dùng có tài khoản bằng cách nào](#người-dùng-có-tài-khoản-bằng-cách-nào).

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

### Tài khoản quản trị đầu tiên

Bản cài mới chưa có tài khoản nào. Mỗi máy cài có CSDL riêng, nên tài khoản ở máy này không dùng được ở máy khác.

1. Trước khi chạy seed, đặt trong `deploy/.env`:
   - `SEED_ADMIN_USERNAME`: tên đăng nhập quản trị viên, ví dụ `admin`.
   - `SEED_ADMIN_PASSWORD`: mật khẩu ban đầu, ít nhất 12 ký tự.
2. Chạy lệnh seed ở trên (chỉ lần đầu). Lệnh này tạo tài khoản quản trị viên. Bản production không tạo tài khoản thử và để các ca mẫu ở trạng thái Nháp.
3. Mở `https://<SITE_ADDRESS>/login/quan-tri`, đăng nhập bằng tài khoản vừa tạo. Hệ thống bắt đặt mật khẩu mới ở lần đầu.

Seed chỉ tạo tài khoản khi chưa có, nên sửa `SEED_ADMIN_PASSWORD` sau khi đã seed không đổi được mật khẩu. Quên mật khẩu quản trị viên thì nhờ một quản trị viên khác đặt lại ở trang Tài khoản. Vì vậy nên tạo ít nhất hai tài khoản quản trị viên.

### Trang chủ công khai

Mở địa chỉ gốc `/` khi chưa đăng nhập sẽ thấy trang tin tức với các bài viết giới thiệu và kỹ năng tham vấn (`/tin-tuc/<bài>`). Nút **Đăng nhập** ở góc trên bên phải mở ba lựa chọn: Sinh viên, Giảng viên, Quản trị viên. Người đã đăng nhập thấy nút **Vào trang của tôi**.

Bài viết là nội dung tĩnh trong [apps/web/src/features/blog/posts.ts](apps/web/src/features/blog/posts.ts): thêm hoặc sửa bài ở đó rồi build lại. Ảnh dùng các ảnh phòng tham vấn có sẵn trong `apps/web/public`; muốn dùng ảnh khác thì đặt vào `apps/web/public/rooms` hoặc `apps/web/public/3d`, không dẫn ảnh từ trang ngoài.

### Trang đăng nhập theo vai trò

| Vai trò | Trang đăng nhập | Trang làm việc |
|---|---|---|
| Sinh viên | `/login` (có Đăng ký, Quên mật khẩu) | `/student` |
| Giảng viên | `/login/giang-vien` | `/lecturer` |
| Quản trị viên | `/login/quan-tri` | `/admin` |

- Gõ `/admin` hoặc `/lecturer` khi chưa đăng nhập sẽ tự chuyển tới trang đăng nhập của vai trò đó. Đăng xuất cũng quay về đúng trang.
- Mỗi trang chỉ nhận tài khoản đúng vai trò. Đăng nhập nhầm trang thì hệ thống báo và chỉ đường sang trang đúng, không tạo phiên đăng nhập.
- Cuối mỗi trang đăng nhập có thẻ chuyển sang trang của vai trò khác.

### Người dùng có tài khoản bằng cách nào

| Vai trò | Cách có tài khoản |
|---|---|
| Quản trị viên | Tài khoản đầu tiên tạo bằng seed. Các tài khoản sau do quản trị viên tạo ở trang **Tài khoản**. |
| Giảng viên | Quản trị viên tạo ở trang **Tài khoản** (bấm **Tạo tài khoản** hoặc **Nhập CSV**), rồi gửi mật khẩu tạm cho giảng viên. |
| Sinh viên | Cách 1: tự đăng ký ở trang đăng nhập, ghi lớp hoặc mã sinh viên, rồi chờ quản trị viên bấm **Duyệt** trong khối **Chờ xử lý** ở trang **Tài khoản**. Cách 2: quản trị viên tạo hoặc nhập CSV như giảng viên. |

- Mật khẩu tạm chỉ hiện một lần. Người dùng phải đổi mật khẩu ở lần đăng nhập đầu.
- Quản trị viên tắt tự đăng ký ở trang **Cấu hình** nếu chỉ muốn cấp tài khoản thủ công.
- Quên mật khẩu: người dùng bấm **Quên mật khẩu?** ở trang đăng nhập để gửi yêu cầu. Hệ thống không gửi email. Quản trị viên xác minh đúng người, bấm **Cấp mật khẩu tạm** trong khối **Chờ xử lý**, rồi trao mật khẩu tạm trực tiếp.
- Sau khi tạo tài khoản sinh viên và giảng viên, quản trị viên xếp họ vào lớp ở trang **Lớp** để giảng viên giao bài được.

### Truy cập từ máy khác trong mạng nội bộ

1. Đặt `SITE_ADDRESS` trong `deploy/.env` là IP hoặc tên miền nội bộ của máy chủ, ví dụ `SITE_ADDRESS=192.168.1.50`, rồi tạo lại Caddy:
   ```bash
   docker compose -f deploy/compose.yaml --env-file deploy/.env up -d --force-recreate caddy
   ```
2. Mở cổng 80 và 443 trên tường lửa của máy chủ.
3. Cài chứng chỉ gốc của Caddy lên từng máy và điện thoại truy cập. Nếu không, trình duyệt sẽ báo "kết nối không riêng tư" và micro không dùng được. Lấy chứng chỉ trên máy chủ:
   ```bash
   docker compose -f deploy/compose.yaml --env-file deploy/.env cp caddy:/data/caddy/pki/authorities/local/root.crt ./caddy-root.crt
   ```
   - Windows: `certutil -user -addstore Root caddy-root.crt`, rồi mở lại trình duyệt.
   - iPhone, iPad: gửi tệp sang máy, cài hồ sơ, rồi bật tin cậy ở Cài đặt > Cài đặt chung > Giới thiệu > Cài đặt tin cậy chứng nhận.
   - Android: Cài đặt > Bảo mật > Mã hóa và thông tin xác thực > Cài đặt chứng chỉ > Chứng chỉ CA.
4. Người dùng mở `https://<SITE_ADDRESS>`.

Chỉ thử trên chính máy chủ thì có thể đặt `SITE_ADDRESS=http://localhost` để bỏ HTTPS và không phải cài chứng chỉ. Cách này không dùng được từ máy khác.
