// Bản standalone của Next không kèm public/ và .next/static/. Chép vào để chạy được bằng server.js (docs Next.js).
import { cpSync, existsSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const target = path.join(root, '.next/standalone/apps/web');
if (!existsSync(target)) throw new Error('Không thấy .next/standalone. Hãy chạy next build với output: standalone trước.');
cpSync(path.join(root, 'public'), path.join(target, 'public'), { recursive: true });
cpSync(path.join(root, '.next/static'), path.join(target, '.next/static'), { recursive: true });
console.log('Đã chép public và .next/static vào bản standalone');
