// Ghép texture, tối ưu và nén gzip. Dùng: node tools/build-assets.mjs <raw> <glb_thô> <texture> <đích>
// Dùng gzip thay cho Meshopt để giải nén bằng DecompressionStream của trình duyệt, không cần WebAssembly.
import { Document, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTTextureWebP } from '@gltf-transform/extensions';
import { dedup, flatten, join, mergeDocuments, prune, quantize, reorder, resample, sparse, unpartition, weld } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

const [,, RAW, GLB, TEX, OUT] = process.argv;
mkdirSync(OUT, { recursive: true });
await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const webp = n => readFileSync(`${TEX}/${n}.webp`);

const attach = (doc, name, file, kind) => doc.createTexture(name).setImage(webp(file)).setMimeType('image/webp').setURI(`${name}.webp`);

const write = async (doc, name) => {
  doc.createExtension(EXTTextureWebP).setRequired(true);
  const bytes = await io.writeBinary(doc);
  const gz = gzipSync(bytes, { level: 9 });
  writeFileSync(`${OUT}/${name}.glb.gz`, gz);
  console.log(name, 'raw KB', Math.round(bytes.length / 1024), 'gz KB', Math.round(gz.length / 1024));
};

for (const key of ['f05', 'f08', 'm10']) {
  const doc = await io.read(`${GLB}/${key}.glb`);
  for (const mat of doc.getRoot().listMaterials()) {
    const n = mat.getName();
    mat.setMetallicFactor(0).setDoubleSided(false);
    if (n.endsWith('_head')) {
      mat.setName('head').setRoughnessFactor(1).setBaseColorTexture(attach(doc, `${key}_head`, `${key}_head`)).setNormalTexture(attach(doc, `${key}_head_n`, `${key}_head_n`)).setMetallicRoughnessTexture(attach(doc, `${key}_head_r`, `${key}_head_r`));
    } else if (n.endsWith('_body')) {
      mat.setName('body').setRoughnessFactor(.78).setBaseColorTexture(attach(doc, `${key}_body`, `${key}_body`)).setNormalTexture(attach(doc, `${key}_body_n`, `${key}_body_n`));
    } else {
      mat.setName('hair').setRoughnessFactor(.6).setAlphaMode('MASK').setAlphaCutoff(.42).setDoubleSided(true).setBaseColorTexture(attach(doc, `${key}_opacity`, `${key}_opacity`));
    }
  }
  await doc.transform(prune({ keepAttributes: false }), dedup(), weld(), reorder({ encoder: MeshoptEncoder }), quantize({ quantizeNormal: 8, quantizeTexcoord: 12, quantizePosition: 14 }), sparse({ ratio: .3 }));
  await write(doc, key);
}

for (const sex of ['f', 'm']) {
  const doc = await io.read(`${GLB}/clips-${sex}.glb`);
  await doc.transform(resample({ tolerance: .0016 }), prune({ keepAttributes: false }), dedup());
  await write(doc, `clips-${sex}`);
}

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
void join;
