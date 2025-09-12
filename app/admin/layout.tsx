// app/admin/layout.tsx
export const runtime = 'edge';

import React from 'react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // ⚠️ Nada de chequeo de sesión aquí.
  // La protección la hace el middleware y las APIs /api/admin.
  return <>{children}</>;
}
