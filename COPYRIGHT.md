# Công nghệ, thư viện và giấy phép của Lab FourT

Tệp này chốt bộ công nghệ của sản phẩm Lab FourT: tên, phiên bản được ghim và giấy phép của từng thành phần. Đây là danh sách chính thức khi khởi tạo và phát triển mã nguồn.

- **Ngày kiểm tra:** 10/11/2026, đối chiếu npm registry, nodejs.org và Docker Hub.
- **Hướng kiến trúc:** frontend Next.js, backend NestJS, cơ sở dữ liệu PostgreSQL, triển khai bằng Docker Compose trên máy chủ local.
- **Phạm vi:** phần web và phòng 3D. Công nghệ AI và nhận dạng giọng nói do đầu mối AI chọn, giao tiếp qua hợp đồng ở [docs/srs/07-ai-voice-interface.md](docs/srs/07-ai-voice-interface.md).

## Quy tắc ghim phiên bản

1. Mọi gói ghi phiên bản chính xác trong `package.json` (không dùng `^` hay `~`). `pnpm-lock.yaml` được commit.
2. Không cài theo thẻ `latest`. Một số gói đang để `latest` trỏ vào bản thử nghiệm (xem mục Không dùng).
3. Muốn đổi phiên bản hoặc thêm thư viện thì phải sửa tệp này trong cùng pull request, ghi rõ lý do và kết quả kiểm tra tương thích.
4. Bản vá bảo mật (số cuối) được nâng ngay, nhưng vẫn phải cập nhật tệp này.

## 1. Nền tảng và hạ tầng

| Thành phần | Phiên bản | Giấy phép | Vai trò |
|---|---|---|---|
| Node.js | 24.22.2 (LTS) | MIT | Runtime cho Next.js và NestJS. Hỗ trợ đến 30/04/2028 |
| pnpm | 12.18.0 | MIT | Quản lý gói, workspace cho monorepo |
| TypeScript | 6.0.3 | Apache-2.0 | Dùng chung toàn dự án |
| PostgreSQL | 18.6 (image `postgres:18.6`) | PostgreSQL License | Dữ liệu, phiên đăng nhập, hàng đợi |
| Caddy | 2.11.9 (image `caddy:2.11.9`) | Apache-2.0 | HTTPS, HTTP/2, reverse proxy cho web và `/api` |
| Docker Compose | Bản đi kèm Docker Engine trên máy chủ | Apache-2.0 | Khởi động toàn hệ thống bằng một lệnh |
| Uptime Kuma | 2.5.9 (image `louislam/uptime-kuma:2.5.9`) | MIT | Theo dõi dịch vụ và cảnh báo |

## 2. Frontend (`apps/web`)

| Thư viện | Phiên bản | Giấy phép | Vai trò |
|---|---|---|---|
| `next` | 16.4.6 | MIT | Khung ứng dụng, App Router, build `output: 'standalone'` |
| `react`, `react-dom` | 19.3.1 | MIT | Thư viện giao diện |
| `@tanstack/react-query` | 5.107.1 | MIT | Gọi API, cache, thử lại, trạng thái tải và lỗi |
| `zustand` | 5.1.0 | MIT | Trạng thái cục bộ, cầu nối hội thoại với phòng 3D |
| `tailwindcss`, `@tailwindcss/postcss` | 4.3.5 | MIT | CSS |
| `radix-ui` | 1.8.1 | MIT | Thành phần truy cập được bằng bàn phím, nền của shadcn/ui |
| `shadcn` (CLI) | 4.23.0 | MIT | Sinh mã thành phần vào dự án, không phải thư viện chạy |
| `lucide-react` | 1.71.0 | ISC | Biểu tượng |
| `react-hook-form` | 7.91.0 | MIT | Biểu mẫu |
| `@hookform/resolvers` | 7.0.5 | MIT | Nối biểu mẫu với lược đồ Zod |
| `zod` | 4.6.7 | MIT | Lược đồ dữ liệu dùng chung với backend |
| `@fontsource/be-vietnam-pro` | 5.3.0 | OFL-1.1 | Font giao diện, tự lưu trữ để chạy không cần internet |

**Về React:** App Router của Next.js 16.4.6 chạy bằng bản React đóng gói sẵn bên trong Next (`19.3.0-canary-278794d7-20261002`), không dùng bản `react` cài ngoài. Cả hai đều thuộc dòng 19.3, khớp với yêu cầu `>=19 <19.4` của React Three Fiber. Khi nâng Next.js phải kiểm tra lại bản React mà Next đóng gói.

## 3. Phòng 3D (trong `apps/web`)

| Thư viện | Phiên bản | Giấy phép | Vai trò |
|---|---|---|---|
| `three` | 0.186.1 | MIT | Dựng hình WebGL 2 bằng `WebGLRenderer` |
| `@types/three` | 0.186.0 | MIT | Kiểu dữ liệu cho Three.js |
| `@react-three/fiber` | 9.8.2 | MIT | Three.js trong React. Yêu cầu React `>=19 <19.4` |
| `@react-three/drei` | 10.7.9 | MIT | Helper: tải GLTF, `PerformanceMonitor` |
| `meshoptimizer` | 1.3.0 | MIT | Giải nén lưới đã nén meshopt |
| `@gltf-transform/cli` | 4.5.1 | MIT | Nén tài sản 3D lúc build (công cụ, không đóng gói vào sản phẩm) |

Prototype tại [docs/design/UI/prototype](docs/design/UI/prototype) đã chạy thật với `three` 0.186, Fiber 9.8 và React 19.3.

## 4. Backend (`apps/api`, gồm API và worker)

| Thư viện | Phiên bản | Giấy phép | Vai trò |
|---|---|---|---|
| `@nestjs/core`, `@nestjs/common`, `@nestjs/platform-express` | 12.4.2 | MIT | Khung backend |
| `@nestjs/testing` | 12.4.2 | MIT | Kiểm thử module NestJS |
| `@nestjs/cli` | 12.0.12 | MIT | Công cụ dòng lệnh. Đi kèm TypeScript `~6.0.2`, là lý do cả dự án dùng TypeScript 6.0 |
| `@nestjs/config` | 12.1.1 | MIT | Cấu hình theo biến môi trường |
| `@nestjs/swagger` | 12.1.1 | MIT | Sinh tài liệu OpenAPI |
| `@nestjs/throttler` | 6.7.1 | MIT | Giới hạn tần suất gọi API |
| `@nestjs/schedule` | 12.0.3 | MIT | Lịch chạy tác vụ định kỳ trong worker |
| `reflect-metadata` | 0.2.2 | Apache-2.0 | Bắt buộc cho decorator của NestJS |
| `rxjs` | 7.8.2 | Apache-2.0 | Bắt buộc cho NestJS, dùng cho luồng SSE |
| `prisma` (CLI), `@prisma/client` | 7.10.1 | Apache-2.0 | ORM, migration có phiên bản |
| `pg-boss` | 12.38.1 | MIT | Hàng đợi tác vụ chạy trên PostgreSQL. Cần Node 22.12 trở lên |
| `argon2` | 0.45.2 | MIT | Băm mật khẩu Argon2id |
| `cookie-parser` | 1.4.7 | MIT | Đọc cookie phiên `HttpOnly` |
| `pino` | 10.4.0 | MIT | Log JSON có cấu trúc |
| `pino-http`, `nestjs-pino` | 11.0.0, 5.3.1 | MIT | Nối Pino vào NestJS |

**Kiểm tra dữ liệu đầu vào:** dùng chính lược đồ Zod trong `packages/shared` qua một `ZodValidationPipe` tự viết (khoảng 20 dòng). Không dùng `nestjs-zod` (xem mục Không dùng).

## 5. Kiểm thử và công cụ

| Công cụ | Phiên bản | Giấy phép | Vai trò |
|---|---|---|---|
| `vitest` | 5.1.0 | MIT | Kiểm thử đơn vị và tích hợp |
| `@testing-library/react` | 16.3.3 | MIT | Kiểm thử thành phần giao diện |
| `@playwright/test` | 1.65.0 | Apache-2.0 | Kiểm thử đầu cuối trên Chromium, Firefox, WebKit |
| k6 | Bản ổn định mới nhất khi chạy thử tải | AGPL-3.0 | Thử tải 50 phiên. Chỉ chạy trên máy kiểm thử, không đóng gói hay phân phối |
| `eslint` | 10.14.0 | MIT | Kiểm tra mã |
| `eslint-config-next` | 16.4.6 | MIT | Luật ESLint cho Next.js, cùng phiên bản với `next` |
| `prettier` | 3.9.10 | MIT | Định dạng mã |
| `@types/node` | 24.19.2 | MIT | Kiểu dữ liệu Node 24 |

### 5.1. Bổ sung khi khởi tạo mã nguồn (10/11/2026)

Các gói phụ trợ bắt buộc phải có để những thư viện ở trên chạy được, phát hiện khi dựng nền móng.

| Thư viện | Phiên bản | Giấy phép | Vì sao cần |
|---|---|---|---|
| `@prisma/adapter-pg`, `pg` | 7.10.1, 8.23.1 | Apache-2.0, MIT | Prisma 7 bắt buộc dùng driver adapter để kết nối PostgreSQL |
| `@types/pg` | 8.23.1 | MIT | Kiểu dữ liệu cho `pg` |
| `typescript-eslint`, `@eslint/js`, `globals` | 8.72.2, 10.0.1, 17.14.0 | MIT | Chạy ESLint 10 cho mã TypeScript của API và `packages/shared` |
| `unplugin-swc`, `@swc/core` | 2.0.0, 1.16.22 | MIT, Apache-2.0 | Vitest dùng esbuild, không sinh được metadata của decorator mà NestJS cần |
| `supertest`, `@types/supertest` | 7.3.2, 7.2.1 | MIT | Kiểm thử tích hợp API qua HTTP |
| `tsx` | 4.23.15 | MIT | Chạy script seed viết bằng TypeScript |
| `@types/express`, `@types/cookie-parser` | 5.0.6, 1.4.10 | MIT | Kiểu dữ liệu cho Express (nền của NestJS) và cookie-parser |
| `vite`, `@vitejs/plugin-react`, `jsdom` | 8.3.7, 6.3.0, 31.0.0 | MIT | Vitest chạy kiểm thử thành phần React trong môi trường DOM giả lập |
| `@testing-library/dom`, `@testing-library/jest-dom`, `@testing-library/user-event` | 10.4.2, 7.0.1, 14.6.9 | MIT | Đi kèm `@testing-library/react` để thao tác và kiểm tra DOM |
| `@types/react`, `@types/react-dom` | 19.3.0 | MIT | Kiểu dữ liệu React 19.3 |
| `postcss` | 8.5.32 | MIT | Tailwind 4 chạy qua PostCSS trong Next.js |

Lưu ý khi cài:

- `pnpm-workspace.yaml` chỉ cho phép script cài đặt của `prisma`, `@prisma/engines`, `argon2`, `@swc/core`, `esbuild`. Gói `@scarf/scarf` (gửi số liệu sử dụng) bị chặn.
- Các plugin `eslint-plugin-react`, `eslint-plugin-import`, `eslint-plugin-jsx-a11y` trong `eslint-config-next` chưa khai báo hỗ trợ ESLint 10, nên pnpm báo cảnh báo peer dependency. Thực tế lint chạy đúng. Theo dõi khi các plugin này ra bản mới.
- `radix-ui`, `shadcn`, `class-variance-authority`, `clsx`, `tailwind-merge` vẫn nằm trong danh sách được phép nhưng chưa cài. Màn hình hiện tại dùng lại CSS của prototype; sẽ thêm khi cần thành phần tương tác phức tạp (hộp thoại, menu).

## 6. Tài sản 3D, hình ảnh và font

| Tài sản | Nguồn | Giấy phép | Ghi chú |
|---|---|---|---|
| Nhân vật Hà Linh | VALID: Validated Avatar Library for Inclusion and Diversity (UCF, Google), bản glTF của c-frame/valid-avatars-glb | MIT | Đã chỉnh màu da và môi (`tools/fetch-characters.py`) |
| Nhân vật Tuấn Kiệt, Mai Phương | Microsoft Rocketbox Avatar Library | MIT | |
| Nội thất, vật liệu phòng tham vấn | Poly Haven | CC0 | Không bắt buộc ghi công, vẫn ghi để minh bạch |
| Ảnh nền phòng, ảnh tĩnh, nền lá | Nhóm dự án tự dựng từ các nguồn trên | Theo giấy phép của dự án | |
| Font Be Vietnam Pro | Google Fonts, gói `@fontsource/be-vietnam-pro` | SIL Open Font License 1.1 | |

Sản phẩm phân phối phải giữ thông báo bản quyền MIT của VALID và Rocketbox, kèm thông báo giấy phép OFL của font. Thông báo đầy đủ được gom vào trang "Giấy phép" của ứng dụng khi khởi tạo `apps/web`.

## 7. Không dùng và lý do

| Thành phần | Lý do |
|---|---|
| `prisma` 8.0.0-rc | Thẻ `latest` của `prisma` đang trỏ vào bản thử nghiệm `8.0.0-rc.33`. Ghim 7.10.1 |
| `three` 0.187.0 | Phát hành ngày 30/10/2026, chưa thử với prototype. Giữ 0.186.1 đến khi kiểm chứng |
| TypeScript 7.0 | `@nestjs/cli` đi kèm `~6.0.2` và `@nestjs/swagger` chỉ nhận `^5.5 \|\| ^6`. Chờ NestJS xác nhận hỗ trợ |
| React 19.4 trở lên | `@react-three/fiber` 9.8.2 chỉ nhận React `<19.4` |
| `nestjs-zod` 5.6.0 | Chỉ nhận `@nestjs/common` 10 hoặc 11, chưa hỗ trợ NestJS 12 |
| Server Actions, Route Handlers chứa nghiệp vụ trong Next.js | Mọi nghiệp vụ, dữ liệu và phân quyền nằm ở NestJS để có một nơi kiểm soát duy nhất |
| Redis | PostgreSQL đủ làm hàng đợi và kho phiên cho 50 người dùng. Chỉ thêm khi chạy nhiều tiến trình API |
| WebGPU, `@react-three/xr` | Chưa cần cho v1. VR không thuộc phạm vi v1 |

## 8. Nguyên tắc khi dùng Next.js

1. Next.js chỉ làm giao diện. Gọi API NestJS qua `/api` sau Caddy, dùng chung cookie phiên.
2. `proxy.ts` của Next (tên mới của middleware từ Next 16) chỉ chuyển hướng trang theo trạng thái đăng nhập. Quyền thật luôn được kiểm tra lại ở NestJS.
3. Phòng 3D tải bằng `dynamic(() => import(...), { ssr: false })` trong error boundary riêng, để lỗi WebGL không làm hỏng hội thoại.
4. Build `output: 'standalone'`, chạy trong container riêng sau Caddy. Không dùng dịch vụ hay CDN bên ngoài lúc chạy, để hệ thống hoạt động trên mạng không có internet.

## 9. Bản quyền mã nguồn

Mã nguồn Lab FourT thuộc chủ sở hữu dự án. Giấy phép phát hành mã nguồn chưa được chốt.

Toàn bộ thư viện bên thứ ba ở trên là mã nguồn mở với giấy phép cho phép dùng thương mại (MIT, ISC, Apache-2.0, PostgreSQL License, OFL-1.1, CC0). Riêng k6 dùng AGPL-3.0, chỉ chạy như công cụ kiểm thử độc lập, không liên kết vào sản phẩm. Không có khoản phí bản quyền nào.
