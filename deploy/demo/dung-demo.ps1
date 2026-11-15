# Tắt bản demo Lab FourT (DUNG-DEMO.bat gọi tệp này). Dữ liệu vẫn được giữ cho lần chạy sau.
# Thêm tham số -XoaDuLieu để xóa sạch dữ liệu demo và bắt đầu lại từ đầu (XOA-DU-LIEU-DEMO.bat).
# -KhongHoi bỏ bước hỏi xác nhận, dùng khi chạy tự động.
param([switch]$XoaDuLieu, [switch]$KhongHoi)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$Root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$Compose = Join-Path $Root 'deploy\compose.yaml'
$EnvFile = Join-Path $PSScriptRoot '.env'
$Project = 'lab-fourt-demo'

if (-not (Test-Path $EnvFile)) { Write-Host 'Bản demo chưa từng chạy trên máy này, không có gì để tắt.'; exit 0 }
& docker info *> $null
if ($LASTEXITCODE -ne 0) { Write-Host 'Docker Desktop đang tắt, nghĩa là bản demo cũng đã dừng.'; exit 0 }

if ($XoaDuLieu -and -not $KhongHoi) {
  Write-Host 'Thao tác này XÓA toàn bộ tài khoản mới, bài giao, phiên thực hành và báo cáo đã tạo trong bản demo.' -ForegroundColor Yellow
  Write-Host 'Lần chạy CHAY-DEMO tiếp theo sẽ có lại dữ liệu mẫu ban đầu, rất hợp trước khi quay video.'
  $answer = Read-Host 'Gõ XOA rồi bấm Enter để xác nhận (bấm Enter luôn để hủy)'
  if ($answer -ne 'XOA') { Write-Host 'Đã hủy, dữ liệu vẫn còn nguyên.'; exit 0 }
}
if ($XoaDuLieu) {
  Write-Host 'Đang tắt và XÓA toàn bộ dữ liệu demo...' -ForegroundColor Yellow
  & docker compose -p $Project -f $Compose --env-file $EnvFile down -v
} else {
  Write-Host 'Đang tắt bản demo...'
  & docker compose -p $Project -f $Compose --env-file $EnvFile down
}
if ($LASTEXITCODE -eq 0) { Write-Host 'Đã tắt. Muốn chạy lại thì mở CHAY-DEMO.' -ForegroundColor Green }
else { Write-Host 'Chưa tắt được. Mở Docker Desktop, mục Containers, bấm Stop ở lab-fourt-demo.' -ForegroundColor Red }
