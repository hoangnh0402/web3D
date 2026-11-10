import { Injectable, type MessageEvent } from '@nestjs/common';
import { Observable } from 'rxjs';
import type { SessionEvent } from '@lab-fourt/shared';

interface Buffered {
  id: number;
  event: SessionEvent;
}

interface Channel {
  next: number;
  buffer: Buffered[];
  listeners: Set<(e: Buffered) => void>;
  touched: number;
}

const BUFFER = 300;
const IDLE_MS = 30 * 60_000;

const toMessage = ({ id, event }: Buffered): MessageEvent => {
  const { type, ...data } = event;
  return { id: String(id), type, data };
};

/**
 * Kênh sự kiện của từng phiên, giữ trong bộ nhớ vì hệ thống chạy một tiến trình API (docs/srs/06 mục 6).
 * Mỗi sự kiện có số thứ tự tăng dần. Trình duyệt kết nối lại sẽ gửi Last-Event-ID để nhận bù những gì đã lỡ.
 * Nếu API khởi động lại, bộ đệm mất nhưng mọi lời đã lưu trong CSDL; trình duyệt tải lại phiên để đồng bộ.
 */
@Injectable()
export class SessionEventsService {
  private readonly channels = new Map<string, Channel>();

  private channel(sessionId: string) {
    let ch = this.channels.get(sessionId);
    if (!ch) {
      ch = { next: 1, buffer: [], listeners: new Set(), touched: Date.now() };
      this.channels.set(sessionId, ch);
    }
    ch.touched = Date.now();
    return ch;
  }

  emit(sessionId: string, event: SessionEvent) {
    const ch = this.channel(sessionId);
    const item = { id: ch.next++, event };
    ch.buffer.push(item);
    if (ch.buffer.length > BUFFER) ch.buffer.shift();
    for (const listen of ch.listeners) listen(item);
    this.sweep();
  }

  /** Luồng sự kiện cho một kết nối SSE, phát lại các sự kiện có số thứ tự lớn hơn lastEventId */
  stream(sessionId: string, lastEventId?: string): Observable<MessageEvent> {
    return new Observable<MessageEvent>((sub) => {
      const ch = this.channel(sessionId);
      const after = Number(lastEventId);
      if (Number.isFinite(after) && after > 0) {
        for (const item of ch.buffer) if (item.id > after) sub.next(toMessage(item));
      }
      const listen = (item: Buffered) => sub.next(toMessage(item));
      ch.listeners.add(listen);
      // Giữ kết nối qua proxy và phát hiện mất kết nối sớm
      const ping = setInterval(() => sub.next({ type: 'ping', data: {} }), 20_000);
      return () => {
        clearInterval(ping);
        ch.listeners.delete(listen);
      };
    });
  }

  /** Dọn kênh lâu không dùng và không còn ai nghe */
  private sweep() {
    const now = Date.now();
    for (const [id, ch] of this.channels) {
      if (!ch.listeners.size && now - ch.touched > IDLE_MS) this.channels.delete(id);
    }
  }
}
