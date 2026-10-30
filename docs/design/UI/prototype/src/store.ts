import { useSyncExternalStore } from 'react';
import { ASSIGNMENTS, AUDIT, AuditItem, Assignment, CASES, CASE_DEFAULTS, CaseItem, CLASSES, ClassRoom, Role, Session, SESSIONS, User, USERS } from './data';

export type Route =
  | 'login' | 'change-password' | 'map' | 'home' | 'library' | 'prepare' | 'room' | 'report' | 'transcript' | 'reflection' | 'history'
  | 'lec-home' | 'lec-cases' | 'lec-case-edit' | 'lec-assign' | 'lec-progress' | 'lec-review' | 'lec-stats'
  | 'adm-users' | 'adm-classes' | 'adm-data' | 'adm-config' | 'adm-status' | 'adm-logs' | 'styleguide' | 'scene';

const ROUTES: Route[] = ['login', 'change-password', 'map', 'home', 'library', 'prepare', 'room', 'report', 'transcript', 'reflection', 'history', 'lec-home', 'lec-cases', 'lec-case-edit', 'lec-assign', 'lec-progress', 'lec-review', 'lec-stats', 'adm-users', 'adm-classes', 'adm-data', 'adm-config', 'adm-status', 'adm-logs', 'styleguide', 'scene'];

const roleOf = (r: Route): Role | null => r.startsWith('lec-') ? 'lecturer' : r.startsWith('adm-') ? 'admin'
  : ['home', 'library', 'prepare', 'room', 'report', 'transcript', 'reflection', 'history'].includes(r) ? 'student' : null;

export interface Toast { id: number; text: string; kind: 'ok' | 'warn' }

export interface State {
  route: Route; role: Role; caseId: string; sessionId: string; focusSeq: number | null; reviewId: string; editCaseId: string;
  users: User[]; classes: ClassRoom[]; cases: CaseItem[]; assignments: Assignment[]; sessions: Session[]; audit: AuditItem[]; toasts: Toast[];
  firstRun: boolean;
}

const fromHash = (): Route => {
  const h = location.hash.replace('#', '') as Route;
  return ROUTES.includes(h) ? h : 'login';
};

let state: State = {
  route: fromHash(), role: roleOf(fromHash()) ?? 'student', caseId: 'case1', sessionId: 's1', focusSeq: null, reviewId: 's4', editCaseId: 'case1',
  users: USERS.map(u => ({ ...u })), classes: CLASSES.map(c => ({ ...c, students: [...c.students] })), cases: CASES.map(c => ({ ...c })),
  assignments: [...ASSIGNMENTS], sessions: SESSIONS.map(s => ({ ...s })), audit: [...AUDIT], toasts: [], firstRun: true,
};

const listeners = new Set<() => void>();
const emit = () => listeners.forEach(l => l());

export const getState = () => state;
export const setState = (patch: Partial<State> | ((s: State) => Partial<State>)) => {
  state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) };
  emit();
};
export const useStore = <T,>(sel: (s: State) => T): T => useSyncExternalStore(cb => { listeners.add(cb); return () => listeners.delete(cb); }, () => sel(state));

export const go = (route: Route, patch: Partial<State> = {}) => {
  const role = roleOf(route);
  setState({ ...patch, route, ...(role ? { role } : {}) });
  if (location.hash.replace('#', '') !== route) {
    try { history.replaceState(null, '', '#' + route); } catch { location.hash = route; }
  }
  document.querySelector('.main-scroll')?.scrollTo(0, 0);
  window.scrollTo(0, 0);
};

window.addEventListener('hashchange', () => {
  const route = fromHash();
  if (route !== state.route) go(route);
});

let toastId = 1;
export const toast = (text: string, kind: Toast['kind'] = 'ok') => {
  const id = toastId++;
  setState(s => ({ toasts: [...s.toasts, { id, text, kind }] }));
  setTimeout(() => setState(s => ({ toasts: s.toasts.filter(t => t.id !== id) })), 3200);
};

export const updateSession = (id: string, patch: Partial<Session> | ((s: Session) => Partial<Session>)) =>
  setState(s => ({ sessions: s.sessions.map(x => x.id === id ? { ...x, ...(typeof patch === 'function' ? patch(x) : patch) } : x) }));

export const logAudit = (actor: string, action: string, target: string, detail: string) =>
  setState(s => ({ audit: [{ id: 'n' + Date.now(), at: '30/10/2026 ' + new Date().toTimeString().slice(0, 5), actor, action, target, detail }, ...s.audit] }));

export const CURRENT_STUDENT = 'u1';
export const CURRENT_LECTURER = 'l1';
export const CURRENT_ADMIN = 'a1';

export const newCase = (): CaseItem => ({ ...CASE_DEFAULTS, id: 'case' + Date.now() });
