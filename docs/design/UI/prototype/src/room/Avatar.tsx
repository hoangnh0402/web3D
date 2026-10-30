import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Emotion } from '../data';
import { loadCast, Variant } from './assets';
import { Activity, Rig } from './rig';
import { SEAT, SEAT_HIP } from './RoomSet';

// Nhân vật: Microsoft Rocketbox (MIT). Xem tools/ để dựng lại.

// Da người hơi mờ: lớp sheen ấm giả tán xạ dưới da, giảm phản xạ trắng để da không giống nhựa
const dressSkin = (mesh: THREE.Mesh) => {
  const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  const dressed = mats.map(m => {
    const s = m as THREE.MeshStandardMaterial;
    if ((m as THREE.MeshPhysicalMaterial).isMeshPhysicalMaterial) return m;
    if (s.name === 'hair') {
      // Alpha-to-coverage cho mép tóc mềm hơn nhiều so với cắt alpha cứng
      s.alphaTest = .32;
      s.alphaToCoverage = true;
      s.roughness = .85;
      s.envMapIntensity = .45;
      return s;
    }
    if (s.name !== 'head') { s.roughness = Math.max(s.roughness, .82); s.envMapIntensity = .8; return s; }
    return new THREE.MeshPhysicalMaterial({
      name: 'head', map: s.map, normalMap: s.normalMap, normalScale: new THREE.Vector2(.7, .7), roughnessMap: s.roughnessMap, roughness: 1, metalness: 0,
      sheen: .3, sheenColor: new THREE.Color('#FFC4B0'), sheenColorMap: s.map, sheenRoughness: .62, specularIntensity: .5, envMapIntensity: 1,
    });
  });
  mesh.material = Array.isArray(mesh.material) ? dressed : dressed[0];
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
        // Bóng VSM tự đổ lên mô hình có da gây vệt tối ở mặt, nên nhân vật chỉ đổ bóng ra môi trường
        mesh.castShadow = true; mesh.receiveShadow = false; mesh.frustumCulled = false;
        dressSkin(mesh);
      });
      rig = new Rig(c.scene, c.clips, c.height, SEAT_HIP);
      setCast({ scene: c.scene, rig });
      onReady();
    }).catch(onFail);
    return () => { alive = false; rig?.dispose(); };
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
