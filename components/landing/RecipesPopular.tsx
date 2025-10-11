// Bloque de “Recetas populares” para la landing.
// Ahora trae el dataset y tiene fallback de imagen.

import Link from "next/link";
import { recipes as RECIPES, FALLBACK_IMG } from "@/app/(public)/recetas/recipes";

export default function RecipesPopular() {
  const top = RECIPES.slice(0, 3);

  return (
    <section className="bg-white">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl md:text-2xl font-semibold">Recetas populares</h2>
          <Link
            href="/recetas"
            className="text-sm text-emerald-800 hover:underline"
          >
            Ver todas »
          </Link>
        </div>

        <div className="grid gap-4 md:gap-6 md:grid-cols-3">
          {top.map((r) => (
            <Link
              key={r.slug}
              href={`/recetas/${r.slug}`}
              className="block rounded-2xl ring-1 ring-emerald-100 bg-white overflow-hidden hover:shadow transition-shadow"
            >
              <div className="relative bg-emerald-50 aspect-[16/10]">
                <img
                  src={r.img || FALLBACK_IMG}
                  alt={r.heroAlt || r.title}
                  className="absolute inset-0 h-full w-full object-cover"
                  loading="lazy"
                  decoding="async"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = FALLBACK_IMG;
                  }}
                />
              </div>
              <div className="p-4">
                <h3 className="font-medium">{r.title}</h3>
                <p className="text-sm text-gray-600 line-clamp-2">{r.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
