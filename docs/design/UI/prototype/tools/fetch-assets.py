"""Tải nội thất và vật liệu Poly Haven (CC0) về thư mục ngoài repo. Dùng: python tools/fetch-assets.py <thư_mục_raw>
Nhân vật không tải từ ngoài mà được nặn bằng tools/build-characters.mjs.
"""
import json, os, sys, urllib.request as u
from concurrent.futures import ThreadPoolExecutor

RAW = sys.argv[1]
HEADERS = {'User-Agent': 'lab-fourt-prototype'}

MODELS = ['modern_arm_chair_01', 'side_table_01', 'wooden_bookshelf_worn', 'ceramic_vase_01', 'fern_02', 'planter_pot_clay']
SURFACES = ['laminate_floor_02', 'painted_plaster_wall']


def get(url, dest):
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    if os.path.exists(dest) and os.path.getsize(dest) > 0:
        return
    with u.urlopen(u.Request(url, headers=HEADERS), timeout=120) as r, open(dest, 'wb') as f:
        f.write(r.read())


jobs = []
for m in MODELS:
    info = json.load(u.urlopen(u.Request(f'https://api.polyhaven.com/files/{m}', headers=HEADERS), timeout=30))['gltf']['1k']['gltf']
    jobs.append((info['url'], f'{RAW}/models/{m}/{m}.gltf'))
    for rel, inc in info['include'].items():
        jobs.append((inc['url'], f'{RAW}/models/{m}/{rel}'))

for s in SURFACES:
    info = json.load(u.urlopen(u.Request(f'https://api.polyhaven.com/files/{s}', headers=HEADERS), timeout=30))
    for key, out in [('Diffuse', 'diff'), ('nor_gl', 'nor'), ('Rough', 'rough')]:
        jobs.append((info[key]['1k']['jpg']['url'], f'{RAW}/surfaces/{s}_{out}.jpg'))

with ThreadPoolExecutor(8) as pool:
    list(pool.map(lambda j: get(*j), jobs))
print('files', len(jobs))
