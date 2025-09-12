// app/admin/layout.tsx
export const runtime = 'edge';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/auth';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE_NAME)?.value ?? '';
  const session = token ? await verifySession(token) : null;

  if (!session) {
    redirect(`/admin/login?next=/admin`);
  }

  return <>{children}</>;
}
