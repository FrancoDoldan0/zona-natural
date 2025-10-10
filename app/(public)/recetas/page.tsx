// app/(public)/recetas/page.tsx
export const runtime = "edge";

import Link from "next/link";
import { RECIPES } from "./recipes";

export default function RecipesIndex() {
  return (
    <main className="mx-auto max-w-6xl p-6">
      <h1 className="text-2xl md:text-3xl font-semibold mb-6">Recetas</h1>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {RECIPES.map((r) => (
          <Link
            key={r.slug}
            href={`/recetas/${r.slug}`}
            className="group rounded-2xl overflow-hidden ring-1 ring-emerald-100 hover:shadow-md bg-white"
          >
            <div className="relative aspect-[4/3]">
              <img
                src={r.image}
                alt={r.title}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
                decoding="async"
              />
            </div>
            <div className="p-4">
              <h2 className="font-medium">{r.title}</h2>
              <p className="mt-1 text-sm text-gray-600">
                ⏱ {r.time} · 🍽 {r.serves}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
