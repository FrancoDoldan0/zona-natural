// app/(public)/recetas/page.tsx
export const runtime = "edge";
export const revalidate = 3600;

import Link from "next/link";
import { recipes } from "./recipes";

export default function RecipesIndex() {
  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Recetas</h1>
        <Link
          href="/"
          className="text-sm text-emerald-800 underline"
        >
          ← Volver al inicio
        </Link>
      </header>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {recipes.map((r) => (
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
              <h2 className="font-medium">{r.title}</h2>
              {r.desc ? (
                <p className="text-sm text-gray-600 line-clamp-2">{r.desc}</p>
              ) : null}
              {r.time ? (
                <p className="mt-1 text-xs text-gray-500">⏱ {r.time}</p>
              ) : null}
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
