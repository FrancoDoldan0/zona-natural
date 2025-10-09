// components/landing/Header.tsx
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Header() {
  const [q, setQ] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const doSearch = () => {
    const term = q.trim();
    if (!term) return;
    router.push(`/catalogo?query=${encodeURIComponent(term)}`);
  };

  return (
    <header className={`sticky top-0 z-50 bg-white/80 supports-[backdrop-filter]:backdrop-blur-md transition-shadow ${scrolled ? "shadow-sm" : ""}`}>
      <div className="mx-auto max-w-7xl px-3 py-3 flex items-center gap-3">
        {/* Logo */}
        <a href="/" className="shrink-0 flex items-center gap-2" aria-label="Zona Natural – inicio">
          <img src="/logo.svg" alt="Zona Natural" className="h-8 w-auto" loading="lazy" decoding="async" />
        </a>

        {/* Buscador */}
        <div className="flex-1 flex items-center">
          <div className="w-full flex items-stretch rounded-full ring-1 ring-emerald-200 overflow-hidden">
            <input
              className="flex-1 px-4 py-2 outline-none text-sm"
              placeholder="Estoy buscando…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && doSearch()}
              aria-label="Buscar productos"
            />
            <button
              onClick={doSearch}
              className="px-4 py-2 text-sm font-medium bg-emerald-700 text-white hover:bg-emerald-800 focus:bg-emerald-800"
            >
              Buscar
            </button>
          </div>
        </div>

        {/* Acciones derechas */}
        <nav className="hidden sm:flex items-center gap-5 text-sm">
          <a className="hover:underline" href="#cuenta">Cuenta</a>
          <a className="hover:underline" href="#favoritos">Favoritos</a>
          <a className="hover:underline" href="#carrito">Carrito (0)</a>
        </nav>
      </div>
    </header>
  );
}
