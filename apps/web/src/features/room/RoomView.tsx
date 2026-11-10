'use client';

import dynamic from 'next/dynamic';
import { Component, useEffect, useState, type ReactNode } from 'react';
import type { AvatarKey, Emotion } from '@lab-fourt/shared';
import type { Activity } from './rig';

/** Ảnh dựng sẵn từ chính cảnh 3D, dùng cho chế độ nhẹ 2D, thẻ ca và khi đang tải */
export const roomImage = (variant: AvatarKey, emotion: Emotion = 'NEUTRAL') =>
  variant === 'a' ? `/rooms/room-a-${emotion.toLowerCase()}.jpg` : `/rooms/room-${variant}-neutral.jpg`;

// Three.js chỉ chạy ở trình duyệt và nặng, nên chỉ tải khi trang thật sự cần phòng 3D
const Scene = dynamic(() => import('./Scene'), { ssr: false });

export const RoomStill = ({ variant, emotion, label }: { variant: AvatarKey; emotion: Emotion; label?: string }) => (
  <div
    className="stage-2d"
    role="img"
    aria-label={label ?? 'Thân chủ trong phòng tham vấn, ảnh tĩnh'}
    style={{ backgroundImage: `url(${roomImage(variant, emotion)})` }}
  />
);

/** Lỗi trong Canvas không được làm hỏng phần còn lại của trang (FR-3D-08) */
class SceneBoundary extends Component<{ fallback: ReactNode; onError?: () => void; children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override componentDidCatch() {
    this.props.onError?.();
  }
  override render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

let webgl: boolean | undefined;
export const FORCE_LITE_KEY = 'lf.forceLite';
/** Dò WebGL 2 một lần rồi trả lại ngữ cảnh, vì trình duyệt giới hạn số ngữ cảnh WebGL */
export const hasWebGL2 = () => {
  if (webgl !== undefined) return webgl;
  try {
    // Ép chế độ nhẹ: dùng cho máy rất yếu và cho kiểm thử tự động, tránh dựng 3D bằng CPU
    if (localStorage.getItem(FORCE_LITE_KEY) === '1') return (webgl = false);
  } catch {
    // Không đọc được bộ nhớ trình duyệt thì dò WebGL như bình thường
  }
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
    webgl = !!gl;
  } catch {
    webgl = false;
  }
  return webgl;
};

/** Hook đọc khả năng WebGL sau khi đã ở trình duyệt. null là đang dò. */
export const useWebGL2 = () => {
  const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- đọc khả năng thiết bị một lần sau khi mount
    setOk(hasWebGL2());
  }, []);
  return ok;
};

/** Vùng hiển thị phòng tham vấn: 3D khi có thể, ảnh tĩnh khi chọn chế độ nhẹ hoặc 3D lỗi */
export const RoomStage = ({
  variant,
  emotion,
  activity = 'idle',
  view,
  onLost,
  onFps,
  label,
}: {
  variant: AvatarKey;
  emotion: Emotion;
  activity?: Activity;
  view: '3D' | '2D';
  onLost?: () => void;
  onFps?: (fps: number) => void;
  label?: string;
}) => {
  const still = <RoomStill variant={variant} emotion={emotion} label={label} />;
  if (view === '2D') return still;
  return (
    <SceneBoundary fallback={still} onError={onLost}>
      <Scene variant={variant} emotion={emotion} activity={activity} poster={roomImage(variant, emotion)} onLost={onLost} onFps={onFps} />
    </SceneBoundary>
  );
};

/** Phòng xem thử: tự chuyển sang ảnh tĩnh khi thiết bị không có WebGL 2 hoặc mất ngữ cảnh đồ họa */
export const RoomView = ({ variant, emotion }: { variant: AvatarKey; emotion: Emotion }) => {
  const webglOk = useWebGL2();
  const [lost, setLost] = useState(false);
  const view = webglOk && !lost ? '3D' : '2D';
  const note = webglOk === false ? 'Thiết bị không hỗ trợ WebGL 2, đang dùng chế độ nhẹ.' : lost ? 'Đồ họa 3D gặp sự cố, đã chuyển sang chế độ nhẹ.' : '';
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {webglOk === null ? <RoomStill variant={variant} emotion={emotion} /> : <RoomStage variant={variant} emotion={emotion} view={view} onLost={() => setLost(true)} />}
      {note && (
        <p className="glass" role="status" style={{ position: 'absolute', left: 16, bottom: 16 }}>
          {note}
        </p>
      )}
    </div>
  );
};
