import * as THREE from 'three';
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import f08 from '../assets/3d/f08.glb.gz';
import f05 from '../assets/3d/f05.glb.gz';
import m10 from '../assets/3d/m10.glb.gz';
import clipsF from '../assets/3d/clips-f.glb.gz';
import clipsM from '../assets/3d/clips-m.glb.gz';
import validA from '../assets/3d/valid-a.glb.gz';
import { smoothValid } from './smooth';

export type Variant = 'a' | 'b' | 'c';

// rocketbox: khung xương Bip01 tính bằng cm, có động tác ngồi dựng sẵn.
// valid: thư viện VALID (MIT), khung xương HumanIK, 65 biểu cảm khuôn mặt, tư thế ngồi dựng hoàn toàn bằng IK.
export type Kit = 'rocketbox' | 'valid';
const SOURCES = { f05, f08, m10, clipsF, clipsM, validA };
const CAST: Record<Variant, { model: keyof typeof SOURCES; clips?: keyof typeof SOURCES; height: number; kit: Kit }> = {
  a: { model: 'validA', height: 1.58, kit: 'valid' },
  b: { model: 'm10', clips: 'clipsM', height: 1.7, kit: 'rocketbox' },
  c: { model: 'f08', clips: 'clipsF', height: 1.6, kit: 'rocketbox' },
};

// Tài sản là gzip, giải nén bằng API sẵn có của trình duyệt nên không cần WebAssembly.
// Bản build nhúng chúng dạng data URL; khi chạy `npm run dev`, Vite trả về đường dẫn tệp nên phải tải về.
const unzip = async (src: string) => {
  let bytes: Uint8Array;
  if (src.startsWith('data:')) {
    const bin = atob(src.slice(src.indexOf(',') + 1));
    bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  } else {
    const res = await fetch(src);
    if (!res.ok) throw new Error(`Không tải được ${src}: ${res.status}`);
    bytes = new Uint8Array(await res.arrayBuffer());
  }
  // Máy chủ có thể đã tự giải nén (Content-Encoding: gzip); chỉ giải nén khi còn chữ ký gzip 1F 8B.
  if (bytes[0] !== 0x1f || bytes[1] !== 0x8b) return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).arrayBuffer();
};

const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
// Dùng thẻ ảnh thay cho fetch để nạp texture, hoạt động cả trong khung xem bị giới hạn mạng.
loader.register(parser => {
  (parser as unknown as { textureLoader: THREE.Loader }).textureLoader = new THREE.TextureLoader(parser.options.manager);
  return { name: 'plain_image_textures' };
});

const cache = new Map<string, Promise<GLTF>>();
const load = (key: keyof typeof SOURCES) => {
  if (!cache.has(key)) cache.set(key, unzip(SOURCES[key]).then(buf => loader.parseAsync(buf, '')));
  return cache.get(key)!;
};

export const loadCast = async (v: Variant) => {
  const { model, clips, height, kit } = CAST[v];
  const [m, c] = await Promise.all([load(model), clips ? load(clips) : null]);
  if (kit === 'valid') smoothValid(m.scene);
  return { scene: m.scene, clips: c?.animations ?? [], height, kit };
};
