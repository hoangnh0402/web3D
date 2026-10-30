// Ghép texture cho nhân vật, tối ưu và nén gzip. Dùng: node tools/build-assets.mjs <glb_thô> <texture> <đích>
// Dùng gzip thay cho Meshopt để giải nén bằng DecompressionStream của trình duyệt, không cần WebAssembly.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTTextureWebP } from '@gltf-transform/extensions';
import { dedup, prune, quantize, reorder, resample, sparse, weld } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const [,, GLB, TEX, OUT] = process.argv;
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
