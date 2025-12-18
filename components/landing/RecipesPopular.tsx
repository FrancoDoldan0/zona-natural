// components/landing/RecipesPopular.tsx
// Bloque de “Recetas populares” para la landing.
// Server Component segura: sin handlers de evento.

import Link from "next/link";
import { recipes as RECIPES, FALLBACK_IMG } from "@/app/(public)/recetas/recipes";

export default function RecipesPopular() {
  const top = RECIPES.slice(0, 3);

  return (
    <section className="bg-black">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl md:text-2xl font-semibold text-white">
            Recetas populares
          </h2>
          <Link
            href="/recetas"
            className="text-sm text-emerald-400 hover:underline"
          >
            Ver todas »
          </Link>
        </div>

        <div className="grid gap-4 md:gap-6 md:grid-cols-3">
          {top.map((r) => (
            <Link
              key={r.slug}
              href={`/recetas/${r.slug}`}
              className="block rounded-2xl ring-1 ring-emerald-900/40 bg-zinc-900 overflow-hidden hover:shadow transition-shadow"
            >
              <div className="relative bg-zinc-800 aspect-[16/10]">
                <img
                  src={r.img || FALLBACK_IMG}
                  alt={r.heroAlt || r.title}
                  className="absolute inset-0 h-full w-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <div className="p-4">
                <h3 className="font-medium text-white">{r.title}</h3>
                <p className="text-sm text-zinc-400 line-clamp-2">
                  {r.desc}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
