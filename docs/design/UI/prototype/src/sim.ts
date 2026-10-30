// Bộ giả lập thay cho dịch vụ AI và STT trong buổi demo. Không gọi dịch vụ thật nào.
import { CaseItem, CaseLine, Msg, Report, Score, SKILLS, SkillCode } from './data';

export const RISK_LINE: CaseLine = {
  text: 'Có lúc em nghĩ giá mà mình biến mất một thời gian thì mọi người sẽ đỡ phiền hơn.',
  emotion: 'SAD',
};

const ADVICE = /(^|\s)(nên|phải cố|cần phải|hãy cố|cố gắng lên)(\s|$)/i;

// Chọn câu tiếp theo của thân chủ. Lời khuyên làm thân chủ thu lại, các câu khác đẩy kịch bản đi tiếp.
export const nextClientLine = (c: CaseItem, text: string, stage: number): { line: CaseLine; stage: number } => {
  if (ADVICE.test(text)) return { line: c.defensive, stage };
  if (stage < c.script.length) return { line: c.script[stage], stage: stage + 1 };
  return { line: c.closing, stage };
};

const RULES: { skill: SkillCode; re: RegExp; good: string; none: string }[] = [
  { skill: 'ACTIVE_LISTENING', re: /nghe|vừa kể|em nói/i, good: 'Người học phản hồi lại đúng điều thân chủ vừa nói.', none: 'Chưa có lượt phản hồi lại lời thân chủ để đánh giá.' },
  { skill: 'OPEN_QUESTIONS', re: /\?|thế nào|điều gì|ra sao/i, good: 'Người học dùng câu hỏi mở để thân chủ kể thêm.', none: 'Chưa có câu hỏi mở trong phiên.' },
  { skill: 'EMPATHY', re: /cảm thấy|lo|buồn|nặng|mệt|khó khăn/i, good: 'Người học ghi nhận cảm xúc của thân chủ.', none: 'Chưa có lượt ghi nhận cảm xúc.' },
  { skill: 'SUMMARIZING', re: /đúng không|tóm lại|như vậy là/i, good: 'Người học tóm tắt và kiểm tra lại với thân chủ.', none: 'Chưa có lượt tóm tắt.' },
  { skill: 'AUTONOMY', re: /quyết định|lựa chọn|ở em|em muốn/i, good: 'Người học để thân chủ tự lựa chọn hướng đi.', none: 'Chưa có tình huống để đánh giá kỹ năng này.' },
  { skill: 'ETHICS_SAFETY', re: /an toàn|giữ kín|bảo mật/i, good: 'Người học chú ý đến an toàn và giới hạn vai trò.', none: 'Phiên chưa có tình huống để đánh giá kỹ năng này.' },
];

// Tạo báo cáo minh họa từ chính lời sinh viên trong phiên, để dẫn chứng luôn là câu có thật.
export const buildReport = (messages: Msg[], c: CaseItem): Report => {
  const student = messages.filter(m => m.speaker === 'STUDENT');
  const advice = student.filter(m => ADVICE.test(m.text));
  const scores: Score[] = RULES.map(r => {
    const hits = student.filter(m => r.re.test(m.text));
    if (!hits.length) return { skill: r.skill, level: null, rationale: r.none, evidence: [] };
    const level = Math.min(4, hits.length + 1) - (r.skill === 'AUTONOMY' && advice.length ? 1 : 0);
    return { skill: r.skill, level: Math.max(1, level), rationale: r.good, evidence: hits.slice(0, 2).map(m => ({ seq: m.seq, quote: m.text.length > 90 ? m.text.slice(0, 88) + '…' : m.text })) };
  });
  const assessed = scores.filter(s => s.level !== null);
  const lowest = [...assessed].sort((a, b) => a.level! - b.level!)[0];
  const best = [...assessed].sort((a, b) => b.level! - a.level!)[0];
  const skillName = (s?: Score) => SKILLS.find(x => x.code === s?.skill)?.name ?? '';
  return {
    summary: `Phiên có ${student.length} lượt của người học với thân chủ ${c.clientName}. ${advice.length ? 'Có lượt đưa lời khuyên trực tiếp khiến thân chủ thu lại.' : 'Thân chủ cởi mở dần theo các lượt trao đổi.'}`,
    scores,
    strengths: assessed.length ? [`Kỹ năng thể hiện rõ nhất: ${skillName(best)}.`, 'Giữ được vai người tham vấn trong suốt phiên.'] : ['Phiên quá ngắn để nêu điểm làm tốt.'],
    improvements: advice.length
      ? [{ point: 'Tránh khuyên nhủ khi thân chủ vừa chia sẻ điều khó nói.', alt: 'Có thể nói: "Chuyện đó chắc đã rất nặng với em. Em muốn kể thêm không?"' }]
      : [{ point: `Luyện thêm kỹ năng ${skillName(lowest) || 'lắng nghe'}.`, alt: 'Có thể nói: "Anh chị nghe em nói... có đúng không?"' }],
    questions: ['Ở lượt nào bạn thấy thân chủ cởi mở nhất, và vì sao?', 'Nếu được làm lại một lượt, bạn sẽ nói khác đi thế nào?', 'Bạn muốn luyện kỹ năng nào ở lần sau?'],
    goals: [`Luyện ${skillName(lowest) || 'câu hỏi mở'} ở lần thực hành tiếp theo.`],
    limitation: scores.some(s => s.level === null) ? 'Một số kỹ năng chưa đủ dữ liệu do phiên chưa có tình huống tương ứng.' : 'Đánh giá dựa trên văn bản hội thoại, không dựa trên giọng điệu.',
  };
};
