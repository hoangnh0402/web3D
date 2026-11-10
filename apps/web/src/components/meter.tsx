import { SKILL_LEVELS } from '@lab-fourt/shared';

const label = (level: number) => SKILL_LEVELS[level as keyof typeof SKILL_LEVELS];

/** Thang 4 mức của rubric. null là chưa đủ dữ liệu (FR-RPT-04). */
export const Meter = ({ level, compact }: { level: number | null | undefined; compact?: boolean }) => (
  <span className="meter" aria-label={level ? `Mức ${level}: ${label(level)}` : 'Chưa đủ dữ liệu'}>
    <span className="bars" aria-hidden>
      {[1, 2, 3, 4].map((i) => (
        <i key={i} className={level && i <= level ? `on l${level}` : ''} />
      ))}
    </span>
    {!compact && <span className="lv">{level ? `${level}. ${label(level)}` : 'Chưa đủ dữ liệu'}</span>}
  </span>
);
