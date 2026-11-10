import { describe, expect, it } from 'vitest';
import { normalize, verifyEvidence } from './evidence';

const transcript = new Map([
  [2, { id: 'm2', content: 'Chào em, hôm nay em muốn chia sẻ điều gì?' }],
  [4, { id: 'm4', content: 'Nghe em kể, có vẻ em đang rất LO lắng.' }],
]);

describe('verifyEvidence', () => {
  it('chấp nhận trích dẫn đúng lượt, bỏ qua hoa thường và dấu câu', () => {
    expect(verifyEvidence({ seq: 4, quote: '“có vẻ em đang rất lo lắng”' }, transcript)).toMatchObject({ messageId: 'm4', seq: 4 });
    expect(verifyEvidence({ seq: 2, quote: 'hôm nay em muốn chia sẻ' }, transcript)?.messageId).toBe('m2');
  });

  it('loại trích dẫn bịa hoặc gắn sai lượt (AT-11)', () => {
    expect(verifyEvidence({ seq: 2, quote: 'Em hãy cố gắng hơn nữa' }, transcript)).toBeNull();
    expect(verifyEvidence({ seq: 2, quote: 'có vẻ em đang rất lo lắng' }, transcript)).toBeNull();
    expect(verifyEvidence({ seq: 99, quote: 'hôm nay em muốn chia sẻ' }, transcript)).toBeNull();
  });

  it('loại trích dẫn quá ngắn', () => {
    expect(verifyEvidence({ seq: 2, quote: 'em' }, transcript)).toBeNull();
  });

  it('chuẩn hóa giữ nguyên dấu tiếng Việt', () => {
    expect(normalize('  Thấu   CẢM… ')).toBe('thấu cảm');
  });
});
