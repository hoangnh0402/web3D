"""Thu nhỏ texture nội thất và vật liệu sang WebP. Dùng: python tools/prepare-textures.py <raw> <tex_out>"""
import glob, os, sys
import numpy as np
from PIL import Image, ImageFilter

RAW, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)


def soft(mask):
    img = Image.fromarray((mask * 255).astype('uint8')).filter(ImageFilter.GaussianBlur(1.2))
    return np.asarray(img, float) / 255


# Texture nội thất: lưu cùng tên tệp gốc để bước sau gắn lại vào glTF
for f in glob.glob(f'{RAW}/models/*/textures/*.jpg'):
    name = os.path.basename(f).rsplit('.', 1)[0]
    img = Image.open(f).convert('RGB')
    if name == 'modern_arm_chair_01_pillow_diff_1k':
        # Da đen của ghế tạo cảm giác nặng nề, đổi sang vải da màu xám ấm
        rgb = np.asarray(img, float)
        lum = rgb @ np.array([.299, .587, .114])
        mask = soft(lum < 62)
        lifted = np.clip((lum / 26)[..., None] * np.array([92., 84., 74.]), 0, 255)
        img = Image.fromarray((rgb * (1 - mask[..., None]) + lifted * mask[..., None]).astype('uint8'))
    img.resize((512, 512), Image.LANCZOS).save(f'{OUT}/{name}.webp', quality=68, method=6)

for f in glob.glob(f'{RAW}/surfaces/*.jpg'):
    name = os.path.basename(f).rsplit('.', 1)[0]
    size = 1024 if name.endswith('diff') else 768
    Image.open(f).convert('RGB').resize((size, size), Image.LANCZOS).save(f'{OUT}/{name}.webp', quality=72, method=6)

total = sum(os.path.getsize(p) for p in glob.glob(f'{OUT}/*.webp'))
print('webp files', len(glob.glob(f'{OUT}/*.webp')), 'MB', round(total / 1e6, 2))
