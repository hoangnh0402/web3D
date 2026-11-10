import type { MessageEvent } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { SessionEventsService } from './session-events.service';

const collect = (service: SessionEventsService, id: string, last?: string) => {
  const got: MessageEvent[] = [];
  const sub = service.stream(id, last).subscribe((e) => got.push(e));
  return { got, stop: () => sub.unsubscribe() };
};

describe('SessionEventsService', () => {
  it('đánh số sự kiện tăng dần theo từng phiên', () => {
    const s = new SessionEventsService();
    const a = collect(s, 'a');
    s.emit('a', { type: 'busy', busy: true });
    s.emit('b', { type: 'busy', busy: true });
    s.emit('a', { type: 'delta', text: 'Dạ' });
    expect(a.got.map((e) => e.id)).toEqual(['1', '2']);
    expect(a.got[1]).toMatchObject({ type: 'delta', data: { text: 'Dạ' } });
    a.stop();
  });

  it('kết nối lại với Last-Event-ID chỉ nhận bù các sự kiện đã lỡ (FR-SES-06)', () => {
    const s = new SessionEventsService();
    s.emit('a', { type: 'delta', text: 'một ' });
    s.emit('a', { type: 'delta', text: 'hai ' });
    s.emit('a', { type: 'delta', text: 'ba' });
    const again = collect(s, 'a', '1');
    expect(again.got.map((e) => (e.data as { text: string }).text)).toEqual(['hai ', 'ba']);
    s.emit('a', { type: 'busy', busy: false });
    expect(again.got).toHaveLength(3);
    again.stop();
  });

  it('không phát lại khi kết nối lần đầu', () => {
    const s = new SessionEventsService();
    s.emit('a', { type: 'busy', busy: true });
    const first = collect(s, 'a');
    expect(first.got).toHaveLength(0);
    first.stop();
  });
});
