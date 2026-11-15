#!/usr/bin/env bash
# Chạy bản demo Lab FourT trên macOS hoặc Linux bằng một lệnh:  bash chay-demo.command  (ở thư mục gốc)
# Cùng các bước với chay-demo.ps1 của Windows. Chạy lại bao nhiêu lần cũng được, dữ liệu được giữ.
set -u
DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$DIR/../.." && pwd)"
COMPOSE="$ROOT/deploy/compose.yaml"
ENV_FILE="$DIR/.env"
PROJECT=lab-fourt-demo
URL=http://localhost

step() { printf '\n\033[36m[%s/6] %s\033[0m\n' "$1" "$2"; }
ok() { printf '      \033[32m%s\033[0m\n' "$1"; }
fail() { printf '\n  \033[31mCHƯA CHẠY ĐƯỢC: %s\033[0m\n' "$1"; [ -n "${2:-}" ] && printf '  \033[33mCách xử lý: %s\033[0m\n' "$2"; printf '  Xem mục "Khi gặp lỗi" trong tài liệu hướng dẫn.\n'; exit 1; }
dc() { docker compose -p "$PROJECT" -f "$COMPOSE" --env-file "$ENV_FILE" "$@"; }
engine_up() { docker info >/dev/null 2>&1; }
open_url() { if command -v open >/dev/null; then open "$1"; elif command -v xdg-open >/dev/null; then xdg-open "$1" >/dev/null 2>&1; fi; }

echo '=============================================='
echo '   LAB FOURT - KHỞI ĐỘNG BẢN DEMO'
echo '=============================================='
echo 'Lần đầu mất khoảng 5 đến 15 phút (tải và build). Những lần sau chỉ khoảng 1 phút.'

step 1 'Kiểm tra Docker Desktop'
if ! command -v docker >/dev/null; then
  open_url 'https://www.docker.com/products/docker-desktop/'
  fail 'Máy chưa cài Docker Desktop.' 'Trình duyệt vừa mở trang tải Docker Desktop. Cài xong rồi chạy lại lệnh này.'
fi
if ! engine_up; then
  echo '      Docker Desktop chưa chạy, đang mở... (có thể mất 1 đến 2 phút)'
  if [ "$(uname)" = Darwin ]; then open -a Docker || true; fi
  for _ in $(seq 1 48); do engine_up && break; sleep 5; done
  engine_up || fail 'Docker Desktop chưa chạy.' 'Mở Docker Desktop, chờ báo "Engine running" rồi chạy lại lệnh này.'
fi
ok 'Docker đã sẵn sàng.'

step 2 'Kiểm tra cổng 80 (địa chỉ http://localhost)'
if [ -z "$(dc ps -q caddy 2>/dev/null)" ] && command -v lsof >/dev/null && lsof -nP -iTCP:80 -sTCP:LISTEN >/dev/null 2>&1; then
  fail 'Cổng 80 đang bị một chương trình khác dùng.' 'Tắt chương trình đó (hoặc ứng dụng khác trong Docker Desktop) rồi chạy lại.'
fi
ok 'Cổng 80 dùng được.'

step 3 'Chuẩn bị cấu hình'
if [ ! -f "$ENV_FILE" ]; then
  cp "$DIR/demo.env.template" "$ENV_FILE"
  ok 'Đã tạo cấu hình mới.'
else ok 'Dùng cấu hình đã có.'; fi

step 4 'Build và khởi động web (lần đầu lâu nhất, hãy chờ)'
dc up -d --build || fail 'Build hoặc khởi động không thành công.' 'Kiểm tra Internet (lần đầu tải khoảng 1 GB) và ổ đĩa còn trống ít nhất 10 GB, rồi chạy lại.'
ok 'Các thành phần đã khởi động.'

step 5 'Chờ web sẵn sàng và nạp dữ liệu demo'
for i in $(seq 1 100); do curl -fs "$URL/api/health" >/dev/null 2>&1 && break; [ "$i" = 100 ] && fail 'Web chưa phản hồi sau 5 phút.' 'Chạy dung-demo rồi chạy lại.'; sleep 3; done
dc run --rm -e NODE_ENV=development api npx prisma db seed >/dev/null 2>&1 || fail 'Không nạp được dữ liệu demo.' 'Chạy lại lệnh này.'
echo "update users set must_change_password = false where username in ('admin','giangvien','sinhvien1','sinhvien2');" \
  | dc exec -T postgres sh -c 'psql -q -v ON_ERROR_STOP=1 -U $POSTGRES_USER -d $POSTGRES_DB' >/dev/null 2>&1 || fail 'Không cập nhật được tài khoản demo.' 'Chạy lại lệnh này.'
ok 'Dữ liệu demo đã sẵn sàng.'

step 6 'Mở web'
open_url "$URL"
printf '\n\033[32m==============================================\n   XONG! Web đang chạy tại  http://localhost\n==============================================\033[0m\n\n'
echo '  Tài khoản demo:'
echo '    Sinh viên      sinhvien1   /  LabFourT2026'
echo '    Giảng viên     giangvien   /  LabFourT2026'
echo '    Quản trị viên  admin       /  LabFourTAdmin2026'
echo
echo '  Dùng xong, chạy:  bash dung-demo.command  để tắt (dữ liệu vẫn được giữ).'
