// Dựng căn phòng bằng path tracing ngay trong trình duyệt, dùng GPU thật. Driver: tools/bake.mjs
// Ánh sáng ban ngày đi qua ô cửa thật, nảy nhiều lần trên tường và đồ vật, nên có bóng mềm và màu hắt tự nhiên.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { EquirectCamera, PhysicalCamera, ShapedAreaLight, WebGLPathTracer } from 'three-gpu-pathtracer';
import { CAM, LOOK, onSofa, PLATE, ROOM, SEAT, SIDE_WINDOW, SOFA, TABLE, WINDOW } from '../src/room/layout';

const RAW = 'http://bake.local/raw';
const params = new URLSearchParams(location.search);
const LAMP = +(params.get('lamp') ?? 11);
const WALL = '#E2D8C8', TRIM = '#F2EDE3', BRASS = '#A98A58';

const scene = new THREE.Scene();
const ray = new THREE.Raycaster();
const textures = new THREE.TextureLoader();
// Trình dựng nạp ảnh vào GPU ngay khi nhận cảnh, nên phải chờ mọi texture tải xong trước đó
const pending: Promise<unknown>[] = [];
const image = (url: string) => {
  let done = () => {};
  pending.push(new Promise<void>(res => { done = res; }));
  return textures.load(url, () => done(), undefined, () => done());
};
const tex = (url: string, repeat: [number, number], color = false) => {
  const t = image(`${RAW}/surfaces/${url}`);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(...repeat);
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  return t;
};
const add = (geo: THREE.BufferGeometry, mat: THREE.Material, pos: [number, number, number] = [0, 0, 0], rot: [number, number, number] = [0, 0, 0]) => {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(...pos);
  m.rotation.set(...rot);
  scene.add(m);
  return m;
};
const paint = (color: string, roughness = .9, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
const box = (size: [number, number, number], mat: THREE.Material, pos: [number, number, number], radius = 0) =>
  add(radius ? new RoundedBoxGeometry(...size, 3, radius) : new THREE.BoxGeometry(...size), mat, pos);

// Tường có khoét ô cửa thật. Tường đủ dày để ô cửa có má cửa và ánh sáng không lọt qua khe.
const buildShell = () => {
  const { left, right, back, front, height, wall } = ROOM;
  const wallMat = new THREE.MeshStandardMaterial({ color: WALL, roughness: .92, normalMap: tex('painted_plaster_wall_nor.jpg', [2.2, 1]), normalScale: new THREE.Vector2(.18, .18) });
  const width = right - left, depth = front - back, mx = (left + right) / 2, mz = (back + front) / 2;
  const floor = new THREE.MeshStandardMaterial({
    map: tex('herringbone_parquet_diff.jpg', [3, 3.2], true), normalMap: tex('herringbone_parquet_nor.jpg', [3, 3.2]), roughnessMap: tex('herringbone_parquet_rough.jpg', [3, 3.2]), color: '#E6D6C2',
  });
  box([width + 1, .1, depth + 1], floor, [mx, -.05, mz]);
  box([width + 1, .1, depth + 1], paint('#F4F1EA', 1), [mx, height + .05, mz]);
  box([wall, height, depth], wallMat, [right + wall / 2, height / 2, mz]);
  box([width, height, wall], wallMat, [mx, height / 2, front + wall / 2]);

  const cut = (w: typeof WINDOW) => ({ a: w.x - w.w / 2, b: w.x + w.w / 2, top: w.y + w.h / 2, low: w.y - w.h / 2 });
  const b = cut(WINDOW);
  box([b.a - left, height, wall], wallMat, [(left + b.a) / 2, height / 2, back - wall / 2]);
  box([right - b.b, height, wall], wallMat, [(right + b.b) / 2, height / 2, back - wall / 2]);
  box([WINDOW.w, height - b.top, wall], wallMat, [WINDOW.x, (height + b.top) / 2, back - wall / 2]);
  box([WINDOW.w, b.low, wall], wallMat, [WINDOW.x, b.low / 2, back - wall / 2]);

  const za = SIDE_WINDOW.z - SIDE_WINDOW.w / 2, zb = SIDE_WINDOW.z + SIDE_WINDOW.w / 2, top = SIDE_WINDOW.y + SIDE_WINDOW.h / 2, low = SIDE_WINDOW.y - SIDE_WINDOW.h / 2;
  box([wall, height, za - back], wallMat, [left - wall / 2, height / 2, (back + za) / 2]);
  box([wall, height, front - zb], wallMat, [left - wall / 2, height / 2, (front + zb) / 2]);
  box([wall, height - top, SIDE_WINDOW.w], wallMat, [left - wall / 2, (height + top) / 2, SIDE_WINDOW.z]);
  box([wall, low, SIDE_WINDOW.w], wallMat, [left - wall / 2, low / 2, SIDE_WINDOW.z]);

  // Khung cửa, bậu cửa, chân tường, phào trần
  const trim = paint(TRIM, .55);
  const f = .07;
  box([WINDOW.w + .14, f, .1], trim, [WINDOW.x, b.top + f / 2, back + .01]);
  box([WINDOW.w + .14, f, .1], trim, [WINDOW.x, b.low - f / 2, back + .01]);
  box([f, WINDOW.h, .1], trim, [b.a - f / 2, WINDOW.y, back + .01]);
  box([f, WINDOW.h, .1], trim, [b.b + f / 2, WINDOW.y, back + .01]);
  box([.035, WINDOW.h, .05], trim, [WINDOW.x, WINDOW.y, back - .08]);
  box([WINDOW.w, .03, .05], trim, [WINDOW.x, WINDOW.y + .42, back - .08]);
  box([WINDOW.w + .04, .035, .13], trim, [WINDOW.x, b.low - .09, back + .03], .01);
  [[left, b.a - .07], [b.b + .07, right]].forEach(([p, q]) => box([q - p, .12, .022], trim, [(p + q) / 2, .06, back + .011]));
  box([.022, .12, depth], trim, [right - .011, .06, mz]);
  box([width, .07, .03], trim, [mx, height - .035, back + .015]);
  box([.03, .07, depth], trim, [right - .015, height - .035, mz]);
};

const curtain = (x: number, z: number, width: number, height: number, color: string, depth = .03, rotY = 0) => {
  const g = new THREE.PlaneGeometry(width, height, Math.round(width * 170), 30);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const px = p.getX(i), py = p.getY(i);
    const flare = 1 + (height / 2 - py) * .16;
    p.setZ(i, (Math.sin(px * 30) * depth + Math.sin(px * 11.3 + 1) * depth * .6 + Math.sin(px * 67 + py) * depth * .12) * flare);
  }
  g.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ color, roughness: .96, side: THREE.DoubleSide });
  add(g, mat, [x, height / 2, z], [0, rotY, 0]);
};

const buildDrapes = () => {
  const { back, height, left } = ROOM;
  const a = WINDOW.x - WINDOW.w / 2, b = WINDOW.x + WINDOW.w / 2;
  const fabric = '#B9AD97';
  curtain(a - .1, back + .17, .56, height - .12, fabric);
  curtain(b + .1, back + .17, .56, height - .12, fabric);
  add(new THREE.CylinderGeometry(.013, .013, WINDOW.w + 1.1, 16), paint(BRASS, .35, .85), [WINDOW.x, height - .1, back + .17], [0, 0, Math.PI / 2]);
  const rings = paint(BRASS, .35, .85);
  for (let i = 0; i < 12; i++) {
    const xp = i < 6 ? a - .34 + i * .096 : b - .14 + (i - 6) * .096;
    add(new THREE.TorusGeometry(.018, .003, 8, 20), rings, [xp, height - .118, back + .17], [0, Math.PI / 2, 0]);
  }
  // Rèm cửa sổ bên làm mềm ánh sáng ngoài trời chiếu vào mặt thân chủ
  curtain(left + .12, SIDE_WINDOW.z - 1.0, .4, height - .12, fabric, .03, Math.PI / 2);
  curtain(left + .12, SIDE_WINDOW.z + 1.0, .4, height - .12, fabric, .03, Math.PI / 2);
};

const buildLamp = () => {
  const g = new THREE.Group();
  g.position.set(1.34, 0, -2.02);
  const metal = paint(BRASS, .32, .85);
  const part = (geo: THREE.BufferGeometry, mat: THREE.Material, y: number) => { const m = new THREE.Mesh(geo, mat); m.position.y = y; g.add(m); };
  part(new THREE.CylinderGeometry(.14, .15, .024, 40), metal, .012);
  part(new THREE.CylinderGeometry(.008, .008, 1.5, 12), metal, .75);
  const shade = new THREE.MeshStandardMaterial({ color: '#F4E8D2', emissive: '#FFC98A', emissiveIntensity: 1.3, roughness: .9, side: THREE.DoubleSide });
  part(new THREE.CylinderGeometry(.15, .2, .28, 48, 1, true), shade, 1.58);
  scene.add(g);
  // Bóng đèn là hai nguồn sáng có diện tích, nên quầng sáng lên trần và tường có viền mềm
  [[Math.PI / 2, 1.5], [-Math.PI / 2, 1.66]].forEach(([rx, y]) => {
    const bulb = new ShapedAreaLight('#FFD8AE', LAMP, .3, .3);
    bulb.isCircular = true;
    bulb.position.set(1.34, y, -2.02);
    bulb.rotation.x = rx;
    scene.add(bulb);
  });
};

const buildRug = () => {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 768;
  const g = c.getContext('2d')!;
  g.fillStyle = '#CFC5B4'; g.fillRect(0, 0, 1024, 768);
  for (let i = 0; i < 140000; i++) {
    g.fillStyle = `rgba(${Math.random() > .5 ? '255,250,240' : '84,72,60'},.05)`;
    g.fillRect(Math.random() * 1024, Math.random() * 768, 2, 2);
  }
  g.strokeStyle = '#A99A84'; g.lineWidth = 12; g.strokeRect(44, 44, 936, 680);
  g.strokeStyle = '#DED5C6'; g.lineWidth = 5; g.strokeRect(70, 70, 884, 628);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshStandardMaterial({ map: t, roughness: 1, normalMap: tex('rough_linen_nor.jpg', [6, 4.5]), normalScale: new THREE.Vector2(.7, .7) });
  const rug = box([3.1, .012, 2.5], mat, [-.2, .006, -.62], .004);
  rug.rotation.y = SOFA.yaw;
};

const loader = new GLTFLoader();
const models = new Map<string, Promise<THREE.Group>>();
const model = (id: string) => {
  if (!models.has(id)) models.set(id, loader.loadAsync(`${RAW}/models/${id}/${id}.gltf`).then(g => g.scene));
  return models.get(id)!;
};
const place = async (id: string, pos: [number, number, number], rotY = 0, scale = 1, tilt: [number, number] = [0, 0], pick?: (o: THREE.Object3D, i: number) => boolean) => {
  const src = await model(id);
  const g = new THREE.Group();
  src.children.forEach((c, i) => { if (!pick || pick(c, i)) g.add(c.clone()); });
  g.position.set(...pos);
  g.rotation.set(tilt[0], rotY, tilt[1], 'YXZ');
  g.scale.setScalar(scale);
  scene.add(g);
  g.updateMatrixWorld(true);
  return g;
};
const size = (o: THREE.Object3D) => {
  const b = new THREE.Box3().setFromObject(o);
  return { min: b.min.toArray().map(v => +v.toFixed(3)), max: b.max.toArray().map(v => +v.toFixed(3)) };
};
// Dò độ cao mặt trên của vật tại một điểm, để đặt đồ lên đúng bề mặt thay vì ước lượng
const surfaceY = (o: THREE.Object3D, x: number, z: number, from = 3) => {
  ray.set(new THREE.Vector3(x, from, z), new THREE.Vector3(0, -1, 0));
  return ray.intersectObject(o, true)[0]?.point.y ?? 0;
};
// Dò khoảng cách tới mặt tựa theo trục z cục bộ của sofa
const reachZ = (o: THREE.Object3D, side: number, y: number) => {
  const p = onSofa(side, .8);
  const dir = new THREE.Vector3(-Math.sin(SOFA.yaw), 0, -Math.cos(SOFA.yaw));
  ray.set(new THREE.Vector3(p.x, y, p.z), dir);
  return .8 - (ray.intersectObject(o, true)[0]?.distance ?? 0);
};

const report: Record<string, unknown> = {};

const buildFurniture = async () => {
  const sofa = await place('Sofa_01', [SOFA.x, 0, SOFA.z], SOFA.yaw);
  const seat = (side: number, front: number) => { const p = onSofa(side, front); return surfaceY(sofa, p.x, p.z); };

  // Gối vải trơn dựng trên đúng mặt đệm, tựa vào lưng sofa và cách tay sofa
  const at = onSofa(.2, -.05);
  const pillow = await place('throw_pillows_01', [at.x, seat(.42, -.05) - .012, at.z], SOFA.yaw + .12, .86, [0, 0], c => c.name.endsWith('pillow02'));
  pillow.traverse(o => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const mat = (m.material as THREE.MeshStandardMaterial).clone();
    mat.map = null;
    mat.color.set('#9BA08B');
    m.material = mat;
  });
  report.pillow = size(pillow);

  await place('coffee_table_round_01', [-.2, 0, -.2], 0, .62);
};

const buildProps = async () => {
  const table = await place('side_table_01', [TABLE.x, 0, TABLE.z], .3, .92);
  const tableTop = surfaceY(table, TABLE.x, TABLE.z);
  const shelf = await place('wooden_bookshelf_worn', [2.2, 0, -2.3], 0, 1.05);

  // Đặt sách và bình lên đúng mặt kệ đo được
  const board = (x: number, y: number) => { ray.set(new THREE.Vector3(x, y, -2.26), new THREE.Vector3(0, -1, 0)); return ray.intersectObject(shelf, true)[0]?.point.y ?? y; };
  const rows = [.62, .9, 1.25, 1.65].map(y => +board(1.86, y).toFixed(3));
  report.rows = rows;
  const set = await place('book_encyclopedia_set_01', [0, -9, 0]);
  const raw = new THREE.Box3().setFromObject(set);
  report.book = raw.getSize(new THREE.Vector3()).toArray();
  scene.remove(set);
  const books = async (x: number, y: number, rot = 0) => place('book_encyclopedia_set_01', [x, y - (raw.min.y + 9) + .001, -2.25], rot);
  await books(1.82, rows[0]);
  await books(1.82, rows[2]);
  await books(2.3, rows[1]);
  await books(2.3, rows[3]);
  await place('ceramic_vase_04', [1.84, rows[1] + .001, -2.26], 0, .85);
  await place('ceramic_vase_04', [2.42, rows[2] + .001, -2.26], .8, 1);

  const pot = await place('planter_pot_clay', [-1.46, 0, -2.04], 0, 1.5);
  const potTop = new THREE.Box3().setFromObject(pot).max.y;
  const fernSrc = await model('fern_02');
  report.ferns = fernSrc.children.map(c => size(c));
  const fern = await place('fern_02', [-1.46, potTop - .05, -2.04], 0, 1.5, [0, 0], (_, i) => i === 0);
  const box3 = new THREE.Box3().setFromObject(fern), mid = box3.getCenter(new THREE.Vector3());
  fern.position.x += -1.46 - mid.x;
  fern.position.z += -2.04 - mid.z;
  report.fern = size(fern);

  const frame = await place('hanging_picture_frame_02', [.66, 1.68, ROOM.back + .02]);
  frame.traverse(o => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const mat = m.material as THREE.MeshStandardMaterial;
    if (mat.name.endsWith('_glass')) m.visible = false;
    if (mat.name.endsWith('_artwork')) {
      const art = image(`${RAW}/tex/hanging_picture_frame_02_artwork_diff_1k.webp`);
      art.colorSpace = THREE.SRGBColorSpace;
      art.flipY = false;
      mat.map = art;
      mat.metalness = 0;
      mat.roughness = .6;
    }
  });

  // Khăn giấy và ly nước đặt đúng mặt bàn đo được
  const y = tableTop + .001;
  const tissueMat = paint('#EFE9DD', .7);
  const tissue = box([.23, .085, .12], tissueMat, [TABLE.x - .06, y + .0425, TABLE.z + .04], .012);
  tissue.rotation.y = .55;
  const sheet = box([.1, .03, .04], paint('#FBF9F4', .95), [TABLE.x - .06, y + .096, TABLE.z + .04], .006);
  sheet.rotation.y = .55;
  const glass = new THREE.MeshPhysicalMaterial({ color: '#FFFFFF', roughness: .02, transmission: 1, ior: 1.5, thickness: .002 });
  const water = new THREE.MeshPhysicalMaterial({ color: '#EAF3F4', roughness: .02, transmission: 1, ior: 1.33, thickness: .05 });
  add(new THREE.CylinderGeometry(.036, .03, .115, 40, 1, true), glass, [TABLE.x + .15, y + .0575, TABLE.z - .02]);
  add(new THREE.CylinderGeometry(.03, .03, .004, 40), glass, [TABLE.x + .15, y + .002, TABLE.z - .02]);
  add(new THREE.CylinderGeometry(.033, .0295, .062, 40), water, [TABLE.x + .15, y + .034, TABLE.z - .02]);
};

// Hình nộm cùng dáng ngồi với nhân vật. Chỉ dùng để tính bóng và độ che của người lên sofa, sàn; không xuất hiện trong ảnh.
const buildStandIn = () => {
  const g = new THREE.Group();
  g.position.set(SEAT.x, 0, SEAT.z);
  g.rotation.y = SEAT.yaw;
  const skin = paint('#8A7F74', .8);
  const limb = (r: number, a: [number, number, number], b: [number, number, number]) => {
    const p = new THREE.Vector3(...a), q = new THREE.Vector3(...b), dir = q.clone().sub(p);
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, dir.length(), 8, 16), skin);
    m.position.copy(p).addScaledVector(dir, .5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    g.add(m);
  };
  limb(.15, [0, .54, -.02], [0, .92, .02]);
  limb(.1, [0, 1.16, .05], [0, 1.2, .05]);
  [1, -1].forEach(s => {
    limb(.08, [s * .09, .5, 0], [s * .13, .5, .38]);
    limb(.06, [s * .13, .48, .4], [s * .13, .1, .4]);
    limb(.055, [s * .13, .05, .38], [s * .13, .05, .5]);
    limb(.05, [s * .2, .92, 0], [s * .22, .66, .04]);
    limb(.042, [s * .22, .66, .04], [s * .08, .58, .24]);
  });
  scene.add(g);
};

const build = async () => {
  if (params.has('standin')) buildStandIn();
  buildShell();
  buildDrapes();
  buildLamp();
  buildRug();
  await buildFurniture();
  await buildProps();
  await Promise.all(pending);
};

console.log('STEP hdr');
const hdr = await new HDRLoader().loadAsync(`${RAW}/sky.hdr`);
hdr.mapping = THREE.EquirectangularReflectionMapping;
scene.environment = hdr;
scene.background = hdr;
const SKY = +(params.get('sky') ?? 10), SKY_YAW = +(params.get('yaw') ?? 3.63);
scene.environmentIntensity = SKY;
scene.backgroundIntensity = SKY;
scene.environmentRotation.y = SKY_YAW;
scene.backgroundRotation.y = SKY_YAW;

console.log('STEP build');
await build();
console.log('STEP built', JSON.stringify(report).length);

const W = +(params.get('w') ?? 700), H = +(params.get('h') ?? 600);
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1);
renderer.setSize(W, H);
renderer.toneMapping = THREE.NeutralToneMapping;
document.body.append(renderer.domElement);

// Chế độ probe chụp toàn cảnh ánh sáng ngay tại đầu nhân vật, dùng để chiếu sáng nhân vật trên web
const probe = params.has('probe');
const camera: THREE.PerspectiveCamera = probe ? new EquirectCamera() : new PhysicalCamera(PLATE.vfov, W / H, .05, 40);
if (probe) camera.position.set(SEAT.x, 1.05, SEAT.z + .2);
else {
  camera.position.set(...CAM);
  camera.lookAt(...LOOK);
  (camera as PhysicalCamera).bokehSize = 0;
}
camera.updateMatrixWorld(true);

const tracer = new WebGLPathTracer(renderer);
tracer.bounces = 7;
tracer.filterGlossyFactor = .6;
tracer.minSamples = 1;
tracer.renderDelay = 0;
tracer.fadeDuration = 0;
tracer.tiles.set(probe ? 1 : 3, probe ? 1 : 3);
console.log('STEP tracer');
tracer.setScene(scene, camera);
console.log('STEP scene ready');

// Các lớp phụ cho bộ khử nhiễu và làm mờ hậu cảnh: màu vật liệu, pháp tuyến, khoảng cách
const auxTarget = new THREE.WebGLRenderTarget(W, H, { type: THREE.FloatType });
const renderAux = (mode: string) => {
  const swapped = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
  const background = scene.background;
  scene.background = null;
  renderer.setClearColor(0xffffff, 1);
  const override = mode === 'normal' ? new THREE.MeshNormalMaterial({ side: THREE.DoubleSide }) : mode === 'depth' ? new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    vertexShader: 'varying vec3 v; void main() { vec4 p = modelViewMatrix * vec4(position, 1.); v = p.xyz; gl_Position = projectionMatrix * p; }',
    fragmentShader: 'varying vec3 v; void main() { gl_FragColor = vec4(vec3(length(v)), 1.); }',
  }) : null;
  scene.traverse(o => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    swapped.set(m, m.material);
    const s = m.material as THREE.MeshStandardMaterial;
    m.material = override ?? new THREE.MeshBasicMaterial({ map: s.map, color: s.color, side: THREE.DoubleSide, alphaTest: s.alphaTest });
  });
  const clear = renderer.getClearAlpha();
  renderer.setRenderTarget(auxTarget);
  renderer.clear();
  renderer.render(scene, camera);
  renderer.setRenderTarget(null);
  swapped.forEach((mat, m) => { m.material = mat; });
  scene.background = background;
  renderer.setClearAlpha(clear);
};

// Mã hóa căn bậc hai để lưu ánh sáng HDR gọn trong 16 bit, giữ được vùng tối
const dump = (mode = 'color') => {
  if (mode !== 'color') renderAux(mode);
  const t = mode === 'color' ? tracer.target : auxTarget;
  const px = new Float32Array(W * H * 4);
  renderer.readRenderTargetPixels(t, 0, 0, W, H, px);
  const out = new Uint16Array(W * H * 3);
  for (let i = 0, j = 0; i < px.length; i += 4) for (let c = 0; c < 3; c++) out[j++] = Math.min(65535, Math.sqrt(Math.max(px[i + c], 0) / 64) * 65535);
  const bytes = new Uint8Array(out.buffer);
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
};

Object.assign(window, {
  report,
  bake: (samples: number) => new Promise<{ ms: number; samples: number }>(resolve => {
    const t0 = performance.now();
    const step = () => {
      tracer.renderSample();
      (window as unknown as { progress: number }).progress = tracer.samples;
      if (tracer.samples >= samples) resolve({ ms: performance.now() - t0, samples: tracer.samples });
      else requestAnimationFrame(step);
    };
    step();
  }),
  dump,
});
document.title = 'ready';
