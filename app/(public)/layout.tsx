// app/(public)/layout.tsx
import "../globals.css";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      {/* Evita scroll horizontal en móvil */}
      <body className="overflow-x-hidden">{children}</body>
    </html>
  );
}
