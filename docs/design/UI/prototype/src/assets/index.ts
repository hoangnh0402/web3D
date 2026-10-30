import aNeutral from './room-a-neutral.jpg';
import aAnxious from './room-a-anxious.jpg';
import aSad from './room-a-sad.jpg';
import aRelieved from './room-a-relieved.jpg';
import aTense from './room-a-tense.jpg';
import aHesitant from './room-a-hesitant.jpg';
import bNeutral from './room-b-neutral.jpg';
import cNeutral from './room-c-neutral.jpg';
import type { Emotion } from '../data';

const A: Record<Emotion, string> = { NEUTRAL: aNeutral, ANXIOUS: aAnxious, SAD: aSad, RELIEVED: aRelieved, TENSE: aTense, HESITANT: aHesitant };

// Ảnh dựng sẵn từ chính cảnh 3D, dùng cho chế độ nhẹ 2D và thẻ ca.
export const roomImage = (variant: 'a' | 'b' | 'c', emotion: Emotion = 'NEUTRAL') =>
  variant === 'a' ? A[emotion] : variant === 'b' ? bNeutral : cNeutral;
