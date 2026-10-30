"""Thu nhỏ texture, đổi màu trang phục và màu mắt. Dùng: python tools/prepare-textures.py <raw> <tex_out>"""
import glob, os, sys
import numpy as np
from PIL import Image, ImageFilter

RAW, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)


def recolor(rgb, mask, target):
    """Giữ độ sáng và nếp vải, chỉ đổi sắc màu ở vùng mặt nạ."""
    lum = rgb @ np.array([.299, .587, .114])
    mean = lum[mask > .5].mean() if (mask > .5).any() else 128
    tinted = np.clip((lum / mean)[..., None] * np.array(target, float), 0, 255)
    return rgb * (1 - mask[..., None]) + tinted * mask[..., None]


def soft(mask):
    img = Image.fromarray((mask * 255).astype('uint8')).filter(ImageFilter.GaussianBlur(1.2))
    return np.asarray(img, float) / 255


def brown_eyes(head):
    """Mắt nằm ở góc dưới bên trái texture đầu. Iris sáng và ít bão hòa được đổi sang nâu sẫm."""
    h, w, _ = head.shape
    lum = head @ np.array([.299, .587, .114])
    # Tìm con ngươi: vùng tối nhất nằm trong lòng trắng sáng ở góc dưới texture
    y0, y1, x0, x1 = int(h * .86), h, int(w * .14), int(w * .40)
    white = lum[y0:y1, x0:x1] > 170
    ys, xs = np.nonzero(white)
    cy0, cx0 = ys.mean() + y0, xs.mean() + x0
    yy, xx = np.mgrid[:h, :w]
    near = np.hypot(yy - cy0, xx - cx0) < h * .03
    pupil = near & (lum < 45)
    cy, cx = np.nonzero(pupil)[0].mean(), np.nonzero(pupil)[1].mean()
    r = np.hypot(yy - cy, xx - cx)
    print(f'  eye center ({cx / w:.3f}, {cy / h:.3f})', 'iris lum', round(lum[(r > h * .012) & (r < h * .02)].mean()))
    iris = (r < h * .0255) & (lum > 25) & (r > h * .004)
    mask = soft(iris)
    tinted = np.clip((lum / max(lum[iris].mean(), 1))[..., None] * np.array([64., 40., 26.]), 0, 255)
    return head * (1 - mask[..., None]) + tinted * mask[..., None]


# Quy tắc đổi màu riêng cho từng nhân vật: phát hiện vùng áo theo sắc màu rồi đổi sang tông trầm
def outfit_f12(rgb):
    """Áo hoodie có họa tiết neon xanh và tím, đưa về tông xám trầm."""
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    green = (g > 1.25 * r) & (g > 1.2 * b) & (g > 60)
    purple = (b > 1.2 * g) & (r > 1.2 * g) & (b > 60)
    return recolor(rgb, soft(green | purple), (70, 74, 76))


def outfit_m10(rgb):
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    red = (r > 1.5 * g) & (r > 1.5 * b) & (r > 50)
    return recolor(rgb, soft(red), (72, 88, 86))


def darken_hair(arr, keep_alpha=False):
    """Đưa tóc về gần đen, tự nhiên với thân chủ người Việt."""
    rgb = arr[..., :3]
    lum = rgb @ np.array([.299, .587, .114])
    out = np.clip((lum * .62)[..., None] * np.array([1.02, .96, .92]), 0, 255)
    return np.concatenate([out, arr[..., 3:]], axis=2) if keep_alpha else out


OUTFIT = {'f12': outfit_f12, 'f08': lambda rgb: rgb, 'm10': outfit_m10}
EYES = {'f12': True, 'f08': True, 'm10': False}
DARK_HAIR = {'f12': True, 'f08': True, 'm10': False}

for key, fn in OUTFIT.items():
    d = f'{RAW}/avatars/{key}'
    head = np.asarray(Image.open(f'{d}/head_color.tga').convert('RGB'), float)
    if DARK_HAIR[key]:
        # Vùng da đầu dưới lớp tóc: chỉ áp dụng cho các điểm ảnh tối ở nửa trên texture
        lum = head @ np.array([.299, .587, .114])
        hh, _, _ = head.shape
        rows = (np.arange(hh) < hh * .78)[:, None]
        scalp = soft((lum < 105) & rows)
        head = head * (1 - scalp[..., None]) + darken_hair(head) * scalp[..., None]
    if EYES[key]:
        head = brown_eyes(head)
    body = fn(np.asarray(Image.open(f'{d}/body_color.tga').convert('RGB'), float))
    Image.fromarray(head.astype('uint8')).resize((1024, 1024), Image.LANCZOS).save(f'{OUT}/{key}_head.webp', quality=82, method=6)
    Image.fromarray(body.astype('uint8')).resize((1024, 1024), Image.LANCZOS).save(f'{OUT}/{key}_body.webp', quality=78, method=6)
    opacity = np.asarray(Image.open(f'{d}/opacity_color.tga').convert('RGBA'), float)
    if DARK_HAIR[key]:
        opacity = darken_hair(opacity, keep_alpha=True)
    Image.fromarray(opacity.astype('uint8')).resize((1024, 1024), Image.LANCZOS).save(f'{OUT}/{key}_opacity.webp', quality=78, alpha_quality=85, method=6)
    Image.open(f'{d}/head_normal.tga').convert('RGB').resize((768, 768), Image.LANCZOS).save(f'{OUT}/{key}_head_n.webp', quality=70, method=6)
    Image.open(f'{d}/body_normal.tga').convert('RGB').resize((768, 768), Image.LANCZOS).save(f'{OUT}/{key}_body_n.webp', quality=66, method=6)

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
