import * as THREE from 'three';

// Nhân vật VALID ít đa giác ở thân và tóc nên viền vai, tay áo, khuỷu tay và đuôi tóc bị gãy khúc.
// Chia mịn một lần kiểu Loop ngay khi nạp: mỗi tam giác thành bốn, đỉnh được kéo về mặt cong trơn.
// Phần có biểu cảm (khuôn mặt) giữ nguyên lưới gốc để không phải nhân 65 morph target lên gấp bốn.
// Đỉnh nằm trên đường nối với khuôn mặt được ghim lại để không hở mép.

type Attr = THREE.BufferAttribute | THREE.InterleavedBufferAttribute;

const read = (a: Attr, n: number) => {
  const out = new Float32Array(a.count * n);
  for (let i = 0; i < a.count; i++) for (let k = 0; k < n; k++) out[i * n + k] = a.getComponent(i, k);
  return out;
};

/** Đỉnh bất kỳ morph target nào làm dịch chuyển */
const morphed = (geo: THREE.BufferGeometry) => {
  const n = geo.attributes.position.count, out = new Uint8Array(n);
  for (const t of geo.morphAttributes.position ?? []) {
    for (let i = 0; i < n; i++) if (!out[i] && (Math.abs(t.getX(i)) + Math.abs(t.getY(i)) + Math.abs(t.getZ(i))) > 1e-6) out[i] = 1;
  }
  return out;
};

/**
 * Chia mịn một bậc các tam giác `tris` của `geo`.
 * pinned: đỉnh (chỉ số gốc) giữ nguyên vị trí và pháp tuyến, dùng cho đường nối với phần không chia.
 */
const subdivide = (geo: THREE.BufferGeometry, tris: number[], pinned: Uint8Array) => {
  const P = read(geo.attributes.position as Attr, 3), N = read(geo.attributes.normal as Attr, 3);
  const UV = read(geo.attributes.uv as Attr, 2), J = read(geo.attributes.skinIndex as Attr, 4), W = read(geo.attributes.skinWeight as Attr, 4);
  const n = P.length / 3;

  // Gộp các đỉnh trùng vị trí (bị tách do đường nối UV) để tìm đúng quan hệ láng giềng
  const box = new THREE.Box3().setFromBufferAttribute(geo.attributes.position as THREE.BufferAttribute);
  const eps = box.getSize(new THREE.Vector3()).length() * 1e-6;
  const weld = new Int32Array(n), ids = new Map<string, number>(), wp: number[] = [];
  const key = (i: number) => `${Math.round(P[i * 3] / eps)},${Math.round(P[i * 3 + 1] / eps)},${Math.round(P[i * 3 + 2] / eps)}`;
  for (let i = 0; i < n; i++) {
    const k = key(i);
    let id = ids.get(k);
    if (id === undefined) { id = wp.length / 3; ids.set(k, id); wp.push(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]); }
    weld[i] = id;
  }
  const wn = wp.length / 3, wpin = new Uint8Array(wn);
  for (let i = 0; i < n; i++) if (pinned[i]) wpin[weld[i]] = 1;

  // Cạnh theo đỉnh đã gộp: số tam giác dùng chung và các đỉnh đối diện
  const ek = (a: number, b: number) => a < b ? a * wn + b : b * wn + a;
  const edges = new Map<number, { a: number; b: number; opp: number[] }>();
  for (let t = 0; t < tris.length; t += 3) {
    for (let k = 0; k < 3; k++) {
      const a = weld[tris[t + k]], b = weld[tris[t + (k + 1) % 3]], c = weld[tris[t + (k + 2) % 3]];
      const id = ek(a, b);
      let e = edges.get(id);
      if (!e) edges.set(id, e = { a, b, opp: [] });
      e.opp.push(c);
    }
  }
  const nb: number[][] = Array.from({ length: wn }, () => []), bnd: number[][] = Array.from({ length: wn }, () => []);
  for (const e of edges.values()) {
    nb[e.a].push(e.b); nb[e.b].push(e.a);
    if (e.opp.length !== 2) { bnd[e.a].push(e.b); bnd[e.b].push(e.a); }
  }

  // Vị trí mới của đỉnh cũ
  const even = new Float32Array(wn * 3);
  for (let v = 0; v < wn; v++) {
    const set = (x: number, y: number, z: number) => { even[v * 3] = x; even[v * 3 + 1] = y; even[v * 3 + 2] = z; };
    const vx = wp[v * 3], vy = wp[v * 3 + 1], vz = wp[v * 3 + 2];
    if (wpin[v] || nb[v].length === 0) { set(vx, vy, vz); continue; }
    if (bnd[v].length) {
      // Mép hở (viền tay áo, đuôi tóc): chỉ làm trơn dọc theo mép. Góc nhọn hoặc mép rẽ nhánh giữ nguyên.
      if (bnd[v].length !== 2) { set(vx, vy, vz); continue; }
      const [a, b] = bnd[v];
      set(.75 * vx + .125 * (wp[a * 3] + wp[b * 3]), .75 * vy + .125 * (wp[a * 3 + 1] + wp[b * 3 + 1]), .75 * vz + .125 * (wp[a * 3 + 2] + wp[b * 3 + 2]));
      continue;
    }
    const k = nb[v].length, beta = k === 3 ? 3 / 16 : 3 / (8 * k);
    let sx = 0, sy = 0, sz = 0;
    for (const u of nb[v]) { sx += wp[u * 3]; sy += wp[u * 3 + 1]; sz += wp[u * 3 + 2]; }
    set((1 - k * beta) * vx + beta * sx, (1 - k * beta) * vy + beta * sy, (1 - k * beta) * vz + beta * sz);
  }
  // Vị trí đỉnh mới giữa mỗi cạnh
  const odd = new Map<number, [number, number, number]>();
  for (const [id, e] of edges) {
    const { a, b, opp } = e;
    if (opp.length !== 2 || (wpin[a] && wpin[b])) {
      odd.set(id, [(wp[a * 3] + wp[b * 3]) / 2, (wp[a * 3 + 1] + wp[b * 3 + 1]) / 2, (wp[a * 3 + 2] + wp[b * 3 + 2]) / 2]);
    } else {
      const [c, d] = opp;
      odd.set(id, [0, 1, 2].map(k => .375 * (wp[a * 3 + k] + wp[b * 3 + k]) + .125 * (wp[c * 3 + k] + wp[d * 3 + k])) as [number, number, number]);
    }
  }

  // Dựng lưới mới. Đỉnh cũ giữ UV và trọng số xương; đỉnh giữa cạnh lấy trung bình hai đầu.
  const pos: number[] = [], uv: number[] = [], ji: number[] = [], jw: number[] = [], nor: number[] = [], pin: number[] = [];
  const remap = new Map<number, number>(), mids = new Map<number, number>(), index: number[] = [];
  const old = (i: number) => {
    let o = remap.get(i);
    if (o !== undefined) return o;
    o = pos.length / 3; remap.set(i, o);
    const v = weld[i];
    pos.push(even[v * 3], even[v * 3 + 1], even[v * 3 + 2]);
    uv.push(UV[i * 2], UV[i * 2 + 1]);
    for (let k = 0; k < 4; k++) { ji.push(J[i * 4 + k]); jw.push(W[i * 4 + k]); }
    nor.push(N[i * 3], N[i * 3 + 1], N[i * 3 + 2]);
    pin.push(pinned[i]);
    return o;
  };
  const mid = (i: number, j: number) => {
    const id = i < j ? i * n + j : j * n + i;
    let o = mids.get(id);
    if (o !== undefined) return o;
    o = pos.length / 3; mids.set(id, o);
    pos.push(...odd.get(ek(weld[i], weld[j]))!);
    uv.push((UV[i * 2] + UV[j * 2]) / 2, (UV[i * 2 + 1] + UV[j * 2 + 1]) / 2);
    // Gộp trọng số hai đầu, giữ bốn xương nặng nhất
    const m = new Map<number, number>();
    for (const s of [i, j]) for (let k = 0; k < 4; k++) if (W[s * 4 + k] > 0) m.set(J[s * 4 + k], (m.get(J[s * 4 + k]) ?? 0) + W[s * 4 + k] / 2);
    const top = [...m].sort((x, y) => y[1] - x[1]).slice(0, 4), sum = top.reduce((s, x) => s + x[1], 0) || 1;
    for (let k = 0; k < 4; k++) { ji.push(top[k]?.[0] ?? 0); jw.push((top[k]?.[1] ?? 0) / sum); }
    nor.push(0, 0, 0);
    pin.push(pinned[i] && pinned[j] ? 1 : 0);
    return o;
  };
  // Cạnh có hai đầu đều bị ghim (đường nối với khuôn mặt) không được chia: đỉnh giữa cạnh khi uốn theo xương
  // sẽ lệch khỏi mép bên kia và hở thành vệt chấm sáng.
  const split = (i: number, j: number) => !(pinned[i] && pinned[j]);
  for (let t = 0; t < tris.length; t += 3) {
    let v = [tris[t], tris[t + 1], tris[t + 2]], s = [split(v[0], v[1]), split(v[1], v[2]), split(v[2], v[0])];
    const count = s.filter(Boolean).length;
    // Xoay để mẫu chia luôn bắt đầu từ cạnh đầu tiên
    for (let r = 0; r < 3 && count && count < 3; r++) {
      if (count === 1 ? s[0] : s[0] && s[1]) break;
      v = [v[1], v[2], v[0]]; s = [s[1], s[2], s[0]];
    }
    const [a, b, c] = v, A = old(a), B = old(b), C = old(c);
    if (count === 3) { const ab = mid(a, b), bc = mid(b, c), ca = mid(c, a); index.push(A, ab, ca, ab, B, bc, ca, bc, C, ab, bc, ca); }
    else if (count === 2) { const ab = mid(a, b), bc = mid(b, c); index.push(ab, B, bc, A, ab, bc, A, bc, C); }
    else if (count === 1) { const ab = mid(a, b); index.push(A, ab, C, ab, B, C); }
    else index.push(A, B, C);
  }

  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  out.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(ji, 4));
  out.setAttribute('skinWeight', new THREE.Float32BufferAttribute(jw, 4));
  out.setIndex(index);

  // Pháp tuyến trơn: cộng pháp tuyến mặt theo vị trí, bỏ qua đường nối UV để không lộ vệt sáng tối.
  // Đỉnh bị ghim lấy pháp tuyến gốc cho khớp với khuôn mặt.
  const m = pos.length / 3, acc = new Map<string, THREE.Vector3>(), cell = (i: number) => `${Math.round(pos[i * 3] / eps)},${Math.round(pos[i * 3 + 1] / eps)},${Math.round(pos[i * 3 + 2] / eps)}`;
  const va = new THREE.Vector3(), vb = new THREE.Vector3(), vc = new THREE.Vector3();
  const keys = Array.from({ length: m }, (_, i) => cell(i));
  for (let t = 0; t < index.length; t += 3) {
    const [a, b, c] = [index[t], index[t + 1], index[t + 2]];
    va.fromArray(pos, a * 3); vb.fromArray(pos, b * 3); vc.fromArray(pos, c * 3);
    const f = vc.sub(vb).cross(va.sub(vb));
    for (const v of [a, b, c]) {
      let s = acc.get(keys[v]);
      if (!s) acc.set(keys[v], s = new THREE.Vector3());
      s.add(f);
    }
  }
  for (let i = 0; i < m; i++) {
    if (pin[i] && (nor[i * 3] || nor[i * 3 + 1] || nor[i * 3 + 2])) continue;
    const s = acc.get(keys[i])!.clone().normalize();
    nor[i * 3] = s.x; nor[i * 3 + 1] = s.y; nor[i * 3 + 2] = s.z;
  }
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  return out;
};

// Bản gốc tách đỉnh ở đường nối UV (cằm với cổ) nhưng mỗi bản sao mang trọng số xương hơi khác nhau,
// khi uốn theo xương chúng tách ra thành khe nhỏ lộ tường phía sau. Cho mọi đỉnh trùng vị trí dùng chung trọng số.
const weldSkin = (geo: THREE.BufferGeometry) => {
  const P = geo.attributes.position, J = geo.attributes.skinIndex, W = geo.attributes.skinWeight;
  const first = new Map<string, number>();
  for (let i = 0; i < P.count; i++) {
    const k = `${P.getX(i).toFixed(4)},${P.getY(i).toFixed(4)},${P.getZ(i).toFixed(4)}`, f = first.get(k);
    if (f === undefined) { first.set(k, i); continue; }
    for (let c = 0; c < 4; c++) { J.setComponent(i, c, J.getComponent(f, c)); W.setComponent(i, c, W.getComponent(f, c)); }
    // Biểu cảm cũng có thể chỉ kéo một bản sao, nên dùng chung độ dịch morph
    for (const t of geo.morphAttributes.position ?? []) t.setXYZ(i, t.getX(f), t.getY(f), t.getZ(f));
  }
  J.needsUpdate = W.needsUpdate = true;
  for (const t of geo.morphAttributes.position ?? []) t.needsUpdate = true;
};

/** Chia mịn phần không có biểu cảm của một lưới có khung xương. Phần còn lại giữ lưới gốc. */
const smoothMesh = (mesh: THREE.SkinnedMesh) => {
  const geo = mesh.geometry, src = geo.index;
  if (!src) return;
  weldSkin(geo);
  const moving = morphed(geo), keep: number[] = [], soft: number[] = [];
  for (let t = 0; t < src.count; t += 3) {
    const tri = [src.getX(t), src.getX(t + 1), src.getX(t + 2)];
    (tri.some(i => moving[i]) ? keep : soft).push(...tri);
  }
  if (!soft.length) return;
  // Đỉnh dùng chung giữa phần giữ và phần chia (theo vị trí, vì đường nối có thể tách đỉnh)
  const pinned = new Uint8Array(geo.attributes.position.count);
  if (keep.length) {
    const P = geo.attributes.position, at = (i: number) => `${P.getX(i).toFixed(5)},${P.getY(i).toFixed(5)},${P.getZ(i).toFixed(5)}`;
    const edge = new Set(keep.map(at));
    for (const i of soft) if (edge.has(at(i))) pinned[i] = 1;
  }
  const smooth = subdivide(geo, soft, pinned);
  if (!keep.length) { mesh.geometry = smooth; geo.dispose(); return; }
  geo.setIndex(keep);
  const body = new THREE.SkinnedMesh(smooth, mesh.material);
  body.name = `${mesh.name}_smooth`;
  body.position.copy(mesh.position); body.quaternion.copy(mesh.quaternion); body.scale.copy(mesh.scale);
  mesh.parent!.add(body);
  body.bind(mesh.skeleton, mesh.bindMatrix);
};

// Răng, mắt và tuyến lệ đã đủ mịn hoặc bị che, không cần chia
const SKIP = /eye|gland|teeth/i;

export const smoothValid = (root: THREE.Object3D) => {
  if (root.userData.smoothed) return;
  root.userData.smoothed = true;
  const meshes: THREE.SkinnedMesh[] = [];
  root.traverse(o => { if ((o as THREE.SkinnedMesh).isSkinnedMesh && !SKIP.test(o.name)) meshes.push(o as THREE.SkinnedMesh); });
  meshes.forEach(smoothMesh);
};
