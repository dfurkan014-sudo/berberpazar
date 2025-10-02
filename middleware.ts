// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Projenin auth çerez adı (gerekirse lib/auth'takiyle aynı yap)
const AUTH_COOKIE = 'app-auth';

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const token = req.cookies.get(AUTH_COOKIE)?.value;

  // 1) Giriş gerektiren rotalar
  const protectedPaths = [
    /^\/favorites(?:\/.*)?$/,      // /favorites
    /^\/my(?:\/.*)?$/,             // /my, /my/profile, ...
    /^\/listings\/new$/,           // /listings/new
    /^\/listings\/\d+\/edit$/,     // /listings/123/edit
  ];
  const needsAuth = protectedPaths.some((re) => re.test(pathname));
  if (needsAuth) {
    if (token) return NextResponse.next();

    // login'e yönlendir (redirect paramıyla geldiği yere geri dön)
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname + (search || ''));
    return NextResponse.redirect(url);
  }

  // 2) Misafire özel sayfalar: login & register
  const guestOnly = pathname === '/login' || pathname === '/register';
  if (guestOnly && token) {
    // zaten girişliyse listings'e at
    const url = req.nextUrl.clone();
    url.pathname = '/listings';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Sadece ilgili path'leri dinle (performans için)
export const config = {
  matcher: [
    '/login',
    '/register',
    '/favorites',
    '/my/:path*',
    '/listings/:path*',
  ],
};
