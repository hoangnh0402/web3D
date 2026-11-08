import * as THREE from 'three';
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import charA from '../assets/3d/char-a.glb.gz';
import charB from '../assets/3d/char-b.glb.gz';
import charC from '../assets/3d/char-c.glb.gz';
import room from '../assets/3d/room.glb.gz';

export type Variant = 'a' | 'b' | 'c';

const SOURCES = { charA, charB, charC, room };
const CAST: Record<Variant, keyof typeof SOURCES> = { a: 'charA', b: 'charB', c: 'charC' };

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

export const loadRoom = () => load('room');
// Mỗi lần vào phòng dùng một bản sao riêng để nhiều phiên không dùng chung khung xương
export const loadCharacter = async (v: Variant) => {
  const g = await load(CAST[v]);
  const { clone } = await import('three/examples/jsm/utils/SkeletonUtils.js');
  return clone(g.scene) as THREE.Group;
};
