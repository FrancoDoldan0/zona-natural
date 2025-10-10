// app/(public)/recetas/[slug]/page.tsx
export const runtime = "edge";

import Link from "next/link";
import { notFound } from "next/navigation";
import { RECIPES } from "../recipes";

export async function generateStaticParams() {
  return RECIPES.map((r) => ({ slug: r.slug }));
}

export default function RecipeDetail({
  params,
}: {
  params: { slug: string };
}) {
  const recipe = RECIPES.find((r) => r.slug === params.slug);
  if (!recipe) return notFound();

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-6">
      <Link href="/recetas" className="text-sm underline text-emerald-800">
        ← Volver a recetas
      </Link>

      <h1 className="text-2xl md:text-3xl font-semibold">{recipe.title}</h1>

      <div className="relative overflow-hidden rounded-2xl ring-1 ring-emerald-100">
        <div className="aspect-[16/9]">
          <img
            src={recipe.image}
            alt={recipe.title}
            className="absolute inset-0 w-full h-full object-cover"
            loading="eager"
            decoding="async"
          />
        </div>
      </div>

      <p className="text-gray-700">{recipe.intro}</p>

      <p className="text-sm text-gray-600">⏱ {recipe.time} · 🍽 {recipe.serves}</p>

      <section className="grid gap-6 sm:grid-cols-2">
        <div>
          <h2 className="font-semibold mb-2">Ingredientes</h2>
          <ul className="list-disc pl-5 space-y-1">
            {recipe.ingredients.map((it, i) => <li key={i}>{it}</li>)}
          </ul>
        </div>
        <div>
          <h2 className="font-semibold mb-2">Pasos</h2>
          <ol className="list-decimal pl-5 space-y-2">
            {recipe.steps.map((it, i) => <li key={i}>{it}</li>)}
          </ol>
        </div>
      </section>
    </main>
  );
}
