import type { JSX } from 'react';
import { createRoot } from 'react-dom/client';
import './fonts.css';
import './app.css';
import Scene from './room/Scene';
import type { Emotion } from './data';
import { Route, useStore } from './store';
import { DemoPill, Shell, Toasts } from './ui';
import { ChangePassword, Login, ScreenMap, StyleGuide } from './screens/auth';
import { Home, HistoryScreen, Library, Prepare, ReflectionScreen, Report, Transcript } from './screens/student';
import { Room } from './screens/room';
import { LecAssign, LecCaseEdit, LecCases, LecHome, LecProgress, LecReview, LecStats } from './screens/lecturer';
import { AdmClasses, AdmConfig, AdmData, AdmLogs, AdmStatus, AdmUsers } from './screens/admin';

const SHELLED: Partial<Record<Route, () => JSX.Element>> = {
  home: Home, library: Library, prepare: Prepare, report: Report, transcript: Transcript, reflection: ReflectionScreen, history: HistoryScreen,
  'lec-home': LecHome, 'lec-cases': LecCases, 'lec-case-edit': LecCaseEdit, 'lec-assign': LecAssign, 'lec-progress': LecProgress, 'lec-review': LecReview, 'lec-stats': LecStats,
  'adm-users': AdmUsers, 'adm-classes': AdmClasses, 'adm-data': AdmData, 'adm-config': AdmConfig, 'adm-status': AdmStatus, 'adm-logs': AdmLogs,
};

// Cảnh trần, dùng để dựng ảnh cho chế độ nhẹ 2D.
const BareScene = () => {
  const p = window as unknown as { __variant?: 'a' | 'b' | 'c'; __emotion?: Emotion; __activity?: 'thinking' };
  // Cũng nhận tham số trên URL, ví dụ ?variant=a&emotion=SAD#scene, để xem nhanh từng trạng thái
  const q = new URLSearchParams(location.search);
  const variant = (q.get('variant') ?? p.__variant ?? 'a') as 'a' | 'b' | 'c';
  const emotion = (q.get('emotion') ?? p.__emotion ?? 'NEUTRAL') as Emotion;
  const activity = (q.get('activity') ?? p.__activity ?? 'idle') as 'idle' | 'thinking';
  return <div style={{ position: 'fixed', inset: 0 }}><Scene variant={variant} emotion={emotion} activity={activity} /></div>;
};

const App = () => {
  const route = useStore(s => s.route);
  const Screen = SHELLED[route];
  return (
    <>
      {route === 'login' && <Login />}
      {route === 'change-password' && <ChangePassword />}
      {route === 'map' && <ScreenMap />}
      {route === 'styleguide' && <StyleGuide />}
      {route === 'room' && <Room />}
      {Screen && <Shell><Screen key={route} /></Shell>}
      {route === 'scene' && <BareScene />}
      {route !== 'room' && route !== 'scene' && <DemoPill />}
      <Toasts />
    </>
  );
};

// Xuất khung hình tĩnh cho Figma hoặc người dùng giảm chuyển động: tắt hiệu ứng
if ((window as unknown as { __noMotion?: boolean }).__noMotion) document.documentElement.classList.add('no-motion');

createRoot(document.getElementById('root')!).render(<App />);
