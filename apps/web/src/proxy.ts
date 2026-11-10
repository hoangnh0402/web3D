import { NextResponse, type NextRequest } from 'next/server';

/**
 * Chỉ chuyển hướng theo việc có cookie phiên hay không, để trang không nháy nội dung trước khi chuyển.
 * Phiên còn hạn không, vai trò có đúng không đều do NestJS kiểm tra lại ở từng yêu cầu.
 */
const PUBLIC = ['/login'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has('lf_session');
  if (!hasSession && !PUBLIC.includes(pathname)) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  return NextResponse.next();
}

export const config = {
  // Bỏ qua API, tệp tĩnh của Next và tài sản trong public
  matcher: ['/((?!api|_next|3d|rooms|brand|favicon.ico).*)'],
};
