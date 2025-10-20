// components/landing/Header.tsx
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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
    <header
      className={`sticky top-0 z-50 bg-white/80 supports-[backdrop-filter]:backdrop-blur-md transition-shadow ${
        scrolled ? "shadow-sm" : ""
      }`}
    >
      {/* flex-wrap + gaps: evita overflow horizontal en mobile */}
      <div className="mx-auto max-w-7xl px-3 py-3 md:py-4 flex flex-wrap items-center gap-3 md:gap-5">
        {/* Logo */}
        <Link href="/" aria-label="Zona Natural – inicio" className="shrink-0 flex items-center">
          <img
            src="/brand/logo-zonanatural.png"
            alt="Zona Natural"
            className="block h-12 sm:h-14 md:h-16 w-auto object-contain select-none"
            loading="eager"
            decoding="async"
            draggable={false}
          />
        </Link>

        {/* Buscador: min-w-0 evita que el contenido fuerce ancho mínimo */}
        <div className="min-w-0 flex-1">
          {/* 🔧 overflow-visible + botón absoluto para que no se recorte en mobile */}
          <div className="relative w-full rounded-full ring-1 ring-emerald-200 bg-white overflow-visible">
            <input
              className="block w-full min-w-0 h-11 md:h-12 rounded-full px-4 pr-14 outline-none text-sm"
              placeholder="Estoy buscando…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && doSearch()}
              aria-label="Buscar productos"
            />
            <button
              type="button"
              onClick={doSearch}
              className="absolute inset-y-0 right-0 m-1 px-4 md:px-5 rounded-full text-sm font-medium bg-emerald-700 text-white hover:bg-emerald-800 focus:bg-emerald-800 active:bg-emerald-900"
              aria-label="Buscar"
            >
              Buscar
            </button>
          </div>
        </div>

        {/* Sobre nosotros: en mobile ocupa la línea completa; desde sm vuelve a auto */}
        <div className="w-full sm:w-auto shrink-0">
          <Link
            href="/sobre-nosotros"
            className="w-full sm:w-auto inline-flex items-center justify-center rounded-full border border-emerald-300 px-4 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-50"
          >
            Sobre nosotros
          </Link>
        </div>
      </div>
    </header>
  );
}
