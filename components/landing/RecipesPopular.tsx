// components/landing/RecipesPopular.tsx
import Link from "next/link";
import { recipes } from "@/app/(public)/recetas/recipes";

export default function RecipesPopular() {
  // Simple: mostramos las primeras 3 (puedes reordenar a gusto)
  const top = recipes.slice(0, 3);

  if (!top.length) return null;

  return (
    <section className="bg-white">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl md:text-2xl font-semibold">Recetas populares</h2>
          <Link href="/recetas" className="text-sm text-emerald-800 underline">
            Ver todas
          </Link>
        </div>

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {top.map((r) => (
            <Link
              key={r.slug}
              href={`/recetas/${r.slug}`}
              className="group block rounded-xl overflow-hidden ring-1 ring-emerald-100 hover:shadow"
            >
              <div className="relative aspect-[4/3] bg-emerald-50">
                {r.image ? (
                  <img
                    src={r.image}
                    alt={r.title}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                    decoding="async"
                  />
                ) : null}
              </div>
              <div className="p-3">
                <h3 className="font-medium">{r.title}</h3>
                {r.desc ? (
                  <p className="text-sm text-gray-600 line-clamp-2">{r.desc}</p>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
