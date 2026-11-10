"""Tải nhân vật thân chủ từ thư viện VALID (MIT, UCF và Google) bản glTF, chỉnh ảnh bề mặt rồi nén gzip vào src/assets/3d.
Dùng: python tools/fetch-characters.py src/assets/3d

Nguồn: https://github.com/xrtlab/Validated-Avatar-Library-for-Inclusion-and-Diversity---VALID
Bản glTF: https://github.com/c-frame/valid-avatars-glb
"""
import gzip, io, json, os, struct, sys, urllib.request as u
import numpy as np
from PIL import Image, ImageFilter

OUT = sys.argv[1]
BASE = 'https://raw.githubusercontent.com/c-frame/valid-avatars-glb/main/avatars'
# Tên trong app: tệp gốc và vùng môi trên ảnh bề mặt (x0, y0, x1, y1 trên ảnh 2048 px).
# Hà Linh dùng nữ châu Á số 3, áo thun và quần jean như sinh viên.
CAST = {'valid-a': ('Asian/Asian_F_3_Casual.glb', (520, 660, 820, 800))}


def read_glb(data):
    json_len = struct.unpack_from('<I', data, 12)[0]
    doc = json.loads(data[20:20 + json_len])
    bin_len = struct.unpack_from('<I', data, 20 + json_len)[0]
    return doc, bytearray(data[28 + json_len:28 + json_len + bin_len])


def write_glb(doc, binary):
    js = json.dumps(doc, separators=(',', ':')).encode()
    js += b' ' * (-len(js) % 4)
    binary += b'\0' * (-len(binary) % 4)
    total = 12 + 8 + len(js) + 8 + len(binary)
    return struct.pack('<III', 0x46546C67, 2, total) + struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(binary), 0x004E4942) + bytes(binary)


def retouch(img, lips):
    """Bản gốc tô son đỏ đậm và da bão hòa màu cam, dưới đèn ấm của phòng trông như búp bê.
    Đưa môi về hồng đất tự nhiên, da bớt cam và sáng lên một chút. Quần áo, mắt và giày không đổi."""
    rgb = np.asarray(img.convert('RGB')).astype(np.float32)
    hsv = np.asarray(img.convert('RGB').convert('HSV')).astype(np.float32)
    h, s, v = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    H, W = h.shape

    # Da: sắc cam (khoảng 8 đến 32 độ), độ bão hòa vừa, không quá tối
    skin = ((h > 5) & (h < 23) & (s > 50) & (s < 215) & (v > 70)).astype(np.float32)
    # Môi: sắc đỏ trong vùng miệng
    x0, y0, x1, y1 = lips
    box = np.zeros((H, W), np.float32)
    box[y0:y1, x0:x1] = 1
    red = ((h < 8) | (h > 232)) & (s > 70)
    lip = (red * box).astype(np.float32)
    soft = lambda m, r: np.asarray(Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r))).astype(np.float32) / 255
    skin, lip = soft(skin, 1.5), soft(lip, 4)
    skin *= 1 - lip

    s2 = s * (1 - .24 * skin - .26 * lip)
    v2 = np.minimum(255, v * (1 + .06 * skin + .14 * lip))
    # Kéo sắc môi từ đỏ son về hồng ấm (khoảng 10 độ)
    h2 = h.copy()
    h2 = np.where(lip > 0, (h + ((7 - ((h + 128) % 256 - 128)) * lip)) % 256, h2)
    out = Image.fromarray(np.dstack([h2, s2, v2]).clip(0, 255).astype(np.uint8), 'HSV').convert('RGB')
    # Giữ nguyên các vùng không phải da và môi để tránh lệch màu do đổi qua lại HSV
    mask = np.clip(skin + lip, 0, 1)[..., None]
    res = rgb * (1 - mask) + np.asarray(out).astype(np.float32) * mask
    return Image.fromarray(res.clip(0, 255).astype(np.uint8))


for key, (path, lips) in CAST.items():
    with u.urlopen(u.Request(f'{BASE}/{path}', headers={'User-Agent': 'lab-fourt-prototype'}), timeout=120) as r:
        data = r.read()
    doc, binary = read_glb(data)
    # Ảnh màu của vật liệu thân (da và quần áo)
    body = next(m for m in doc['materials'] if m['name'] == '_Body')
    tex = doc['textures'][body['pbrMetallicRoughness']['baseColorTexture']['index']]
    image = doc['images'][tex['extensions']['EXT_texture_webp']['source']]
    view = doc['bufferViews'][image['bufferView']]
    start = view.get('byteOffset', 0)
    src = Image.open(io.BytesIO(bytes(binary[start:start + view['byteLength']])))
    buf = io.BytesIO()
    retouch(src, lips).save(buf, 'WEBP', quality=90, method=6)
    # Ảnh mới nối vào cuối vùng nhị phân, ảnh cũ được bỏ qua
    binary += b'\0' * (-len(binary) % 4)
    doc['bufferViews'].append({'buffer': 0, 'byteOffset': len(binary), 'byteLength': len(buf.getvalue())})
    image['bufferView'] = len(doc['bufferViews']) - 1
    binary += buf.getvalue()
    doc['buffers'][0]['byteLength'] = len(binary)
    dest = f'{OUT}/{key}.glb.gz'
    with gzip.open(dest, 'wb', compresslevel=9) as f:
        f.write(write_glb(doc, binary))
    print(key, round(os.path.getsize(dest) / 1024), 'KB')
