import "../globals.css";
import { Poppins } from "next/font/google";
import Header from "@/components/site/Header";
import Footer from "@/components/site/Footer";

export const runtime = "edge";

const font = Poppins({ subsets: ["latin"], weight: ["400","500","600","700"] });

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={font.className}>
      <body className="bg-white text-ink-900">
        <Header />
        <main className="min-h-screen">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
