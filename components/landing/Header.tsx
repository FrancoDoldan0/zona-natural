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
      <div className="mx-auto max-w-7xl px-3 py-3 md:py-4 flex items-center gap-3 md:gap-5">
        {/* Logo (escala para compensar padding del PNG) */}
        <Link href="/" aria-label="Zona Natural – inicio" className="shrink-0 flex items-center">
          <img
            src="/brand/logo-zonanatural.png"
            alt="Zona Natural"
            className="
              h-12 md:h-16 lg:h-20 w-auto
              object-contain
              transform origin-left
              scale-[1.35] md:scale-[1.5]
              select-none
            "
            loading="eager"
            decoding="async"
            draggable={false}
          />
        </Link>

        {/* Buscador */}
        <div className="flex-1 flex items-center">
          <div className="w-full flex items-stretch rounded-full ring-1 ring-emerald-200 overflow-hidden">
            <input
              className="flex-1 px-4 py-2 md:py-3 outline-none text-sm"
              placeholder="Estoy buscando…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && doSearch()}
              aria-label="Buscar productos"
            />
            <button
              onClick={doSearch}
              className="px-4 md:px-6 py-2 md:py-3 text-sm font-medium bg-emerald-700 text-white hover:bg-emerald-800 focus:bg-emerald-800"
            >
              Buscar
            </button>
          </div>
        </div>

        {/* Sobre nosotros */}
        <div className="shrink-0">
          <Link
            href="/sobre-nosotros"
            className="inline-flex items-center rounded-full border border-emerald-300 px-4 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-50"
          >
            Sobre nosotros
          </Link>
        </div>
      </div>
    </header>
  );
}
