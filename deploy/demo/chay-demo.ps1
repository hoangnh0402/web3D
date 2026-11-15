# Chạy bản demo Lab FourT trên Windows bằng một lệnh (CHAY-DEMO.bat gọi tệp này).
# Các bước: kiểm tra Docker -> tạo cấu hình -> build và khởi động -> chờ sẵn sàng -> nạp dữ liệu demo -> mở trình duyệt.
# Chạy lại bao nhiêu lần cũng được: dữ liệu đã có được giữ nguyên.

# Không dùng 'Stop': PowerShell 5.1 coi mọi dòng docker in ra stderr (kể cả tiến độ build) là lỗi. Lỗi được kiểm tra qua $LASTEXITCODE.
$ErrorActionPreference = 'Continue'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
# UTF-8 không BOM: [Text.Encoding]::UTF8 của PowerShell 5.1 chèn BOM vào dữ liệu đẩy sang chương trình ngoài, psql sẽ báo lỗi cú pháp
$OutputEncoding = New-Object System.Text.UTF8Encoding $false

$Root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$Compose = Join-Path $Root 'deploy\compose.yaml'
$EnvFile = Join-Path $PSScriptRoot '.env'
$Template = Join-Path $PSScriptRoot 'demo.env.template'
$Project = 'lab-fourt-demo'
$Url = 'http://localhost'
$DemoUsers = "'admin','giangvien','sinhvien1','sinhvien2'"

function Step([string]$n, [string]$text) { Write-Host ''; Write-Host "[$n/6] $text" -ForegroundColor Cyan }
function Ok([string]$text) { Write-Host "      $text" -ForegroundColor Green }
function Info([string]$text) { Write-Host "      $text" }
function Fail([string]$text, [string]$hint = '') {
  Write-Host ''
  Write-Host "  CHƯA CHẠY ĐƯỢC: $text" -ForegroundColor Red
  if ($hint) { Write-Host "  Cách xử lý: $hint" -ForegroundColor Yellow }
  Write-Host '  Xem thêm mục "Khi gặp lỗi" trong tài liệu hướng dẫn.' -ForegroundColor Yellow
  exit 1
}
# Gọi docker compose cho đúng dự án demo
function Dc { & docker compose -p $Project -f $Compose --env-file $EnvFile @args }
function EngineUp { & docker info --format '{{.ServerVersion}}' *> $null; return ($LASTEXITCODE -eq 0) }

Write-Host '==============================================' -ForegroundColor Cyan
Write-Host '   LAB FOURT - KHỞI ĐỘNG BẢN DEMO' -ForegroundColor Cyan
Write-Host '==============================================' -ForegroundColor Cyan
Write-Host 'Lần đầu mất khoảng 5 đến 15 phút (tải và build). Những lần sau chỉ khoảng 1 phút.'
Write-Host 'Đừng đóng cửa sổ này trong lúc chạy.'

# ---------- 1. Docker ----------
Step 1 'Kiểm tra Docker Desktop'
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Start-Process 'https://www.docker.com/products/docker-desktop/'
  Fail 'Máy chưa cài Docker Desktop.' 'Trình duyệt vừa mở trang tải Docker Desktop. Cài xong, khởi động lại máy rồi chạy lại CHAY-DEMO.'
}
if (-not (EngineUp)) {
  $candidates = @(
    "$env:ProgramFiles\Docker\Docker\Docker Desktop.exe",
    "$env:LOCALAPPDATA\Programs\DockerDesktop\Docker Desktop.exe",
    "$env:LOCALAPPDATA\Docker\Docker Desktop.exe"
  )
  $exe = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
  if (-not $exe) { Fail 'Docker Desktop chưa chạy.' 'Mở Docker Desktop từ menu Start, chờ biểu tượng cá voi báo "Engine running" rồi chạy lại CHAY-DEMO.' }
  Info 'Docker Desktop chưa chạy, đang mở... (có thể mất 1 đến 2 phút)'
  Start-Process $exe
  $deadline = (Get-Date).AddMinutes(4)
  while (-not (EngineUp)) {
    if ((Get-Date) -gt $deadline) { Fail 'Docker Desktop mở quá lâu.' 'Mở Docker Desktop, chờ báo "Engine running" (nếu Docker hỏi điều khoản thì bấm Accept) rồi chạy lại CHAY-DEMO.' }
    Start-Sleep -Seconds 5
  }
}
Ok 'Docker đã sẵn sàng.'

# ---------- 2. Cổng 80 ----------
Step 2 'Kiểm tra cổng 80 (địa chỉ http://localhost)'
$mine = (Dc ps -q caddy 2>$null)
$busy = Get-NetTCPConnection -LocalPort 80 -State Listen -ErrorAction SilentlyContinue
if ($busy -and -not $mine) {
  $owner = ($busy | Select-Object -First 1 | ForEach-Object { (Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue).ProcessName })
  if ($owner -match 'docker|wslrelay|vpnkit') {
    Fail 'Cổng 80 đang được một ứng dụng Docker khác dùng.' 'Mở Docker Desktop, mục Containers, bấm Stop ở ứng dụng đang chạy, rồi chạy lại CHAY-DEMO.'
  }
  Fail "Cổng 80 đang bị chương trình '$owner' dùng." "Tắt chương trình '$owner' (ví dụ Skype, IIS, XAMPP) rồi chạy lại CHAY-DEMO."
}
Ok 'Cổng 80 dùng được.'

# ---------- 3. Cấu hình ----------
Step 3 'Chuẩn bị cấu hình'
if (-not (Test-Path $EnvFile)) {
  [System.IO.File]::WriteAllText($EnvFile, (Get-Content $Template -Raw -Encoding UTF8), (New-Object System.Text.UTF8Encoding $false))
  Ok 'Đã tạo cấu hình mới.'
} else { Ok 'Dùng cấu hình đã có.' }

# ---------- 4. Build và khởi động ----------
Step 4 'Build và khởi động web (lần đầu lâu nhất, hãy chờ)'
Dc up -d --build
if ($LASTEXITCODE -ne 0) {
  Fail 'Build hoặc khởi động không thành công.' 'Kiểm tra máy có Internet (lần đầu cần tải khoảng 1 GB), ổ đĩa còn trống ít nhất 10 GB, rồi chạy lại CHAY-DEMO.'
}
Ok 'Các thành phần đã khởi động.'

# ---------- 5. Chờ sẵn sàng và nạp dữ liệu ----------
Step 5 'Chờ web sẵn sàng và nạp dữ liệu demo'
$deadline = (Get-Date).AddMinutes(5)
while ($true) {
  try { if ((Invoke-WebRequest "$Url/api/health" -UseBasicParsing -TimeoutSec 5).StatusCode -eq 200) { break } } catch { }
  if ((Get-Date) -gt $deadline) { Fail 'Web chưa phản hồi sau 5 phút.' 'Chạy DUNG-DEMO rồi chạy lại CHAY-DEMO. Nếu vẫn lỗi, khởi động lại máy.' }
  Start-Sleep -Seconds 3
}
# Seed ở chế độ development: thêm tài khoản giảng viên, sinh viên, lớp mẫu và xuất bản sẵn các ca.
# Chạy lại không tạo trùng (seed chỉ thêm cái còn thiếu).
Dc run --rm -e NODE_ENV=development api npx prisma db seed *> $null
if ($LASTEXITCODE -ne 0) { Fail 'Không nạp được dữ liệu demo.' 'Chạy lại CHAY-DEMO.' }
# Bản demo bỏ bước bắt đổi mật khẩu ở lần đăng nhập đầu, để quay video liền mạch
# Câu lệnh SQL đi qua stdin vì PowerShell 5.1 làm hỏng dấu ngoặc kép lồng nhau khi gọi chương trình ngoài.
# Gọi docker trực tiếp: dữ liệu đẩy vào hàm Dc không được chuyển tiếp tới stdin của docker.
$sql = "update users set must_change_password = false where username in ($DemoUsers);"
$sql | & docker compose -p $Project -f $Compose --env-file $EnvFile exec -T postgres sh -c 'psql -q -v ON_ERROR_STOP=1 -U $POSTGRES_USER -d $POSTGRES_DB' *> $null
if ($LASTEXITCODE -ne 0) { Fail 'Không cập nhật được tài khoản demo.' 'Chạy lại CHAY-DEMO.' }
Ok 'Dữ liệu demo đã sẵn sàng.'

# ---------- 6. Mở trình duyệt ----------
Step 6 'Mở web'
Start-Process $Url
Write-Host ''
Write-Host '==============================================' -ForegroundColor Green
Write-Host '   XONG! Web đang chạy tại  http://localhost' -ForegroundColor Green
Write-Host '==============================================' -ForegroundColor Green
Write-Host ''
Write-Host '  Tài khoản demo:'
Write-Host '    Sinh viên      sinhvien1   /  LabFourT2026'
Write-Host '    Giảng viên     giangvien   /  LabFourT2026'
Write-Host '    Quản trị viên  admin       /  LabFourTAdmin2026'
Write-Host ''
Write-Host '  Dùng xong, chạy DUNG-DEMO để tắt (dữ liệu vẫn được giữ cho lần sau).'
