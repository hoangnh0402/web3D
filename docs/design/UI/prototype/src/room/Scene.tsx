import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { Emotion } from '../data';
import { loadCast, loadRoom, Variant } from './assets';
import floorDiff from '../assets/3d/tex/laminate_floor_02_diff.webp';
import floorNor from '../assets/3d/tex/laminate_floor_02_nor.webp';
import floorRough from '../assets/3d/tex/laminate_floor_02_rough.webp';
import wallDiff from '../assets/3d/tex/painted_plaster_wall_diff.webp';
import wallNor from '../assets/3d/tex/painted_plaster_wall_nor.webp';

export type Activity = 'idle' | 'listening' | 'thinking' | 'responding';

// Nhân vật: Microsoft Rocketbox (MIT). Nội thất và vật liệu: Poly Haven (CC0). Xem tools/ để dựng lại.

// Mỗi cảm xúc ứng với một động tác ngồi có sẵn và các biểu cảm khuôn mặt chuẩn ARKit.
const BODY: Record<Emotion, string> = { NEUTRAL: 'breathe', ANXIOUS: 'anxious', SAD: 'neutral', TENSE: 'waiting', RELIEVED: 'relaxed', HESITANT: 'breathe' };
const FACE: Record<Emotion, Record<string, number>> = {
  NEUTRAL: {},
  ANXIOUS: { BrowInnerUp: .55, MouthPress: .3 },
  SAD: { BrowInnerUp: .8, MouthFrown: .45 },
  TENSE: { BrowDown: .5, MouthPress: .5 },
  RELIEVED: { MouthSmile: .42, BrowInnerUp: .1 },
  HESITANT: { BrowInnerUp: .35, MouthPress: .2 },
};
// Vị trí hông khi ngồi trên ghế, tính theo mét trong phòng
const SEAT_HIP: [number, number, number] = [0, .58, -1.0];
const ANKLE = .09;
const THIGH_LIFT = .42;
const CAM_Z = 1.15;
// [cúi đầu, quay đầu]. Giá trị âm ở cột đầu là ngẩng lên nhìn người tham vấn.
const GAZE: Record<Emotion, [number, number]> = { NEUTRAL: [-.3, 0], ANXIOUS: [-.14, 0], SAD: [.06, -.05], TENSE: [-.24, .08], RELIEVED: [-.32, 0], HESITANT: [-.12, .2] };

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
  // Hạ ghế xuống dưới sàn một chút để mặt đệm khớp với tư thế ngồi của nhân vật, phần chân ghế khuất dưới sàn
  { id: 'modern_arm_chair_01', position: [0, -.11, -1.02], rotation: 0, scale: .94 },
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

const X_AXIS = new THREE.Vector3(1, 0, 0), Y_AXIS = new THREE.Vector3(0, 1, 0);
const qParent = new THREE.Quaternion(), qWorld = new THREE.Quaternion(), qLocal = new THREE.Quaternion();

// Xoay một xương theo trục của phòng, chồng lên động tác đang chạy
const rotateWorld = (bone: THREE.Object3D, axis: THREE.Vector3, angle: number) => {
  bone.parent!.getWorldQuaternion(qParent);
  qWorld.setFromAxisAngle(axis, angle);
  qLocal.copy(qParent).invert().multiply(qWorld).multiply(qParent);
  bone.quaternion.premultiply(qLocal);
};

// Động tác gốc ngồi ghế cao nên đùi dốc xuống. Nâng đùi cho ghế bành thấp và bù lại ở cẳng chân.
const seatLegs = (legs: THREE.Object3D[][]) => legs.forEach(([thigh, calf]) => {
  rotateWorld(thigh, X_AXIS, -THIGH_LIFT);
  rotateWorld(calf, X_AXIS, THIGH_LIFT);
});

const Avatar = ({ variant, emotion, activity, onReady, onFail }: { variant: Variant; emotion: Emotion; activity: Activity; onReady: () => void; onFail: () => void }) => {
  const [cast, setCast] = useState<Awaited<ReturnType<typeof loadCast>> | null>(null);
  const [offset, setOffset] = useState<[number, number, number]>([0, 0, -1]);
  const mixer = useRef<THREE.AnimationMixer | null>(null);
  const actions = useRef<Record<string, THREE.AnimationAction>>({});
  const current = useRef<string>('');
  const meshes = useRef<THREE.Mesh[]>([]);
  const head = useRef<THREE.Object3D | null>(null);
  const legs = useRef<THREE.Object3D[][]>([]);
  const face = useRef<Record<string, number>>({});
  const blink = useRef({ next: 2, t: 0 });
  const gaze = useRef<[number, number]>([0, 0]);
  const emotionRef = useRef(emotion);
  emotionRef.current = emotion;

  useEffect(() => {
    let alive = true;
    loadCast(variant).then(c => {
      if (!alive) return;
      const m = new THREE.AnimationMixer(c.scene);
      mixer.current = m;
      actions.current = Object.fromEntries(c.clips.map(clip => [clip.name, m.clipAction(clip)]));
      const found: THREE.Mesh[] = [];
      c.scene.traverse(o => {
        const mesh = o as THREE.Mesh;
        if (mesh.isMesh) {
          // Bóng VSM tự đổ lên mô hình có da gây vệt tối ở mặt, nên nhân vật chỉ đổ bóng ra môi trường
          mesh.castShadow = true; mesh.receiveShadow = false; mesh.frustumCulled = false;
          if (mesh.morphTargetDictionary) found.push(mesh);
        }
        if (/Bip01_Head$/.test(o.name)) head.current = o;
      });
      meshes.current = found;

      // Đo vị trí hông trong tư thế ngồi để đặt nhân vật đúng vào ghế
      const pose = actions.current.breathe;
      pose?.play();
      m.update(0);
      c.scene.updateMatrixWorld(true);
      legs.current = ['L', 'R'].map(side => [c.scene.getObjectByName(`Bip01_${side}_Thigh`)!, c.scene.getObjectByName(`Bip01_${side}_Calf`)!]);
      seatLegs(legs.current);
      c.scene.updateMatrixWorld(true);
      const pelvis = c.scene.getObjectByName('Bip01_Pelvis'), foot = c.scene.getObjectByName('Bip01_L_Foot');
      if (pelvis && foot) {
        const v = pelvis.getWorldPosition(new THREE.Vector3()), f = foot.getWorldPosition(new THREE.Vector3());
        const s = c.height / 1.74 * .01;
        // Bàn chân chạm sàn quyết định độ cao của nhân vật
        setOffset([-v.x * s, ANKLE - f.y * s, SEAT_HIP[2] - v.z * s]);
      }
      pose?.stop();
      setCast(c);
      onReady();
    }).catch(onFail);
    return () => { alive = false; mixer.current?.stopAllAction(); mixer.current = null; current.current = ''; };
  }, [variant]);

  const clipName = activity === 'thinking' ? 'thoughtful' : BODY[emotion];
  useEffect(() => {
    const next = actions.current[clipName];
    if (!next || current.current === clipName) return;
    const prev = actions.current[current.current];
    next.reset().setLoop(THREE.LoopPingPong, Infinity).fadeIn(.9).play();
    prev?.fadeOut(.9);
    current.current = clipName;
  }, [clipName, cast]);

  const setMorph = (key: string, v: number) => meshes.current.forEach(m => {
    Object.entries(m.morphTargetDictionary!).forEach(([n, i]) => { if (n.includes(key)) m.morphTargetInfluences![i] = v; });
  });

  useFrame((state, dt) => {
    if (!mixer.current) return;
    mixer.current.update(Math.min(dt, .1));
    seatLegs(legs.current);
    const k = 1 - Math.exp(-dt * 3.5), tgt = FACE[emotionRef.current];
    ['BrowInnerUp', 'BrowDown', 'MouthPress', 'MouthFrown', 'MouthSmile'].forEach(n => {
      face.current[n] = (face.current[n] ?? 0) + ((tgt[n] ?? 0) - (face.current[n] ?? 0)) * k;
      setMorph(n, face.current[n]);
    });
    const b = blink.current;
    b.next -= dt;
    if (b.next < 0) { b.t = .16; b.next = 2.2 + Math.random() * 3.6; }
    b.t = Math.max(0, b.t - dt);
    setMorph('EyeBlink', b.t > 0 ? Math.sin((b.t / .16) * Math.PI) : 0);

    // Đầu hơi hướng về người tham vấn, chồng lên động tác có sẵn
    const [gx, gy] = GAZE[emotionRef.current];
    gaze.current[0] += (gx - gaze.current[0]) * k; gaze.current[1] += (gy - gaze.current[1]) * k;
    const t = state.clock.elapsedTime;
    if (head.current) {
      rotateWorld(head.current, X_AXIS, gaze.current[0] + Math.sin(t * .4) * .012);
      rotateWorld(head.current, Y_AXIS, gaze.current[1] + Math.sin(t * .31) * .015);
    }
  });

  if (!cast) return null;
  const scale = cast.height / 1.74 * .01;
  return <group position={offset} scale={scale}><primitive object={cast.scene} /></group>;
};

const CameraRig = ({ yawRef, pitchRef }: { yawRef: React.RefObject<number>; pitchRef: React.RefObject<number> }) => {
  const { camera, size } = useThree();
  const cur = useRef({ y: 0, p: 0 });
  useFrame((_, dt) => {
    const k = 1 - Math.exp(-dt * 6);
    cur.current.y += (yawRef.current - cur.current.y) * k;
    cur.current.p += (pitchRef.current - cur.current.p) * k;
    const cam = camera as THREE.PerspectiveCamera;
    const aspect = size.width / size.height;
    cam.fov = aspect < 1 ? 62 : aspect < 1.4 ? 46 : 38;
    cam.updateProjectionMatrix();
    cam.position.set(0, 1.18, CAM_Z);
    const dist = 4.4;
    cam.lookAt(Math.sin(cur.current.y) * dist, 1.0 + cur.current.p * dist, CAM_Z - Math.cos(cur.current.y) * dist);
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
  variant: Variant; emotion: Emotion; activity: Activity; poster?: string; onLost?: () => void; onFps?: (fps: number) => void;
}

const FpsProbe = ({ onFps }: { onFps?: (fps: number) => void }) => {
  const acc = useRef({ t: 0, n: 0 });
  useFrame((_, dt) => {
    acc.current.t += dt; acc.current.n++;
    if (acc.current.t >= 2) { onFps?.(acc.current.n / acc.current.t); acc.current = { t: 0, n: 0 }; }
  });
  return null;
};

export default function Scene({ variant, emotion, activity, poster, onLost, onFps }: SceneProps) {
  const yaw = useRef(0), pitch = useRef(0);
  const drag = useRef<{ x: number; y: number; yaw: number; pitch: number } | null>(null);
  const [loaded, setLoaded] = useState({ room: false, cast: false });
  const clamp = (v: number, m: number) => Math.max(-m, Math.min(m, v));
  const small = typeof window !== 'undefined' && window.innerWidth < 700;
  const ready = loaded.room && loaded.cast;

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
          gl.domElement.addEventListener('webglcontextlost', e => { e.preventDefault(); onLost?.(); });
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
        <Avatar variant={variant} emotion={emotion} activity={activity} onReady={() => setLoaded(l => ({ ...l, cast: true }))} onFail={() => onLost?.()} />
        <CameraRig yawRef={yaw} pitchRef={pitch} />
        <FpsProbe onFps={onFps} />
      </Canvas>
      {!ready && <div className="scene-loading" style={poster ? { backgroundImage: `url(${poster})` } : undefined}><span className="glass">Đang chuẩn bị phòng tham vấn</span></div>}
    </div>
  );
}

export const webglSupported = () => {
  if ((window as unknown as { __noWebGL?: boolean }).__noWebGL) return false;
  try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; }
};
