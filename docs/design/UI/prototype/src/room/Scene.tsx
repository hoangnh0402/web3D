import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { Emotion } from '../data';
import { loadCharacter, loadRoom, Variant } from './assets';
import floorDiff from '../assets/3d/tex/laminate_floor_02_diff.webp';
import floorNor from '../assets/3d/tex/laminate_floor_02_nor.webp';
import floorRough from '../assets/3d/tex/laminate_floor_02_rough.webp';
import wallDiff from '../assets/3d/tex/painted_plaster_wall_diff.webp';
import wallNor from '../assets/3d/tex/painted_plaster_wall_nor.webp';

export type Activity = 'idle' | 'listening' | 'thinking' | 'responding';

// Nhân vật được nặn bằng SDF trong tools/build-characters.mjs. Nội thất và vật liệu: Poly Haven (CC0).

// Tư thế, nét mặt và hướng nhìn cho từng cảm xúc. Góc tính bằng radian, áp lên khung xương ở tư thế ngồi.
interface Mood { lean: number; slump: number; headX: number; headY: number; headZ: number; shrug: number; hands: number; brow: number; browY: number; smile: number; blush: number }
const MOODS: Record<Emotion, Mood> = {
  NEUTRAL: { lean: .02, slump: 0, headX: -.04, headY: 0, headZ: 0, shrug: 0, hands: 0, brow: 0, browY: 0, smile: .25, blush: .35 },
  ANXIOUS: { lean: .07, slump: .04, headX: .06, headY: .05, headZ: .03, shrug: .06, hands: 1, brow: .45, browY: .0012, smile: -.2, blush: .3 },
  SAD: { lean: .1, slump: .1, headX: .2, headY: -.08, headZ: .05, shrug: -.02, hands: .4, brow: .6, browY: .0008, smile: -.55, blush: .2 },
  TENSE: { lean: .05, slump: -.02, headX: -.02, headY: .12, headZ: 0, shrug: .1, hands: .7, brow: -.35, browY: -.0012, smile: -.25, blush: .25 },
  RELIEVED: { lean: -.05, slump: -.03, headX: -.08, headY: 0, headZ: -.05, shrug: -.03, hands: 0, brow: .15, browY: .0015, smile: .85, blush: .5 },
  HESITANT: { lean: .04, slump: .03, headX: .07, headY: .18, headZ: .07, shrug: .03, hands: .5, brow: .3, browY: .0006, smile: .05, blush: .35 },
};
const CAM_Z = 1.15;
// Vị trí mặt đệm ghế trong phòng: nhân vật được dựng với gốc tọa độ ở đây
const SEAT_AT: [number, number, number] = [0, .45, -.99];

const useTex = (url: string, repeat: [number, number], color = false) => useMemo(() => {
  const t = new THREE.TextureLoader().load(url);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(...repeat);
  t.anisotropy = 8;
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}, [url]);

const canvasTex = (w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) => {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
};

const RBox = ({ size, radius = .02, color, roughness = .7, ...rest }: { size: [number, number, number]; radius?: number; color: string; roughness?: number } & Record<string, unknown>) => {
  const geo = useMemo(() => new RoundedBoxGeometry(size[0], size[1], size[2], 3, radius), [size[0], size[1], size[2], radius]);
  return <mesh geometry={geo} castShadow receiveShadow {...rest}><meshStandardMaterial color={color} roughness={roughness} /></mesh>;
};

// Rèm có nếp gấp thật thay cho các ống trụ
const Curtain = ({ position, width }: { position: [number, number, number]; width: number }) => {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(width, 2.6, 120, 24);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i);
      const flare = 1 + (1.3 - y) * .12;
      p.setZ(i, (Math.sin(x * 34) * .032 + Math.sin(x * 13 + 1) * .018) * flare);
    }
    g.computeVertexNormals();
    return g;
  }, [width]);
  return <mesh geometry={geo} position={position} castShadow receiveShadow><meshStandardMaterial color="#D9D3C6" roughness={.92} side={THREE.DoubleSide} /></mesh>;
};

// Bóng tiếp xúc giả dưới đồ vật để đồ vật bám sàn, rẻ hơn nhiều so với AO thời gian thực
const Contact = ({ position, size, opacity = .38 }: { position: [number, number, number]; size: [number, number]; opacity?: number }) => {
  const tex = useMemo(() => canvasTex(128, 128, g => {
    const r = g.createRadialGradient(64, 64, 8, 64, 64, 64);
    r.addColorStop(0, 'rgba(30,22,16,1)'); r.addColorStop(.55, 'rgba(30,22,16,.5)'); r.addColorStop(1, 'rgba(30,22,16,0)');
    g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  }), []);
  return <mesh rotation={[-Math.PI / 2, 0, 0]} position={position}><planeGeometry args={size} /><meshBasicMaterial map={tex} transparent opacity={opacity} depthWrite={false} /></mesh>;
};

interface Placed { id: string; position: [number, number, number]; rotation?: number; scale?: number }
const FURNITURE: Placed[] = [
  // Ghế hạ thấp một chút để mặt đệm khớp với tư thế ngồi của nhân vật, chân ghế khuất dưới sàn
  { id: 'modern_arm_chair_01', position: [0, -.06, -1.02], rotation: 0, scale: 1 },
  { id: 'side_table_01', position: [.74, 0, -.86], rotation: -.28 },
  { id: 'wooden_bookshelf_worn', position: [2.05, 0, -2.2], scale: 1.05 },
  { id: 'ceramic_vase_01', position: [2.32, .94, -2.2], scale: .7 },
  { id: 'planter_pot_clay', position: [-1.46, 0, -1.72], scale: 1.5 },
  { id: 'fern_02', position: [-1.46, .28, -1.72], scale: 1.7 },
];

const Furniture = ({ onReady }: { onReady: () => void }) => {
  const [root, setRoot] = useState<THREE.Group | null>(null);
  useEffect(() => {
    let alive = true;
    loadRoom().then(g => {
      if (!alive) return;
      const group = new THREE.Group();
      FURNITURE.forEach(f => {
        const part = g.scene.children.filter(c => c.name === f.id);
        const holder = new THREE.Group();
        part.forEach(p => holder.add(p.clone()));
        holder.position.set(...f.position);
        holder.rotation.y = f.rotation ?? 0;
        holder.scale.setScalar(f.scale ?? 1);
        holder.traverse(o => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
        group.add(holder);
      });
      setRoot(group);
      onReady();
    });
    return () => { alive = false; };
  }, []);
  return root ? <primitive object={root} /> : null;
};

const Room = () => {
  const floorMap = useTex(floorDiff, [2.6, 2.6], true), floorN = useTex(floorNor, [2.6, 2.6]), floorR = useTex(floorRough, [2.6, 2.6]);
  const wallMap = useTex(wallDiff, [3, 1.1], true), wallN = useTex(wallNor, [3, 1.1]);
  const sky = useMemo(() => canvasTex(512, 640, g => {
    const grd = g.createLinearGradient(0, 0, 0, 640);
    grd.addColorStop(0, '#D6E8EF'); grd.addColorStop(.6, '#F6F0E2'); grd.addColorStop(1, '#E2E8CF');
    g.fillStyle = grd; g.fillRect(0, 0, 512, 640);
    g.filter = 'blur(16px)';
    [[70, 480, 120, '#8FAE8B'], [210, 530, 150, '#7E9F7E'], [380, 490, 130, '#94B38F'], [470, 570, 120, '#7A9A7B']].forEach(([x, y, r, c]) => {
      g.fillStyle = c as string; g.beginPath(); g.arc(x as number, y as number, r as number, 0, Math.PI * 2); g.fill();
    });
  }), []);
  const rug = useMemo(() => canvasTex(512, 512, g => {
    g.fillStyle = '#B9C0B6'; g.beginPath(); g.arc(256, 256, 256, 0, Math.PI * 2); g.fill();
    for (let i = 0; i < 26000; i++) {
      const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 254;
      g.fillStyle = `rgba(${Math.random() > .5 ? '255,255,250' : '60,70,66'},.05)`;
      g.fillRect(256 + Math.cos(a) * r, 256 + Math.sin(a) * r, 2, 2);
    }
    ['#A4AEA4', '#CCD1C8', '#98A398'].forEach((c, i) => { g.strokeStyle = c; g.lineWidth = 12; g.beginPath(); g.arc(256, 256, 232 - i * 70, 0, Math.PI * 2); g.stroke(); });
  }), []);
  const art = useMemo(() => canvasTex(256, 320, g => {
    g.fillStyle = '#EDE7DA'; g.fillRect(0, 0, 256, 320);
    g.fillStyle = '#7F9EA3'; g.beginPath(); g.ellipse(128, 215, 150, 66, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#C9A26A'; g.beginPath(); g.arc(160, 120, 44, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#4F7377'; g.beginPath(); g.ellipse(70, 262, 130, 44, 0, 0, Math.PI * 2); g.fill();
  }), []);
  const wall = <meshStandardMaterial map={wallMap} normalMap={wallN} normalScale={new THREE.Vector2(.35, .35)} color="#E9EEE9" roughness={.92} />;

  const books = useMemo(() => {
    const colors = ['#5F7E8C', '#B8935A', '#7C8C76', '#A67A5C', '#3F5C63', '#CFC4AD', '#6E5C4C', '#8E9AA0'];
    const out: { x: number; y: number; w: number; h: number; c: string }[] = [];
    [.5, .9, 1.3].forEach((y, row) => {
      let x = -.42, i = row * 3;
      const end = row === 1 ? .1 : .4;
      while (x < end) {
        const w = .03 + ((i * 7) % 5) * .007, h = .22 + ((i * 3) % 4) * .02;
        out.push({ x, y: y + h / 2, w, h, c: colors[i % colors.length] });
        x += w + .004; i++;
      }
    });
    return out;
  }, []);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[8, 8]} /><meshStandardMaterial map={floorMap} normalMap={floorN} roughnessMap={floorR} roughness={.9} color="#D8C9B6" /></mesh>
      <mesh position={[0, 1.45, -2.4]} receiveShadow><planeGeometry args={[8, 2.9]} />{wall}</mesh>
      <mesh position={[-3, 1.45, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow><planeGeometry args={[8, 2.9]} />{wall}</mesh>
      <mesh position={[3, 1.45, 0]} rotation={[0, -Math.PI / 2, 0]} receiveShadow><planeGeometry args={[8, 2.9]} />{wall}</mesh>
      <mesh position={[0, 2.9, 0]} rotation={[Math.PI / 2, 0, 0]}><planeGeometry args={[8, 8]} /><meshStandardMaterial color="#F3F4F0" roughness={1} /></mesh>
      <RBox size={[6, .11, .02]} radius={.004} color="#F2F1EC" position={[0, .055, -2.388]} />

      {/* Cửa sổ */}
      <group position={[-1.5, 1.52, -2.38]}>
        <mesh><planeGeometry args={[1.5, 1.72]} /><meshBasicMaterial map={sky} toneMapped={false} /></mesh>
        {[[0, .88, 1.6, .05], [0, -.88, 1.6, .05], [-.77, 0, .05, 1.76], [.77, 0, .05, 1.76], [0, 0, .03, 1.72], [0, .26, 1.5, .03]].map(([x, y, w, h], i) => (
          <RBox key={i} size={[w, h, .05]} radius={.006} color="#F4F3EE" position={[x, y, .02]} />
        ))}
        <RBox size={[1.74, .05, .16]} radius={.012} color="#F4F3EE" position={[0, -.92, .06]} />
      </group>
      <Curtain position={[-2.42, 1.42, -2.3]} width={.62} />
      <Curtain position={[-.58, 1.42, -2.3]} width={.62} />
      <RBox size={[2.5, .035, .035]} radius={.015} color="#6B5B4A" position={[-1.5, 2.74, -2.28]} />

      {/* Sách trên giá */}
      <group position={[2.05, 0, -2.2]}>
        {books.map((b, i) => <mesh key={i} position={[b.x, b.y, -.02]} castShadow receiveShadow><boxGeometry args={[b.w, b.h, .2]} /><meshStandardMaterial color={b.c} roughness={.75} /></mesh>)}
      </group>

      <group position={[.42, 1.78, -2.37]}>
        <RBox size={[.6, .74, .03]} radius={.004} color="#5E5146" />
        <mesh position={[0, 0, .017]}><planeGeometry args={[.52, .66]} /><meshStandardMaterial map={art} roughness={.8} /></mesh>
      </group>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .006, -.2]} receiveShadow><circleGeometry args={[1.55, 64]} /><meshStandardMaterial map={rug} roughness={.98} /></mesh>

      {/* Đèn đứng */}
      <group position={[1.32, 0, -1.5]}>
        <mesh castShadow position={[0, .02, 0]}><cylinderGeometry args={[.15, .17, .03, 28]} /><meshStandardMaterial color="#3F362E" roughness={.35} metalness={.6} /></mesh>
        <mesh castShadow position={[0, .78, 0]}><cylinderGeometry args={[.009, .009, 1.54, 10]} /><meshStandardMaterial color="#3F362E" roughness={.35} metalness={.6} /></mesh>
        <mesh position={[0, 1.6, 0]}><cylinderGeometry args={[.14, .21, .26, 32, 1, true]} /><meshStandardMaterial color="#F6E8CB" emissive="#F7C97B" emissiveIntensity={.9} side={THREE.DoubleSide} roughness={.9} /></mesh>
        <pointLight position={[0, 1.55, .05]} intensity={2.1} distance={3.6} decay={1.7} color="#FFD49A" />
      </group>

      {/* Khăn giấy và ly nước trên bàn nhỏ */}
      <group position={[.74, .52, -.86]} rotation={[0, -.28, 0]}>
        <mesh castShadow position={[-.12, .055, .04]}><cylinderGeometry args={[.036, .03, .11, 24]} /><meshPhysicalMaterial color="#E6F0F2" roughness={.08} transparent opacity={.42} /></mesh>
        <RBox size={[.22, .08, .12]} radius={.01} color="#EFE9DD" position={[.1, .04, -.03]} rotation={[0, .3, 0]} />
      </group>

      <Contact position={[0, .012, -1.02]} size={[1.25, 1.2]} />
      <Contact position={[.74, .012, -.86]} size={[.85, .85]} opacity={.3} />
      <Contact position={[-1.46, .012, -1.72]} size={[.7, .7]} opacity={.34} />
      <Contact position={[2.05, .012, -2.15]} size={[1.5, .7]} opacity={.34} />
      <Contact position={[1.32, .012, -1.5]} size={[.5, .5]} opacity={.3} />
    </group>
  );
};

const lerp = THREE.MathUtils.lerp;

// Mắt dạng hạt có hai điểm sáng, lông mày và miệng là ống cong mềm, má ửng hồng: phong cách minh họa thân thiện
const Face = ({ head, colors, mood, blink, look }: { head: THREE.Object3D; colors: Record<string, string>; mood: React.RefObject<Mood>; blink: React.RefObject<number>; look: React.RefObject<number> }) => {
  const parts = useMemo(() => {
    const a = head.userData.anchors as Record<string, [number, number, number]>;
    const hs = (head.userData.scale as number) ?? 1;
    const root = new THREE.Group();
    const eyeMat = new THREE.MeshPhysicalMaterial({ color: '#2A1B17', roughness: .18, clearcoat: 1, clearcoatRoughness: .05 });
    const shine = new THREE.MeshBasicMaterial({ color: '#FFFFFF' });
    const eyes = (['eyeL', 'eyeR'] as const).map(k => {
      const g = new THREE.Group();
      g.position.set(a[k][0], a[k][1], a[k][2] - .0035);
      const ball = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 20), eyeMat);
      ball.scale.set(.0122 * hs, .0152 * hs, .0075 * hs);
      const s1 = new THREE.Mesh(new THREE.SphereGeometry(.0032 * hs, 12, 10), shine); s1.position.set(.0042 * hs, .0058 * hs, .0062 * hs);
      const s2 = new THREE.Mesh(new THREE.SphereGeometry(.0016 * hs, 10, 8), shine); s2.position.set(-.0036 * hs, -.0045 * hs, .0066 * hs);
      g.add(ball, s1, s2);
      root.add(g);
      return g;
    });
    const browMat = new THREE.MeshStandardMaterial({ color: colors.hair, roughness: .7 });
    const brows = (['browL', 'browR'] as const).map(k => {
      const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(-.0145, -.0015, 0), new THREE.Vector3(0, .0032, .002), new THREE.Vector3(.0145, -.0005, 0));
      const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 16, .0021, 8), browMat);
      const g = new THREE.Group(); g.position.set(a[k][0], a[k][1], a[k][2] + .002); g.scale.setScalar(hs); g.add(m);
      root.add(g);
      return g;
    });
    const mouthMat = new THREE.MeshStandardMaterial({ color: '#9C5651', roughness: .5 });
    const mouth = new THREE.Mesh(new THREE.BufferGeometry(), mouthMat);
    mouth.position.set(a.mouth[0], a.mouth[1], a.mouth[2] + .0012);
    mouth.scale.setScalar(hs);
    root.add(mouth);
    const blushTex = (() => {
      const c = document.createElement('canvas'); c.width = c.height = 64;
      const g = c.getContext('2d')!, r = g.createRadialGradient(32, 32, 2, 32, 32, 32);
      r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = r; g.fillRect(0, 0, 64, 64);
      return new THREE.CanvasTexture(c);
    })();
    const blushMat = new THREE.MeshBasicMaterial({ color: '#F0857A', map: blushTex, transparent: true, opacity: .35, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    const cheeks = (['cheekL', 'cheekR'] as const).map(k => {
      const m = new THREE.Mesh(new THREE.CircleGeometry(.019 * hs, 24), blushMat);
      m.position.set(a[k][0], a[k][1], a[k][2] + .0015);
      m.rotation.y = Math.sign(a[k][0]) * .45;
      root.add(m);
      return m;
    });
    root.traverse(o => { o.castShadow = false; });
    head.add(root);
    return { root, eyes, brows, mouth, blushMat };
  }, [head]);
  useEffect(() => () => { head.remove(parts.root); }, [parts]);

  const lastSmile = useRef(99);
  useFrame(() => {
    const m = mood.current!;
    const open = 1 - blink.current!;
    parts.eyes.forEach((e, i) => { e.scale.y = Math.max(.08, open); e.position.x = (head.userData.anchors as Record<string, number[]>)[i ? 'eyeR' : 'eyeL'][0] + look.current! * .0016; });
    parts.brows.forEach((b, i) => { const s = i ? -1 : 1; b.rotation.z = -s * m.brow * .32; b.position.y = (head.userData.anchors as Record<string, number[]>)[i ? 'browR' : 'browL'][1] + m.browY; });
    parts.blushMat.opacity = m.blush;
    // Chỉ dựng lại miệng khi độ cong đổi đáng kể
    if (Math.abs(m.smile - lastSmile.current) > .015) {
      lastSmile.current = m.smile;
      const w = .015, c = -m.smile * .0062;
      const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(-w, -c * .15, 0), new THREE.Vector3(0, c, .002), new THREE.Vector3(w, -c * .15, 0));
      parts.mouth.geometry.dispose();
      parts.mouth.geometry = new THREE.TubeGeometry(curve, 18, .0017, 8);
    }
  });
  return null;
};

const Character = ({ variant, emotion, activity, onReady, onFail }: { variant: Variant; emotion: Emotion; activity: Activity; onReady: () => void; onFail: () => void }) => {
  const [rig, setRig] = useState<{ scene: THREE.Group; bones: Record<string, THREE.Object3D>; colors: Record<string, string> } | null>(null);
  const mood = useRef<Mood>({ ...MOODS.NEUTRAL });
  const blink = useRef(0), look = useRef(0);
  const blinkT = useRef({ next: 1.6, t: 0 });
  const nod = useRef(0);
  const gesture = useRef(0);

  useEffect(() => {
    let alive = true;
    loadCharacter(variant).then(scene => {
      if (!alive) return;
      const colors = scene.userData.colors as Record<string, string>;
      const bones: Record<string, THREE.Object3D> = {};
      scene.traverse(o => {
        if ((o as THREE.Bone).isBone || /^(hips|spine|chest|neck|head|shoulder|upperArm|foreArm|hand)[LR]?$/.test(o.name)) bones[o.name] = o;
        const mesh = o as THREE.SkinnedMesh;
        if (!mesh.isMesh) return;
        mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false;
        const name = mesh.name.startsWith('hands') ? 'skin' : mesh.name.startsWith('skin') ? 'skin' : mesh.name.replace(/_\d+$/, '');
        const color = new THREE.Color(colors[name] ?? '#cccccc');
        // Vải có lớp sheen mềm, da có ánh hồng dưới bề mặt, tóc bóng nhẹ
        const look: Record<string, THREE.MeshPhysicalMaterialParameters> = {
          skin: { roughness: .58, sheen: .6, sheenRoughness: .5, sheenColor: new THREE.Color('#FFB8A0') },
          hair: { roughness: .46, clearcoat: .12, clearcoatRoughness: .6, sheen: .35, sheenColor: new THREE.Color('#5E4E49') },
          top: { roughness: .92, sheen: 1, sheenRoughness: .6, sheenColor: color.clone().offsetHSL(0, -.1, .18) },
          pants: { roughness: .85, sheen: .6, sheenRoughness: .7, sheenColor: color.clone().offsetHSL(0, -.1, .2) },
          shoes: { roughness: .5, clearcoat: .2 },
        };
        mesh.material = new THREE.MeshPhysicalMaterial({ color, ...(look[name] ?? {}) });
      });
      setRig({ scene, bones, colors });
      onReady();
    }).catch(onFail);
    return () => { alive = false; };
  }, [variant]);

  useFrame((state, dt) => {
    if (!rig) return;
    const t = state.clock.elapsedTime, k = 1 - Math.exp(-dt * 2.6), m = mood.current, tgt = MOODS[emotion];
    (Object.keys(m) as (keyof Mood)[]).forEach(key => { m[key] = lerp(m[key], tgt[key], k); });
    const b = rig.bones;

    // Chớp mắt ngẫu nhiên, thỉnh thoảng chớp đôi
    const bt = blinkT.current;
    bt.next -= dt;
    if (bt.next < 0) { bt.t = .15; bt.next = 2 + Math.random() * 3.4; if (Math.random() < .2) bt.next = .28; }
    bt.t = Math.max(0, bt.t - dt);
    blink.current = bt.t > 0 ? Math.sin(bt.t / .15 * Math.PI) : 0;

    const breathe = Math.sin(t * 1.35);
    nod.current = lerp(nod.current, activity === 'listening' ? Math.max(0, Math.sin(t * 1.6)) * .06 : 0, k);
    gesture.current = lerp(gesture.current, activity === 'thinking' ? 1 : activity === 'responding' ? .45 : 0, 1 - Math.exp(-dt * 2));
    look.current = lerp(look.current, activity === 'thinking' ? 1 : 0, k);
    const g = gesture.current;

    b.spine.rotation.set(m.lean + breathe * .006, Math.sin(t * .23) * .015, 0);
    b.chest.rotation.set(m.slump + breathe * .012, 0, Math.sin(t * .31) * .008);
    b.chest.scale.set(1 + breathe * .006, 1, 1 + breathe * .01);
    b.neck.rotation.set(m.headX * .35, m.headY * .3, 0);
    b.head.rotation.set(m.headX * .65 + nod.current + Math.sin(t * .5) * .012 - g * .08, m.headY * .7 + Math.sin(t * .37) * .025 + g * .16, m.headZ + g * .1 + Math.sin(t * .29) * .012);
    ['L', 'R'].forEach((side, i) => {
      const s = i ? -1 : 1;
      b[`shoulder${side}`].rotation.z = s * (m.shrug + breathe * .006);
      // Lo lắng: hai bàn tay xích lại xoa nhẹ. Suy nghĩ: tay phải đưa lên ngang ngực.
      const fidget = m.hands > .5 ? Math.sin(t * 3.1 + i) * .05 * m.hands : 0;
      const raise = side === 'R' ? g : 0;
      // Suy nghĩ: khuỷu tay đưa ra trước, cẳng tay gập lên và hướng vào giữa để bàn tay chạm gần cằm
      b[`upperArm${side}`].rotation.set(-raise * .42, raise * .1, -s * m.hands * .1 + raise * .32);
      b[`foreArm${side}`].rotation.set(-raise * 1.35 + Math.sin(t * 2.2) * .04 * (activity === 'responding' && side === 'R' ? 1 : 0), -s * (m.hands * .32 + fidget) + raise * .85, 0);
      b[`hand${side}`].rotation.set(raise * .5, 0, -s * fidget);
    });
  });

  if (!rig) return null;
  return (
    <group position={SEAT_AT}>
      <primitive object={rig.scene} />
      <Face head={rig.bones.head} colors={rig.colors} mood={mood} blink={blink} look={look} />
    </group>
  );
};

// Bụi li ti bay chậm trong vệt nắng từ cửa sổ
const Dust = () => {
  const count = 140;
  const { geo, speed } = useMemo(() => {
    const p = new Float32Array(count * 3), sp = new Float32Array(count);
    for (let i = 0; i < count; i++) { p.set([-2.3 + Math.random() * 2.4, .3 + Math.random() * 2.2, -2.2 + Math.random() * 2.4], i * 3); sp[i] = .02 + Math.random() * .05; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    return { geo: g, speed: sp };
  }, []);
  const tex = useMemo(() => canvasTex(32, 32, g => {
    const r = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    r.addColorStop(0, 'rgba(255,248,230,1)'); r.addColorStop(1, 'rgba(255,248,230,0)');
    g.fillStyle = r; g.fillRect(0, 0, 32, 32);
  }), []);
  useFrame((state, dt) => {
    const p = geo.attributes.position as THREE.BufferAttribute, t = state.clock.elapsedTime;
    for (let i = 0; i < count; i++) {
      let y = p.getY(i) + speed[i] * dt * .5;
      if (y > 2.6) y = .3;
      p.setXYZ(i, p.getX(i) + Math.sin(t * .3 + i) * dt * .02, y, p.getZ(i) + Math.cos(t * .25 + i) * dt * .015);
    }
    p.needsUpdate = true;
  });
  return <points geometry={geo}><pointsMaterial map={tex} size={.022} transparent opacity={.55} depthWrite={false} blending={THREE.AdditiveBlending} color="#FFF4DC" /></points>;
};

// Vệt nắng mờ chiếu từ cửa sổ xuống sàn
const Sunbeam = () => {
  const tex = useMemo(() => canvasTex(64, 256, g => {
    const r = g.createLinearGradient(0, 0, 0, 256);
    r.addColorStop(0, 'rgba(255,244,220,.9)'); r.addColorStop(1, 'rgba(255,244,220,0)');
    g.fillStyle = r; g.fillRect(0, 0, 64, 256);
    const s = g.createLinearGradient(0, 0, 64, 0);
    s.addColorStop(0, 'rgba(0,0,0,1)'); s.addColorStop(.2, 'rgba(0,0,0,0)'); s.addColorStop(.8, 'rgba(0,0,0,0)'); s.addColorStop(1, 'rgba(0,0,0,1)');
    g.globalCompositeOperation = 'destination-out'; g.fillStyle = s; g.fillRect(0, 0, 64, 256);
  }), []);
  return (
    <mesh position={[-1.25, 1.25, -1.75]} rotation={[-.55, .42, .18]}>
      <planeGeometry args={[1.4, 2.8]} />
      <meshBasicMaterial map={tex} transparent opacity={.11} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
    </mesh>
  );
};

// Camera lướt nhẹ vào phòng khi mở phiên, sau đó người dùng xoay góc nhìn trong giới hạn
const CameraRig = ({ yawRef, pitchRef, ready }: { yawRef: React.RefObject<number>; pitchRef: React.RefObject<number>; ready: boolean }) => {
  const { camera, size } = useThree();
  const cur = useRef({ y: 0, p: 0 });
  const intro = useRef(0);
  const calm = typeof window !== 'undefined' && (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || (window as unknown as { __noMotion?: boolean }).__noMotion);
  useFrame((state, dt) => {
    const k = 1 - Math.exp(-dt * 6);
    if (ready) intro.current = calm ? 1 : Math.min(1, intro.current + dt / 2.8);
    const e = 1 - Math.pow(1 - intro.current, 3);
    cur.current.y += (yawRef.current - cur.current.y) * k;
    cur.current.p += (pitchRef.current - cur.current.p) * k;
    const cam = camera as THREE.PerspectiveCamera;
    const aspect = size.width / size.height;
    cam.fov = aspect < 1 ? 60 : aspect < 1.4 ? 44 : 36;
    cam.updateProjectionMatrix();
    const drift = Math.sin(state.clock.elapsedTime * .2) * .012 * e;
    cam.position.set(lerp(.55, 0, e) + drift, lerp(1.55, 1.16, e), lerp(2.7, CAM_Z, e));
    const dist = 4.4;
    cam.lookAt(Math.sin(cur.current.y) * dist + lerp(-.3, 0, e), lerp(1.2, .98, e) + cur.current.p * dist, CAM_Z - Math.cos(cur.current.y) * dist);
  });
  return null;
};

const Environment = () => {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), .04).texture;
    scene.environment = env;
    scene.environmentIntensity = .5;
    return () => { env.dispose(); pmrem.dispose(); };
  }, [gl, scene]);
  return null;
};

export interface SceneProps {
  variant: Variant; emotion: Emotion; activity: Activity; poster?: string; play?: boolean; onLost?: () => void; onFps?: (fps: number) => void;
}

const FpsProbe = ({ onFps }: { onFps?: (fps: number) => void }) => {
  const acc = useRef({ t: 0, n: 0, warmup: 3, long: 0 });
  useFrame((_, dt) => {
    const a = acc.current;
    // Một khung hình dài đơn lẻ là lúc tab vừa hiện lại hoặc đang biên dịch shader. Dài liên tiếp mới là máy chậm thật.
    if (dt > .5) {
      if (++a.long < 3) return;
    } else a.long = 0;
    if (a.warmup > 0 && a.long === 0) { a.warmup -= dt; return; }
    a.t += dt; a.n++;
    if (a.t >= 2) { onFps?.(a.n / a.t); acc.current = { t: 0, n: 0, warmup: 0, long: 0 }; }
  });
  return null;
};

export default function Scene({ variant, emotion, activity, poster, play = true, onLost, onFps }: SceneProps) {
  const yaw = useRef(0), pitch = useRef(0);
  const drag = useRef<{ x: number; y: number; yaw: number; pitch: number } | null>(null);
  const [loaded, setLoaded] = useState({ room: false, cast: false });
  const clamp = (v: number, m: number) => Math.max(-m, Math.min(m, v));
  const small = typeof window !== 'undefined' && window.innerWidth < 700;
  const ready = loaded.room && loaded.cast;
  // Khi tháo Canvas, thư viện tự làm mất WebGL context để giải phóng GPU. Đó không phải lỗi đồ họa nên không được báo.
  const mounted = useRef(true);
  useLayoutEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  // Ảnh chờ mờ dần rồi mới gỡ khỏi trang, để phòng 3D hiện ra mượt
  const [gone, setGone] = useState(false);
  useEffect(() => { if (ready) { const t = setTimeout(() => setGone(true), 1000); return () => clearTimeout(t); } }, [ready]);

  return (
    <div
      className="scene-wrap" style={{ width: '100%', height: '100%' }} tabIndex={0} role="application" data-ready={ready || undefined}
      aria-label="Phòng tham vấn 3D. Dùng phím mũi tên hoặc kéo chuột để xoay góc nhìn."
      onPointerDown={e => { drag.current = { x: e.clientX, y: e.clientY, yaw: yaw.current, pitch: pitch.current }; }}
      onPointerMove={e => {
        if (!drag.current) return;
        yaw.current = clamp(drag.current.yaw + (e.clientX - drag.current.x) * .0022, .42);
        pitch.current = clamp(drag.current.pitch - (e.clientY - drag.current.y) * .0016, .14);
      }}
      onPointerUp={() => { drag.current = null; }} onPointerLeave={() => { drag.current = null; }}
      onKeyDown={e => {
        const m: Record<string, () => void> = {
          ArrowLeft: () => { yaw.current = clamp(yaw.current - .06, .42); }, ArrowRight: () => { yaw.current = clamp(yaw.current + .06, .42); },
          ArrowUp: () => { pitch.current = clamp(pitch.current + .03, .14); }, ArrowDown: () => { pitch.current = clamp(pitch.current - .03, .14); },
        };
        if (m[e.key]) { e.preventDefault(); m[e.key](); }
      }}
    >
      <Canvas
        shadows={small ? false : { type: THREE.VSMShadowMap }} dpr={small ? [1, 1.5] : [1, 1.75]} camera={{ position: [0, 1.2, 2.25], fov: 36, near: .1, far: 30 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.0;
          gl.domElement.addEventListener('webglcontextlost', e => { e.preventDefault(); if (mounted.current) onLost?.(); });
        }}
      >
        <color attach="background" args={['#C6D4D0']} />
        <Environment />
        <ambientLight intensity={.14} color="#FFF3E2" />
        <hemisphereLight intensity={.32} color="#FFF6E8" groundColor="#A08C72" />
        <directionalLight
          position={[-2.2, 2.7, 2.4]} intensity={2.1} color="#FFE8CC" castShadow
          shadow-mapSize-width={1024} shadow-mapSize-height={1024} shadow-camera-left={-3.2} shadow-camera-right={3.2}
          shadow-camera-top={3.2} shadow-camera-bottom={-3.2} shadow-bias={-.0004} shadow-normalBias={.015} shadow-radius={7} shadow-blurSamples={12}
        />
        <Room />
        <Furniture onReady={() => setLoaded(l => ({ ...l, room: true }))} />
        <Character variant={variant} emotion={emotion} activity={activity} onReady={() => setLoaded(l => ({ ...l, cast: true }))} onFail={() => onLost?.()} />
        <Dust />
        <Sunbeam />
        <CameraRig yawRef={yaw} pitchRef={pitch} ready={ready && play} />
        <FpsProbe onFps={onFps} />
      </Canvas>
      {!gone && <div className={`scene-loading ${ready ? 'done' : ''}`} style={poster ? { backgroundImage: `url(${poster})` } : undefined}><span className="glass">Đang chuẩn bị phòng tham vấn</span></div>}
    </div>
  );
}

// Trình duyệt chỉ cho phép khoảng 16 WebGL context, vượt quá thì hủy context cũ nhất, có thể chính là phòng 3D đang chạy.
// Vì vậy chỉ dò một lần và trả ngay context dùng để dò.
let webgl: boolean | undefined;
export const webglSupported = () => {
  if ((window as unknown as { __noWebGL?: boolean }).__noWebGL) return false;
  if (webgl === undefined) {
    try {
      const gl = document.createElement('canvas').getContext('webgl2');
      gl?.getExtension('WEBGL_lose_context')?.loseContext();
      webgl = !!gl;
    } catch { webgl = false; }
  }
  return webgl;
};
