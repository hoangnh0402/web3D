'use client';

import { useState } from 'react';
import { AVATAR_KEYS, EMOTIONS, EMOTION_LABELS, type AvatarKey, type Emotion } from '@lab-fourt/shared';
import { PageHead } from '@/components/ui';
import { RoomView } from '@/features/room/RoomView';

const CLIENTS: Record<AvatarKey, string> = { a: 'Hà Linh', b: 'Tuấn Kiệt', c: 'Mai Phương' };

/** Xem thử phòng tham vấn 3D với từng thân chủ và cảm xúc, trước khi có phiên thực hành thật */
export default function RoomPreviewPage() {
  const [variant, setVariant] = useState<AvatarKey>('a');
  const [emotion, setEmotion] = useState<Emotion>('NEUTRAL');

  return (
    <>
      <PageHead title="Xem thử phòng tham vấn" sub="Kéo chuột hoặc dùng phím mũi tên để xoay góc nhìn." />
      <div className="stack">
        <div className="chips" role="group" aria-label="Thân chủ">
          {AVATAR_KEYS.map((k) => (
            <button key={k} type="button" className="chip" aria-pressed={variant === k} onClick={() => setVariant(k)}>
              {CLIENTS[k]}
            </button>
          ))}
        </div>
        <div className="chips" role="group" aria-label="Cảm xúc">
          {EMOTIONS.map((e) => (
            <button key={e} type="button" className="chip" aria-pressed={emotion === e} onClick={() => setEmotion(e)}>
              {EMOTION_LABELS[e]}
            </button>
          ))}
        </div>
      </div>
      <section
        className="panel"
        data-testid="room-preview"
        style={{ padding: 0, overflow: 'hidden', aspectRatio: '16 / 10', position: 'relative' }}
      >
        {/* key buộc dựng lại khi đổi thân chủ để giải phóng mô hình cũ */}
        <RoomView key={variant} variant={variant} emotion={emotion} />
      </section>
    </>
  );
}
