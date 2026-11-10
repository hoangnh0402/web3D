import { describe, expect, it } from 'vitest';
import { toCsv } from './csv';

describe('toCsv', () => {
  const lines = (csv: string) => csv.slice(1).split(String.fromCharCode(13, 10));

  it('có BOM cho Excel và giữ nguyên tiếng Việt', () => {
    const csv = toCsv(['Họ tên'], [['Trần Minh Anh']]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(lines(csv)).toEqual(['Họ tên', 'Trần Minh Anh']);
  });

  it('bọc ô có dấu phẩy, ngoặc kép, xuống dòng', () => {
    expect(lines(toCsv(['a'], [['x, y'], ['nói "chào"'], [null]]))).toEqual(['a', '"x, y"', '"nói ""chào"""', '']);
  });

  it('chặn ô bị Excel hiểu thành công thức', () => {
    expect(lines(toCsv(['a'], [['=SUM(A1)'], ['-1']]))[1]).toBe("'=SUM(A1)");
  });
});
