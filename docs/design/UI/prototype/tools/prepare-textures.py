"""Thu nhỏ texture nhân vật, đổi màu trang phục và màu mắt. Dùng: python tools/prepare-textures.py <raw> <tex_out>"""
import glob, os, sys
import numpy as np
from PIL import Image, ImageEnhance, ImageFilter

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
def not_skin(mask):
    """Da tay nằm ở hai góc trên của texture thân nên được loại khỏi vùng đổi màu."""
    h, w = mask.shape
    mask[:int(h * .29), :int(w * .32)] = False
    mask[:int(h * .29), int(w * .68):] = False
    return mask


def outfit_f05(rgb):
    """Áo vest hồng kẻ ô đổi sang xanh xám dịu."""
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    pink = not_skin((r > 1.12 * g) & (r > 1.08 * b) & (r > 90))
    return recolor(rgb, soft(pink), (112, 122, 118))


def outfit_f08(rgb):
    """Áo thun xám đổi sang màu be ấm, làm mờ họa tiết in trước ngực."""
    h, w, _ = rgb.shape
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    grey = not_skin((abs(r - g) < 22) & (abs(g - b) < 22) & (r > 60))
    # Quần jean bạc màu nằm ở hai bên nửa dưới texture, tránh để bị đổi màu theo áo
    grey[int(h * .52):, :int(w * .31)] = False
    grey[int(h * .52):, int(w * .69):] = False
    mask = soft(grey)
    calm = np.asarray(Image.fromarray(rgb.astype('uint8')).filter(ImageFilter.GaussianBlur(22)), float)
    flat = rgb * (1 - mask[..., None] * .8) + calm * mask[..., None] * .8
    return recolor(flat, mask, (168, 142, 118))


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


def head_rough(head):
    """Độ nhám theo vùng: nhãn cầu bóng để có điểm sáng trong mắt, tóc bóng hơn da."""
    h, w, _ = head.shape
    lum = head @ np.array([.299, .587, .114])
    rough = np.full((h, w), .54)
    rough[(lum < 70) & (np.arange(h) < h * .6)[:, None]] = .58
    rough[int(h * .84):, int(w * .19):int(w * .36)] = .1
    g = (rough * 255).astype('uint8')
    return np.stack([g, g, np.zeros_like(g)], axis=2)


OUTFIT = {'f05': outfit_f05, 'f08': outfit_f08, 'm10': outfit_m10}
EYES = {'f05': True, 'f08': True, 'm10': False}
DARK_HAIR = {'f05': True, 'f08': True, 'm10': False}

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
    Image.fromarray(head_rough(head)).resize((256, 256), Image.BILINEAR).save(f'{OUT}/{key}_head_r.webp', quality=70, method=6)
    Image.fromarray(body.astype('uint8')).resize((1024, 1024), Image.LANCZOS).save(f'{OUT}/{key}_body.webp', quality=78, method=6)
    opacity = np.asarray(Image.open(f'{d}/opacity_color.tga').convert('RGBA'), float)
    if DARK_HAIR[key]:
        opacity = darken_hair(opacity, keep_alpha=True)
    # Pixel gần như trong suốt vẫn mang màu sáng và lộ thành sợi trắng trên tóc, nên đưa về đúng màu tóc
    solid = opacity[..., 3] > 235
    opacity[~solid, :3] = np.median(opacity[solid][:, :3], axis=0)
    Image.fromarray(opacity.astype('uint8')).resize((1024, 1024), Image.LANCZOS).save(f'{OUT}/{key}_opacity.webp', quality=78, alpha_quality=85, method=6)
    Image.open(f'{d}/head_normal.tga').convert('RGB').resize((768, 768), Image.LANCZOS).save(f'{OUT}/{key}_head_n.webp', quality=70, method=6)
    Image.open(f'{d}/body_normal.tga').convert('RGB').resize((768, 768), Image.LANCZOS).save(f'{OUT}/{key}_body_n.webp', quality=66, method=6)

def window_view(path, yaw, pitch=4, fov=62, size=(1024, 1280)):
    """Cắt ảnh toàn cảnh thành phối cảnh thường để đặt sau cửa sổ."""
    pano = np.asarray(Image.open(path).convert('RGB').resize((4096, 2048), Image.LANCZOS))
    w, h = size
    f = .5 * w / np.tan(np.radians(fov) / 2)
    yy, xx = np.mgrid[:h, :w]
    x, y = (xx - w / 2) / f, (h / 2 - yy) / f
    p, t = np.radians(pitch), np.radians(yaw)
    y2, z2 = y * np.cos(p) + np.sin(p), np.cos(p) - y * np.sin(p)
    lon, lat = np.arctan2(x, z2) + t, np.arctan2(y2, np.hypot(x, z2))
    u = ((lon / (2 * np.pi) + .5) % 1 * 4095).astype(int)
    v = ((.5 - lat / np.pi) * 2047).astype(int).clip(0, 2047)
    return Image.fromarray(pano[v, u])


# Tranh treo tường trong phòng: ảnh cây xanh làm mờ như tranh sơn dầu, thay cho ảnh gốc của model
ImageEnhance.Brightness(window_view(f'{RAW}/backdrop.jpg', 118, -6, 64, (1024, 683)).filter(ImageFilter.GaussianBlur(6))).enhance(1.25).resize((512, 512), Image.LANCZOS).save(f'{OUT}/hanging_picture_frame_02_artwork_diff_1k.webp', quality=80, method=6)

total = sum(os.path.getsize(p) for p in glob.glob(f'{OUT}/*.webp'))
print('webp files', len(glob.glob(f'{OUT}/*.webp')), 'MB', round(total / 1e6, 2))
