// app/(public)/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import CartProvider from "@/components/cart/CartProvider";

export const metadata: Metadata = {
  title: "Zona Natural",
  description: "Tienda natural y saludable",
};

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="h-full">
      {/* 👇 Evita que cualquier desborde horizontal genere scroll en móvil */}
      <body className="min-h-screen bg-white text-slate-900 antialiased overflow-x-hidden">
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
