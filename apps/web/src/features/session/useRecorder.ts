'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/** Thứ tự định dạng theo docs/srs/06 mục 5.3: Safari cũ không ghi được WebM */
const TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
export const MAX_RECORD_SECONDS = 120;

export type MicProblem = 'denied' | 'unavailable' | 'insecure' | null;

/**
 * Ghi âm kiểu nhấn để nói, nhấn để dừng (FR-CONV-02). Ghi xong mới gửi lên, âm thanh không lưu ở trình duyệt.
 * Phải bắt đầu từ thao tác của người dùng vì iOS chặn ghi âm tự động.
 */
export const useRecorder = (onAudio: (blob: Blob) => void) => {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [problem, setProblem] = useState<MicProblem>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const callback = useRef(onAudio);
  useEffect(() => {
    callback.current = onAudio;
  });

  const stopTracks = () => recorder.current?.stream.getTracks().forEach((t) => t.stop());

  const stop = useCallback(() => {
    window.clearInterval(timer.current);
    if (recorder.current?.state === 'recording') recorder.current.stop();
    setRecording(false);
  }, []);

  const start = useCallback(async () => {
    if (!window.isSecureContext) {
      setProblem('insecure');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setProblem('unavailable');
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch (err) {
      setProblem(err instanceof DOMException && err.name === 'NotFoundError' ? 'unavailable' : 'denied');
      return;
    }
    setProblem(null);
    const mimeType = TYPES.find((t) => MediaRecorder.isTypeSupported(t));
    const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    const chunks: BlobPart[] = [];
    rec.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
    };
    rec.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunks, { type: rec.mimeType || mimeType || 'audio/webm' });
      if (blob.size) callback.current(blob);
    };
    recorder.current = rec;
    rec.start();
    setSeconds(0);
    setRecording(true);
    timer.current = window.setInterval(() => {
      setSeconds((s) => {
        // Mỗi đoạn tối đa 120 giây (docs/srs/07 mục 5)
        if (s + 1 >= MAX_RECORD_SECONDS) stop();
        return s + 1;
      });
    }, 1000);
  }, [stop]);

  useEffect(
    () => () => {
      window.clearInterval(timer.current);
      stopTracks();
    },
    [],
  );

  return { recording, seconds, problem, start, stop };
};
