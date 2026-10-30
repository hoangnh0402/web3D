import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import type { Emotion } from '../data';
import type { Variant } from './assets';
import { Avatar } from './Avatar';
import type { Activity } from './rig';
import { RoomSet, SEAT } from './RoomSet';

export type { Activity };

// Máy quay đặt ngang tầm mắt người tham vấn đang ngồi, chếch sang trái so với thân chủ
const CAM: [number, number, number] = [-.72, 1.14, 1.5];
const SUBJECT = new THREE.Vector3(SEAT.x - .16, 1.0, SEAT.z);
// Khung hình cần chứa được bề ngang này ở khoảng cách của nhân vật
const FRAME_WIDTH = 2;
const MAX_YAW = .3, MAX_PITCH = .1;

const CameraRig = ({ yawRef, pitchRef }: { yawRef: React.RefObject<number>; pitchRef: React.RefObject<number> }) => {
  const { camera, size } = useThree();
  const cur = useRef({ y: 0, p: 0 });
  const aspect = size.width / size.height;
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const dist = new THREE.Vector3(...CAM).distanceTo(SUBJECT);
    const fit = 2 * THREE.MathUtils.radToDeg(Math.atan(FRAME_WIDTH / 2 / dist / aspect));
    cam.fov = Math.min(Math.max(30, fit), 58);
    cam.position.set(...CAM);
    cam.updateProjectionMatrix();
  }, [camera, aspect]);
  const base = useMemo(() => {
    const d = SUBJECT.clone().sub(new THREE.Vector3(...CAM));
    return { yaw: Math.atan2(d.x, -d.z), pitch: Math.atan2(d.y, Math.hypot(d.x, d.z)) };
  }, []);
  useFrame((_, dt) => {
    const k = 1 - Math.exp(-dt * 6);
    cur.current.y += (yawRef.current - cur.current.y) * k;
    cur.current.p += (pitchRef.current - cur.current.p) * k;
    const yaw = base.yaw + cur.current.y, pitch = base.pitch + cur.current.p;
    camera.lookAt(CAM[0] + Math.sin(yaw) * Math.cos(pitch), CAM[1] + Math.sin(pitch), CAM[2] - Math.cos(yaw) * Math.cos(pitch));
  });
  return null;
};

// Môi trường phản chiếu dựng riêng theo đúng căn phòng: tường ấm, mảng trời sáng ở phía cửa sổ, ánh đèn ở phía đối diện.
// Nhờ vậy da và vải nhận ánh sáng có hướng, thay vì xám đều như RoomEnvironment mặc định.
const roomProbe = () => {
  const scene = new THREE.Scene();
  const box = (color: THREE.ColorRepresentation, size: [number, number, number], position: [number, number, number], intensity = 1, side: THREE.Side = THREE.FrontSide) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(...size), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side }));
    m.position.set(...position);
    scene.add(m);
  };
  box('#B6A48F', [8, 4, 8], [0, 1.4, 0], .62, THREE.BackSide);
  box('#8F7558', [8, .1, 8], [0, -.6, 0], .5);
  box('#F2EEE6', [8, .1, 8], [0, 3.3, 0], .85);
  box('#EAF1F6', [.1, 2.6, 4.4], [-3.9, 1.6, .5], 11);
  box('#E8F0E6', [2.6, 2.4, .1], [-1.8, 1.6, -3.9], 5.5);
  box('#FFC98E', [.8, .8, .8], [2.6, 1.6, -2], 5);
  return scene;
};

const Environment = () => {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(roomProbe(), .03).texture;
    scene.environment = env;
    scene.environmentIntensity = .62;
    return () => { env.dispose(); pmrem.dispose(); };
  }, [gl, scene]);
  return null;
};

// Che khuất môi trường (GTAO) làm đồ vật có khối và bám vào nhau. Chỉ bật ở mức chất lượng cao.
const Effects = () => {
  const { gl, scene, camera, size } = useThree();
  const composer = useMemo(() => {
    const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
    const c = new EffectComposer(gl, target);
    c.addPass(new RenderPass(scene, camera));
    const ao = new GTAOPass(scene, camera, 1, 1);
    ao.blendIntensity = .9;
    ao.updateGtaoMaterial({ radius: .3, distanceExponent: 1.6, thickness: 1, scale: 1.15, samples: 12, distanceFallOff: 1, screenSpaceRadius: false });
    ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 3, radiusExponent: 1.5, rings: 2, samples: 12 });
    c.addPass(ao);
    c.addPass(new OutputPass());
    return c;
  }, [gl, scene, camera]);
  useEffect(() => {
    composer.setPixelRatio(gl.getPixelRatio());
    composer.setSize(size.width, size.height);
  }, [composer, gl, size]);
  useEffect(() => () => composer.dispose(), [composer]);
  useFrame((_, dt) => composer.render(dt), 1);
  return null;
};

export interface SceneProps {
  variant: Variant; emotion: Emotion; activity: Activity; poster?: string; onLost?: () => void; onFps?: (fps: number) => void;
}

const FpsProbe = ({ onFps, onLow }: { onFps?: (fps: number) => void; onLow: () => void }) => {
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
      const fps = a.n / a.t;
      if (fps < 30) onLow();
      onFps?.(fps);
      acc.current = { t: 0, n: 0, warmup: 0, long: 0 };
    }
  });
  return null;
};

export default function Scene({ variant, emotion, activity, poster, onLost, onFps }: SceneProps) {
  const yaw = useRef(0), pitch = useRef(0);
  const drag = useRef<{ x: number; y: number; yaw: number; pitch: number } | null>(null);
  const [loaded, setLoaded] = useState({ room: false, cast: false });
  const small = typeof window !== 'undefined' && window.innerWidth < 700;
  const [high, setHigh] = useState(!small);
  const clamp = (v: number, m: number) => Math.max(-m, Math.min(m, v));
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
        yaw.current = clamp(drag.current.yaw + (e.clientX - drag.current.x) * .0018, MAX_YAW);
        pitch.current = clamp(drag.current.pitch - (e.clientY - drag.current.y) * .0014, MAX_PITCH);
      }}
      onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}
      onKeyDown={e => {
        const m: Record<string, () => void> = {
          ArrowLeft: () => { yaw.current = clamp(yaw.current - .05, MAX_YAW); }, ArrowRight: () => { yaw.current = clamp(yaw.current + .05, MAX_YAW); },
          ArrowUp: () => { pitch.current = clamp(pitch.current + .025, MAX_PITCH); }, ArrowDown: () => { pitch.current = clamp(pitch.current - .025, MAX_PITCH); },
        };
        if (m[e.key]) { e.preventDefault(); m[e.key](); }
      }}
    >
      <Canvas
        shadows={{ type: THREE.VSMShadowMap }} dpr={small ? [1, 1.5] : [1, 1.75]} camera={{ position: CAM, fov: 32, near: .1, far: 30 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.NeutralToneMapping;
          gl.toneMappingExposure = .86;
          gl.domElement.addEventListener('webglcontextlost', e => { e.preventDefault(); if (mounted.current) onLost?.(); });
        }}
      >
        <color attach="background" args={['#C9C3B6']} />
        <Environment />
        <hemisphereLight intensity={.22} color="#FFF4E4" groundColor="#8E7760" />
        {/* Ánh sáng chính từ cửa sổ bên trái, chiếu chếch vào mặt thân chủ */}
        <directionalLight
          position={[-3.6, 2.7, .9]} target-position={[SEAT.x, .9, SEAT.z]} intensity={2.4} color="#FFF6EC" castShadow
          shadow-mapSize-width={small ? 1024 : 2048} shadow-mapSize-height={small ? 1024 : 2048} shadow-camera-left={-3.4} shadow-camera-right={3.4}
          shadow-camera-top={3} shadow-camera-bottom={-3} shadow-camera-near={.5} shadow-camera-far={10} shadow-bias={-.0004} shadow-normalBias={.015} shadow-radius={9} shadow-blurSamples={14}
        />
        {/* Viền sáng dịu từ cửa sổ phía sau, tách tóc khỏi tường */}
        <directionalLight position={[-2, 2.2, -3]} intensity={.55} color="#E4EEF6" />
        <RoomSet onReady={() => setLoaded(l => ({ ...l, room: true }))} />
        <Avatar variant={variant} emotion={emotion} activity={activity} onReady={() => setLoaded(l => ({ ...l, cast: true }))} onFail={() => onLost?.()} />
        <CameraRig yawRef={yaw} pitchRef={pitch} />
        {high && <Effects />}
        <FpsProbe onFps={onFps} onLow={() => setHigh(false)} />
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
