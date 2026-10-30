// Chuyển FBX sang GLB ngay trong trình duyệt bằng FBXLoader và GLTFExporter của Three.js.
// Trang này chỉ đọc dữ liệu 3D, không dùng công cụ bên ngoài. Driver: tools/convert.mjs
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

const BLANK = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

const manager = new THREE.LoadingManager();
manager.setURLModifier(() => BLANK);

const toBuffer = (b64: string) => Uint8Array.from(atob(b64), c => c.charCodeAt(0)).buffer;
const toB64 = (buf: ArrayBuffer) => {
  const bytes = new Uint8Array(buf);
  let out = '';
  for (let i = 0; i < bytes.length; i += 0x8000) out += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(out);
};
const parse = (b64: string) => new FBXLoader(manager).parse(toBuffer(b64), '');
const exportGlb = (root: THREE.Object3D, animations: THREE.AnimationClip[]) =>
  new GLTFExporter().parseAsync(root, { binary: true, animations, onlyVisible: false }) as Promise<ArrayBuffer>;

// Bản đầu chỉ cần các biểu cảm cơ bản, nên bỏ các blendshape còn lại để giảm dung lượng.
const keepMorph = (name: string, keep: string[]) => keep.some(k => name.toLowerCase().includes(k.toLowerCase()));

const convertAvatar = async (b64: string, keep: string[] = []) => {
  const root = parse(b64);
  const report: unknown[] = [];
  root.traverse(o => {
    const mesh = o as THREE.SkinnedMesh;
    if (!mesh.isMesh) return;
    const geo = mesh.geometry;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const names = Object.keys(mesh.morphTargetDictionary ?? {});
    report.push({ name: mesh.name, verts: geo.attributes.position.count, groups: geo.groups.length, skinned: !!mesh.isSkinnedMesh, morphs: names.length, sample: names.slice(0, 200), mats: mats.map(m => m.name) });

    if (names.length) {
      const kept = names.filter(n => keepMorph(n, keep));
      const idx = kept.map(n => mesh.morphTargetDictionary![n]);
      geo.morphAttributes.position = idx.map(i => geo.morphAttributes.position[i]);
      delete geo.morphAttributes.normal;
      mesh.morphTargetDictionary = Object.fromEntries(kept.map((n, i) => [n, i]));
      mesh.morphTargetInfluences = kept.map(() => 0);
      if (!kept.length) { geo.morphAttributes = {}; mesh.morphTargetDictionary = undefined; mesh.morphTargetInfluences = undefined; }
    }
    // FBX dùng gốc UV ở dưới còn glTF ở trên. Texture được gắn lại ở bước sau nên phải tự lật trục V.
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - uv.getY(i));
    const plain = mats.map(m => new THREE.MeshStandardMaterial({ name: m.name }));
    mesh.material = Array.isArray(mesh.material) ? plain : plain[0];
  });
  const size = new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3());
  return { report, size: size.toArray(), glb: toB64(await exportGlb(root, [])) };
};

// Gộp nhiều động tác vào một GLB. Các động tác dùng chung bộ xương nên chỉ cần xương của tệp đầu.
const convertClips = async (files: { name: string; b64: string }[], fps = 12) => {
  const first = parse(files[0].b64);
  const clips: THREE.AnimationClip[] = [];
  const report: unknown[] = [];
  for (const f of files) {
    const g = parse(f.b64);
    const clip = g.animations[0];
    clip.name = f.name;
    clip.tracks = clip.tracks.filter(t => /^Bip01_/.test(t.name) && !t.name.startsWith('Bip01_Footsteps') && (t.name.endsWith('.quaternion') || t.name === 'Bip01_Pelvis.position'));
    const step = 1 / fps;
    clip.tracks.forEach(t => {
      const keep: number[] = [];
      let next = 0;
      t.times.forEach((time, i) => { if (time >= next - 1e-4 || i === t.times.length - 1) { keep.push(i); next = time + step; } });
      const n = t.getValueSize();
      const values = new Float32Array(keep.length * n);
      keep.forEach((k, i) => { for (let c = 0; c < n; c++) values[i * n + c] = t.values[k * n + c]; });
      t.times = Float32Array.from(keep.map(k => t.times[k]));
      t.values = values;
    });
    report.push({ name: f.name, duration: clip.duration, tracks: clip.tracks.length, keys: clip.tracks[0]?.times.length, sample: clip.tracks.slice(0, 4).map(t => t.name) });
    clips.push(clip);
  }
  first.traverse(o => { if ((o as THREE.Mesh).isMesh) o.visible = false; });
  return { report, glb: toB64(await exportGlb(first, clips)) };
};

Object.assign(window, { convertAvatar, convertClips });
document.title = 'ready';
