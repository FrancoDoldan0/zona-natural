// components/landing/RecipesPopular.tsx
import Link from "next/link";
import { RECIPES } from "@/app/(public)/recetas/recipes";

export default function RecipesPopular() {
  const top = RECIPES.slice(0, 4);

  return (
    <section className="bg-white">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl md:text-2xl font-semibold">Recetas populares</h2>
          <Link href="/recetas" className="text-sm text-emerald-800 underline">
            Ver todas »
          </Link>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {top.map((r) => (
            <Link
              key={r.slug}
              href={`/recetas/${r.slug}`}
              className="group rounded-2xl overflow-hidden ring-1 ring-emerald-100 hover:shadow-md bg-white"
            >
              <div className="relative aspect-[4/3] bg-emerald-50">
                <img
                  src={r.image}
                  alt={r.title}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <div className="p-3">
                <h3 className="text-sm font-medium line-clamp-2">{r.title}</h3>
                <span className="mt-1 inline-block text-sm text-emerald-800 underline">
                  Ver receta
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
