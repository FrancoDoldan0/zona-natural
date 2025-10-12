// app/(public)/layout.tsx
import "../globals.css";
import CartProvider from "@/components/cart/CartProvider";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      {/* Evita scroll horizontal en móvil */}
      <body className="overflow-x-hidden">
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
