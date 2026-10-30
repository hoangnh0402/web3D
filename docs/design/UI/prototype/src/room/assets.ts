import * as THREE from 'three';
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import f08 from '../assets/3d/f08.glb.gz';
import f05 from '../assets/3d/f05.glb.gz';
import m10 from '../assets/3d/m10.glb.gz';
import clipsF from '../assets/3d/clips-f.glb.gz';
import clipsM from '../assets/3d/clips-m.glb.gz';

export type Variant = 'a' | 'b' | 'c';

const SOURCES = { f05, f08, m10, clipsF, clipsM };
const CAST: Record<Variant, { model: keyof typeof SOURCES; clips: keyof typeof SOURCES; height: number }> = {
  a: { model: 'f05', clips: 'clipsF', height: 1.6 },
  b: { model: 'm10', clips: 'clipsM', height: 1.7 },
  c: { model: 'f08', clips: 'clipsF', height: 1.6 },
};

// Tài sản được nhúng dạng gzip và giải nén bằng API sẵn có của trình duyệt, nên không cần WebAssembly hay tải mạng.
const unzip = async (dataUrl: string) => {
  const bin = atob(dataUrl.slice(dataUrl.indexOf(',') + 1));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).arrayBuffer();
};

const loader = new GLTFLoader();
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
  const { model, clips, height } = CAST[v];
  const [m, c] = await Promise.all([load(model), load(clips)]);
  return { scene: m.scene, clips: c.animations, height };
};
