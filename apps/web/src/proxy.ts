import { NextResponse, type NextRequest } from 'next/server';

/**
 * Chỉ chuyển hướng theo việc có cookie phiên hay không, để trang không nháy nội dung trước khi chuyển.
 * Phiên còn hạn không, vai trò có đúng không đều do NestJS kiểm tra lại ở từng yêu cầu.
 */
const PUBLIC = ['/register', '/forgot-password'];
/** Trang chủ tin tức, bài viết và các trang đăng nhập, đăng ký ai cũng xem được */
const isPublic = (path: string) =>
  path === '/' || path.startsWith('/tin-tuc/') || path === '/login' || path.startsWith('/login/') || PUBLIC.includes(path);
/** Chưa đăng nhập mà vào khu vực của vai trò nào thì đưa tới trang đăng nhập của vai trò đó */
const loginFor = (path: string) =>
  path.startsWith('/admin') ? '/login/quan-tri' : path.startsWith('/lecturer') ? '/login/giang-vien' : '/login';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has('lf_session');
  if (!hasSession && !isPublic(pathname)) {
    return NextResponse.redirect(new URL(loginFor(pathname), request.url));
  }
  return NextResponse.next();
}

export const config = {
  // Bỏ qua API, tệp tĩnh của Next và tài sản trong public
  matcher: ['/((?!api|_next|3d|rooms|brand|favicon.ico).*)'],
};
