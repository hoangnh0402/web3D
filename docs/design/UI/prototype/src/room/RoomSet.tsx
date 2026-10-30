import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { loadRoom } from './assets';
import floorDiff from '../assets/3d/tex/herringbone_parquet_diff.webp';
import floorNor from '../assets/3d/tex/herringbone_parquet_nor.webp';
import floorRough from '../assets/3d/tex/herringbone_parquet_rough.webp';
import wallNor from '../assets/3d/tex/painted_plaster_wall_nor.webp';
import linenNor from '../assets/3d/tex/rough_linen_nor.webp';
import windowView from '../assets/3d/tex/window_view.webp';

// Nội thất và vật liệu: Poly Haven (CC0). Xem tools/ để dựng lại.

// Chỗ ngồi của thân chủ. Sofa xoay chếch so với người tham vấn để hai người không đối diện thẳng, cảm giác bớt đối đầu.
const SOFA = { x: .42, z: -1.46, yaw: -.2 };
// Thân chủ ngồi lệch về một bên sofa, chừa chỗ cho gối ở bên kia
const sit = (side: number, back: number) => ({ x: SOFA.x + side * Math.cos(SOFA.yaw) + back * Math.sin(SOFA.yaw), z: SOFA.z - side * Math.sin(SOFA.yaw) + back * Math.cos(SOFA.yaw), yaw: SOFA.yaw });
export const SEAT = sit(-.26, -.1);
export const SEAT_HIP: [number, number, number] = [0, .5, 0];

const WALL = '#E4DACA', TRIM = '#F1ECE2', WOOD = '#6B5140', BRASS = '#A98A58';
const BACK_Z = -2.6, HEIGHT = 2.8;
const WINDOW = { x: -1.5, y: 1.5, w: 1.9, h: 2.1 };

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

// Rèm có nếp gấp thật. Rèm dày hai bên, rèm voan mỏng phủ cửa sổ làm dịu ánh sáng ngoài trời.
const Curtain = ({ position, width, height, color, opacity = 1, depth = .036 }: { position: [number, number, number]; width: number; height: number; color: string; opacity?: number; depth?: number }) => {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(width, height, Math.round(width * 150), 24);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i);
      const flare = 1 + (height / 2 - y) * .14;
      p.setZ(i, (Math.sin(x * 34) * depth + Math.sin(x * 13 + 1) * depth * .5) * flare);
    }
    g.computeVertexNormals();
    return g;
  }, [width, height, depth]);
  return <mesh geometry={geo} position={position} castShadow={opacity === 1} receiveShadow><meshStandardMaterial color={color} roughness={.95} side={THREE.DoubleSide} transparent={opacity < 1} opacity={opacity} depthWrite={opacity === 1} /></mesh>;
};

// Bóng tiếp xúc giả dưới đồ vật để đồ vật bám sàn, rẻ hơn nhiều so với AO thời gian thực
const Contact = ({ position, size, rotation = 0, opacity = .38 }: { position: [number, number, number]; size: [number, number]; rotation?: number; opacity?: number }) => {
  const tex = useMemo(() => canvasTex(128, 128, g => {
    const r = g.createRadialGradient(64, 64, 8, 64, 64, 64);
    r.addColorStop(0, 'rgba(34,24,16,1)'); r.addColorStop(.55, 'rgba(34,24,16,.5)'); r.addColorStop(1, 'rgba(34,24,16,0)');
    g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  }), []);
  return <mesh rotation={[-Math.PI / 2, 0, rotation]} position={position}><planeGeometry args={size} /><meshBasicMaterial map={tex} transparent opacity={opacity} depthWrite={false} /></mesh>;
};

const TABLE = { x: -.82, z: -1.24 };
interface Placed { id: string; position: [number, number, number]; rotation?: number; scale?: number }
const FURNITURE: Placed[] = [
  { id: 'Sofa_01', position: [SOFA.x, 0, SOFA.z], rotation: SOFA.yaw },
  { id: 'coffee_table_round_01', position: [-.34, 0, -.2], scale: .62 },
  { id: 'side_table_01', position: [TABLE.x, 0, TABLE.z], rotation: .3, scale: .92 },
  { id: 'wooden_bookshelf_worn', position: [2.2, 0, -2.3], scale: 1.05 },
  { id: 'ceramic_vase_04', position: [2.46, .94, -2.3], scale: .8 },
  { id: 'planter_pot_clay', position: [-1.5, 0, -2.04], scale: 1.5 },
  { id: 'fern_02', position: [-1.5, .28, -2.04], scale: 1.7 },
  { id: 'throw_pillows_01', position: [1.02, .44, -1.56], rotation: SOFA.yaw + .2, scale: .52 },
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
        // Bóng lá cây in lên tường trông như vết bẩn nên cây chỉ nhận bóng
        holder.traverse(o => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = f.id !== 'fern_02'; m.receiveShadow = true; } });
        group.add(holder);
      });
      const frame = g.scene.children.filter(c => c.name === 'hanging_picture_frame_02');
      const holder = new THREE.Group();
      // Lớp kính của khung làm tối bức tranh dưới ánh sáng phòng, nên bỏ đi
      frame.forEach(p => { const c = p.clone(); c.traverse(o => { const m = o as THREE.Mesh; if (m.isMesh && (m.material as THREE.Material).name.endsWith('_glass')) m.visible = false; }); holder.add(c); });
      holder.position.set(.66, 1.68, BACK_Z + .02);
            group.add(holder);
      setRoot(group);
      onReady();
    });
    return () => { alive = false; };
  }, []);
  return root ? <primitive object={root} /> : null;
};

const Books = () => {
  const books = useMemo(() => {
    const colors = ['#7A8C86', '#B39A73', '#8C9880', '#A68872', '#55696B', '#CFC4AD', '#7C6A5A', '#98A2A0'];
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
    <group position={[2.2, 0, -2.3]}>
      {books.map((b, i) => <mesh key={i} position={[b.x, b.y, -.02]} castShadow receiveShadow><boxGeometry args={[b.w, b.h, .2]} /><meshStandardMaterial color={b.c} roughness={.75} /></mesh>)}
    </group>
  );
};

// Đèn đứng cạnh sofa tạo một vùng sáng ấm, tách nhân vật khỏi tường
const FloorLamp = () => (
  <group position={[1.36, 0, -1.92]}>
    <mesh castShadow position={[0, .012, 0]}><cylinderGeometry args={[.14, .15, .024, 32]} /><meshStandardMaterial color={BRASS} roughness={.32} metalness={.8} /></mesh>
    <mesh castShadow position={[0, .75, 0]}><cylinderGeometry args={[.008, .008, 1.5, 12]} /><meshStandardMaterial color={BRASS} roughness={.32} metalness={.8} /></mesh>
    <mesh position={[0, 1.58, 0]}><cylinderGeometry args={[.15, .2, .28, 40, 1, true]} /><meshStandardMaterial color="#F4E6CC" emissive="#FFC67A" emissiveIntensity={1.15} side={THREE.DoubleSide} roughness={.9} /></mesh>
    <pointLight position={[0, 1.6, .02]} intensity={1.5} distance={3.6} decay={1.8} color="#FFD6A6" />
  </group>
);

export const RoomSet = ({ onReady }: { onReady: () => void }) => {
  const floorMap = useTex(floorDiff, [3, 3], true), floorN = useTex(floorNor, [3, 3]), floorR = useTex(floorRough, [3, 3]);
  const wallN = useTex(wallNor, [2.2, 1]), linenN = useTex(linenNor, [5, 4]);
  const view = useMemo(() => {
    const t = new THREE.TextureLoader().load(windowView);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  const rug = useMemo(() => canvasTex(512, 384, g => {
    g.fillStyle = '#C9BFAE'; g.fillRect(0, 0, 512, 384);
    for (let i = 0; i < 30000; i++) {
      g.fillStyle = `rgba(${Math.random() > .5 ? '255,250,240' : '84,72,60'},.05)`;
      g.fillRect(Math.random() * 512, Math.random() * 384, 2, 2);
    }
    g.strokeStyle = '#AEA08C'; g.lineWidth = 7; g.strokeRect(22, 22, 468, 340);
    g.strokeStyle = '#D9D0C0'; g.lineWidth = 3; g.strokeRect(36, 36, 440, 312);
  }), []);
  const wall = <meshStandardMaterial normalMap={wallN} normalScale={new THREE.Vector2(.22, .22)} color={WALL} roughness={.9} />;

  const { x: wx, y: wy, w: ww, h: wh } = WINDOW;
  const left = wx - ww / 2, right = wx + ww / 2, top = wy + wh / 2, bottom = wy - wh / 2;
  const sideL = left + 3.2, sideR = 3.2 - right;

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, .7]} receiveShadow><planeGeometry args={[6.4, 6.8]} /><meshStandardMaterial map={floorMap} normalMap={floorN} roughnessMap={floorR} color="#E6D6C2" /></mesh>
      <mesh position={[0, HEIGHT, .7]} rotation={[Math.PI / 2, 0, 0]}><planeGeometry args={[6.4, 6.8]} /><meshStandardMaterial color="#F3F0E8" roughness={1} /></mesh>

      {/* Tường sau khoét một ô cửa thật, cảnh ngoài trời nằm xa phía sau nên có chiều sâu khi xoay góc nhìn */}
      <mesh position={[left - sideL / 2, HEIGHT / 2, BACK_Z]} receiveShadow><planeGeometry args={[sideL, HEIGHT]} />{wall}</mesh>
      <mesh position={[right + sideR / 2, HEIGHT / 2, BACK_Z]} receiveShadow><planeGeometry args={[sideR, HEIGHT]} />{wall}</mesh>
      <mesh position={[wx, (top + HEIGHT) / 2, BACK_Z]} receiveShadow><planeGeometry args={[ww, HEIGHT - top]} />{wall}</mesh>
      <mesh position={[wx, bottom / 2, BACK_Z]} receiveShadow><planeGeometry args={[ww, bottom]} />{wall}</mesh>
      <mesh position={[-3.2, HEIGHT / 2, .7]} rotation={[0, Math.PI / 2, 0]} receiveShadow><planeGeometry args={[6.8, HEIGHT]} />{wall}</mesh>
      <mesh position={[3.2, HEIGHT / 2, .7]} rotation={[0, -Math.PI / 2, 0]} receiveShadow><planeGeometry args={[6.8, HEIGHT]} />{wall}</mesh>
      <mesh position={[0, HEIGHT / 2, 4.1]} rotation={[0, Math.PI, 0]}><planeGeometry args={[6.4, HEIGHT]} />{wall}</mesh>

      <mesh position={[wx - .5, wy - .9, BACK_Z - 4.6]}><planeGeometry args={[9.6, 12]} /><meshBasicMaterial map={view} color={[2.3, 2.3, 2.15]} /></mesh>

      {/* Khung cửa và chân tường */}
      <group position={[wx, wy, BACK_Z]}>
        {([[0, wh / 2 + .03, ww + .12, .06], [0, -wh / 2 - .03, ww + .12, .06], [-ww / 2 - .03, 0, .06, wh + .12], [ww / 2 + .03, 0, .06, wh + .12], [0, 0, .035, wh], [-.0, .42, ww, .03]] as number[][]).map(([x, y, w, h], i) => (
          <RBox key={i} size={[w, h, .09]} radius={.006} color={TRIM} position={[x, y, 0]} />
        ))}
        <RBox size={[ww + .1, .04, .17]} radius={.012} color={TRIM} position={[0, -wh / 2 - .08, .05]} />
      </group>
      <RBox size={[left + 3.2, .12, .025]} radius={.004} color={TRIM} position={[(left - 3.2) / 2, .06, BACK_Z + .012]} />
      <RBox size={[3.2 - right, .12, .025]} radius={.004} color={TRIM} position={[(right + 3.2) / 2, .06, BACK_Z + .012]} />

      <Curtain position={[left - .14, 1.36, BACK_Z + .18]} width={.5} height={2.72} color="#A99C86" depth={.026} />
      <Curtain position={[right + .14, 1.36, BACK_Z + .18]} width={.5} height={2.72} color="#A99C86" depth={.026} />
      <mesh position={[wx, 2.68, BACK_Z + .18]} rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[.014, .014, ww + 1.2, 16]} /><meshStandardMaterial color={BRASS} roughness={.35} metalness={.8} /></mesh>

      <Books />
      <FloorLamp />

      <mesh rotation={[-Math.PI / 2, 0, SOFA.yaw]} position={[-.12, .008, -.62]} receiveShadow><planeGeometry args={[3, 2.5]} /><meshStandardMaterial map={rug} normalMap={linenN} normalScale={new THREE.Vector2(.6, .6)} roughness={.98} /></mesh>

      {/* Khăn giấy và ly nước trên bàn, đúng đồ vật thường thấy ở phòng tham vấn */}
      <group position={[TABLE.x, .485, TABLE.z]} rotation={[0, .3, 0]}>
        <mesh castShadow position={[.14, .056, .1]}><cylinderGeometry args={[.036, .03, .112, 28]} /><meshPhysicalMaterial color="#E9F2F2" roughness={.06} transparent opacity={.38} /></mesh>
        <mesh position={[.14, .03, .1]}><cylinderGeometry args={[.031, .028, .05, 28]} /><meshStandardMaterial color="#C9DDE0" roughness={.08} transparent opacity={.5} /></mesh>
        <RBox size={[.23, .085, .12]} radius={.012} color="#EFE9DD" position={[-.08, .043, -.03]} rotation={[0, .4, 0]} />
        <RBox size={[.13, .012, .03]} radius={.004} color="#F9F7F1" position={[-.08, .09, -.03]} rotation={[0, .4, 0]} />
      </group>

      <Contact position={[SOFA.x, .014, SOFA.z]} size={[2, 1.2]} rotation={SOFA.yaw} opacity={.52} />
      <Contact position={[-.34, .014, -.2]} size={[.95, .95]} opacity={.26} />
      <Contact position={[-1.5, .012, -2.04]} size={[.8, .8]} opacity={.36} />
      <Contact position={[TABLE.x, .014, TABLE.z]} size={[.8, .8]} opacity={.32} />
      <Contact position={[1.36, .012, -1.92]} size={[.5, .5]} opacity={.3} />
      <Contact position={[2.2, .012, -2.2]} size={[1.5, .7]} opacity={.34} />

      <Furniture onReady={onReady} />
    </group>
  );
};
