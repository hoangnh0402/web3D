import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { Emotion } from '../data';
import type { Variant } from './assets';
import plate from '../assets/3d/room-plate.webp';
import probe from '../assets/3d/room-probe.bin';
import { Avatar } from './Avatar';
import { CAM, LOOK, PLATE } from './layout';
import type { Activity } from './rig';

export type { Activity };

// Khung hình cần chứa được bề ngang này ở khoảng cách của nhân vật
const FRAME_WIDTH = 2;
const DIST = new THREE.Vector3(...CAM).distanceTo(new THREE.Vector3(...LOOK));
const MAX_YAW = .3, MAX_PITCH = .1;
const rad = THREE.MathUtils.degToRad;

// Hướng máy quay lúc dựng ảnh nền. Camera nhìn theo trục -z, nên dựng một camera tạm để lấy đúng hướng.
const base = new THREE.PerspectiveCamera();
base.position.set(...CAM);
base.lookAt(...LOOK);

// Góc lệch tối đa để khung nhìn luôn nằm gọn trong ảnh nền
const limits = (fov: number, aspect: number) => {
  const half = rad(fov) / 2, halfH = Math.atan(Math.tan(half) * aspect);
  return { yaw: Math.max(0, Math.min(MAX_YAW, rad(PLATE.hfov) / 2 - halfH - .04)), pitch: Math.max(0, Math.min(MAX_PITCH, rad(PLATE.vfov) / 2 - half - .04)) };
};

const CameraRig = ({ yawRef, pitchRef, range }: { yawRef: React.RefObject<number>; pitchRef: React.RefObject<number>; range: React.RefObject<{ yaw: number; pitch: number }> }) => {
  const { camera, size } = useThree();
  const cur = useRef({ y: 0, p: 0 });
  const aspect = size.width / size.height;
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const fit = 2 * THREE.MathUtils.radToDeg(Math.atan(FRAME_WIDTH / 2 / DIST / aspect));
    cam.fov = Math.min(Math.max(30, fit), 58);
    cam.position.set(...CAM);
    cam.updateProjectionMatrix();
    range.current = limits(cam.fov, aspect);
  }, [camera, aspect, range]);
  const turn = useMemo(() => ({ euler: new THREE.Euler(0, 0, 0, 'YXZ'), quat: new THREE.Quaternion() }), []);
  useFrame((_, dt) => {
    const k = 1 - Math.exp(-dt * 6), r = range.current;
    const yaw = Math.max(-r.yaw, Math.min(r.yaw, yawRef.current)), pitch = Math.max(-r.pitch, Math.min(r.pitch, pitchRef.current));
    cur.current.y += (yaw - cur.current.y) * k;
    cur.current.p += (pitch - cur.current.p) * k;
    turn.euler.set(cur.current.p, -cur.current.y, 0);
    camera.quaternion.copy(base.quaternion).multiply(turn.quat.setFromEuler(turn.euler));
  });
  return null;
};

// Ảnh căn phòng dựng sẵn bằng path tracing, đặt đúng mặt phẳng ảnh của máy quay lúc dựng.
// Máy chỉ xoay tại chỗ nên phối cảnh giữ đúng ở mọi góc nhìn.
const PLATE_DIST = 14;
const Backplate = ({ onReady }: { onReady: () => void }) => {
  const { gl } = useThree();
  const [map, setMap] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    let alive = true;
    new THREE.TextureLoader().loadAsync(plate).then(t => {
      if (!alive) return;
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = gl.capabilities.getMaxAnisotropy();
      setMap(t);
      onReady();
    });
    return () => { alive = false; };
  }, [gl]);
  const w = 2 * PLATE_DIST * Math.tan(rad(PLATE.hfov) / 2), h = 2 * PLATE_DIST * Math.tan(rad(PLATE.vfov) / 2);
  const position = new THREE.Vector3(0, 0, -PLATE_DIST).applyQuaternion(base.quaternion).add(base.position);
  if (!map) return null;
  return <mesh position={position} quaternion={base.quaternion} renderOrder={-1}><planeGeometry args={[w, h]} /><meshBasicMaterial map={map} toneMapped={false} depthWrite={false} depthTest={false} /></mesh>;
};

// Ánh sáng thật đo tại chỗ ngồi của nhân vật, cùng lần dựng với ảnh nền, nên nhân vật hòa vào căn phòng.
const PROBE = { w: 256, h: 128 };
// Cùng cân bằng trắng với ảnh nền trong tools/grade-plate.py
const WHITE = [1.02, .95, 1.06];
const Environment = () => {
  const { gl, scene } = useThree();
  useEffect(() => {
    let alive = true;
    let env: THREE.Texture | null = null;
    fetch(probe).then(r => r.arrayBuffer()).then(buf => {
      if (!alive) return;
      const src = new Uint16Array(buf), data = new Float32Array(PROBE.w * PROBE.h * 4);
      for (let i = 0; i < PROBE.w * PROBE.h; i++) {
        for (let c = 0; c < 3; c++) { const v = src[i * 3 + c] / 65535; data[i * 4 + c] = v * v * 64 * WHITE[c]; }
        data[i * 4 + 3] = 1;
      }
      const hdr = new THREE.DataTexture(data, PROBE.w, PROBE.h, THREE.RGBAFormat, THREE.FloatType);
      hdr.mapping = THREE.EquirectangularReflectionMapping;
      hdr.minFilter = hdr.magFilter = THREE.LinearFilter;
      hdr.needsUpdate = true;
      const pmrem = new THREE.PMREMGenerator(gl);
      env = pmrem.fromEquirectangular(hdr).texture;
      scene.environment = env;
      scene.environmentIntensity = 1.5;
      hdr.dispose();
      pmrem.dispose();
    });
    return () => { alive = false; env?.dispose(); scene.environment = null; };
  }, [gl, scene]);
  return null;
};

export interface SceneProps {
  variant: Variant; emotion: Emotion; activity: Activity; poster?: string; onLost?: () => void; onFps?: (fps: number) => void;
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
    if (a.t >= 2) {
      onFps?.(a.n / a.t);
      acc.current = { t: 0, n: 0, warmup: 0, long: 0 };
    }
  });
  return null;
};

export default function Scene({ variant, emotion, activity, poster, onLost, onFps }: SceneProps) {
  const yaw = useRef(0), pitch = useRef(0), range = useRef({ yaw: MAX_YAW, pitch: MAX_PITCH });
  const drag = useRef<{ x: number; y: number; yaw: number; pitch: number } | null>(null);
  const [loaded, setLoaded] = useState({ room: false, cast: false });
  const small = typeof window !== 'undefined' && window.innerWidth < 700;
  const clampYaw = (v: number) => Math.max(-range.current.yaw, Math.min(range.current.yaw, v));
  const clampPitch = (v: number) => Math.max(-range.current.pitch, Math.min(range.current.pitch, v));
  const ready = loaded.room && loaded.cast;
  // Khi tháo Canvas, thư viện tự làm mất WebGL context để giải phóng GPU. Đó không phải lỗi đồ họa nên không được báo.
  const mounted = useRef(true);
  useLayoutEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  return (
    <div
      className="scene-wrap" style={{ width: '100%', height: '100%' }} tabIndex={0} role="application" data-ready={ready || undefined}
      aria-label="Phòng tham vấn 3D. Dùng phím mũi tên hoặc kéo chuột để xoay góc nhìn."
      onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); drag.current = { x: e.clientX, y: e.clientY, yaw: yaw.current, pitch: pitch.current }; }}
      onPointerMove={e => {
        if (!drag.current) return;
        yaw.current = clampYaw(drag.current.yaw + (e.clientX - drag.current.x) * .0018);
        pitch.current = clampPitch(drag.current.pitch - (e.clientY - drag.current.y) * .0014);
      }}
      onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}
      onKeyDown={e => {
        const m: Record<string, () => void> = {
          ArrowLeft: () => { yaw.current = clampYaw(yaw.current - .05); }, ArrowRight: () => { yaw.current = clampYaw(yaw.current + .05); },
          ArrowUp: () => { pitch.current = clampPitch(pitch.current + .025); }, ArrowDown: () => { pitch.current = clampPitch(pitch.current - .025); },
        };
        if (m[e.key]) { e.preventDefault(); m[e.key](); }
      }}
    >
      <Canvas
        dpr={small ? [1, 1.5] : [1, 2]} camera={{ position: CAM, fov: 32, near: .1, far: 30 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.NeutralToneMapping;
          gl.toneMappingExposure = 1;
          gl.domElement.addEventListener('webglcontextlost', e => { e.preventDefault(); if (mounted.current) onLost?.(); });
        }}
      >
        <color attach="background" args={['#B5AD9E']} />
        <Backplate onReady={() => setLoaded(l => ({ ...l, room: true }))} />
        <Environment />
        {/* Ánh sáng từ cửa sổ bên trái làm rõ khối khuôn mặt. Bóng của người đã nằm sẵn trong ảnh nền. */}
        <directionalLight position={[-3.2, 2.1, 1]} intensity={1.1} color="#FFF8F0" />
        <Avatar variant={variant} emotion={emotion} activity={activity} onReady={() => setLoaded(l => ({ ...l, cast: true }))} onFail={() => onLost?.()} />
        <CameraRig yawRef={yaw} pitchRef={pitch} range={range} />
        <FpsProbe onFps={onFps} />
      </Canvas>
      {!ready && <div className="scene-loading" style={poster ? { backgroundImage: `url(${poster})` } : undefined}><span className="glass">Đang chuẩn bị phòng tham vấn</span></div>}
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
