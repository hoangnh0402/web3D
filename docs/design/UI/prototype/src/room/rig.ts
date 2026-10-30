import * as THREE from 'three';
import type { Emotion } from '../data';

export type Activity = 'idle' | 'listening' | 'thinking' | 'responding';
type V3 = [number, number, number];

// Tư thế theo cảm xúc, tính trong hệ tọa độ của chỗ ngồi: x+ bên trái nhân vật, z+ phía trước, y tính từ sàn.
// Ngôn ngữ cơ thể mang phần lớn cảm xúc, nên mỗi trạng thái có chỗ đặt tay và độ nghiêng thân riêng.
interface Pose { left: V3; right: V3; aimL: V3; aimR: V3; lean: number; shoulders: number; contact: number; away: [number, number] }
const OUT: V3 = [.28, -.1, 1], IN: V3 = [-.85, -.1, .5];
const mirror = ([x, y, z]: V3): V3 => [-x, y, z];
const POSES: Record<Emotion, Pose> = {
  NEUTRAL: { left: [.09, .575, .22], right: [-.03, .595, .25], aimL: IN, aimR: mirror(IN), lean: .03, shoulders: 0, contact: .78, away: [.3, .12] },
  ANXIOUS: { left: [.04, .585, .25], right: [-.05, .605, .26], aimL: IN, aimR: mirror(IN), lean: .1, shoulders: .05, contact: .45, away: [.34, .28] },
  SAD: { left: [.07, .57, .21], right: [-.08, .58, .21], aimL: IN, aimR: mirror(IN), lean: .24, shoulders: -.03, contact: .28, away: [.16, .42] },
  TENSE: { left: [.17, .6, .34], right: [-.17, .6, .34], aimL: OUT, aimR: mirror(OUT), lean: .12, shoulders: .09, contact: .6, away: [.22, .08] },
  RELIEVED: { left: [.2, .59, .2], right: [-.13, .58, .25], aimL: OUT, aimR: mirror(OUT), lean: -.07, shoulders: -.03, contact: .86, away: [.26, .1] },
  HESITANT: { left: [.13, .58, .23], right: [.05, .6, .25], aimL: IN, aimR: mirror(IN), lean: .05, shoulders: .03, contact: .4, away: [.38, .2] },
};
const THINK_AWAY: [number, number] = [.42, -.16];

// Mỗi cảm xúc chọn một động tác ngồi có sẵn làm nền cho thân và đầu, phần tay do IK đảm nhiệm.
const CLIP: Record<Emotion, string> = { NEUTRAL: 'breathe', ANXIOUS: 'breathe', SAD: 'neutral', TENSE: 'waiting', RELIEVED: 'relaxed', HESITANT: 'breathe' };

const FACE: Record<Emotion, Record<string, number>> = {
  NEUTRAL: { MouthSmile: .06 },
  ANXIOUS: { BrowInnerUp: .6, MouthPress: .3, EyeWide: .18, MouthFrown: .08 },
  SAD: { BrowInnerUp: .85, MouthFrown: .5, EyeSquint: .22, CheekSquint: .08 },
  TENSE: { BrowDown: .5, MouthPress: .5, EyeSquint: .3 },
  RELIEVED: { MouthSmile: .5, CheekSquint: .3, EyeSquint: .15, BrowInnerUp: .12 },
  HESITANT: { BrowInnerUp: .4, MouthPress: .24, BrowOuterUp: .12, MouthDimple: .14 },
};
const FACE_KEYS = ['BrowInnerUp', 'BrowDown', 'BrowOuterUp', 'CheekSquint', 'EyeSquint', 'EyeWide', 'MouthPress', 'MouthFrown', 'MouthSmile', 'MouthDimple'];
// Khẩu hình tiếng Việt chủ yếu là các nguyên âm mở, xen phụ âm môi và răng.
const VISEMES = ['VI_10_aa', 'VI_11_E', 'VI_10_aa', 'VI_13_O', 'VI_08_nn', 'VI_12_I', 'VI_04_DD', 'VI_14_U', 'VI_01_PP', 'VI_10_aa', 'VI_07_SS', 'VI_11_E', 'VI_02_FF'];
const SYLLABLE = 1 / 5.2;

const q1 = new THREE.Quaternion(), q2 = new THREE.Quaternion();
const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), d = new THREE.Vector3(), e = new THREE.Vector3(), f = new THREE.Vector3();
const damp = (rate: number, dt: number) => 1 - Math.exp(-dt * rate);
const pos = (o: THREE.Object3D, out: THREE.Vector3) => out.setFromMatrixPosition(o.matrixWorld);

// Xoay một xương theo trục thế giới, chồng lên động tác đang chạy
const rotateWorld = (bone: THREE.Object3D, q: THREE.Quaternion) => {
  bone.parent!.getWorldQuaternion(q1);
  q2.copy(q1).invert().multiply(q).multiply(q1);
  bone.quaternion.premultiply(q2);
};
const turn = (bone: THREE.Object3D, axis: THREE.Vector3, angle: number) => {
  rotateWorld(bone, new THREE.Quaternion().setFromAxisAngle(axis, angle));
};
const aim = (bone: THREE.Object3D, from: THREE.Vector3, to: THREE.Vector3) => {
  rotateWorld(bone, new THREE.Quaternion().setFromUnitVectors(from.clone().normalize(), to.clone().normalize()));
  bone.updateMatrixWorld(true);
};

// IK hai đoạn cho tay và chân: khớp giữa nằm trên mặt phẳng hướng về điểm pole
const solve = (upper: THREE.Object3D, mid: THREE.Object3D, end: THREE.Object3D, target: THREE.Vector3, pole: THREE.Vector3) => {
  pos(upper, a); pos(mid, b); pos(end, c);
  const l1 = a.distanceTo(b), l2 = b.distanceTo(c);
  const dir = d.copy(target).sub(a);
  const dist = THREE.MathUtils.clamp(dir.length(), Math.abs(l1 - l2) + 1e-3, l1 + l2 - 1e-3);
  dir.normalize();
  const x = (l1 * l1 - l2 * l2 + dist * dist) / (2 * dist), h = Math.sqrt(Math.max(l1 * l1 - x * x, 0));
  const perp = e.copy(pole).sub(a);
  perp.addScaledVector(dir, -perp.dot(dir)).normalize();
  const joint = f.copy(a).addScaledVector(dir, x).addScaledVector(perp, h);
  aim(upper, b.clone().sub(a), joint.clone().sub(a));
  const reach = a.clone().addScaledVector(dir, dist);
  pos(mid, b); pos(end, c);
  aim(mid, c.clone().sub(b), reach.sub(b));
};

// Hai bàn chân lệch nhau một chút, ngồi đối xứng tuyệt đối trông như ma-nơ-canh
const FEET = { L: { x: .15, z: .44 }, R: { x: .09, z: .35 } };
const ANKLE = .095;
// Ngả hông về sau rồi bù lại ở cột sống tạo dáng ngồi thả lỏng trên sofa, hơi đổ trọng tâm sang một bên
const SLOUCH = .13, HIP_ROLL = .035, HEAD_TILT = .045;

export class Rig {
  readonly scale: number;
  offset: V3 = [0, 0, 0];
  private mixer: THREE.AnimationMixer;
  private actions: Record<string, THREE.AnimationAction>;
  private clip = '';
  private bones: Record<string, THREE.Object3D> = {};
  private morphs: Record<string, [THREE.Mesh, number][]> = {};
  private face: Record<string, number> = {};
  private restHead = new THREE.Vector3();
  private restEye = new THREE.Vector3();
  private blink = { next: 2, t: 0 };
  private hands = { l: new THREE.Vector3(), r: new THREE.Vector3(), aimL: new THREE.Vector3(), aimR: new THREE.Vector3(), lean: 0, shoulders: 0 };
  private gaze = { yaw: 0, pitch: 0, eyeYaw: 0, eyePitch: 0, wantYaw: 0, wantPitch: 0, next: 0 };
  private speech = { t: 0, viseme: '', value: 0, nod: 0, nodNext: 3 };
  private placed = false;
  private touched: { bone: THREE.Object3D; pose: THREE.Quaternion }[] = [];

  constructor(private root: THREE.Object3D, clips: THREE.AnimationClip[], height: number, hip: V3) {
    this.scale = height / 1.74 * .01;
    this.mixer = new THREE.AnimationMixer(root);
    this.actions = Object.fromEntries(clips.map(clip => [clip.name, this.mixer.clipAction(clip)]));
    root.traverse(o => {
      if (o.name.startsWith('Bip01_')) this.bones[o.name.slice(6)] = o;
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh && mesh.morphTargetDictionary) {
        Object.entries(mesh.morphTargetDictionary).forEach(([name, i]) => {
          [...FACE_KEYS, 'EyeBlink', ...VISEMES, 'JawOpen'].filter(k => name.includes(k)).forEach(k => { (this.morphs[k] ??= []).push([mesh, i]); });
        });
      }
    });

    const sides = ['Clavicle', 'UpperArm', 'Forearm', 'Hand', 'Thigh', 'Calf', 'Foot'].flatMap(n => [`L_${n}`, `R_${n}`]);
    this.touched = ['Pelvis', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head', 'REye', 'LEye', ...sides].map(n => ({ bone: this.bones[n], pose: new THREE.Quaternion() }));

    // Hướng nhìn thẳng của đầu và mắt, đo một lần lúc model còn ở tư thế gốc, nhân vật quay về trục z
    if (!root.userData.rest) {
      root.updateMatrixWorld(true);
      const forward = new THREE.Vector3(0, 0, 1);
      root.userData.rest = {
        head: forward.clone().applyQuaternion(this.bones.Head.getWorldQuaternion(new THREE.Quaternion()).invert()),
        eye: forward.clone().applyQuaternion(this.bones.REye.getWorldQuaternion(new THREE.Quaternion()).invert()),
      };
    }
    this.restHead.copy(root.userData.rest.head);
    this.restEye.copy(root.userData.rest.eye);

    // Đặt hông đúng vào mặt đệm ghế theo tư thế ngồi
    const pose = this.actions.breathe;
    pose.play();
    this.mixer.update(0);
    root.updateMatrixWorld(true);
    const pelvis = this.bones.Pelvis.getWorldPosition(new THREE.Vector3());
    this.offset = [hip[0] - pelvis.x * this.scale, hip[1] - pelvis.y * this.scale, hip[2] - pelvis.z * this.scale];
    pose.stop();
  }

  private setMorph(key: string, value: number) {
    this.morphs[key]?.forEach(([mesh, i]) => { mesh.morphTargetInfluences![i] = value; });
  }

  private play(name: string) {
    if (this.clip === name) return;
    const next = this.actions[name], prev = this.actions[this.clip];
    if (!next) return;
    next.reset().setLoop(THREE.LoopPingPong, Infinity).fadeIn(.9).play();
    prev?.fadeOut(.9);
    this.clip = name;
  }

  private animateFace(dt: number, emotion: Emotion, speaking: boolean) {
    const k = damp(4, dt), target = FACE[emotion];
    FACE_KEYS.forEach(n => {
      this.face[n] = (this.face[n] ?? 0) + ((target[n] ?? 0) - (this.face[n] ?? 0)) * k;
      // Khi đang nói, miệng do khẩu hình quyết định nên giảm các biểu cảm mím môi
      const mouth = speaking && (n === 'MouthPress' || n === 'MouthFrown') ? .35 : 1;
      this.setMorph(n, this.face[n] * mouth);
    });
    const bl = this.blink;
    bl.next -= dt;
    if (bl.next < 0) { bl.t = .17; bl.next = 2 + Math.random() * 3.8; }
    bl.t = Math.max(0, bl.t - dt);
    this.setMorph('EyeBlink', bl.t > 0 ? Math.sin((bl.t / .17) * Math.PI) : 0);
  }

  private animateSpeech(dt: number, speaking: boolean) {
    const s = this.speech;
    s.t -= dt;
    if (s.t <= 0) {
      s.t = SYLLABLE * (.75 + Math.random() * .6);
      // Thỉnh thoảng ngắt nhịp như lúc lấy hơi giữa các cụm từ
      const nextViseme = speaking && Math.random() > .12 ? VISEMES[Math.floor(Math.random() * VISEMES.length)] : '';
      if (s.viseme !== nextViseme) { if (s.viseme) this.setMorph(s.viseme, 0); s.value = 0; }
      s.viseme = nextViseme;
    }
    s.value += ((s.viseme ? .72 : 0) - s.value) * damp(22, dt);
    if (s.viseme) this.setMorph(s.viseme, s.value);
    this.setMorph('JawOpen', speaking ? s.value * .12 : 0);
  }

  private animateGaze(dt: number, pose: Pose, activity: Activity) {
    const g = this.gaze;
    g.next -= dt;
    if (g.next <= 0) {
      const contact = activity === 'thinking' ? 0 : activity === 'listening' ? Math.max(pose.contact, .85) : pose.contact;
      const away = activity === 'thinking' ? THINK_AWAY : pose.away;
      const look = Math.random() < contact;
      g.wantYaw = look ? 0 : away[0] * (Math.random() > .3 ? 1 : -.7) * (.7 + Math.random() * .3);
      g.wantPitch = look ? 0 : away[1];
      g.next = look ? 2 + Math.random() * 3.4 : .8 + Math.random() * 1.6;
    }
    g.eyeYaw += (g.wantYaw - g.eyeYaw) * damp(16, dt);
    g.eyePitch += (g.wantPitch - g.eyePitch) * damp(16, dt);
    g.yaw += (g.wantYaw * .7 - g.yaw) * damp(3, dt);
    g.pitch += (g.wantPitch * .7 - g.pitch) * damp(3, dt);
  }

  private lookAt(bone: THREE.Object3D, rest: THREE.Vector3, target: THREE.Vector3, weight: number) {
    const facing = rest.clone().applyQuaternion(bone.getWorldQuaternion(new THREE.Quaternion())).normalize();
    const want = target.clone().sub(pos(bone, a)).normalize();
    rotateWorld(bone, new THREE.Quaternion().setFromUnitVectors(facing, facing.clone().lerp(want, weight).normalize()));
    bone.updateMatrixWorld(true);
  }

  private orientHand(hand: THREE.Object3D, index: THREE.Object3D, middle: THREE.Object3D, pinky: THREE.Object3D, dir: THREE.Vector3, across: THREE.Vector3) {
    pos(hand, a); pos(middle, b);
    aim(hand, b.clone().sub(a), dir);
    pos(index, a); pos(pinky, b);
    const axis = dir.clone().normalize();
    const cur = b.clone().sub(a); cur.addScaledVector(axis, -cur.dot(axis)).normalize();
    const want = across.clone(); want.addScaledVector(axis, -want.dot(axis)).normalize();
    turn(hand, axis, Math.atan2(cur.clone().cross(want).dot(axis), cur.dot(want)));
    hand.updateMatrixWorld(true);
  }

  update(dt: number, t: number, emotion: Emotion, activity: Activity, seat: THREE.Object3D, camera: THREE.Vector3) {
    const speaking = activity === 'responding';
    this.play(activity === 'thinking' ? 'thoughtful' : CLIP[emotion]);
    // Mixer bỏ qua việc ghi lại khi giá trị clip không đổi, nên phải trả xương về đúng pose của clip trước khi cập nhật.
    // Nếu không, các phép xoay chồng thêm sẽ cộng dồn qua từng khung hình và nhân vật gập người dần.
    if (this.placed) this.touched.forEach(({ bone, pose }) => bone.quaternion.copy(pose));
    this.mixer.update(Math.min(dt, .1));
    this.touched.forEach(({ bone, pose }) => pose.copy(bone.quaternion));
    this.root.updateMatrixWorld(true);

    const pose = POSES[emotion], bones = this.bones, h = this.hands;
    const toWorld = (p: V3 | THREE.Vector3) => seat.localToWorld(Array.isArray(p) ? new THREE.Vector3(...p) : p.clone());
    const toDir = (v: THREE.Vector3) => v.clone().transformDirection(seat.matrixWorld);
    if (!this.placed) {
      h.l.set(...pose.left); h.r.set(...pose.right); h.aimL.set(...pose.aimL); h.aimR.set(...pose.aimR); h.lean = pose.lean; h.shoulders = pose.shoulders;
      this.placed = true;
    }
    const k = damp(2.6, dt);
    h.l.lerp(a.set(...pose.left), k); h.r.lerp(a.set(...pose.right), k);
    h.aimL.lerp(a.set(...pose.aimL), k); h.aimR.lerp(a.set(...pose.aimR), k);
    h.lean += (pose.lean + (activity === 'listening' ? .05 : 0) - h.lean) * k;
    h.shoulders += (pose.shoulders - h.shoulders) * k;

    const right = toDir(new THREE.Vector3(-1, 0, 0)), forward = toDir(new THREE.Vector3(0, 0, 1)), up = new THREE.Vector3(0, 1, 0);

    // Thân: nghiêng theo cảm xúc và nhịp thở
    const breath = Math.sin(t * 1.55);
    turn(bones.Pelvis, right, -SLOUCH);
    turn(bones.Pelvis, forward, HIP_ROLL);
    bones.Pelvis.updateMatrixWorld(true);
    turn(bones.Spine, right, SLOUCH * .45 + h.lean * .4);
    turn(bones.Spine1, right, SLOUCH * .3 + h.lean * .35);
    turn(bones.Spine1, forward, -HIP_ROLL * 1.6);
    turn(bones.Spine2, right, h.lean * .25 + breath * .009);
    bones.Spine.updateMatrixWorld(true);

    // Hai chân: bàn chân đặt trên sàn, đầu gối hơi mở
    (['L', 'R'] as const).forEach(side => {
      const sign = side === 'L' ? 1 : -1;
      const ankle = toWorld([sign * FEET[side].x, ANKLE, FEET[side].z]);
      const knee = toWorld([sign * .2, 1.1, .9]);
      solve(bones[`${side}_Thigh`], bones[`${side}_Calf`], bones[`${side}_Foot`], ankle, knee);
      const toe = bones[`${side}_Toe0`], foot = bones[`${side}_Foot`];
      const along = pos(toe, b).clone().sub(pos(foot, a));
      aim(foot, along, forward.clone().multiplyScalar(.9).addScaledVector(up, -.42).addScaledVector(right, -sign * .12));
    });

    // Hai tay: vai thả lỏng rồi đặt bàn tay vào vị trí của tư thế
    (['L', 'R'] as const).forEach(side => {
      const sign = side === 'L' ? 1 : -1;
      turn(bones[`${side}_Clavicle`], forward, sign * (-.1 + h.shoulders) * -1);
      bones[`${side}_Clavicle`].updateMatrixWorld(true);
      const sway = (side === 'L' ? Math.sin(t * .7) : Math.cos(t * .6)) * .004 + (emotion === 'ANXIOUS' ? Math.sin(t * 2.6 + sign) * .007 : 0);
      const target = toWorld((side === 'L' ? h.l : h.r).clone().add(a.set(sway, breath * .003, sway * .6)));
      const elbow = toWorld([sign * .42, .78, -.26]);
      solve(bones[`${side}_UpperArm`], bones[`${side}_Forearm`], bones[`${side}_Hand`], target, elbow);
      const dir = toDir((side === 'L' ? h.aimL : h.aimR).clone().normalize());
      const across = up.clone().cross(dir).normalize().multiplyScalar(sign);
      this.orientHand(bones[`${side}_Hand`], bones[`${side}_Finger1`], bones[`${side}_Finger2`], bones[`${side}_Finger4`], dir, across);
    });

    // Đầu và mắt hướng về người tham vấn, kèm các nhịp liếc đi theo trạng thái
    this.animateGaze(dt, pose, activity);
    const s = this.speech;
    s.nodNext -= dt;
    if (activity === 'listening' && s.nodNext < 0) { s.nod = 1; s.nodNext = 2.6 + Math.random() * 2.4; }
    s.nod = Math.max(0, s.nod - dt * 1.5);
    const talkBob = speaking ? Math.sin(t * 3.1) * .018 + Math.sin(t * 1.3) * .012 : 0;
    const nod = Math.sin(s.nod * Math.PI) * .07;
    const g = this.gaze;
    const headTarget = camera.clone().addScaledVector(right, g.yaw * 2.6).addScaledVector(up, -g.pitch * 2.6);
    this.lookAt(bones.Neck, this.restHead.clone().applyQuaternion(q1.copy(bones.Neck.getWorldQuaternion(new THREE.Quaternion())).invert().multiply(bones.Head.getWorldQuaternion(new THREE.Quaternion()))), headTarget, .35);
    this.lookAt(bones.Head, this.restHead, headTarget, .62);
    turn(bones.Head, right, nod + talkBob + Math.sin(t * .4) * .01);
    turn(bones.Head, up, Math.sin(t * .31) * .012);
    turn(bones.Head, forward, HEAD_TILT + Math.sin(t * .23) * .012);
    bones.Head.updateMatrixWorld(true);
    const eyeTarget = camera.clone().addScaledVector(right, g.eyeYaw * 2.6).addScaledVector(up, -g.eyePitch * 2.6);
    this.lookAt(bones.REye, this.restEye, eyeTarget, .9);
    this.lookAt(bones.LEye, this.restEye, eyeTarget, .9);

    this.animateFace(dt, emotion, speaking);
    this.animateSpeech(dt, speaking);
  }

  dispose() {
    this.mixer.stopAllAction();
  }
}
