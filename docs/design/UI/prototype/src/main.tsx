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
  return <div style={{ position: 'fixed', inset: 0 }}><Scene variant={p.__variant ?? 'a'} emotion={p.__emotion ?? 'NEUTRAL'} activity={p.__activity ?? 'idle'} /></div>;
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

createRoot(document.getElementById('root')!).render(<App />);
