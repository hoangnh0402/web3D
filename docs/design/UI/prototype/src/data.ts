// Toàn bộ dữ liệu trong prototype là dữ liệu minh họa, nhân vật và lớp học đều hư cấu.

export type Role = 'student' | 'lecturer' | 'admin';
export type Emotion = 'NEUTRAL' | 'ANXIOUS' | 'SAD' | 'TENSE' | 'RELIEVED' | 'HESITANT';
export type RecordStatus = 'ACTIVE' | 'ARCHIVED' | 'DELETED';
export type SkillCode = 'ACTIVE_LISTENING' | 'OPEN_QUESTIONS' | 'EMPATHY' | 'SUMMARIZING' | 'AUTONOMY' | 'ETHICS_SAFETY';

export interface User { id: string; name: string; username: string; role: Role; status: 'ACTIVE' | 'LOCKED' | 'DISABLED'; classId?: string; lastLogin: string }
export interface ClassRoom { id: string; name: string; term: string; lecturerId: string; students: string[] }
export interface CaseLine { text: string; emotion: Emotion }
export interface CaseItem {
  id: string; title: string; clientName: string; clientAge: number; avatar: 'a' | 'b' | 'c';
  summary: string; background: string; mainIssue: string; objectives: string[];
  traits: string; hidden: string; arc: string; safety: string; criteria: string;
  skills: string[]; difficulty: 'Cơ bản' | 'Trung bình' | 'Nâng cao'; minutes: number;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'; version: number; reviewed: boolean; updatedAt: string;
  opening: CaseLine; script: CaseLine[]; defensive: CaseLine; closing: CaseLine; suggestions: string[];
}
export interface Assignment { id: string; caseId: string; title: string; classId: string; due: string; status: 'OPEN' | 'CLOSED' }
export interface Msg { seq: number; speaker: 'STUDENT' | 'CLIENT'; text: string; mode?: 'TEXT' | 'VOICE'; edited?: boolean; conf?: number; time: string }
export interface Score { skill: SkillCode; level: number | null; rationale: string; evidence: { seq: number; quote: string }[]; lecturerLevel?: number | null; lecturerNote?: string }
export interface Report { summary: string; scores: Score[]; strengths: string[]; improvements: { point: string; alt: string }[]; questions: string[]; goals: string[]; limitation: string; lecturerComment?: string; reviewedBy?: string; reviewedAt?: string }
export interface Reflection { answers: string[]; goal: string; done: boolean }
export interface Session {
  id: string; userId: string; caseId: string; caseVersion: number; assignmentId?: string;
  status: 'IN_PROGRESS' | 'ENDED' | 'ABANDONED'; record: RecordStatus;
  startedAt: string; endedAt: string; retentionUntil: string; minutes: number; mode: '3D' | '2D';
  messages: Msg[]; report?: Report; reflection?: Reflection;
  submission?: { status: 'SUBMITTED' | 'WITHDRAWN'; at: string; late: boolean };
}
export interface AuditItem { id: string; at: string; actor: string; action: string; target: string; detail: string }

export const SKILLS: { code: SkillCode; name: string }[] = [
  { code: 'ACTIVE_LISTENING', name: 'Lắng nghe chủ động' },
  { code: 'OPEN_QUESTIONS', name: 'Câu hỏi mở và làm rõ' },
  { code: 'EMPATHY', name: 'Thấu cảm và phản hồi cảm xúc' },
  { code: 'SUMMARIZING', name: 'Tóm tắt và xác định vấn đề' },
  { code: 'AUTONOMY', name: 'Tôn trọng quyền tự quyết' },
  { code: 'ETHICS_SAFETY', name: 'Đạo đức và an toàn' },
];

export const LEVELS = ['Chưa thể hiện', 'Đang hình thành', 'Đạt yêu cầu', 'Thể hiện linh hoạt trong mô phỏng'];

export const USERS: User[] = [
  { id: 'u1', name: 'Nguyễn Minh Anh', username: 'minhanh.k72', role: 'student', status: 'ACTIVE', classId: 'c1', lastLogin: '30/10/2026 08:12' },
  { id: 'u2', name: 'Phạm Gia Huy', username: 'giahuy.k72', role: 'student', status: 'ACTIVE', classId: 'c1', lastLogin: '29/10/2026 21:40' },
  { id: 'u3', name: 'Lê Khánh Vy', username: 'khanhvy.k72', role: 'student', status: 'ACTIVE', classId: 'c1', lastLogin: '30/10/2026 07:55' },
  { id: 'u4', name: 'Đỗ Hoàng Nam', username: 'hoangnam.k72', role: 'student', status: 'ACTIVE', classId: 'c1', lastLogin: '28/10/2026 19:03' },
  { id: 'u5', name: 'Trịnh Thảo Nguyên', username: 'thaonguyen.k72', role: 'student', status: 'ACTIVE', classId: 'c1', lastLogin: '29/10/2026 16:20' },
  { id: 'u6', name: 'Vũ Đức Long', username: 'duclong.k72', role: 'student', status: 'LOCKED', classId: 'c1', lastLogin: '25/10/2026 10:11' },
  { id: 'u7', name: 'Hoàng Bảo Ngọc', username: 'baongoc.k72', role: 'student', status: 'ACTIVE', classId: 'c2', lastLogin: '27/10/2026 14:48' },
  { id: 'u8', name: 'Bùi Quang Vinh', username: 'quangvinh.k72', role: 'student', status: 'ACTIVE', classId: 'c2', lastLogin: '30/10/2026 09:02' },
  { id: 'l1', name: 'TS. Lê Thu Hằng', username: 'thuhang.gv', role: 'lecturer', status: 'ACTIVE', lastLogin: '30/10/2026 07:30' },
  { id: 'l2', name: 'ThS. Ngô Đức Anh', username: 'ducanh.gv', role: 'lecturer', status: 'ACTIVE', lastLogin: '28/10/2026 15:22' },
  { id: 'a1', name: 'Trần Quốc Bảo', username: 'quantri', role: 'admin', status: 'ACTIVE', lastLogin: '30/10/2026 08:45' },
];

export const CLASSES: ClassRoom[] = [
  { id: 'c1', name: 'Tham vấn K72, nhóm 1', term: 'Học kỳ 1, 2026-2027', lecturerId: 'l1', students: ['u1', 'u2', 'u3', 'u4', 'u5', 'u6'] },
  { id: 'c2', name: 'Tham vấn K72, nhóm 2', term: 'Học kỳ 1, 2026-2027', lecturerId: 'l2', students: ['u7', 'u8'] },
];

export const CASES: CaseItem[] = [
  {
    id: 'case1', title: 'Áp lực học tập', clientName: 'Hà Linh', clientAge: 20, avatar: 'a',
    summary: 'Sinh viên năm hai chịu áp lực từ kết quả học tập và kỳ vọng của gia đình.',
    background: 'Hà Linh là sinh viên năm hai, gia đình ở quê làm nông, là người đầu tiên trong nhà học đại học. Kỳ vừa rồi Linh trượt hai môn và chưa nói với ai.',
    mainIssue: 'Linh mất ngủ, học không vào và sợ gia đình thất vọng.',
    objectives: ['Lắng nghe', 'Làm rõ vấn đề', 'Phản hồi cảm xúc'],
    traits: 'Dè dặt, lo lắng, nói ngắn và hay ngập ngừng ở đầu phiên.',
    hidden: 'Linh sợ nhất là làm mẹ thất vọng. Chi tiết này chỉ xuất hiện khi người tham vấn đã tạo được sự tin cậy.',
    arc: 'Từ dè dặt sang lo lắng, buồn, rồi nhẹ nhõm hơn khi được lắng nghe.',
    safety: 'Không tự suy diễn chẩn đoán. Nếu xuất hiện ý nghĩ biến mất hoặc tự hại, hiển thị hướng dẫn an toàn.',
    criteria: 'Phản hồi đúng điều thân chủ nói, dùng câu hỏi mở, ghi nhận cảm xúc có căn cứ, tóm tắt và kiểm tra lại.',
    skills: ['Lắng nghe', 'Làm rõ vấn đề', 'Phản hồi cảm xúc'], difficulty: 'Cơ bản', minutes: 25,
    status: 'PUBLISHED', version: 3, reviewed: false, updatedAt: '26/10/2026',
    opening: { text: 'Dạ, em chào anh chị. Em cũng không biết nên bắt đầu từ đâu nữa.', emotion: 'HESITANT' },
    script: [
      { text: 'Dạo này em học hành sa sút lắm. Kỳ vừa rồi em trượt hai môn.', emotion: 'ANXIOUS' },
      { text: 'Bố mẹ em ở quê làm nông, cả nhà trông vào em. Mẹ hay gọi hỏi điểm mà em không dám nói thật.', emotion: 'SAD' },
      { text: 'Em chưa kể với ai cả. Đêm nào em cũng ngồi đến hai, ba giờ mà chữ không vào đầu.', emotion: 'ANXIOUS' },
      { text: 'Thật ra điều em sợ nhất là làm mẹ thất vọng.', emotion: 'SAD' },
      { text: 'Nói ra được thế này em thấy nhẹ hơn một chút.', emotion: 'RELIEVED' },
      { text: 'Chắc em sẽ thử nói với mẹ một phần. Nhưng em chưa biết mở lời thế nào.', emotion: 'HESITANT' },
    ],
    defensive: { text: 'Em biết là em phải cố gắng hơn. Ai cũng nói với em như vậy.', emotion: 'TENSE' },
    closing: { text: 'Vâng, em đang nghe ạ.', emotion: 'NEUTRAL' },
    suggestions: [
      'Chào em, hôm nay em muốn chia sẻ điều gì?',
      'Nghe em kể, có vẻ em đang rất lo. Em có thể kể thêm về chuyện này không?',
      'Khi mẹ gọi hỏi điểm, em cảm thấy thế nào?',
      'Em đã phải mang chuyện này một mình khá lâu. Điều gì khiến em lo nhất?',
      'Anh chị nghe em nói em đang chịu áp lực từ kết quả học tập và kỳ vọng của gia đình, có đúng không?',
      'Em muốn bắt đầu từ đâu? Quyết định là ở em.',
    ],
  },
  {
    id: 'case2', title: 'Khó khăn trong mối quan hệ', clientName: 'Tuấn Kiệt', clientAge: 22, avatar: 'b',
    summary: 'Thân chủ gặp mâu thuẫn và tổn thương trong một mối quan hệ thân thiết.',
    background: 'Tuấn Kiệt vừa chia tay sau ba năm và thường xuyên cãi nhau với bạn cùng phòng.',
    mainIssue: 'Kiệt thấy bị bỏ rơi và ngày càng thu mình.',
    objectives: ['Thấu cảm', 'Câu hỏi mở', 'Không phán xét', 'Tôn trọng lựa chọn'],
    traits: 'Dễ phòng thủ, hay nói đùa để né tránh.',
    hidden: 'Kiệt tự trách vì đã im lặng quá lâu trong mối quan hệ.',
    arc: 'Từ phòng thủ sang tổn thương, rồi cởi mở hơn.',
    safety: 'Không đánh giá đúng sai trong mối quan hệ.',
    criteria: 'Không phán xét, ghi nhận cảm xúc, tôn trọng lựa chọn của thân chủ.',
    skills: ['Thấu cảm', 'Câu hỏi mở', 'Không phán xét'], difficulty: 'Trung bình', minutes: 30,
    status: 'PUBLISHED', version: 2, reviewed: false, updatedAt: '21/10/2026',
    opening: { text: 'Chào anh chị. Thật ra em cũng chỉ đến cho vui thôi.', emotion: 'TENSE' },
    script: [
      { text: 'Em với bạn gái chia tay rồi. Ba năm đấy, mà kết thúc bằng một tin nhắn.', emotion: 'SAD' },
      { text: 'Giờ về phòng trọ em cũng chẳng muốn nói chuyện với ai.', emotion: 'SAD' },
      { text: 'Em nghĩ lỗi cũng tại em, em im lặng quá lâu.', emotion: 'HESITANT' },
      { text: 'Được nói ra thế này cũng đỡ hơn em nghĩ.', emotion: 'RELIEVED' },
    ],
    defensive: { text: 'Anh chị nói vậy thì dễ thôi, nhưng anh chị đâu ở trong hoàn cảnh của em.', emotion: 'TENSE' },
    closing: { text: 'Vâng, em nghe đây.', emotion: 'NEUTRAL' },
    suggestions: [
      'Em đến đây hôm nay với điều gì trong lòng?',
      'Ba năm là một quãng dài. Khi nhận tin nhắn đó, em đã thấy thế nào?',
      'Em có thể kể thêm về những ngày gần đây không?',
      'Điều gì khiến em nghĩ lỗi là ở mình?',
    ],
  },
  {
    id: 'case3', title: 'Thích nghi với thay đổi', clientName: 'Mai Phương', clientAge: 19, avatar: 'c',
    summary: 'Tân sinh viên khó thích nghi với môi trường sống và học tập mới.',
    background: 'Mai Phương từ tỉnh lên Hà Nội học đại học, lần đầu xa nhà, chưa có bạn thân.',
    mainIssue: 'Phương thấy lạc lõng và nghĩ đến việc bỏ học.',
    objectives: ['Khám phá nguồn lực', 'Xác định mục tiêu', 'Hỗ trợ quyền tự quyết'],
    traits: 'Nói nhiều khi căng thẳng, hay so sánh với bạn bè.',
    hidden: 'Phương có một người chị họ ở Hà Nội nhưng ngại nhờ vả.',
    arc: 'Từ lo lắng sang có thêm hướng đi cụ thể.',
    safety: 'Không đưa lời khuyên thay cho quyết định của thân chủ.',
    criteria: 'Khám phá nguồn lực, cùng xác định mục tiêu, hỗ trợ quyền tự quyết.',
    skills: ['Khám phá nguồn lực', 'Xác định mục tiêu', 'Quyền tự quyết'], difficulty: 'Trung bình', minutes: 30,
    status: 'PUBLISHED', version: 1, reviewed: false, updatedAt: '18/10/2026',
    opening: { text: 'Em chào anh chị. Em mới lên Hà Nội được hai tháng thôi.', emotion: 'ANXIOUS' },
    script: [
      { text: 'Mọi thứ ở đây nhanh quá. Các bạn đều có nhóm rồi, còn em thì chưa.', emotion: 'ANXIOUS' },
      { text: 'Có hôm em nghĩ hay là nghỉ học về quê cho xong.', emotion: 'SAD' },
      { text: 'Em có chị họ ở đây, nhưng em ngại nhờ.', emotion: 'HESITANT' },
      { text: 'Chắc tuần này em thử nhắn cho chị ấy xem sao.', emotion: 'RELIEVED' },
    ],
    defensive: { text: 'Vâng, em biết là ai cũng phải tự lập cả.', emotion: 'TENSE' },
    closing: { text: 'Vâng ạ.', emotion: 'NEUTRAL' },
    suggestions: [
      'Hai tháng vừa rồi với em thế nào?',
      'Khi thấy các bạn đã có nhóm, em cảm thấy ra sao?',
      'Trước đây khi gặp khó khăn, em thường dựa vào ai?',
      'Em muốn thử điều gì đầu tiên trong tuần này?',
    ],
  },
];

export const CASE_DEFAULTS: Omit<CaseItem, 'id'> = {
  title: 'Ca mới', clientName: '', clientAge: 20, avatar: 'a', summary: '', background: '', mainIssue: '', objectives: [],
  traits: '', hidden: '', arc: '', safety: '', criteria: '', skills: [], difficulty: 'Cơ bản', minutes: 25,
  status: 'DRAFT', version: 0, reviewed: false, updatedAt: '30/10/2026',
  opening: { text: '', emotion: 'NEUTRAL' }, script: [], defensive: { text: '', emotion: 'TENSE' }, closing: { text: '', emotion: 'NEUTRAL' }, suggestions: [],
};

export const ASSIGNMENTS: Assignment[] = [
  { id: 'as1', caseId: 'case1', title: 'Bài thực hành tuần 9', classId: 'c1', due: '05/11/2026', status: 'OPEN' },
  { id: 'as2', caseId: 'case2', title: 'Bài thực hành tuần 11', classId: 'c1', due: '19/11/2026', status: 'OPEN' },
  { id: 'as3', caseId: 'case3', title: 'Bài thực hành tuần 7', classId: 'c1', due: '20/10/2026', status: 'CLOSED' },
];

const sampleMessages: Msg[] = [
  { seq: 1, speaker: 'CLIENT', text: CASES[0].opening.text, time: '20:02' },
  { seq: 2, speaker: 'STUDENT', text: 'Chào em, hôm nay em muốn chia sẻ điều gì?', mode: 'VOICE', conf: 0.94, time: '20:03' },
  { seq: 3, speaker: 'CLIENT', text: CASES[0].script[0].text, time: '20:03' },
  { seq: 4, speaker: 'STUDENT', text: 'Nghe em kể, có vẻ em đang rất lo. Em có thể kể thêm về chuyện này không?', mode: 'VOICE', conf: 0.91, time: '20:04' },
  { seq: 5, speaker: 'CLIENT', text: CASES[0].script[1].text, time: '20:05' },
  { seq: 6, speaker: 'STUDENT', text: 'Vậy em nên cố gắng học thêm để lấy lại điểm.', mode: 'TEXT', time: '20:06' },
  { seq: 7, speaker: 'CLIENT', text: CASES[0].defensive.text, time: '20:06' },
  { seq: 8, speaker: 'STUDENT', text: 'Khi mẹ gọi hỏi điểm, em cảm thấy thế nào?', mode: 'VOICE', conf: 0.72, edited: true, time: '20:08' },
  { seq: 9, speaker: 'CLIENT', text: CASES[0].script[2].text, time: '20:08' },
  { seq: 10, speaker: 'STUDENT', text: 'Anh chị nghe em nói em đang chịu áp lực từ kết quả học tập và kỳ vọng của gia đình, có đúng không?', mode: 'VOICE', conf: 0.9, time: '20:11' },
  { seq: 11, speaker: 'CLIENT', text: CASES[0].script[3].text, time: '20:11' },
];

export const sampleReport = (): Report => ({
  summary: 'Phiên đi từ giai đoạn làm quen sang khai thác áp lực học tập. Thân chủ cởi mở hơn sau câu hỏi về cảm xúc khi mẹ gọi hỏi điểm. Có một lượt khuyên nhủ khiến thân chủ thu lại.',
  scores: [
    { skill: 'ACTIVE_LISTENING', level: 3, rationale: 'Người học phản hồi đúng điều thân chủ nói và theo sát chủ đề ở hầu hết các lượt.', evidence: [{ seq: 4, quote: 'Nghe em kể, có vẻ em đang rất lo.' }] },
    { skill: 'OPEN_QUESTIONS', level: 3, rationale: 'Dùng câu hỏi mở để thân chủ kể thêm, không hỏi dồn.', evidence: [{ seq: 2, quote: 'hôm nay em muốn chia sẻ điều gì?' }, { seq: 8, quote: 'em cảm thấy thế nào?' }] },
    { skill: 'EMPATHY', level: 2, rationale: 'Có ghi nhận lo lắng nhưng chưa phản hồi cảm xúc khi thân chủ nhắc đến gia đình.', evidence: [{ seq: 4, quote: 'có vẻ em đang rất lo' }] },
    { skill: 'SUMMARIZING', level: 3, rationale: 'Tóm tắt đúng hai nguồn áp lực và kiểm tra lại với thân chủ.', evidence: [{ seq: 10, quote: 'em đang chịu áp lực từ kết quả học tập và kỳ vọng của gia đình, có đúng không?' }] },
    { skill: 'AUTONOMY', level: 2, rationale: 'Một lượt đưa lời khuyên trực tiếp làm thân chủ thu lại.', evidence: [{ seq: 6, quote: 'em nên cố gắng học thêm để lấy lại điểm' }] },
    { skill: 'ETHICS_SAFETY', level: null, rationale: 'Phiên chưa có tình huống để đánh giá kỹ năng này.', evidence: [] },
  ],
  strengths: ['Mở đầu bằng câu hỏi mở và để thân chủ dẫn dắt.', 'Tóm tắt chính xác và kiểm tra lại với thân chủ.', 'Giữ nhịp hội thoại, không ngắt lời.'],
  improvements: [
    { point: 'Tránh khuyên nhủ khi thân chủ vừa chia sẻ điều khó nói.', alt: 'Thay vì "em nên cố gắng học thêm", có thể nói: "Chuyện đó chắc đã rất nặng với em. Em muốn kể thêm không?"' },
    { point: 'Phản hồi cảm xúc gắn với gia đình rõ hơn.', alt: 'Có thể nói: "Không dám nói thật với mẹ, nghe có vẻ khiến em thấy rất cô đơn."' },
  ],
  questions: ['Ở lượt nào bạn thấy thân chủ cởi mở nhất, và vì sao?', 'Nếu quay lại lượt 6, bạn sẽ nói khác đi thế nào?', 'Bạn muốn luyện kỹ năng nào ở lần sau?'],
  goals: ['Luyện phản hồi cảm xúc trước khi đặt câu hỏi tiếp theo.'],
  limitation: 'Phiên chưa có tình huống an toàn nên kỹ năng Đạo đức và an toàn chưa đủ dữ liệu. Lượt 8 có độ tin cậy nhận dạng thấp.',
});

const varied = (levels: (number | null)[]): Report => {
  const r = sampleReport();
  r.scores = r.scores.map((s, i) => ({ ...s, level: levels[i] }));
  return r;
};

const mk = (id: string, userId: string, caseId: string, opts: Partial<Session>): Session => ({
  id, userId, caseId, caseVersion: CASES.find(c => c.id === caseId)!.version, status: 'ENDED', record: 'ACTIVE',
  startedAt: '28/10/2026 20:02', endedAt: '28/10/2026 20:19', retentionUntil: '11/11/2026', minutes: 17, mode: '3D',
  messages: sampleMessages, report: sampleReport(), ...opts,
});

export const SESSIONS: Session[] = [
  mk('s1', 'u1', 'case1', { assignmentId: 'as1', reflection: { answers: ['', '', ''], goal: '', done: false } }),
  mk('s2', 'u1', 'case2', { startedAt: '24/10/2026 21:10', endedAt: '24/10/2026 21:32', retentionUntil: '07/11/2026', minutes: 22, report: varied([2, 3, 3, 2, 3, null]) }),
  mk('s3', 'u1', 'case3', { assignmentId: 'as3', record: 'ARCHIVED', startedAt: '12/10/2026 19:30', endedAt: '12/10/2026 19:54', retentionUntil: '26/10/2026', minutes: 24, report: varied([2, 2, 2, 2, 3, null]), submission: { status: 'SUBMITTED', at: '12/10/2026 20:10', late: false } }),
  mk('s4', 'u2', 'case1', { assignmentId: 'as1', startedAt: '27/10/2026 19:10', endedAt: '27/10/2026 19:33', retentionUntil: '10/11/2026', minutes: 23, report: varied([3, 2, 3, 2, 3, null]), reflection: { answers: ['Lượt thân chủ kể về mẹ.', 'Em sẽ phản hồi cảm xúc trước.', 'Thấu cảm.'], goal: 'Không vội đưa lời khuyên.', done: true }, submission: { status: 'SUBMITTED', at: '27/10/2026 20:01', late: false } }),
  mk('s5', 'u3', 'case1', { assignmentId: 'as1', startedAt: '26/10/2026 20:30', endedAt: '26/10/2026 20:52', retentionUntil: '09/11/2026', minutes: 22, report: varied([4, 3, 3, 3, 3, 2]), reflection: { answers: ['Khi em tóm tắt lại.', 'Em sẽ hỏi chậm hơn.', 'An toàn.'], goal: 'Hỏi trực tiếp về an toàn khi cần.', done: true }, submission: { status: 'SUBMITTED', at: '26/10/2026 21:15', late: false } }),
  mk('s6', 'u4', 'case1', { assignmentId: 'as1', startedAt: '29/10/2026 22:05', endedAt: '29/10/2026 22:14', retentionUntil: '12/11/2026', minutes: 9, report: varied([1, 2, 1, null, 2, null]), reflection: { answers: ['', '', ''], goal: '', done: false } }),
  mk('s7', 'u5', 'case1', { assignmentId: 'as1', startedAt: '25/10/2026 15:40', endedAt: '25/10/2026 16:05', retentionUntil: '08/11/2026', minutes: 25, report: varied([3, 3, 2, 3, 4, null]), reflection: { answers: ['Khi em im lặng để Linh nói.', 'Em sẽ tóm tắt sớm hơn.', 'Tóm tắt.'], goal: 'Tóm tắt sau mỗi chủ đề.', done: true }, submission: { status: 'SUBMITTED', at: '25/10/2026 16:30', late: false } }),
  mk('s8', 'u2', 'case3', { record: 'DELETED', startedAt: '15/10/2026 20:00', endedAt: '15/10/2026 20:12', retentionUntil: '29/10/2026', minutes: 12, report: varied([2, 2, 2, null, 2, null]) }),
  mk('s9', 'u7', 'case1', { startedAt: '13/10/2026 09:30', endedAt: '13/10/2026 09:51', retentionUntil: '27/10/2026', record: 'ARCHIVED', minutes: 21, report: varied([3, 3, 3, 2, 2, null]) }),
];

export const AUDIT: AuditItem[] = [
  { id: 'l1', at: '30/10/2026 08:45', actor: 'Trần Quốc Bảo', action: 'Đăng nhập', target: 'quantri', detail: 'Đăng nhập thành công' },
  { id: 'l2', at: '30/10/2026 02:00', actor: 'Hệ thống', action: 'Chuyển trạng thái', target: '2 phiên', detail: 'Đang hiệu lực sang Đã lưu trữ, quá hạn 14 ngày' },
  { id: 'l3', at: '29/10/2026 17:12', actor: 'TS. Lê Thu Hằng', action: 'Xuất bản ca', target: 'Áp lực học tập', detail: 'Phiên bản 3' },
  { id: 'l4', at: '29/10/2026 10:05', actor: 'Trần Quốc Bảo', action: 'Khóa tài khoản', target: 'duclong.k72', detail: 'Do yêu cầu của giảng viên' },
  { id: 'l5', at: '28/10/2026 16:40', actor: 'TS. Lê Thu Hằng', action: 'Xuất báo cáo', target: 'Tham vấn K72, nhóm 1', detail: 'Báo cáo tổng hợp theo kỹ năng' },
  { id: 'l6', at: '28/10/2026 09:18', actor: 'Trần Quốc Bảo', action: 'Đổi cấu hình', target: 'Giới hạn tần suất', detail: '30 lượt mỗi phút' },
];

export const USAGE: { day: string; turns: number }[] = [
  { day: '24/10', turns: 86 }, { day: '25/10', turns: 124 }, { day: '26/10', turns: 201 }, { day: '27/10', turns: 178 },
  { day: '28/10', turns: 240 }, { day: '29/10', turns: 163 }, { day: '30/10', turns: 58 },
];
