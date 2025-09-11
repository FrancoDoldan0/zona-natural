// middleware.ts
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

const SESSION_COOKIE_NAME = 'admin_token'

export function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value ?? null

  const isAdminArea = pathname.startsWith('/admin')
  const isAdminLogin = pathname.startsWith('/admin/login')
  const isAdminApi = pathname.startsWith('/api/admin')

  // Si estamos en el login y ya hay sesión → ir al dashboard
  if (isAdminLogin && token) {
    const url = req.nextUrl.clone()
    url.pathname = '/admin'
    url.search = ''
    return NextResponse.redirect(url)
  }

  // Rutas de API admin sin sesión ⇒ 401 JSON
  if (isAdminApi && !token) {
    return NextResponse.json(
      { ok: false, error: 'unauthorized' },
      { status: 401 }
    )
  }

  // Páginas /admin sin sesión ⇒ redirect a login con ?next=…
  if (isAdminArea && !isAdminLogin && !token) {
    const url = req.nextUrl.clone()
    url.pathname = '/admin/login'
    // para volver a donde estaba tras loguearse
    url.searchParams.set('next', pathname + (searchParams.toString() ? `?${searchParams.toString()}` : ''))
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

// Asegura que el middleware solo corra donde importa
export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
}
