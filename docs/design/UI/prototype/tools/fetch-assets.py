"""Tải tài sản 3D gốc về thư mục ngoài repo. Dùng: python tools/fetch-assets.py <thư_mục_raw>

Nguồn:
- Microsoft Rocketbox (MIT): nhân vật và động tác.
- Poly Haven (CC0): nội thất và vật liệu.
"""
import json, os, sys, urllib.parse, urllib.request as u
from concurrent.futures import ThreadPoolExecutor

RAW = sys.argv[1]
ROCKET = 'https://raw.githubusercontent.com/microsoft/Microsoft-Rocketbox/master/Assets'
HEADERS = {'User-Agent': 'lab-fourt-prototype'}

AVATARS = {'f12': ('Female_Adult_12', 'f012'), 'f08': ('Female_Adult_08', 'f008'), 'm10': ('Male_Adult_10', 'm024')}
# Tên động tác trong app: tên tệp gốc. Nam không có "finger nail" nên dùng "nervous" cho trạng thái lo lắng.
CLIPS = {'breathe': 'breathe_01', 'neutral': 'idle_neutral_01', 'thoughtful': 'gestic_thoughtful', 'shrug': 'gestic_shrug_01', 'relaxed': 'idle_relaxed_01', 'waiting': 'idle_waiting_01'}
ANXIOUS = {'f': 'idle_finger nail', 'm': 'idle_nervous_01'}
MODELS = ['modern_arm_chair_01', 'side_table_01', 'wooden_bookshelf_worn', 'ceramic_vase_01', 'fern_02', 'planter_pot_clay']
SURFACES = ['laminate_floor_02', 'painted_plaster_wall']


def get(url, dest):
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    if os.path.exists(dest) and os.path.getsize(dest) > 0:
        return
    with u.urlopen(u.Request(url, headers=HEADERS), timeout=120) as r, open(dest, 'wb') as f:
        f.write(r.read())


jobs = []
for key, (name, tex) in AVATARS.items():
    jobs.append((f'{ROCKET}/Avatars/Adults/{name}/Export/{name}_facial.fbx', f'{RAW}/avatars/{key}/model.fbx'))
    for t in ['body_color', 'body_normal', 'head_color', 'head_normal', 'opacity_color']:
        jobs.append((f'{ROCKET}/Avatars/Adults/{name}/Textures/{tex}_{t}.tga', f'{RAW}/avatars/{key}/{t}.tga'))
for sex in 'fm':
    for name, clip in {**CLIPS, 'anxious': ANXIOUS[sex]}.items():
        q = urllib.parse.quote(f'{sex}_sit_chair_{clip}.max.fbx')
        jobs.append((f'{ROCKET}/Animations/all_animations_max_motextr_static/{q}', f'{RAW}/clips/{sex}/{name}.fbx'))

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
