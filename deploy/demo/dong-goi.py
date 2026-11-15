"""Đóng gói bản demo để bàn giao cho người không chuyên IT.

Chạy ở gốc monorepo:  python deploy/demo/dong-goi.py
Kết quả: ban-giao/LabFourT-demo.zip, giải nén ra thư mục LabFourT-demo/ có sẵn CHAY-DEMO.bat và tài liệu PDF.

Gói gồm các tệp git đang theo dõi hoặc mới thêm (bỏ qua tệp trong .gitignore như node_modules, .env),
bỏ docs/ và knowledge_base/ (tài liệu nội bộ, người chạy demo không cần), chỉ giữ tài liệu hướng dẫn PDF.
"""

import subprocess
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = ROOT / 'ban-giao'
OUT = OUT_DIR / 'LabFourT-demo.zip'
PREFIX = 'LabFourT-demo/'
GUIDE = 'docs/ban-giao/Huong-dan-va-kich-ban-demo-LabFourT.pdf'
# Đặt ở gốc gói để người nhận thấy ngay khi mở thư mục
GUIDE_IN_ZIP = 'HUONG-DAN-DEMO.pdf'
EXECUTABLE = ('.sh', '.command')
SKIP = ('docs/', 'knowledge_base/')


def tracked_files() -> list[str]:
    out = subprocess.run(
        ['git', 'ls-files', '-co', '--exclude-standard', '-z'], cwd=ROOT, check=True, capture_output=True
    ).stdout.decode('utf-8')
    return sorted(f for f in out.split('\0') if f and not f.startswith(SKIP) and (ROOT / f).is_file())


def main() -> int:
    guide = ROOT / GUIDE
    # --thu: đóng gói thử khi chưa có PDF, để chạy thử từ một bản sạch
    trial = '--thu' in sys.argv
    if not guide.is_file() and not trial:
        print(f'Thiếu tài liệu {GUIDE}. Hãy tạo PDF trước khi đóng gói.')
        return 1
    OUT_DIR.mkdir(exist_ok=True)
    files = tracked_files()
    with zipfile.ZipFile(OUT, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for rel in files:
            info = zipfile.ZipInfo.from_file(ROOT / rel, PREFIX + rel)
            # Giữ quyền chạy cho script trên macOS/Linux
            info.external_attr = ((0o755 if rel.endswith(EXECUTABLE) else 0o644) | 0o100000) << 16
            info.compress_type = zipfile.ZIP_DEFLATED
            z.writestr(info, (ROOT / rel).read_bytes())
        if guide.is_file():
            z.write(guide, PREFIX + GUIDE_IN_ZIP)
    print(f'Đã tạo {OUT.relative_to(ROOT)}: {len(files) + 1} tệp, {OUT.stat().st_size / 1e6:.1f} MB')
    return 0


if __name__ == '__main__':
    sys.exit(main())
