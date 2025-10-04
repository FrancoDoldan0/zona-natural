// app/page.tsx
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function RootRedirect() {
  redirect('/landing');        // 307 en tiempo de ejecución
}
