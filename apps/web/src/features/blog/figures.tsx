import type { FigureKey } from './posts';

/** Vòng lắng nghe: bốn bước nối thành vòng tròn quanh thân chủ */
const ListeningLoop = () => {
  const steps = [
    { label: 'Chú ý', hint: 'Hiện diện, không chen ngang', x: 300, y: 50 },
    { label: 'Phản ánh', hint: 'Nói lại ý và cảm xúc', x: 500, y: 190 },
    { label: 'Làm rõ', hint: 'Một câu hỏi mỗi lượt', x: 300, y: 330 },
    { label: 'Tóm tắt', hint: 'Kiểm tra lại cách hiểu', x: 100, y: 190 },
  ];
  return (
    <svg viewBox="0 0 600 380" role="img" aria-labelledby="fig-loop-title" className="fig-svg">
      <title id="fig-loop-title">Vòng lắng nghe gồm bốn bước: chú ý, phản ánh, làm rõ, tóm tắt</title>
      <defs>
        <linearGradient id="loop-core" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8EC3F2" />
          <stop offset="1" stopColor="#2F6FEB" />
        </linearGradient>
        <marker id="loop-arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0 0 10 5 0 10z" fill="#4D8EF7" />
        </marker>
      </defs>
      <ellipse cx="300" cy="190" rx="200" ry="140" fill="none" stroke="#B5CBF0" strokeWidth="2" strokeDasharray="6 8" />
      {[
        'M394 66 Q480 90 500 152',
        'M500 228 Q480 290 394 314',
        'M206 314 Q120 290 100 228',
        'M100 152 Q120 90 206 66',
      ].map((d) => (
        <path key={d} d={d} fill="none" stroke="#4D8EF7" strokeWidth="2.5" markerEnd="url(#loop-arrow)" />
      ))}
      <circle cx="300" cy="190" r="72" fill="url(#loop-core)" />
      <text x="300" y="180" textAnchor="middle" fill="#fff" fontSize="17" fontWeight="700">
        Thân chủ
      </text>
      <text x="300" y="201" textAnchor="middle" fill="#E3EDFD" fontSize="12">
        cảm thấy
      </text>
      <text x="300" y="217" textAnchor="middle" fill="#E3EDFD" fontSize="12">
        được hiểu
      </text>
      {steps.map((s) => (
        <g key={s.label}>
          <rect
            x={s.x - 94}
            y={s.y - 30}
            width="188"
            height="60"
            rx="16"
            fill="#fff"
            stroke="#D6E3F8"
            strokeWidth="1.5"
          />
          <text x={s.x} y={s.y - 4} textAnchor="middle" fill="#1B2A5C" fontSize="16" fontWeight="700">
            {s.label}
          </text>
          <text x={s.x} y={s.y + 16} textAnchor="middle" fill="#4A5A85" fontSize="11.5">
            {s.hint}
          </text>
        </g>
      ))}
    </svg>
  );
};

/** So sánh câu hỏi đóng và câu hỏi mở bằng hai bong bóng hội thoại */
const Questions = () => {
  const col = (x: number, title: string, tone: string, q: string[], a: string[], note: string) => (
    <g>
      <text x={x} y="40" fill={tone} fontSize="15" fontWeight="700">
        {title}
      </text>
      <rect x={x} y="56" width="250" height="76" rx="18" fill="#fff" stroke="#D6E3F8" strokeWidth="1.5" />
      {q.map((line, i) => (
        <text key={line} x={x + 18} y={88 + i * 22} fill="#1C2A52" fontSize="14">
          {line}
        </text>
      ))}
      <rect x={x + 24} y="146" width="226" height={28 + a.length * 22} rx="18" fill={tone} fillOpacity=".12" />
      {a.map((line, i) => (
        <text key={line} x={x + 42} y={176 + i * 22} fill="#1B2A5C" fontSize="14">
          {line}
        </text>
      ))}
      <text x={x} y="262" fill="#4A5A85" fontSize="12.5">
        {note}
      </text>
    </g>
  );
  return (
    <svg viewBox="0 0 600 284" role="img" aria-labelledby="fig-q-title" className="fig-svg">
      <title id="fig-q-title">
        Câu hỏi đóng như &quot;Em có ngủ được không?&quot; chỉ nhận câu trả lời &quot;Dạ không.&quot;; câu hỏi mở như
        &quot;Mấy đêm nay em ngủ thế nào?&quot; để thân chủ tự kể
      </title>
      {col(
        30,
        'Câu hỏi đóng',
        '#94600A',
        ['Em có ngủ được không?'],
        ['Dạ không.'],
        'Nhanh, rõ, nhưng thân chủ dừng ở đó.',
      )}
      <line x1="300" y1="24" x2="300" y2="268" stroke="#D6E3F8" strokeWidth="1.5" strokeDasharray="4 6" />
      {col(
        320,
        'Câu hỏi mở',
        '#2F6FEB',
        ['Mấy đêm nay em ngủ', 'thế nào?'],
        ['Em nằm mãi không ngủ', 'được, cứ nghĩ tới bài thi…'],
        'Thân chủ tự chọn điều để kể.',
      )}
    </svg>
  );
};

export const BlogFigure = ({ figure }: { figure: FigureKey }) =>
  figure === 'listening-loop' ? <ListeningLoop /> : <Questions />;
