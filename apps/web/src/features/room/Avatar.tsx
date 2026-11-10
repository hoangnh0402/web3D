'use client';

import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Emotion } from '@lab-fourt/shared';
import { loadCast, Variant } from './assets';
import { Activity, Rig } from './rig';
import { SEAT, SEAT_HIP } from './layout';

// Nhân vật: VALID (MIT) cho Hà Linh, Microsoft Rocketbox (MIT) cho hai thân chủ còn lại. Xem tools/ để dựng lại.

// Tường ấm trong phòng hắt lên làm da ngả cam, nên bù một chút màu lạnh
const SKIN_TINT = new THREE.Color(.95, .97, 1.08);

// Da người hơi mờ: lớp sheen ấm giả tán xạ dưới da, giảm phản xạ trắng để da không giống nhựa
const dressSkin = (mesh: THREE.Mesh) => {
  const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  const dressed = mats.map(m => {
    const s = m as THREE.MeshStandardMaterial;
    if ((m as THREE.MeshPhysicalMaterial).isMeshPhysicalMaterial) return m;
    if (s.name === 'hair') {
      // Tóc cắt alpha cứng. Alpha-to-coverage để lộ ảnh nền sáng qua khe các mảng tóc thành những vệt trắng.
      s.alphaTest = .18;
      s.roughness = .85;
      s.envMapIntensity = .45;
      return s;
    }
    if (s.name !== 'head') { s.roughness = Math.max(s.roughness, .82); s.envMapIntensity = .8; s.color.copy(SKIN_TINT); return s; }
    return new THREE.MeshPhysicalMaterial({
      name: 'head', color: SKIN_TINT, map: s.map, normalMap: s.normalMap, normalScale: new THREE.Vector2(.7, .7), roughnessMap: s.roughnessMap, roughness: 1, metalness: 0,
      sheen: .3, sheenColor: new THREE.Color('#FFC4B0'), sheenColorMap: s.map, sheenRoughness: .62, specularIntensity: .5, envMapIntensity: 1,
    });
  });
  mesh.material = Array.isArray(mesh.material) ? dressed : dressed[0];
};

// VALID gộp da và quần áo trong một vật liệu, nên chỉ hạ độ bóng chung để da không giống nhựa và tóc không lóa
const dressValid = (mesh: THREE.Mesh) => {
  (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach(m => {
    const s = m as THREE.MeshStandardMaterial;
    s.roughness = s.name === 'Hair' ? .75 : .72;
    s.envMapIntensity = s.name === 'Hair' ? .5 : .85;
    // Bù nhẹ màu lạnh vì tường và đèn ấm làm da ngả cam
    if (s.name !== 'Hair') s.color.setRGB(.96, .96, 1.03);
    // Mặt sau của da ở viền hàm bắt đèn thành vệt chấm sáng. Tóc là lớp vỏ mỏng nên vẫn cần vẽ cả mặt trong.
    s.side = s.name === 'Hair' ? THREE.DoubleSide : THREE.FrontSide;
  });
};

export const Avatar = ({ variant, emotion, activity, onReady, onFail }: { variant: Variant; emotion: Emotion; activity: Activity; onReady: () => void; onFail: () => void }) => {
  const [cast, setCast] = useState<{ scene: THREE.Group; rig: Rig } | null>(null);
  const seat = useRef<THREE.Group>(null);
  const state = useRef({ emotion, activity });
  state.current = { emotion, activity };

  useEffect(() => {
    let alive = true;
    let rig: Rig | null = null;
    loadCast(variant).then(c => {
      if (!alive) return;
      c.scene.traverse(o => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.frustumCulled = false;
        if (c.kit === 'valid') dressValid(mesh);
        else dressSkin(mesh);
      });
      rig = new Rig(c.scene, c.clips, c.height, SEAT_HIP, c.kit);
      setCast({ scene: c.scene, rig });
      onReady();
    }).catch(onFail);
    return () => { alive = false; rig?.dispose(); };
    // Chỉ tải lại mô hình khi đổi thân chủ. Callback của cha đổi mỗi lần render, đưa vào đây sẽ tải lại liên tục.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant]);

  useFrame(({ camera, clock }, dt) => {
    if (cast && seat.current) cast.rig.update(dt, clock.elapsedTime, state.current.emotion, state.current.activity, seat.current, camera.position);
  });

  return (
    <group ref={seat} position={[SEAT.x, 0, SEAT.z]} rotation={[0, SEAT.yaw, 0]}>
      {cast && <group position={cast.rig.offset} scale={cast.rig.scale}><primitive object={cast.scene} /></group>}
    </group>
  );
};
