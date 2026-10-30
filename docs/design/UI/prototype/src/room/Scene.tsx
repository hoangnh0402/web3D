import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { Emotion } from '../data';

export type Activity = 'idle' | 'listening' | 'thinking' | 'responding';

// Nhân vật dựng hoàn toàn bằng hình khối để demo không phụ thuộc tài sản có giấy phép.
// Bản thật thay bằng GLB theo quy trình ở tài liệu 06, mục 4.4.
interface Pose { lean: number; headX: number; headY: number; headZ: number; shoulder: number; clasp: number; brow: number; mouth: number }

const POSES: Record<Emotion, Pose> = {
  NEUTRAL: { lean: 0.04, headX: 0.02, headY: 0, headZ: 0, shoulder: 0, clasp: 0.2, brow: 0, mouth: -0.2 },
  ANXIOUS: { lean: 0.12, headX: 0.14, headY: 0, headZ: 0.03, shoulder: 0.02, clasp: 1, brow: 0.5, mouth: 0.25 },
  SAD: { lean: 0.2, headX: 0.32, headY: -0.08, headZ: 0.04, shoulder: 0.01, clasp: 0.8, brow: 0.8, mouth: 0.6 },
  TENSE: { lean: -0.02, headX: 0.04, headY: 0.1, headZ: 0, shoulder: 0.028, clasp: 0.6, brow: -0.4, mouth: 0.15 },
  RELIEVED: { lean: 0, headX: -0.03, headY: 0, headZ: -0.03, shoulder: -0.008, clasp: 0, brow: 0.15, mouth: -0.85 },
  HESITANT: { lean: 0.08, headX: 0.12, headY: 0.24, headZ: 0.03, shoulder: 0.012, clasp: 0.7, brow: 0.3, mouth: 0.05 },
};

const LOOKS = {
  a: { top: '#6F8FA3', pants: '#3D4650', hair: '#2B211D', long: true },
  b: { top: '#7C8A6C', pants: '#3A3F46', hair: '#231E1C', long: false },
  c: { top: '#B98A6A', pants: '#46505A', hair: '#33261F', long: true },
};

const SKIN = '#E7BFA0';

const canvasTex = (w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, repeat?: [number, number]) => {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  return t;
};

const useTextures = () => useMemo(() => {
  const wood = canvasTex(512, 512, g => {
    g.fillStyle = '#9C7A5B'; g.fillRect(0, 0, 512, 512);
    for (let y = 0; y < 8; y++) {
      const off = (y % 2) * 180;
      for (let x = -1; x < 4; x++) {
        const shade = 96 + (((x + 2) * 37 + y * 53) % 34);
        g.fillStyle = `rgb(${shade + 40},${shade + 8},${shade - 28})`;
        g.fillRect(x * 256 + off, y * 64, 254, 62);
        g.strokeStyle = 'rgba(70,45,25,.10)';
        for (let k = 0; k < 7; k++) { g.beginPath(); const yy = y * 64 + 6 + k * 8; g.moveTo(x * 256 + off, yy); g.bezierCurveTo(x * 256 + off + 80, yy + 4, x * 256 + off + 170, yy - 4, x * 256 + off + 254, yy + 1); g.stroke(); }
      }
    }
  }, [3, 3]);
  const sky = canvasTex(512, 640, g => {
    const grd = g.createLinearGradient(0, 0, 0, 640);
    grd.addColorStop(0, '#CFE4EC'); grd.addColorStop(.55, '#F3EBD8'); grd.addColorStop(1, '#DDE3C8');
    g.fillStyle = grd; g.fillRect(0, 0, 512, 640);
    g.filter = 'blur(14px)';
    [[70, 470, 120, '#8FAE8B'], [210, 520, 150, '#7E9F7E'], [380, 480, 130, '#94B38F'], [470, 560, 120, '#7A9A7B']].forEach(([x, y, r, c]) => {
      g.fillStyle = c as string; g.beginPath(); g.arc(x as number, y as number, r as number, 0, Math.PI * 2); g.fill();
    });
  });
  const rug = canvasTex(512, 512, g => {
    g.fillStyle = '#C9CFC6'; g.beginPath(); g.arc(256, 256, 256, 0, Math.PI * 2); g.fill();
    ['#B5BDB3', '#D7DBD2', '#AAB4AB'].forEach((c, i) => { g.strokeStyle = c; g.lineWidth = 14; g.beginPath(); g.arc(256, 256, 226 - i * 66, 0, Math.PI * 2); g.stroke(); });
  });
  const art = canvasTex(256, 320, g => {
    g.fillStyle = '#EDE7DA'; g.fillRect(0, 0, 256, 320);
    g.fillStyle = '#7F9EA3'; g.beginPath(); g.ellipse(128, 215, 150, 66, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#C9A26A'; g.beginPath(); g.arc(160, 120, 44, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#4F7377'; g.beginPath(); g.ellipse(70, 262, 130, 44, 0, 0, Math.PI * 2); g.fill();
  });
  const wall = canvasTex(256, 256, g => {
    g.fillStyle = '#C6D4D0'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 1400; i++) { g.fillStyle = `rgba(90,110,105,${Math.random() * .025})`; g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2); }
  }, [4, 2]);
  return { wood, sky, rug, art, wall };
}, []);

const RBox = ({ size, radius = 0.03, color, roughness = 0.75, ...rest }: { size: [number, number, number]; radius?: number; color: string; roughness?: number } & Record<string, unknown>) => {
  const geo = useMemo(() => new RoundedBoxGeometry(size[0], size[1], size[2], 3, radius), [size[0], size[1], size[2], radius]);
  return <mesh geometry={geo} castShadow receiveShadow {...rest}><meshStandardMaterial color={color} roughness={roughness} /></mesh>;
};

const Limb = ({ r, len, color, ...rest }: { r: number; len: number; color: string } & Record<string, unknown>) => (
  <mesh castShadow position={[0, -len / 2, 0]} {...rest}>
    <capsuleGeometry args={[r, len, 6, 14]} />
    <meshStandardMaterial color={color} roughness={0.72} />
  </mesh>
);

const torsoProfile: [number, number][] = [[0.001, -0.02], [0.13, 0], [0.142, 0.06], [0.132, 0.14], [0.14, 0.24], [0.166, 0.34], [0.184, 0.41], [0.172, 0.455], [0.118, 0.49], [0.06, 0.51], [0.001, 0.515]];
const torsoGeo = new THREE.LatheGeometry(new THREE.SplineCurve(torsoProfile.map(([x, y]) => new THREE.Vector2(x, y))).getPoints(40), 40);

const Character = ({ variant, emotion, activity }: { variant: keyof typeof LOOKS; emotion: Emotion; activity: Activity }) => {
  const look = LOOKS[variant];
  const spine = useRef<THREE.Group>(null!), head = useRef<THREE.Group>(null!), torso = useRef<THREE.Group>(null!);
  const armL = useRef<THREE.Group>(null!), armR = useRef<THREE.Group>(null!), foreL = useRef<THREE.Group>(null!), foreR = useRef<THREE.Group>(null!);
  const browL = useRef<THREE.Mesh>(null!), browR = useRef<THREE.Mesh>(null!), mouth = useRef<THREE.Mesh>(null!);
  const eyeL = useRef<THREE.Group>(null!), eyeR = useRef<THREE.Group>(null!);
  const cur = useRef<Pose>({ ...POSES.NEUTRAL });
  const blink = useRef({ next: 2.2, t: 0 });

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime, k = 1 - Math.exp(-dt * 3.2), p = cur.current, tgt = POSES[emotion];
    (Object.keys(p) as (keyof Pose)[]).forEach(key => { p[key] += (tgt[key] - p[key]) * k; });

    const breathe = Math.sin(t * 1.5);
    let nodX = 0, tiltZ = 0, gesture = 0, turnY = 0;
    if (activity === 'listening') nodX = Math.max(0, Math.sin(t * 1.3)) * 0.035;
    if (activity === 'thinking') { tiltZ = 0.08; nodX = -0.05; turnY = -0.12 + Math.sin(t * 0.7) * 0.03; }
    if (activity === 'responding') { nodX = Math.sin(t * 3.4) * 0.02; turnY = Math.sin(t * 1.5) * 0.04; gesture = (Math.sin(t * 2.3) + 1) * 0.5; }

    spine.current.rotation.x = p.lean + breathe * 0.006;
    torso.current.scale.set(1 + breathe * 0.008, 1 + breathe * 0.004, 1 + breathe * 0.012);
    head.current.rotation.set(p.headX + nodX + Math.sin(t * 0.43) * 0.012, p.headY + turnY + Math.sin(t * 0.31) * 0.02, p.headZ + tiltZ);

    // Tay đặt trên đùi. Khi lo lắng hai bàn tay khép lại với nhau.
    const sh = p.shoulder;
    armL.current.position.y = 0.43 + sh; armR.current.position.y = 0.43 + sh;
    armL.current.rotation.set(-0.42 - p.clasp * 0.12, 0, -0.05 + p.clasp * 0.08);
    armR.current.rotation.set(-0.42 - p.clasp * 0.12, 0, 0.05 - p.clasp * 0.08);
    foreL.current.rotation.set(-0.98 - p.clasp * 0.14 - gesture * 0.12, 0, 0.34 + p.clasp * 0.42);
    foreR.current.rotation.set(-0.98 - p.clasp * 0.14, 0, -0.34 - p.clasp * 0.42);

    browL.current.rotation.z = 1.5708 - p.brow * 0.3; browR.current.rotation.z = 1.5708 + p.brow * 0.3;
    browL.current.position.y = 0.05 + p.brow * 0.006; browR.current.position.y = 0.05 + p.brow * 0.006;
    mouth.current.scale.set(1, Math.max(0.12, Math.abs(p.mouth)) * Math.sign(p.mouth || 1), 1);
    mouth.current.position.y = -0.058 + p.mouth * 0.007;

    const b = blink.current;
    b.next -= dt;
    if (b.next < 0) { b.t = 0.14; b.next = 2 + Math.random() * 3.5; }
    b.t = Math.max(0, b.t - dt);
    const open = b.t > 0 ? 0.1 : 1;
    eyeL.current.scale.y = open; eyeR.current.scale.y = open;
  });

  return (
    <group position={[0, 0.56, -1.0]}>
      {/* Hông và chân */}
      <mesh castShadow position={[0, 0.03, 0]} scale={[1.2, 0.72, 1]}><sphereGeometry args={[0.15, 24, 18]} /><meshStandardMaterial color={look.pants} roughness={0.8} /></mesh>
      {[-1, 1].map(s => (
        <group key={s} position={[s * 0.085, 0.02, 0.02]}>
          <group rotation={[-1.5, 0, s * 0.04]}><Limb r={0.068} len={0.36} color={look.pants} /></group>
          <group position={[s * 0.015, 0, 0.4]} rotation={[0.08, 0, 0]}>
            <Limb r={0.054} len={0.37} color={look.pants} />
            <mesh castShadow position={[0, -0.47, 0.055]} scale={[0.75, 0.5, 1.45]}><sphereGeometry args={[0.07, 18, 14]} /><meshStandardMaterial color="#EDE8DF" roughness={0.65} /></mesh>
          </group>
        </group>
      ))}

      <group ref={spine}>
        <group ref={torso}>
          <mesh castShadow geometry={torsoGeo} scale={[1, 1, 0.68]}><meshStandardMaterial color={look.top} roughness={0.88} /></mesh>
        </group>

        <group ref={armL} position={[-0.178, 0.43, 0]}>
          <Limb r={0.041} len={0.25} color={look.top} />
          <group ref={foreL} position={[0, -0.27, 0]}>
            <Limb r={0.035} len={0.22} color={look.top} />
            <mesh castShadow position={[0, -0.29, 0]} scale={[0.85, 1.15, 0.7]}><sphereGeometry args={[0.044, 16, 12]} /><meshStandardMaterial color={SKIN} roughness={0.6} /></mesh>
          </group>
        </group>
        <group ref={armR} position={[0.178, 0.43, 0]}>
          <Limb r={0.041} len={0.25} color={look.top} />
          <group ref={foreR} position={[0, -0.27, 0]}>
            <Limb r={0.035} len={0.22} color={look.top} />
            <mesh castShadow position={[0, -0.29, 0]} scale={[0.85, 1.15, 0.7]}><sphereGeometry args={[0.044, 16, 12]} /><meshStandardMaterial color={SKIN} roughness={0.6} /></mesh>
          </group>
        </group>

        <mesh castShadow position={[0, 0.515, 0.005]}><cylinderGeometry args={[0.046, 0.054, 0.1, 16]} /><meshStandardMaterial color={SKIN} roughness={0.6} /></mesh>

        <group ref={head} position={[0, 0.645, 0.012]}>
          <mesh castShadow scale={[0.93, 1.1, 0.98]}><sphereGeometry args={[0.112, 36, 28]} /><meshStandardMaterial color={SKIN} roughness={0.55} /></mesh>
          {!look.long && [-1, 1].map(s => <mesh key={s} position={[s * 0.104, -0.005, 0]} scale={[0.5, 1, 0.7]}><sphereGeometry args={[0.02, 12, 10]} /><meshStandardMaterial color={SKIN} roughness={0.6} /></mesh>)}

          {/* Khuôn mặt */}
          <group ref={eyeL} position={[-0.041, 0.012, 0.1]}><mesh scale={[0.9, 1.15, 0.5]}><sphereGeometry args={[0.0138, 14, 12]} /><meshStandardMaterial color="#20191A" roughness={0.25} /></mesh></group>
          <group ref={eyeR} position={[0.041, 0.012, 0.1]}><mesh scale={[0.9, 1.15, 0.5]}><sphereGeometry args={[0.0138, 14, 12]} /><meshStandardMaterial color="#20191A" roughness={0.25} /></mesh></group>
          <mesh ref={browL} position={[-0.041, 0.05, 0.102]}><capsuleGeometry args={[0.0032, 0.026, 3, 8]} /><meshStandardMaterial color={look.hair} /></mesh>
          <mesh ref={browR} position={[0.041, 0.05, 0.102]}><capsuleGeometry args={[0.0032, 0.026, 3, 8]} /><meshStandardMaterial color={look.hair} /></mesh>
          <mesh position={[0, -0.016, 0.109]} scale={[0.8, 1.1, 0.9]}><sphereGeometry args={[0.0095, 12, 10]} /><meshStandardMaterial color="#DDAE8E" roughness={0.6} /></mesh>
          <mesh ref={mouth} position={[0, -0.058, 0.098]}><torusGeometry args={[0.02, 0.0036, 8, 22, Math.PI]} /><meshStandardMaterial color="#A85F56" roughness={0.5} side={THREE.DoubleSide} /></mesh>

          {/* Tóc */}
          <mesh castShadow position={[0, 0.016, -0.012]} rotation={[-0.42, 0, 0]}>
            <sphereGeometry args={[0.1215, 36, 24, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
            <meshStandardMaterial color={look.hair} roughness={0.92} side={THREE.DoubleSide} />
          </mesh>
          {look.long ? <>
            <mesh castShadow position={[0, -0.11, -0.055]} scale={[1.18, 1, 0.56]}><capsuleGeometry args={[0.1, 0.17, 8, 18]} /><meshStandardMaterial color={look.hair} roughness={0.92} /></mesh>
            {[-1, 1].map(s => <mesh key={s} castShadow position={[s * 0.1, -0.075, 0.018]} rotation={[0.04, 0, s * 0.05]} scale={[0.55, 1, 0.72]}><capsuleGeometry args={[0.03, 0.15, 6, 12]} /><meshStandardMaterial color={look.hair} roughness={0.92} /></mesh>)}
            <mesh position={[-0.052, 0.076, 0.07]} rotation={[0.4, 0.42, 0.72]} scale={[1, 0.3, 0.46]}><sphereGeometry args={[0.078, 20, 14]} /><meshStandardMaterial color={look.hair} roughness={0.92} /></mesh>
            <mesh position={[0.052, 0.078, 0.07]} rotation={[0.4, -0.42, -0.62]} scale={[1, 0.3, 0.46]}><sphereGeometry args={[0.07, 20, 14]} /><meshStandardMaterial color={look.hair} roughness={0.92} /></mesh>
          </> : <>
            <mesh position={[0, 0.095, 0.055]} rotation={[0.55, 0, 0]} scale={[1.16, 0.34, 0.75]}><sphereGeometry args={[0.09, 20, 14]} /><meshStandardMaterial color={look.hair} roughness={0.92} /></mesh>
          </>}
        </group>
      </group>
    </group>
  );
};

const Armchair = ({ position, rotation, color }: { position: [number, number, number]; rotation?: [number, number, number]; color: string }) => (
  <group position={position} rotation={rotation}>
    <RBox size={[0.78, 0.2, 0.7]} radius={0.06} color={color} position={[0, 0.41, 0]} />
    <RBox size={[0.78, 0.8, 0.17]} radius={0.07} color={color} position={[0, 0.78, -0.31]} rotation={[-0.1, 0, 0]} />
    {[-1, 1].map(s => <RBox key={s} size={[0.13, 0.3, 0.68]} radius={0.05} color={color} position={[s * 0.45, 0.58, 0]} />)}
    {[[-.33, .26], [.33, .26], [-.33, -.3], [.33, -.3]].map(([x, z], i) => (
      <mesh key={i} position={[x, 0.15, z]} castShadow><cylinderGeometry args={[0.022, 0.016, 0.3, 10]} /><meshStandardMaterial color="#5B4636" roughness={0.5} /></mesh>
    ))}
  </group>
);

const Room = () => {
  const tx = useTextures();
  const books = useMemo(() => {
    const colors = ['#6F8FA3', '#C9A26A', '#8C9C86', '#B98A6A', '#3F5C63', '#D8CDB8', '#7D6A58'];
    const out: { x: number; y: number; w: number; h: number; c: string }[] = [];
    [0.62, 1.14, 1.66].forEach((y, row) => {
      let x = -0.42;
      let i = row * 3;
      while (x < 0.36) {
        const w = 0.035 + ((i * 7) % 5) * 0.008, h = 0.26 + ((i * 3) % 4) * 0.022;
        if ((i + row) % 11 !== 5) out.push({ x, y: y + h / 2, w, h, c: colors[i % colors.length] });
        x += w + 0.006; i++;
        if ((i + row * 2) % 13 === 0) x += 0.14;
      }
    });
    return out;
  }, []);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[8, 8]} /><meshStandardMaterial map={tx.wood} roughness={0.55} /></mesh>
      <mesh position={[0, 1.45, -2.4]} receiveShadow><planeGeometry args={[8, 2.9]} /><meshStandardMaterial map={tx.wall} roughness={0.95} /></mesh>
      <mesh position={[-3, 1.45, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow><planeGeometry args={[8, 2.9]} /><meshStandardMaterial map={tx.wall} roughness={0.95} /></mesh>
      <mesh position={[3, 1.45, 0]} rotation={[0, -Math.PI / 2, 0]} receiveShadow><planeGeometry args={[8, 2.9]} /><meshStandardMaterial map={tx.wall} roughness={0.95} /></mesh>
      <mesh position={[0, 2.9, 0]} rotation={[Math.PI / 2, 0, 0]}><planeGeometry args={[8, 8]} /><meshStandardMaterial color="#F1F2EE" roughness={1} /></mesh>
      <RBox size={[6, 0.1, 0.03]} radius={0.005} color="#F4F3EE" position={[0, 0.05, -2.385]} />

      {/* Cửa sổ */}
      <group position={[-1.5, 1.52, -2.38]}>
        <mesh><planeGeometry args={[1.5, 1.72]} /><meshBasicMaterial map={tx.sky} toneMapped={false} /></mesh>
        {[[0, 0.88, 1.6, 0.05], [0, -0.88, 1.6, 0.05], [-0.77, 0, 0.05, 1.76], [0.77, 0, 0.05, 1.76], [0, 0, 0.03, 1.72], [0, 0.26, 1.5, 0.03]].map(([x, y, w, h], i) => (
          <RBox key={i} size={[w, h, 0.05]} radius={0.008} color="#F4F3EE" position={[x, y, 0.02]} />
        ))}
        <RBox size={[1.74, 0.05, 0.16]} radius={0.015} color="#F4F3EE" position={[0, -0.92, 0.06]} />
      </group>
      {[-2.46, -0.56].map((x, i) => (
        <group key={i} position={[x, 1.42, -2.3]}>
          {[-.11, -.04, .04, .11].map((o, k) => <mesh key={k} castShadow position={[o, 0, Math.sin(k * 2) * 0.03]}><cylinderGeometry args={[0.052, 0.062, 2.5, 12]} /><meshStandardMaterial color="#D9D4C7" roughness={0.9} /></mesh>)}
        </group>
      ))}

      {/* Giá sách */}
      <group position={[1.95, 0, -2.2]}>
        <mesh position={[0, 1.07, -0.16]}><planeGeometry args={[1.0, 2.14]} /><meshStandardMaterial color="#8A7A69" roughness={0.9} /></mesh>
        {[-1, 1].map(s => <RBox key={s} size={[0.03, 2.14, 0.34]} radius={0.004} color="#CDBFAC" position={[s * 0.5, 1.07, 0]} />)}
        {[0.05, 0.6, 1.12, 1.64, 2.12].map(y => <RBox key={y} size={[1.02, 0.03, 0.34]} radius={0.004} color="#D6CCBB" position={[0, y, 0]} />)}
        {books.map((b, i) => <mesh key={i} position={[b.x, b.y - 0.0, 0.0]} castShadow receiveShadow><boxGeometry args={[b.w, b.h, 0.21]} /><meshStandardMaterial color={b.c} roughness={0.7} /></mesh>)}
      </group>

      {/* Tranh treo tường, thảm, đèn, cây, bàn nhỏ */}
      <group position={[0.42, 1.78, -2.37]}>
        <RBox size={[0.6, 0.74, 0.03]} radius={0.006} color="#5E5146" />
        <mesh position={[0, 0, 0.017]}><planeGeometry args={[0.52, 0.66]} /><meshStandardMaterial map={tx.art} roughness={0.8} /></mesh>
      </group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, -0.1]} receiveShadow><circleGeometry args={[1.5, 64]} /><meshStandardMaterial map={tx.rug} roughness={0.95} /></mesh>

      <group position={[1.08, 0, -1.28]}>
        <mesh castShadow position={[0, 0.02, 0]}><cylinderGeometry args={[0.16, 0.18, 0.04, 24]} /><meshStandardMaterial color="#4A4037" roughness={0.4} metalness={0.3} /></mesh>
        <mesh castShadow position={[0, 0.76, 0]}><cylinderGeometry args={[0.011, 0.011, 1.5, 10]} /><meshStandardMaterial color="#4A4037" roughness={0.4} metalness={0.3} /></mesh>
        <mesh position={[0, 1.56, 0]}><cylinderGeometry args={[0.15, 0.22, 0.26, 28, 1, true]} /><meshStandardMaterial color="#F7E9CC" emissive="#F5C877" emissiveIntensity={0.85} side={THREE.DoubleSide} roughness={0.9} /></mesh>
        <pointLight position={[0, 1.5, 0.05]} intensity={2.6} distance={3.4} decay={1.6} color="#FFD49A" />
      </group>

      <group position={[-1.32, 0, -1.72]}>
        <mesh castShadow position={[0, 0.2, 0]}><cylinderGeometry args={[0.2, 0.15, 0.4, 24]} /><meshStandardMaterial color="#D3C6B2" roughness={0.7} /></mesh>
        {Array.from({ length: 15 }).map((_, i) => {
          const a = i * 2.399, tilt = 0.14 + (i % 5) * 0.13, len = 0.42 + (i % 4) * 0.13;
          return (
            <group key={i} position={[0, 0.38, 0]} rotation={[0, a, tilt]}>
              <mesh castShadow position={[0, len / 2, 0]}><cylinderGeometry args={[0.004, 0.007, len, 6]} /><meshStandardMaterial color="#4E6B50" roughness={0.7} /></mesh>
              <mesh castShadow position={[0, len + 0.1, 0]} rotation={[0, 0, tilt * 0.8]} scale={[0.46, 1.25, 0.09]}>
                <sphereGeometry args={[0.1, 14, 12]} />
                <meshStandardMaterial color={i % 3 ? '#54795D' : '#44684F'} roughness={0.55} />
              </mesh>
            </group>
          );
        })}
      </group>

      <group position={[0.02, 0, 0.42]}>
        <mesh castShadow receiveShadow position={[0, 0.44, 0]}><cylinderGeometry args={[0.33, 0.33, 0.028, 40]} /><meshStandardMaterial color="#B08A63" roughness={0.45} /></mesh>
        <mesh castShadow position={[0, 0.22, 0]}><cylinderGeometry args={[0.024, 0.04, 0.42, 14]} /><meshStandardMaterial color="#6B5441" roughness={0.5} /></mesh>
        <mesh position={[0, 0.012, 0]}><cylinderGeometry args={[0.19, 0.21, 0.02, 24]} /><meshStandardMaterial color="#6B5441" roughness={0.5} /></mesh>
        <mesh castShadow position={[-0.13, 0.5, 0.04]}><cylinderGeometry args={[0.038, 0.031, 0.1, 18]} /><meshPhysicalMaterial color="#DDEEF0" roughness={0.1} transparent opacity={0.5} /></mesh>
        <RBox size={[0.21, 0.09, 0.12]} radius={0.012} color="#EFE9DD" position={[0.13, 0.5, -0.04]} rotation={[0, 0.25, 0]} />
        <RBox size={[0.17, 0.016, 0.23]} radius={0.004} color="#5F7E85" position={[0.02, 0.463, 0.16]} rotation={[0, -0.12, 0]} />
      </group>

      <Armchair position={[0, 0, -1.02]} color="#A6B39D" />
    </group>
  );
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
    cam.fov = aspect < 1 ? 52 : aspect < 1.4 ? 36 : 30;
    cam.updateProjectionMatrix();
    cam.position.set(0, 1.2, 2.25);
    const dist = 5.5;
    cam.lookAt(Math.sin(cur.current.y) * dist, 0.97 + cur.current.p * dist, 2.25 - Math.cos(cur.current.y) * dist);
  });
  return null;
};

const Environment = () => {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.42;
    return () => { env.dispose(); pmrem.dispose(); };
  }, [gl, scene]);
  return null;
};

export interface SceneProps {
  variant: 'a' | 'b' | 'c'; emotion: Emotion; activity: Activity; light?: boolean; onLost?: () => void; onFps?: (fps: number) => void;
}

const FpsProbe = ({ onFps }: { onFps?: (fps: number) => void }) => {
  const acc = useRef({ t: 0, n: 0 });
  useFrame((_, dt) => {
    acc.current.t += dt; acc.current.n++;
    if (acc.current.t >= 2) { onFps?.(acc.current.n / acc.current.t); acc.current = { t: 0, n: 0 }; }
  });
  return null;
};

export default function Scene({ variant, emotion, activity, onLost, onFps }: SceneProps) {
  const yaw = useRef(0), pitch = useRef(0);
  const drag = useRef<{ x: number; y: number; yaw: number; pitch: number } | null>(null);
  const clamp = (v: number, m: number) => Math.max(-m, Math.min(m, v));
  const small = typeof window !== 'undefined' && window.innerWidth < 700;

  return (
    <div
      className="scene-wrap" style={{ width: '100%', height: '100%' }} tabIndex={0} role="application"
      aria-label="Phòng tham vấn 3D. Dùng phím mũi tên hoặc kéo chuột để xoay góc nhìn."
      onPointerDown={e => { drag.current = { x: e.clientX, y: e.clientY, yaw: yaw.current, pitch: pitch.current }; }}
      onPointerMove={e => {
        if (!drag.current) return;
        yaw.current = clamp(drag.current.yaw + (e.clientX - drag.current.x) * 0.0022, 0.42);
        pitch.current = clamp(drag.current.pitch - (e.clientY - drag.current.y) * 0.0016, 0.14);
      }}
      onPointerUp={() => { drag.current = null; }} onPointerLeave={() => { drag.current = null; }}
      onKeyDown={e => {
        const m: Record<string, () => void> = {
          ArrowLeft: () => { yaw.current = clamp(yaw.current - 0.06, 0.42); }, ArrowRight: () => { yaw.current = clamp(yaw.current + 0.06, 0.42); },
          ArrowUp: () => { pitch.current = clamp(pitch.current + 0.03, 0.14); }, ArrowDown: () => { pitch.current = clamp(pitch.current - 0.03, 0.14); },
        };
        if (m[e.key]) { e.preventDefault(); m[e.key](); }
      }}
    >
      <Canvas
        shadows={small ? false : { type: THREE.PCFShadowMap }} dpr={small ? [1, 1.5] : [1, 1.75]} camera={{ position: [0, 1.2, 2.25], fov: 36, near: 0.1, far: 30 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.02;
          gl.domElement.addEventListener('webglcontextlost', e => { e.preventDefault(); onLost?.(); });
        }}
      >
        <color attach="background" args={['#C6D4D0']} />
        <Environment />
        <ambientLight intensity={0.16} color="#FFF3E2" />
        <hemisphereLight intensity={0.4} color="#FFF6E8" groundColor="#A08C72" />
        <directionalLight
          position={[-2.4, 2.8, 1.8]} intensity={2.3} color="#FFE6C4" castShadow
          shadow-mapSize-width={1536} shadow-mapSize-height={1536} shadow-camera-left={-3.4} shadow-camera-right={3.4}
          shadow-camera-top={3.4} shadow-camera-bottom={-3.4} shadow-bias={-0.0004} shadow-radius={5}
        />
        <Room />
        <Character variant={variant} emotion={emotion} activity={activity} />
        <CameraRig yawRef={yaw} pitchRef={pitch} />
        <FpsProbe onFps={onFps} />
      </Canvas>
    </div>
  );
}

export const webglSupported = () => {
  if ((window as unknown as { __noWebGL?: boolean }).__noWebGL) return false;
  try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; }
};
