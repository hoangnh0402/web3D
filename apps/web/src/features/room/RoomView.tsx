'use client';

import dynamic from 'next/dynamic';
import { Component, useEffect, useState, type ReactNode } from 'react';
import type { AvatarKey, Emotion } from '@lab-fourt/shared';

/** Ảnh dựng sẵn từ chính cảnh 3D, dùng cho chế độ nhẹ 2D và khi đang tải */
export const roomImage = (variant: AvatarKey, emotion: Emotion = 'NEUTRAL') =>
  variant === 'a' ? `/rooms/room-a-${emotion.toLowerCase()}.jpg` : `/rooms/room-${variant}-neutral.jpg`;

// Three.js chỉ chạy ở trình duyệt và nặng, nên chỉ tải khi trang thật sự cần phòng 3D
const Scene = dynamic(() => import('./Scene'), { ssr: false });

const Still = ({ variant, emotion, note }: { variant: AvatarKey; emotion: Emotion; note?: string }) => (
  <div className="scene-wrap" style={{ width: '100%', height: '100%', position: 'relative' }}>
    {/* eslint-disable-next-line @next/next/no-img-element -- ảnh tĩnh trong public, không cần tối ưu ảnh */}
    <img
      src={roomImage(variant, emotion)}
      alt="Phòng tham vấn và thân chủ, ảnh tĩnh"
      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
    />
    {note && (
      <p className="glass" role="status" style={{ position: 'absolute', left: 16, bottom: 16 }}>
        {note}
      </p>
    )}
  </div>
);

/** Lỗi trong Canvas không được làm hỏng phần còn lại của trang (FR-3D-08) */
class SceneBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

const hasWebGL2 = () => {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
    return !!gl;
  } catch {
    return false;
  }
};

/**
 * Phòng tham vấn 3D, tự chuyển sang ảnh tĩnh khi thiết bị không có WebGL 2 hoặc mất ngữ cảnh đồ họa.
 * Hội thoại không phụ thuộc thành phần này.
 */
export const RoomView = ({ variant, emotion }: { variant: AvatarKey; emotion: Emotion }) => {
  const [mode, setMode] = useState<'checking' | '3d' | 'lite'>('checking');
  const [lost, setLost] = useState(false);

  useEffect(() => {
    // Chỉ dò được WebGL sau khi đã ở trình duyệt
    // eslint-disable-next-line react-hooks/set-state-in-effect -- đọc khả năng thiết bị một lần sau khi mount
    setMode(hasWebGL2() ? '3d' : 'lite');
  }, []);

  if (mode === 'checking') return <Still variant={variant} emotion={emotion} />;
  if (mode === 'lite' || lost) {
    return (
      <Still
        variant={variant}
        emotion={emotion}
        note={lost ? 'Đồ họa 3D gặp sự cố, đã chuyển sang chế độ nhẹ.' : 'Thiết bị không hỗ trợ WebGL 2, đang dùng chế độ nhẹ.'}
      />
    );
  }
  return (
    <SceneBoundary fallback={<Still variant={variant} emotion={emotion} note="Không mở được phòng 3D, đang dùng chế độ nhẹ." />}>
      <Scene variant={variant} emotion={emotion} activity="idle" poster={roomImage(variant, emotion)} onLost={() => setLost(true)} />
    </SceneBoundary>
  );
};
