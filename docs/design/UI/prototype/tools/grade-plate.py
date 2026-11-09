"""Khử nhiễu và chỉnh màu ảnh path tracing thô thành ảnh nền.
Dùng: python tools/grade-plate.py <vào.bin> <rộng> <cao> <ra.webp> [phơi sáng]
"""
import ctypes
import os
import sys
import cv2
import numpy as np
import oidn
from PIL import Image

src, w, h, out = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4]
exposure = float(sys.argv[5]) if len(sys.argv) > 5 else 1
# Tùy chọn: lần dựng có hình nộm và kích thước của nó, để lấy bóng người đổ lên sofa và sàn
standin, sw, sh = (sys.argv[6], int(sys.argv[7]), int(sys.argv[8])) if len(sys.argv) > 8 else (None, 0, 0)


# Gói Python chưa bọc hàm bật chế độ HDR nên gọi thẳng vào thư viện
LIB = ctypes.CDLL(os.path.join(os.path.dirname(oidn.__file__), 'lib.win.x64', 'OpenImageDenoise.dll'))
LIB.oidnSetFilter1b.argtypes = [ctypes.c_void_p, ctypes.c_char_p, ctypes.c_bool]


def load(path, width=None, height=None):
    return np.flipud((np.fromfile(path, dtype=np.uint16).reshape(height or h, width or w, 3) / 65535.) ** 2 * 64).astype(np.float32)


def denoise(color, albedo, normal, w=w, h=h):
    device = oidn.NewDevice()
    oidn.CommitDevice(device)
    f = oidn.NewFilter(device, 'RT')
    result = np.zeros_like(color)
    oidn.SetSharedFilterImage(f, 'color', color, oidn.FORMAT_FLOAT3, w, h)
    oidn.SetSharedFilterImage(f, 'albedo', albedo, oidn.FORMAT_FLOAT3, w, h)
    oidn.SetSharedFilterImage(f, 'normal', normal, oidn.FORMAT_FLOAT3, w, h)
    oidn.SetSharedFilterImage(f, 'output', result, oidn.FORMAT_FLOAT3, w, h)
    LIB.oidnSetFilter1b(f, b'hdr', True)
    oidn.CommitFilter(f)
    oidn.ExecuteFilter(f)
    oidn.ReleaseFilter(f)
    oidn.ReleaseDevice(device)
    return result


def depth_blur(img, depth, focus=3.3, strength=.55):
    """Hậu cảnh mờ nhẹ theo khoảng cách như ống kính thật, vùng ngoài cửa sổ mờ nhiều nhất."""
    coc = np.clip(np.abs(1 / focus - 1 / np.minimum(depth, 60)) * focus * strength, 0, 1)
    out_img, last = img.copy(), np.zeros_like(coc)
    scale = w / 2800
    for level, radius in [(.12, 1.6), (.3, 3.2), (.6, 6)]:
        layer = cv2.GaussianBlur(img, (0, 0), radius * scale)
        weight = np.clip((coc - last) / (level - last.max() + 1e-6), 0, 1)[..., None]
        out_img = out_img * (1 - weight) + layer * weight
        last = np.full_like(coc, level)
    return out_img


def shadow_layer(clean):
    """So hai lần dựng có và không có hình nộm: tỉ số độ sáng chính là bóng và độ che của người lên căn phòng."""
    aux = lambda kind: load(standin.replace('.bin', f'.{kind}.bin'), sw, sh)
    withman = denoise(load(standin, sw, sh), np.clip(aux('albedo'), 0, 1), aux('normal') * 2 - 1, sw, sh)
    small = cv2.resize(clean, (sw, sh), interpolation=cv2.INTER_AREA)
    ratio = (cv2.GaussianBlur(withman, (0, 0), 3).mean(axis=2) + 1e-3) / (cv2.GaussianBlur(small, (0, 0), 3).mean(axis=2) + 1e-3)
    # Pixel của chính hình nộm không phải bóng, lấp bằng vùng xung quanh
    near = aux('depth')[..., 0] < cv2.resize(load(src.replace('.bin', '.depth.bin'))[..., 0], (sw, sh), interpolation=cv2.INTER_AREA) - .03
    near = cv2.dilate(near.astype('uint8'), np.ones((9, 9), 'uint8'))
    ratio[near > 0] = 0
    known = (near == 0).astype(np.float32)
    filled = cv2.GaussianBlur(ratio, (0, 0), 16) / np.maximum(cv2.GaussianBlur(known, (0, 0), 16), .02)
    ratio = np.where(near > 0, filled, ratio)
    ratio = np.clip(cv2.GaussianBlur(ratio, (0, 0), 5), .3, 1)
    ratio = np.where(ratio > .97, 1, ratio)
    return cv2.GaussianBlur(cv2.resize(ratio.astype(np.float32), (w, h), interpolation=cv2.INTER_CUBIC), (0, 0), 3)[..., None]


hdr = denoise(load(src), np.clip(load(src.replace('.bin', '.albedo.bin')), 0, 1), load(src.replace('.bin', '.normal.bin')) * 2 - 1)
if standin:
    hdr = hdr * shadow_layer(hdr)
# Cân bằng trắng: bớt ám xanh lá do ánh sáng cây cỏ dội vào phòng
hdr = depth_blur(hdr, load(src.replace('.bin', '.depth.bin'))[..., 0]) * exposure * np.array([1.02, .95, 1.06], np.float32)

# Đường cong kiểu phim: vùng sáng mềm dần, vùng tối giữ chi tiết
a, b, c, d, e = 2.51, .03, 2.43, .59, .14
film = np.clip(hdr * (a * hdr + b) / (hdr * (c * hdr + d) + e), 0, 1)
srgb = np.where(film <= .0031308, film * 12.92, 1.055 * film ** (1 / 2.4) - .055)
Image.fromarray((srgb * 255 + .5).astype('uint8')).save(out, quality=90, method=6)
