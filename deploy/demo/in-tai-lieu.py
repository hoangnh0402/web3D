"""In tài liệu hướng dẫn bàn giao ra PDF bằng Microsoft Edge (có sẵn trên Windows), không cần cài thêm gì.

Chạy ở gốc monorepo:  python deploy/demo/in-tai-lieu.py
Nguồn:   docs/ban-giao/huong-dan.html (ảnh trong docs/ban-giao/anh, font trong docs/ban-giao/fonts)
Kết quả: docs/ban-giao/Huong-dan-va-kich-ban-demo-LabFourT.pdf
Sau đó đóng gói lại: python deploy/demo/dong-goi.py
"""

import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'docs' / 'ban-giao' / 'huong-dan.html'
OUT = ROOT / 'docs' / 'ban-giao' / 'Huong-dan-va-kich-ban-demo-LabFourT.pdf'


def find_browser() -> str | None:
    candidates = [
        os.path.expandvars(r'%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe'),
        os.path.expandvars(r'%ProgramFiles%\Microsoft\Edge\Application\msedge.exe'),
        os.path.expandvars(r'%ProgramFiles%\Google\Chrome\Application\chrome.exe'),
    ]
    found = next((c for c in candidates if Path(c).is_file()), None)
    return found or shutil.which('msedge') or shutil.which('google-chrome') or shutil.which('chromium')


def main() -> int:
    browser = find_browser()
    if not browser:
        print('Không tìm thấy Microsoft Edge hoặc Google Chrome để in PDF.')
        return 1
    # Hồ sơ trình duyệt tạm để không đụng tới trình duyệt đang mở của người dùng
    with tempfile.TemporaryDirectory() as profile:
        subprocess.run(
            [
                browser,
                '--headless=new',
                '--disable-gpu',
                f'--user-data-dir={profile}',
                '--no-pdf-header-footer',
                '--allow-file-access-from-files',
                '--virtual-time-budget=10000',
                f'--print-to-pdf={OUT}',
                SRC.as_uri(),
            ],
            check=True,
            capture_output=True,
            timeout=180,
        )
    if not OUT.is_file() or OUT.stat().st_size < 10_000:
        print('In PDF không thành công.')
        return 1
    print(f'Đã in {OUT.relative_to(ROOT)} ({OUT.stat().st_size / 1e6:.1f} MB)')
    return 0


if __name__ == '__main__':
    sys.exit(main())
