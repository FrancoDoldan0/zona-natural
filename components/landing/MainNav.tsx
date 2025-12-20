"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import CartButton from "@/components/cart/CartButton";

type Subcat = { id: number; name: string; slug?: string };
type Cat = {
  id: number;
  name: string;
  slug?: string;
  subcats?: Subcat[];
  subcategories?: Subcat[];
  children?: Subcat[];
};

function useCategories() {
  const [cats, setCats] = useState<Cat[]>([]);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/public/categories", {
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        const json: any = res.ok ? await res.json().catch(() => ({})) : {};
        const list: any[] = Array.isArray(json?.items)
          ? json.items
          : Array.isArray(json)
          ? json
          : [];
        if (!alive) return;
        const norm: Cat[] = list.map((c: any) => ({
          id: Number(c?.id),
          name: String(c?.name ?? ""),
          slug: c?.slug ?? undefined,
          subcats: (c?.subcats ?? c?.subcategories ?? c?.children ?? []) as Subcat[],
        }));
        setCats(norm);
      } catch {
        setCats([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);
  return { cats };
}

export default function MainNav() {
  const { cats } = useCategories();

  const [open, setOpen] = useState(false);
  const [activeCatId, setActiveCatId] = useState<number | null>(null);

  const [menuRender, setMenuRender] = useState(false);
  const [menuIn, setMenuIn] = useState(false);
  const TRANS_MS = 180;

  useEffect(() => {
    if (open) {
      setMenuRender(true);
      const t = requestAnimationFrame(() => setMenuIn(true));
      return () => cancelAnimationFrame(t);
    } else {
      setMenuIn(false);
      const t = setTimeout(() => setMenuRender(false), TRANS_MS);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (open && !activeCatId && cats.length) setActiveCatId(cats[0].id);
  }, [open, cats, activeCatId]);

  const activeCat = useMemo(
    () => cats.find((c) => c.id === activeCatId) || null,
    [cats, activeCatId]
  );

  const rootRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openNow = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  };

  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => {
      setOpen(false);
      closeTimer.current = null;
    }, 200);
  };

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  return (
    <div className="w-full bg-black text-white">
      <div className="mx-auto max-w-7xl px-3 py-2 flex items-center gap-4 text-sm">
        <div
          ref={rootRef}
          className="relative"
          onMouseEnter={openNow}
          onMouseLeave={scheduleClose}
        >
          <button
            className="rounded-md bg-neutral-900 px-3 py-1 ring-1 ring-neutral-700 hover:bg-neutral-800"
            onClick={() => setOpen(!open)}
            aria-haspopup="menu"
            aria-expanded={open}
          >
            Categorías
          </button>

          {menuRender && (
            <div
              className={`
                absolute left-0 top-full w-[min(92vw,820px)] z-40 rounded-xl
                border border-neutral-800 bg-neutral-950 shadow-xl mt-2
                transition-all duration-200 ease-out will-change-transform
                ${
                  menuIn
                    ? "opacity-100 translate-y-0 scale-100"
                    : "opacity-0 -translate-y-1 scale-[0.98] pointer-events-none"
                }
              `}
              role="menu"
              onMouseEnter={openNow}
              onMouseLeave={scheduleClose}
              style={{ transformOrigin: "24px top" }}
            >
              <div className="grid grid-cols-1 md:grid-cols-3">
                <ul className="md:col-span-1 max-h-[60vh] overflow-auto py-2 no-scrollbar">
                  {cats.map((c) => (
                    <li key={c.id}>
                      <button
                        onMouseEnter={() => setActiveCatId(c.id)}
                        onFocus={() => setActiveCatId(c.id)}
                        onClick={() => setActiveCatId(c.id)}
                        className={`flex w-full items-center justify-between px-4 py-2 text-left hover:bg-neutral-800 ${
                          activeCatId === c.id ? "bg-neutral-800" : ""
                        }`}
                      >
                        <span className="truncate">{c.name}</span>
                        <span className="ml-3 text-xs text-neutral-400">›</span>
                      </button>
                    </li>
                  ))}
                  {!cats.length && (
                    <li className="px-4 py-3 text-neutral-400">Sin categorías</li>
                  )}
                </ul>

                <div className="md:col-span-2 border-t md:border-t-0 md:border-l border-neutral-800 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="font-semibold">
                      {activeCat?.name ?? "Subcategorías"}
                    </div>
                    {!!activeCat && (
                      <Link
                        href={`/catalogo?categoryId=${activeCat.id}`}
                        className="text-neutral-300 hover:underline"
                      >
                        Ver todo
                      </Link>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-1">
                    {(activeCat?.subcats ??
                      activeCat?.subcategories ??
                      activeCat?.children ??
                      []).map((s) => (
                      <Link
                        key={s.id}
                        href={`/catalogo?categoryId=${activeCat!.id}&subcategoryId=${s.id}`}
                        className="rounded-md px-3 py-2 hover:bg-neutral-800"
                      >
                        {s.name}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <Link href="/catalogo" className="hover:underline">
          Tienda
        </Link>

        <Link href="/recetas" className="hover:underline">
          Recetas
        </Link>

        <div className="ml-auto">
          <CartButton />
        </div>
      </div>
    </div>
  );
}
