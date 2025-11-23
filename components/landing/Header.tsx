// components/landing/Header.tsx
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type Suggestion = {
  id: number;
  name: string;
  slug: string;
  cover?: string | null;
  priceFinal?: number | null;
  priceOriginal?: number | null;
};

// normalizar texto: minúsculas + sin acentos
const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}+/gu, "");

export default function Header() {
  const [q, setQ] = useState("");
  const [scrolled, setScrolled] = useState(false);

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // 🔍 Buscar sugerencias mientras se escribe (SOLO por nombre)
  useEffect(() => {
    const term = q.trim();

    if (!term) {
      setSuggestions([]);
      setSuggestionsOpen(false);
      return;
    }

    const controller = new AbortController();

    const timer = setTimeout(async () => {
      try {
        setLoadingSuggestions(true);

        // pedimos un poco más (20) y después filtramos por nombre en el front
        const params = new URLSearchParams({
          q: term,
          status: "all",
          perPage: "20",
          sort: "-sold",
        });

        const res = await fetch(`/api/public/catalogo?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!res.ok) {
          setSuggestions([]);
          setSuggestionsOpen(false);
          return;
        }

        const json: any = await res.json().catch(() => ({}));
        const items: Suggestion[] = Array.isArray(json?.items) ? json.items : [];

        const normTerm = normalize(term);
        // 🔧 SOLO sugerencias donde el nombre contenga el término
        const byName = items.filter(
          (it) => it?.name && normalize(it.name).includes(normTerm)
        );

        const final = byName.slice(0, 5); // mostramos hasta 5

        setSuggestions(final);
        setSuggestionsOpen(final.length > 0);
      } catch {
        if (!controller.signal.aborted) {
          setSuggestions([]);
          setSuggestionsOpen(false);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoadingSuggestions(false);
        }
      }
    }, 250); // pequeño debounce

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q]);

  // Cerrar sugerencias un poco después del blur para permitir clicks
  const closeSuggestionsSoon = () => {
    setTimeout(() => setSuggestionsOpen(false), 120);
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
          {/* 🔧 <form> que navega igual que el buscador del catálogo */}
          <form
            className="relative w-full rounded-full ring-1 ring-emerald-200 bg-white overflow-visible"
            action="/catalogo"
            method="get"
            onSubmit={(e) => {
              const term = q.trim();
              if (!term) {
                e.preventDefault();
                return;
              }
              setSuggestionsOpen(false);
            }}
          >
            <input
              className="block w-full min-w-0 h-11 md:h-12 rounded-full px-4 pr-14 outline-none text-sm"
              placeholder="Estoy buscando…"
              name="query"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onFocus={() => suggestions.length && setSuggestionsOpen(true)}
              onBlur={closeSuggestionsSoon}
              aria-label="Buscar productos"
            />
            <button
              type="submit"
              onBlur={closeSuggestionsSoon}
              className="absolute inset-y-0 right-0 m-1 px-4 md:px-5 rounded-full text-sm font-medium bg-emerald-700 text-white hover:bg-emerald-800 focus:bg-emerald-800 active:bg-emerald-900"
              aria-label="Buscar"
            >
              Buscar
            </button>

            {/* Dropdown de sugerencias */}
            {suggestionsOpen && (
              <div className="absolute left-0 right-0 top-full mt-1 rounded-2xl border border-emerald-100 bg-white shadow-lg max-h-80 overflow-auto z-50">
                {loadingSuggestions && !suggestions.length && (
                  <div className="px-4 py-3 text-xs text-gray-500">
                    Buscando productos…
                  </div>
                )}

                {!loadingSuggestions && !suggestions.length && (
                  <div className="px-4 py-3 text-xs text-gray-500">
                    No encontramos productos para “{q.trim()}”.
                  </div>
                )}

                {suggestions.map((s) => {
                  const price =
                    typeof s.priceFinal === "number"
                      ? s.priceFinal
                      : typeof s.priceOriginal === "number"
                      ? s.priceOriginal
                      : null;

                  return (
                    <Link
                      key={s.id}
                      href={`/producto/${s.slug}`}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-emerald-50"
                      onClick={() => setSuggestionsOpen(false)}
                    >
                      {s.cover && (
                        <img
                          src={s.cover}
                          alt={s.name}
                          className="h-12 w-12 rounded object-cover flex-shrink-0"
                          loading="lazy"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{s.name}</p>
                        {price != null && (
                          <p className="text-xs text-emerald-700 mt-0.5">
                            ${price.toLocaleString("es-UY")}
                          </p>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </form>
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
