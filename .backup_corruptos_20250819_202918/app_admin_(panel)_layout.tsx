export const runtime = 'edge';
import { ReactNode } from 'react';
import { getCurrentUser } from '@/lib/auth';

export default async function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
  await getCurrentUser(); // valida sesiÃ³n; lanza si no hay
  return <>{children}</>;
}
