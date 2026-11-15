#!/usr/bin/env bash
# Tắt bản demo Lab FourT trên macOS hoặc Linux. Thêm --xoa-du-lieu để xóa sạch dữ liệu demo.
DIR="$(cd "$(dirname "$0")" && pwd)"
COMPOSE="$DIR/../compose.yaml"
ENV_FILE="$DIR/.env"
[ -f "$ENV_FILE" ] || { echo 'Bản demo chưa từng chạy trên máy này.'; exit 0; }
docker info >/dev/null 2>&1 || { echo 'Docker Desktop đang tắt, nghĩa là bản demo cũng đã dừng.'; exit 0; }
if [ "${1:-}" = "--xoa-du-lieu" ]; then
  echo 'Đang tắt và XÓA toàn bộ dữ liệu demo...'
  docker compose -p lab-fourt-demo -f "$COMPOSE" --env-file "$ENV_FILE" down -v
else
  echo 'Đang tắt bản demo...'
  docker compose -p lab-fourt-demo -f "$COMPOSE" --env-file "$ENV_FILE" down
fi && echo 'Đã tắt. Muốn chạy lại thì chạy chay-demo.command.'
