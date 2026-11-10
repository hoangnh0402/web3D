#!/bin/sh
# Sao lưu PostgreSQL hằng ngày sang ổ đĩa khác (docs/srs/06 mục 6, NFR-BAK).
# Chạy trên máy chủ, từ gốc monorepo:  sh deploy/backup/backup.sh
#
# Lên lịch bằng cron, ví dụ 01:30 hằng ngày:
#   30 1 * * * cd /opt/lab-fourt && sh deploy/backup/backup.sh >> /var/log/lab-fourt-backup.log 2>&1
#
# Khôi phục một bản sao lưu:
#   gunzip -c <tệp>.sql.gz | docker compose -f deploy/compose.yaml --env-file deploy/.env \
#     exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
set -eu

ENV_FILE="${ENV_FILE:-deploy/.env}"
# shellcheck disable=SC1090
. "./$ENV_FILE"
: "${BACKUP_DIR:?Thiếu BACKUP_DIR trong deploy/.env}"
KEEP="${BACKUP_KEEP:-14}"

mkdir -p "$BACKUP_DIR"
FILE="$BACKUP_DIR/labfourt-$(date +%Y%m%d-%H%M%S).sql.gz"
docker compose -f deploy/compose.yaml --env-file "$ENV_FILE" exec -T postgres \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner | gzip > "$FILE.tmp"
mv "$FILE.tmp" "$FILE"
echo "$(date -Iseconds) Đã sao lưu: $FILE"

# Ghi thời điểm sao lưu để trang Trạng thái hệ thống hiển thị (FR-ADM-03)
docker compose -f deploy/compose.yaml --env-file "$ENV_FILE" exec -T postgres   psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -q -c   "INSERT INTO system_settings (key, value, created_at, updated_at) VALUES ('backup.lastAt', to_jsonb(to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD\"T\"HH24:MI:SS\"Z\"')), now(), now())
   ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();"

# Chỉ giữ KEEP bản mới nhất
ls -1t "$BACKUP_DIR"/labfourt-*.sql.gz | tail -n +"$((KEEP + 1))" | while read -r old; do
  rm -f "$old"
  echo "Đã xóa bản cũ: $old"
done
