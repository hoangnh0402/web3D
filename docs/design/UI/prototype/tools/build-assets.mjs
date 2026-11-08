// Ghép texture, tối ưu và nén gzip. Dùng: node tools/build-assets.mjs <raw> <glb_thô> <texture> <đích>
// Dùng gzip thay cho Meshopt để giải nén bằng DecompressionStream của trình duyệt, không cần WebAssembly.
import { Document, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTTextureWebP } from '@gltf-transform/extensions';
import { dedup, flatten, mergeDocuments, prune, quantize, reorder, unpartition, weld } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

const [,, RAW, TEX, OUT] = process.argv;
mkdirSync(OUT, { recursive: true });
await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const webp = n => readFileSync(`${TEX}/${n}.webp`);


const write = async (doc, name) => {
  doc.createExtension(EXTTextureWebP).setRequired(true);
  const bytes = await io.writeBinary(doc);
  const gz = gzipSync(bytes, { level: 9 });
  writeFileSync(`${OUT}/${name}.glb.gz`, gz);
  console.log(name, 'raw KB', Math.round(bytes.length / 1024), 'gz KB', Math.round(gz.length / 1024));
};

// Nội thất: gộp các model Poly Haven vào một tệp, mỗi model là một nút theo tên
const room = new Document();
room.createScene('room');
for (const id of readdirSync(`${RAW}/models`)) {
  const doc = await io.read(`${RAW}/models/${id}/${id}.gltf`);
  doc.getRoot().listTextures().forEach(t => {
    const file = path.basename(t.getURI()).replace(/\.[a-z]+$/, '');
    t.setImage(webp(file)).setMimeType('image/webp').setURI(`${file}.webp`);
  });
  doc.getRoot().listNodes().forEach(n => { if (!n.getParentNode()) n.setName(id); });
  mergeDocuments(room, doc);
}
const scene = room.getRoot().listScenes()[0];
room.getRoot().listScenes().slice(1).forEach(s => { s.listChildren().forEach(c => scene.addChild(c)); s.dispose(); });
await room.transform(flatten(), prune({ keepAttributes: true }), dedup(), weld(), unpartition(), reorder({ encoder: MeshoptEncoder }), quantize({ quantizeNormal: 10, quantizeTexcoord: 12 }));
await write(room, 'room');
