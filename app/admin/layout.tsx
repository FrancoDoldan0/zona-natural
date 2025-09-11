// app/admin/layout.tsx
import type { ReactNode } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/auth'

export const dynamic = 'force-dynamic' // asegura ejecución en runtime (lee cookies)

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value
  const session = await verifySession(token)

  if (!session) {
    // Podés propagar ?next con la ruta actual si querés;
    // como layout no conoce la URL completa acá, el middleware ya la maneja.
    redirect('/admin/login')
  }

  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
