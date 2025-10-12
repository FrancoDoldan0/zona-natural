// app/(public)/layout.tsx
import "../globals.css";
import { Poppins } from "next/font/google";
import Footer from "@/components/site/Footer";
import CartProvider from "@/components/cart/CartProvider";

export const runtime = "edge";

const font = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={font.className}>
      <body className="bg-white text-ink-900">
        <CartProvider>
          {/* Evitamos encabezado global para no duplicar buscador */}
          <main className="min-h-screen">{children}</main>
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}
