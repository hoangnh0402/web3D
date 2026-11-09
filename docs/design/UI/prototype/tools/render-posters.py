"""Dựng ảnh tĩnh từ cảnh 3D cho chế độ nhẹ 2D và thẻ ca (src/assets/room-*.jpg).
Cần `npm run dev` đang chạy. Dùng: python tools/render-posters.py [http://localhost:5173] [đường_dẫn_trình_duyệt]
"""
import os, subprocess, sys, tempfile, time
from PIL import Image

URL = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:5173'
BROWSER = sys.argv[2] if len(sys.argv) > 2 else r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
OUT = os.path.join(os.path.dirname(__file__), '..', 'src', 'assets')
JOBS = [('a', e) for e in ['NEUTRAL', 'ANXIOUS', 'SAD', 'RELIEVED', 'TENSE', 'HESITANT']] + [('b', 'NEUTRAL'), ('c', 'NEUTRAL')]

for variant, emotion in JOBS:
    shot = os.path.join(tempfile.gettempdir(), f'poster-{variant}-{emotion}.png')
    if os.path.exists(shot):
        os.remove(shot)
    subprocess.run([BROWSER, '--headless=new', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--window-size=1304,952',
                    '--virtual-time-budget=15000', f'--screenshot={shot}', f'{URL}/?variant={variant}&emotion={emotion}#scene'],
                   timeout=120, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    # Trình duyệt có thể trả về trước khi tiến trình con ghi xong ảnh
    for _ in range(120):
        if os.path.exists(shot) and os.path.getsize(shot) > 0:
            time.sleep(.5)
            break
        time.sleep(.5)
    dest = os.path.join(OUT, f'room-{variant}-{emotion.lower()}.jpg')
    # Khung nhìn headless nhỏ hơn cửa sổ (trừ thanh cuộn và viền), nên mở rộng hơn rồi cắt đúng 1280x860
    Image.open(shot).convert('RGB').crop((0, 0, 1280, 860)).save(dest, quality=84, optimize=True, progressive=True)
    print(dest, round(os.path.getsize(dest) / 1024), 'KB')
