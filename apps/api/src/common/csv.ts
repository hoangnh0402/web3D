/**
 * Tạo CSV mở được bằng Excel: có BOM để giữ tiếng Việt, xuống dòng CRLF, ô có dấu phẩy hoặc ngoặc kép được bọc lại.
 * Ô bắt đầu bằng = + - @ được thêm dấu nháy để Excel không hiểu nhầm thành công thức (chống CSV injection).
 */
const cell = (v: unknown) => {
  let s = v === null || v === undefined ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const toCsv = (header: string[], rows: unknown[][]) =>
  String.fromCharCode(0xfeff) + [header, ...rows].map((r) => r.map(cell).join(',')).join(String.fromCharCode(13, 10));
