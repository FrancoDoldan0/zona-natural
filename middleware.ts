// middleware.ts
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';

const PUBLIC_FILE = /\.(.*)$/;

function getAuthCookie(req: NextRequest) {
  return (
    req.cookies.get('admin_token')?.value ??
    req.cookies.get('token')?.value ??
    req.cookies.get('auth')?.value ??
    req.cookies.get('__session')?.value ??
    null
  );
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // Deja pasar assets y API pública
  if (
    PUBLIC_FILE.test(pathname) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/api/public')
  ) {
    return NextResponse.next();
  }

  const token = getAuthCookie(req);
  const payload = token ? await verifySession(token) : null; // ✅ validar firma/exp
  const isValid = !!payload;

  const isAdmin = pathname === '/admin' || pathname.startsWith('/admin/');
  const isAdminLogin = pathname.startsWith('/admin/login');
  const isAdminApi = pathname.startsWith('/api/admin');

  // Si NO hay sesión válida y quiere admin/admin API => a login
  if ((isAdmin || isAdminApi) && !isAdminLogin && !isValid) {
    const url = req.nextUrl.clone();
    url.pathname = '/admin/login';
    url.searchParams.set('next', pathname + (search || ''));
    return NextResponse.redirect(url);
  }

  // Si YA hay sesión válida y va al login => al dashboard
  if (isAdminLogin && isValid) {
    const url = req.nextUrl.clone();
    url.pathname = '/admin';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Protege /admin y /api/admin
export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
