/** Tên hàng đợi pg-boss, schema riêng "pgboss" trên chính PostgreSQL */
export const QUEUES = {
  RETENTION: 'retention-archive',
  SESSION_SWEEP: 'session-sweep',
  ASSESSMENT: 'assessment',
} as const;

export const PGBOSS_SCHEMA = 'pgboss';

/** Xếp việc tạo báo cáo sau phiên (FR-RPT-01). API và worker mỗi bên có một cách gửi riêng. */
export interface AssessmentQueue {
  enqueue(sessionId: string): Promise<void>;
}

export const ASSESSMENT_QUEUE = Symbol('ASSESSMENT_QUEUE');
