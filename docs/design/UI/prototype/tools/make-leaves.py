"""Sinh hai lớp nền lá nhiệt đới tông xanh trời sáng: lớp sau phủ kín, lớp trước trong suốt để tạo chiều sâu khi lá đung đưa.
Dùng: python tools/make-leaves.py src/assets"""
import math, random, sys

OUT = sys.argv[1]
W, H = 1600, 1000


def palm(cx, cy, angle, length, color, rib, leaflets=26, spread=.95, width=.05):
    """Lá cọ: cuống cong, các lá chét thuôn dài mọc hai bên và ngắn dần về ngọn."""
    out = []
    bend = random.uniform(-.35, .35)
    pts = []
    for i in range(41):
        t = i / 40
        a = angle + bend * t * t
        if not pts:
            pts.append((cx, cy))
        else:
            px, py = pts[-1]
            pts.append((px + math.cos(a) * length / 40, py + math.sin(a) * length / 40))
    for side in (1, -1):
        for i in range(2, leaflets):
            t = i / leaflets
            k = int(t * 40)
            x, y = pts[k]
            nx, ny = pts[min(k + 1, 40)]
            a = math.atan2(ny - y, nx - x) + side * (spread - t * .35)
            L = length * (.42 * math.sin(math.pi * (.15 + .85 * t)) + .05)
            w = L * width * random.uniform(.85, 1.15)
            droop = side * .25 * t
            ex, ey = x + math.cos(a + droop) * L, y + math.sin(a + droop) * L
            mx, my = x + math.cos(a) * L * .5, y + math.sin(a) * L * .5
            px, py = -math.sin(a) * w, math.cos(a) * w
            out.append(f'<path d="M{x:.0f} {y:.0f}Q{mx + px:.0f} {my + py:.0f} {ex:.0f} {ey:.0f}Q{mx - px:.0f} {my - py:.0f} {x:.0f} {y:.0f}Z" fill="{color}"/>')
    d = 'M' + ' L'.join(f'{x:.0f} {y:.0f}' for x, y in pts[::4])
    out.append(f'<path d="{d}" stroke="{rib}" stroke-width="{max(2, length / 160):.0f}" fill="none" stroke-linecap="round"/>')
    return out


def banana(cx, cy, angle, length, color, rib):
    """Lá bản rộng có gân xiên mảnh."""
    out = []
    ca, sa = math.cos(angle), math.sin(angle)
    tr = lambda x, y: (cx + x * ca - y * sa, cy + x * sa + y * ca)
    w = length * .2
    a, b, c, d = tr(0, 0), tr(length * .5, w), tr(length, 0), tr(length * .5, -w)
    out.append(f'<path d="M{a[0]:.0f} {a[1]:.0f}Q{b[0]:.0f} {b[1]:.0f} {c[0]:.0f} {c[1]:.0f}Q{d[0]:.0f} {d[1]:.0f} {a[0]:.0f} {a[1]:.0f}Z" fill="{color}"/>')
    for i in range(1, 14):
        t = i / 14
        for s in (1, -1):
            p0 = tr(length * t, 0)
            p1 = tr(length * (t + .06), s * w * math.sin(math.pi * t) * .9)
            out.append(f'<path d="M{p0[0]:.0f} {p0[1]:.0f} L{p1[0]:.0f} {p1[1]:.0f}" stroke="{rib}" stroke-width="2" opacity=".55"/>')
    out.append(f'<path d="M{a[0]:.0f} {a[1]:.0f} L{c[0]:.0f} {c[1]:.0f}" stroke="{rib}" stroke-width="4"/>')
    return out


random.seed(7)
back = ['<defs><linearGradient id="sky" x1="0" y1="0" x2=".35" y2="1"><stop offset="0" stop-color="#F3F9FF"/><stop offset=".55" stop-color="#DCEBFF"/><stop offset="1" stop-color="#C8DFFF"/></linearGradient></defs>', f'<rect width="{W}" height="{H}" fill="url(#sky)"/>']
# Lớp xa: nhạt gần như hoà vào trời, lá lớn
for _ in range(9):
    back += palm(random.uniform(-100, W + 100), random.uniform(H * .5, H + 200), random.uniform(-2.4, -.7), random.uniform(500, 820), '#CFE2FD', '#BDD5FA')
for _ in range(4):
    back += banana(random.uniform(0, W), random.uniform(0, H), random.uniform(0, 6.28), random.uniform(520, 720), '#C6DCFC', '#B3CEF7')
# Lớp giữa: đậm hơn một nấc
for _ in range(8):
    back += palm(random.uniform(-150, W + 150), random.choice([random.uniform(-150, 100), random.uniform(H - 50, H + 150)]), random.uniform(0, 6.28), random.uniform(420, 680), '#B8D3FA', '#A5C5F5')
for _ in range(4):
    back += banana(random.uniform(0, W), random.uniform(0, H), random.uniform(0, 6.28), random.uniform(380, 560), '#BFD8FB', '#A9C8F6')
for _ in range(3):
    back += banana(random.uniform(0, W), random.uniform(0, H), random.uniform(0, 6.28), random.uniform(420, 600), '#ADCCF8', '#98BDF2')

front = []
# Lớp gần: vài lá xanh trời rõ nét ở mép khung hình
for x, y, a in [(-60, 120, .2), (W + 40, 80, 2.7), (W + 60, H - 80, -2.6), (120, H + 40, -1.2), (W * .55, -60, 1.5)]:
    front += palm(x, y, a + random.uniform(-.2, .2), random.uniform(420, 600), '#9EC4F6', '#88B4EF', leaflets=22, width=.06)
for x, y in [(W - 120, H * .45), (60, H * .62)]:
    front += banana(x, y, random.uniform(0, 6.28), 520, '#A7CBF7', '#8FB9F0')


def svg(parts, name):
    path = f'{OUT}/{name}'
    open(path, 'w', encoding='utf-8').write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid slice">' + ''.join(parts) + '</svg>')
    import os
    print(name, round(os.path.getsize(path) / 1024), 'KB')


svg(back, 'leaves-back.svg')
svg(front, 'leaves-front.svg')
