/** Chuẩn hóa để so khớp trích dẫn: bỏ dấu câu, khoảng trắng thừa, ngoặc kép, dấu ba chấm, không phân biệt hoa thường */
export const normalize = (text: string) =>
  text
    .normalize('NFC')
    .toLocaleLowerCase('vi')
    .replace(/[“”"'‘’«»…]/g, ' ')
    .replace(/[.,!?;:()[\]{}–—-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Trích dẫn quá ngắn thì dễ khớp ngẫu nhiên nên không chấp nhận */
const MIN_QUOTE = 4;

/**
 * Dẫn chứng chỉ hợp lệ khi trích đúng nội dung của lượt seq trong transcript (FR-RPT-06, docs/srs/07 mục 4).
 * Trả về trích dẫn đã cắt khoảng trắng, hoặc null nếu không khớp.
 */
export const verifyEvidence = (
  evidence: { seq: number; quote: string },
  transcript: Map<number, { id: string; content: string }>,
): { messageId: string; seq: number; quote: string } | null => {
  const message = transcript.get(evidence.seq);
  const quote = evidence.quote.trim();
  const needle = normalize(quote);
  if (!message || needle.length < MIN_QUOTE) return null;
  return normalize(message.content).includes(needle) ? { messageId: message.id, seq: evidence.seq, quote } : null;
};
