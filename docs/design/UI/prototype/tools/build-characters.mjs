// Dựng nhân vật thân chủ bằng hàm khoảng cách (SDF): các khối hòa vào nhau như đất sét nặn, không có đường nối.
// Lưới được tạo bằng surface nets, giảm tam giác bằng meshoptimizer, gắn khung xương rồi xuất GLB nén gzip.
// Dùng: node tools/build-characters.mjs <thư_mục_đích>
import { Document, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { quantize } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import { mkdirSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const OUT = process.argv[2];
mkdirSync(OUT, { recursive: true });
await MeshoptSimplifier.ready;

// ---------- Toán vector và các khối SDF ----------
const len = (x, y, z) => Math.sqrt(x * x + y * y + z * z);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const mix = (a, b, t) => a + (b - a) * t;
const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * .25; };
const smax = (a, b, k) => -smin(-a, -b, k);
const rot = (ax = 0, ay = 0, az = 0) => {
  const [cx, sx, cy, sy, cz, sz] = [Math.cos(ax), Math.sin(ax), Math.cos(ay), Math.sin(ay), Math.cos(az), Math.sin(az)];
  // R = Rz * Ry * Rx, trả về ma trận chuyển vị để đưa điểm về hệ của khối
  const m = [cz * cy, cz * sy * sx - sz * cx, cz * sy * cx + sz * sx, sz * cy, sz * sy * sx + cz * cx, sz * sy * cx - cz * sx, -sy, cy * sx, cy * cx];
  return (x, y, z) => [m[0] * x + m[3] * y + m[6] * z, m[1] * x + m[4] * y + m[7] * z, m[2] * x + m[5] * y + m[8] * z];
};
const ellipsoid = (c, r, angles) => {
  const R = angles ? rot(...angles) : null;
  return (x, y, z) => {
    let px = x - c[0], py = y - c[1], pz = z - c[2];
    if (R) [px, py, pz] = R(px, py, pz);
    const k0 = len(px / r[0], py / r[1], pz / r[2]), k1 = len(px / (r[0] * r[0]), py / (r[1] * r[1]), pz / (r[2] * r[2]));
    return k1 === 0 ? -Math.min(...r) : k0 * (k0 - 1) / k1;
  };
};
// Ống bo tròn có bán kính thay đổi giữa hai điểm (theo Inigo Quilez)
const cone = (a, b, r1, r2) => {
  const ba = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], l2 = ba[0] ** 2 + ba[1] ** 2 + ba[2] ** 2, rr = r1 - r2, a2 = l2 - rr * rr, il2 = 1 / l2;
  return (x, y, z) => {
    const pa = [x - a[0], y - a[1], z - a[2]];
    const yv = pa[0] * ba[0] + pa[1] * ba[1] + pa[2] * ba[2], zv = yv - l2;
    const q = [pa[0] * l2 - ba[0] * yv, pa[1] * l2 - ba[1] * yv, pa[2] * l2 - ba[2] * yv];
    const x2 = q[0] ** 2 + q[1] ** 2 + q[2] ** 2, y2 = yv * yv * l2, z2 = zv * zv * l2, k = Math.sign(rr) * rr * rr * x2;
    if (Math.sign(zv) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - r2;
    if (Math.sign(yv) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - r1;
    return (Math.sqrt(x2 * a2 * il2) + yv * rr) * il2 - r1;
  };
};
const torus = (c, R, r) => (x, y, z) => len(Math.hypot(x - c[0], z - c[2]) - R, y - c[1], 0) - r;
const union = (k, ...fs) => (x, y, z) => fs.reduce((d, f) => smin(d, f(x, y, z), k), 1e9);
// Điểm gần nhất trên đoạn thẳng, dùng cho trọng số khung xương và nếp gấp vải
const segT = (a, b, x, y, z) => {
  const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], l2 = ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2;
  return clamp(((x - a[0]) * ab[0] + (y - a[1]) * ab[1] + (z - a[2]) * ab[2]) / l2, 0, 1);
};
const segDist = (a, b, x, y, z) => { const t = segT(a, b, x, y, z); return len(x - a[0] - t * (b[0] - a[0]), y - a[1] - t * (b[1] - a[1]), z - a[2] - t * (b[2] - a[2])); };

// ---------- Surface nets ----------
const polygonize = (sdf, min, max, h) => {
  const nx = Math.ceil((max[0] - min[0]) / h) + 1, ny = Math.ceil((max[1] - min[1]) / h) + 1, nz = Math.ceil((max[2] - min[2]) / h) + 1;
  const val = new Float32Array(nx * ny * nz), id = (i, j, k) => i + nx * (j + ny * k);
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) val[id(i, j, k)] = sdf(min[0] + i * h, min[1] + j * h, min[2] + k * h);
  const cid = (i, j, k) => i + (nx - 1) * (j + (ny - 1) * k);
  const vIndex = new Int32Array((nx - 1) * (ny - 1) * (nz - 1)).fill(-1);
  const pos = [], nor = [];
  const grad = (x, y, z) => { const e = h * .25; return [sdf(x + e, y, z) - sdf(x - e, y, z), sdf(x, y + e, z) - sdf(x, y - e, z), sdf(x, y, z + e) - sdf(x, y, z - e)]; };
  const corners = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
  const edges = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const v = corners.map(([a, b, c]) => val[id(i + a, j + b, k + c)]);
    let inside = 0; v.forEach(d => { if (d < 0) inside++; });
    if (inside === 0 || inside === 8) continue;
    let sx = 0, sy = 0, sz = 0, n = 0;
    for (const [a, b] of edges) {
      if ((v[a] < 0) === (v[b] < 0)) continue;
      const t = v[a] / (v[a] - v[b]);
      sx += corners[a][0] + t * (corners[b][0] - corners[a][0]); sy += corners[a][1] + t * (corners[b][1] - corners[a][1]); sz += corners[a][2] + t * (corners[b][2] - corners[a][2]); n++;
    }
    let p = [min[0] + (i + sx / n) * h, min[1] + (j + sy / n) * h, min[2] + (k + sz / n) * h];
    for (let it = 0; it < 3; it++) {
      const d = sdf(...p), g = grad(...p), gl = g[0] ** 2 + g[1] ** 2 + g[2] ** 2;
      if (gl < 1e-12) break;
      const s = d / gl * (h * .5);
      p = [p[0] - g[0] * s, p[1] - g[1] * s, p[2] - g[2] * s];
    }
    const g = grad(...p), gl = len(...g) || 1;
    vIndex[cid(i, j, k)] = pos.length / 3;
    pos.push(...p); nor.push(g[0] / gl, g[1] / gl, g[2] / gl);
  }
  const idx = [];
  const quad = (a, b, c, d) => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return;
    const P = q => [pos[q * 3], pos[q * 3 + 1], pos[q * 3 + 2]];
    const [pa, pb, pc] = [P(a), P(b), P(c)];
    const u = [pb[0] - pa[0], pb[1] - pa[1], pb[2] - pa[2]], w = [pc[0] - pa[0], pc[1] - pa[1], pc[2] - pa[2]];
    const cr = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
    const nn = [nor[a * 3] + nor[c * 3], nor[a * 3 + 1] + nor[c * 3 + 1], nor[a * 3 + 2] + nor[c * 3 + 2]];
    if (cr[0] * nn[0] + cr[1] * nn[1] + cr[2] * nn[2] < 0) idx.push(a, c, b, a, d, c); else idx.push(a, b, c, a, c, d);
  };
  for (let k = 1; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++)
    if ((val[id(i, j, k)] < 0) !== (val[id(i + 1, j, k)] < 0)) quad(vIndex[cid(i, j - 1, k - 1)], vIndex[cid(i, j, k - 1)], vIndex[cid(i, j, k)], vIndex[cid(i, j - 1, k)]);
  for (let k = 1; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++)
    if ((val[id(i, j, k)] < 0) !== (val[id(i, j + 1, k)] < 0)) quad(vIndex[cid(i - 1, j, k - 1)], vIndex[cid(i, j, k - 1)], vIndex[cid(i, j, k)], vIndex[cid(i - 1, j, k)]);
  for (let k = 0; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++)
    if ((val[id(i, j, k)] < 0) !== (val[id(i, j, k + 1)] < 0)) quad(vIndex[cid(i - 1, j - 1, k)], vIndex[cid(i, j - 1, k)], vIndex[cid(i, j, k)], vIndex[cid(i - 1, j, k)]);
  return { pos: new Float32Array(pos), nor: new Float32Array(nor), idx: new Uint32Array(idx) };
};

const simplify = (m, ratio, error) => {
  const target = Math.floor(m.idx.length * ratio / 3) * 3;
  const [idx] = MeshoptSimplifier.simplify(m.idx, m.pos, 3, target, error);
  const remap = new Int32Array(m.pos.length / 3).fill(-1), pos = [], nor = [], out = [];
  for (const i of idx) {
    if (remap[i] < 0) { remap[i] = pos.length / 3; pos.push(m.pos[i * 3], m.pos[i * 3 + 1], m.pos[i * 3 + 2]); nor.push(m.nor[i * 3], m.nor[i * 3 + 1], m.nor[i * 3 + 2]); }
    out.push(remap[i]);
  }
  return { pos: new Float32Array(pos), nor: new Float32Array(nor), idx: new Uint32Array(out) };
};

// ---------- Nhân vật ----------
// Gốc tọa độ: giữa mặt đệm ghế. Nhân vật nhìn về +z. Sàn ở y = -SEAT.
const SEAT = .45;

const build = cfg => {
  const S = cfg.scale, sw = cfg.shoulder, M = cfg.male;
  const P = (x, y, z) => [x * S, y * S, z];
  const sides = [1, -1];

  // Khớp xương ở tư thế ngồi, tay đặt trên đùi
  const J = {
    hips: [0, .08, -.06], spine: [0, .2, -.065], chest: [0, .36, -.07], neck: [0, .56 * S, -.068], head: [0, .645 * S, -.05],
  };
  sides.forEach(s => {
    const k = s > 0 ? 'L' : 'R';
    J[`shoulder${k}`] = [s * .06, .52 * S, -.07];
    J[`upperArm${k}`] = [s * sw, .485 * S, -.072];
    J[`foreArm${k}`] = [s * (sw + .04), .255, -.035];
    J[`hand${k}`] = [s * .15, .19, .185];
  });

  // Đầu: hộp sọ, gò má tròn, cằm thon, mũi nhỏ, tai. Phóng to quanh điểm nối cổ theo tỷ lệ minh họa.
  const hc = [0, .752 * S, -.035];
  const HS = cfg.headScale, pivot = [0, .6 * S, -.05];
  const scaled = f => (x, y, z) => f(pivot[0] + (x - pivot[0]) / HS, pivot[1] + (y - pivot[1]) / HS, pivot[2] + (z - pivot[2]) / HS) * HS;
  const headSdf0 = (() => {
    const base = union(.045,
      ellipsoid(hc, [.097 * S, .112 * S, .104 * S]),
      ellipsoid([0, .69 * S, .002], [.08 * S, .072 * S, .082 * S]),
      ellipsoid([0, .652 * S, .032], [M ? .046 : .036, .03, .04]),
    );
    const cheeks = sides.map(s => ellipsoid([s * .047 * S, .695 * S, .048], [.04, .034, .036]));
    const nose = union(.012, ellipsoid([0, .718 * S, .084], [.012, .02, .014], [.25, 0, 0]), ellipsoid([0, .703 * S, .093], [.014, .011, .011]));
    const ears = sides.map(s => ellipsoid([s * .096 * S, .718 * S, -.032], [.013, .027, .02], [0, s * .35, 0]));
    const sockets = sides.map(s => ellipsoid([s * .036 * S, .73 * S, .1], [.02, .014, .012]));
    const neck = cone([0, .55 * S, -.066], [0, .67 * S, -.042], M ? .05 : .043, M ? .046 : .039);
    return (x, y, z) => {
      let d = base(x, y, z);
      cheeks.forEach(f => { d = smin(d, f(x, y, z), .035); });
      d = smin(d, nose(x, y, z), .014);
      ears.forEach(f => { d = smin(d, f(x, y, z), .012); });
      sockets.forEach(f => { d = smax(d, -f(x, y, z), .012); });
      return smin(d, neck(x, y, z), .035);
    };
  })();
  const headSdf = scaled(headSdf0);

  // Tóc có rãnh sợi chạy dọc để không trông như mũ bảo hiểm
  const hairSdf0 = (() => {
    const strands = (x, y, z) => .0021 * Math.sin(Math.atan2(x, z + .04) * 46 + y * 18) + .0009 * Math.sin(Math.atan2(x, z + .04) * 117);
    const faceCut = ellipsoid([0, .672 * S, .095], [.083 * S, .112 * S, .085]);
    if (cfg.hair === 'short') {
      const cap = union(.03,
        ellipsoid([0, .765 * S, -.04], [.104 * S, .112 * S, .112 * S]),
        ellipsoid([.01, .828 * S, .03], [.08, .026, .068], [.2, 0, -.12]),
      );
      return (x, y, z) => {
        let d = cap(x, y, z);
        d = smax(d, -faceCut(x, y, z), .014);
        d = smax(d, (M ? .705 * S : .69) - y + Math.max(0, -z - .02) * 1.4, .02);
        return d + strands(x, y, z) * .7;
      };
    }
    const long = cfg.hair === 'long';
    const shape = union(.04,
      ellipsoid([0, .752 * S, -.04], [.108 * S, .12 * S, .114 * S]),
      ellipsoid([0, (long ? .64 : .69) * S, -.056], [.118 * S, (long ? .15 : .1) * S, .105 * S]),
      ellipsoid([0, .812 * S, .06], [.097 * S, .036, .05], [-.22, 0, 0]),
      ...(long ? [ellipsoid([0, .54, -.1], [.11, .12, .055], [.2, 0, 0])] : []),
    );
    const bottom = (long ? .5 : .625) * S;
    return (x, y, z) => {
      let d = shape(x, y, z);
      d = smax(d, -faceCut(x, y, z), .016);
      d = smax(d, bottom - y + (long ? 0 : Math.abs(x) * .25), .012);
      // Tóc dài chỉ buông sau lưng và hai bên, không vòng ra trước cằm
      if (long) d = smax(d, -smax(y - .665 * S, -.025 + Math.max(0, Math.abs(x) - .075) * 2.2 - z, .01), .012);
      return d + strands(x, y, z);
    };
  })();
  const hairSdf = scaled(hairSdf0);

  // Áo: thân, vai, tay áo rộng, bo gấu và cổ áo dệt kim, nếp gấp ở khuỷu tay
  const sleeve = s => {
    const sh = J[`upperArm${s > 0 ? 'L' : 'R'}`], el = J[`foreArm${s > 0 ? 'L' : 'R'}`], wr = J[`hand${s > 0 ? 'L' : 'R'}`];
    return { up: cone(sh, el, .054, .047), fore: cone(el, [wr[0] + s * .006, wr[1] + .006, wr[2] - .03], .047, .04), cuff: cone([wr[0] + s * .009, wr[1] + .008, wr[2] - .045], [wr[0] + s * .004, wr[1] + .004, wr[2] - .018], .041, .04), sh, el, wr };
  };
  const sleeves = sides.map(sleeve);
  const topSdf = (() => {
    const body = union(.06,
      ellipsoid([0, .16, -.058], [(M ? .152 : .14), .13, .118]),
      ellipsoid([0, .37 * S, -.07], [(M ? .17 : .148), .15, .108]),
      ...sides.map(s => cone([s * .03, .545 * S, -.07], [s * (sw - .015), .49 * S, -.072], .058, .054)),
      ...(M ? [] : sides.map(s => ellipsoid([s * .05, .38 * S, -.02], [.05, .045, .042]))),
      ...(cfg.top === 'hoodie' ? [ellipsoid([0, .545 * S, -.15], [.12, .065, .075], [-.5, 0, 0])] : []),
    );
    const collar = torus([0, .55 * S, -.07], M ? .062 : .055, .02);
    return (x, y, z) => {
      let d = body(x, y, z);
      sleeves.forEach(sl => { d = smin(d, smin(sl.up(x, y, z), sl.fore(x, y, z), .03), .06); d = smin(d, sl.cuff(x, y, z), .01); });
      d = smin(d, collar(x, y, z), .02);
      d = smax(d, .015 - y, .02);
      // Bo gấu, cổ áo, cổ tay: gân dệt kim
      const ang = Math.atan2(x, z + .06);
      if (y < .06) d += .0016 * Math.sin(ang * 70) * clamp((.06 - y) / .02, 0, 1);
      if (y > .52 * S) d += .0012 * Math.sin(ang * 60);
      sleeves.forEach(sl => {
        const t = segT(sl.el, sl.wr, x, y, z);
        if (t > .82) d += .0013 * Math.sin(Math.atan2(y - sl.wr[1], x - sl.wr[0]) * 34) * (t - .82) * 5;
        // Nếp nhăn mềm quanh khuỷu tay
        const de = len(x - sl.el[0], y - sl.el[1], z - sl.el[2]);
        if (de < .08) d += .0035 * Math.sin(de * 110) * (1 - de / .08);
      });
      return d;
    };
  })();

  // Quần và giày: chân ngồi, đùi gần ngang, cẳng chân thẳng xuống sàn
  const legs = sides.map(s => ({
    thigh: cone([s * .08, .07, -.035], [s * .092, .085, .36], .076, .06),
    shin: cone([s * .092, .075, .38], [s * .09, -SEAT + .085, .37], .056, .042),
    shoe: union(.02, ellipsoid([s * .098, -SEAT + .04, .41], [.048, .04, .095]), ellipsoid([s * .098, -SEAT + .07, .37], [.042, .035, .05])),
    ankle: [s * .098, -SEAT + .085, .37],
  }));
  const pantsSdf = (() => {
    const pelvis = ellipsoid([0, .07, -.06], [.155, .085, .12]);
    return (x, y, z) => {
      let d = pelvis(x, y, z);
      legs.forEach(l => { d = smin(d, smin(l.thigh(x, y, z), l.shin(x, y, z), .045), .05); });
      // Nếp gấp ở háng và đầu gối
      legs.forEach(l => { const dk = len(x - l.ankle[0], y - .085, z - .39); if (dk < .09) d += .0025 * Math.sin(dk * 90) * (1 - dk / .09); });
      return smax(d, -SEAT + .07 - y, .01);
    };
  })();
  const shoeSdf = (x, y, z) => smax(legs.reduce((d, l) => Math.min(d, l.shoe(x, y, z)), 1e9), -SEAT + .004 - y, .006);

  // Bàn tay dạng găng mềm: lòng bàn tay, bốn ngón khép, ngón cái
  const handSdf = (() => {
    const parts = sides.map(s => {
      const w = J[`hand${s > 0 ? 'L' : 'R'}`];
      return union(.014,
        cone([w[0] + s * .006, w[1] + .002, w[2] - .03], [w[0], w[1], w[2] + .01], .03, .028),
        ellipsoid([w[0] - s * .012, w[1] - .006, w[2] + .045], [.036, .016, .045], [.12, s * .18, 0]),
        ellipsoid([w[0] - s * .02, w[1] - .012, w[2] + .093], [.034, .012, .032], [.25, s * .18, 0]),
        cone([w[0] - s * .036, w[1] - .002, w[2] + .03], [w[0] - s * .05, w[1] - .006, w[2] + .068], .012, .009),
      );
    });
    return (x, y, z) => {
      let d = Math.min(...parts.map(f => f(x, y, z)));
      // Rãnh giữa các ngón
      const zz = z - J.handL[2];
      if (zz > .07) d += .0012 * Math.max(0, Math.sin(x * 330)) * clamp((zz - .07) / .02, 0, 1);
      return d;
    };
  })();

  const parts = [
    { name: 'skin', sdf: headSdf, min: [-.16, .52 * S, -.2], max: [.16, 1.0 * S, .17], h: .0024, ratio: .09, err: .0012, bones: ['head', 'neck'] },
    { name: 'hands', sdf: handSdf, min: [-.24, .1, .1], max: [.24, .24, .32], h: .0026, ratio: .12, err: .0012, bones: ['hand', 'foreArm'], material: 'skin' },
    { name: 'hair', sdf: hairSdf, min: [-.18, .42, -.24], max: [.18, 1.02 * S, .17], h: .003, ratio: .2, err: .0022, bones: ['head'] },
    { name: 'top', sdf: topSdf, min: [-.32, -.02, -.24], max: [.32, .62 * S, .25], h: .0042, ratio: .07, err: .0016, bones: ['spine', 'chest', 'shoulder', 'upperArm', 'foreArm', 'hips', 'neck'] },
    { name: 'pants', sdf: pantsSdf, min: [-.24, -SEAT + .05, -.22], max: [.24, .2, .5], h: .0048, ratio: .07, err: .0018, bones: ['hips'] },
    { name: 'shoes', sdf: shoeSdf, min: [-.2, -SEAT - .01, .25], max: [.2, -SEAT + .14, .53], h: .0035, ratio: .12, err: .0014, bones: ['hips'] },
  ];

  // Đoạn ảnh hưởng của từng xương để tính trọng số da
  const segs = {
    hips: [[0, -.05, -.06], [0, .12, -.06]], spine: [[0, .12, -.062], [0, .28, -.066]], chest: [[0, .28, -.068], [0, .5 * S, -.07]],
    neck: [[0, .54 * S, -.068], [0, .62 * S, -.055]], head: [[0, .66 * S, -.045], [0, .86 * S, -.03]],
  };
  sides.forEach(s => {
    const k = s > 0 ? 'L' : 'R';
    segs[`shoulder${k}`] = [[s * .05, .52 * S, -.07], [s * (sw - .02), .505 * S, -.072]];
    segs[`upperArm${k}`] = [J[`upperArm${k}`], J[`foreArm${k}`]];
    segs[`foreArm${k}`] = [J[`foreArm${k}`], J[`hand${k}`]];
    segs[`hand${k}`] = [J[`hand${k}`], [J[`hand${k}`][0] - s * .02, J[`hand${k}`][1] - .01, J[`hand${k}`][2] + .11]];
  });
  const boneNames = ['hips', 'spine', 'chest', 'neck', 'head', 'shoulderL', 'upperArmL', 'foreArmL', 'handL', 'shoulderR', 'upperArmR', 'foreArmR', 'handR'];
  const parent = { spine: 'hips', chest: 'spine', neck: 'chest', head: 'neck', shoulderL: 'chest', upperArmL: 'shoulderL', foreArmL: 'upperArmL', handL: 'foreArmL', shoulderR: 'chest', upperArmR: 'shoulderR', foreArmR: 'upperArmR', handR: 'foreArmR' };

  const meshes = parts.map(p => {
    const t0 = Date.now();
    const raw = polygonize(p.sdf, p.min, p.max, p.h);
    const m = simplify(raw, p.ratio, p.err);
    const n = m.pos.length / 3, joints = new Uint8Array(n * 4), weights = new Float32Array(n * 4);
    const allowed = boneNames.map((b, i) => [b, i]).filter(([b]) => p.bones.some(x => b.startsWith(x)));
    for (let v = 0; v < n; v++) {
      const [x, y, z] = [m.pos[v * 3], m.pos[v * 3 + 1], m.pos[v * 3 + 2]];
      const w = allowed.map(([b, i]) => [i, 1 / Math.pow(segDist(segs[b][0], segs[b][1], x, y, z) + .012, 5)]).sort((a, b) => b[1] - a[1]).slice(0, 4);
      const sum = w.reduce((a, b) => a + b[1], 0);
      w.forEach(([i, wt], k) => { joints[v * 4 + k] = i; weights[v * 4 + k] = wt / sum; });
    }
    console.log(`  ${cfg.id}/${p.name}: ${raw.idx.length / 3} -> ${m.idx.length / 3} tris, ${Date.now() - t0}ms`);
    return { ...p, ...m, joints, weights };
  });

  // Điểm neo trên mặt cho mắt, lông mày, miệng, má: dò từ phía trước vào bề mặt da
  const hit = (x, y) => { let z = .2; for (let i = 0; i < 300; i++) { const d = headSdf(x, y, z); if (d < 1e-4) break; z -= Math.max(d * .8, 2e-4); } return z; };
  const anchor = (x, y) => [x, y, hit(x, y)];
  const anchors = {
    eyeL: anchor(.036 * S, .73 * S), eyeR: anchor(-.036 * S, .73 * S),
    browL: anchor(.037 * S, .763 * S), browR: anchor(-.037 * S, .763 * S),
    mouth: anchor(0, .672 * S), cheekL: anchor(.052 * S, .69 * S), cheekR: anchor(-.052 * S, .69 * S),
  };
  return { meshes, J, boneNames, parent, anchors };
};

// ---------- Xuất GLB ----------
const write = async (cfg) => {
  const c = build(cfg);
  const doc = new Document(), buf = doc.createBuffer(), scene = doc.createScene();
  const nodes = {};
  c.boneNames.forEach(b => {
    const p = c.parent[b] ? c.J[c.parent[b]] : [0, 0, 0];
    nodes[b] = doc.createNode(b).setTranslation([c.J[b][0] - p[0], c.J[b][1] - p[1], c.J[b][2] - p[2]]);
  });
  c.boneNames.forEach(b => { if (c.parent[b]) nodes[c.parent[b]].addChild(nodes[b]); });
  scene.addChild(nodes.hips);
  const ibm = new Float32Array(c.boneNames.length * 16);
  c.boneNames.forEach((b, i) => { const o = i * 16; ibm.set([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, -c.J[b][0], -c.J[b][1], -c.J[b][2], 1], o); });
  const skin = doc.createSkin('body').setSkeleton(nodes.hips).setInverseBindMatrices(doc.createAccessor().setType('MAT4').setArray(ibm).setBuffer(buf));
  c.boneNames.forEach(b => skin.addJoint(nodes[b]));
  const head = c.J.head;
  nodes.head.setExtras({ scale: cfg.headScale, anchors: Object.fromEntries(Object.entries(c.anchors).map(([k, v]) => [k, [v[0] - head[0], v[1] - head[1], v[2] - head[2]]])) });
  for (const m of c.meshes) {
    const prim = doc.createPrimitive()
      .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(m.pos).setBuffer(buf))
      .setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(m.nor).setBuffer(buf))
      .setAttribute('JOINTS_0', doc.createAccessor().setType('VEC4').setArray(m.joints).setBuffer(buf))
      .setAttribute('WEIGHTS_0', doc.createAccessor().setType('VEC4').setArray(m.weights).setBuffer(buf))
      .setIndices(doc.createAccessor().setType('SCALAR').setArray(m.pos.length / 3 > 65535 ? m.idx : new Uint16Array(m.idx)).setBuffer(buf))
      .setMaterial(doc.createMaterial(m.material ?? m.name));
    scene.addChild(doc.createNode(m.name).setMesh(doc.createMesh(m.name).addPrimitive(prim)).setSkin(skin));
  }
  scene.setExtras({ seat: SEAT, colors: cfg.colors });
  await doc.transform(quantize({ quantizePosition: 14, quantizeNormal: 10, quantizeWeight: 8 }));
  const bytes = await new NodeIO().registerExtensions(ALL_EXTENSIONS).writeBinary(doc);
  const gz = gzipSync(bytes, { level: 9 });
  writeFileSync(`${OUT}/${cfg.id}.glb.gz`, gz);
  console.log(cfg.id, 'gz KB', Math.round(gz.length / 1024));
};

const CAST = [
  { id: 'char-a', male: false, scale: 1, headScale: 1.17, shoulder: .158, hair: 'bob', top: 'sweater', colors: { skin: '#EEC1A0', hair: '#1D1715', top: '#8FA7D3', pants: '#2F3A57', shoes: '#F3F1EC' } },
  { id: 'char-b', male: true, scale: 1.04, headScale: 1.12, shoulder: .178, hair: 'short', top: 'hoodie', colors: { skin: '#E8B996', hair: '#16110F', top: '#5F8273', pants: '#363B47', shoes: '#E9E6E0' } },
  { id: 'char-c', male: false, scale: 1, headScale: 1.17, shoulder: .155, hair: 'long', top: 'sweater', colors: { skin: '#F0C4A6', hair: '#221A17', top: '#D29E97', pants: '#4E5770', shoes: '#8A6E5E' } },
];
for (const cfg of CAST) await write(cfg);
