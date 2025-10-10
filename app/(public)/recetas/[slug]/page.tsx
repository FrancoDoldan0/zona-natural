// app/(public)/recetas/[slug]/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { recipes, type Recipe } from "../recipes";

export const revalidate = 3600;

export async function generateStaticParams() {
  return recipes.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const r = recipes.find((x) => x.slug === params.slug);
  return {
    title: r ? `${r.title} — Recetas` : "Receta no encontrada — Zona Natural",
    // Usamos 'desc' (que sí existe) en lugar de 'excerpt'
    description: r?.desc || "Recetas ricas y naturales.",
  };
}

export default function RecipePage({ params }: { params: { slug: string } }) {
  const r: Recipe | undefined = recipes.find((x) => x.slug === params.slug);
  if (!r) return notFound();

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-5">
      <Link href="/recetas" className="text-sm text-emerald-800 underline">
        ← Volver a recetas
      </Link>

      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">{r.title}</h1>
        {r.desc ? <p className="text-gray-700">{r.desc}</p> : null}
        {r.time ? (
          <p className="text-sm text-gray-600">Tiempo estimado: {r.time}</p>
        ) : null}
      </header>

      {r.image ? (
        <div className="overflow-hidden rounded-xl ring-1 ring-emerald-100">
          <img
            src={r.image}
            alt={r.title}
            className="w-full h-auto object-cover"
            loading="lazy"
            decoding="async"
          />
        </div>
      ) : null}

      {Array.isArray(r.ingredients) && r.ingredients.length > 0 ? (
        <section>
          <h2 className="font-semibold mb-2">Ingredientes</h2>
          <ul className="list-disc ml-6 space-y-1">
            {r.ingredients.map((it, i) => (
              <li key={i}>{it}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {Array.isArray(r.steps) && r.steps.length > 0 ? (
        <section>
          <h2 className="font-semibold mb-2">Pasos</h2>
          <ol className="list-decimal ml-6 space-y-2">
            {r.steps.map((st, i) => (
              <li key={i}>{st}</li>
            ))}
          </ol>
        </section>
      ) : null}
    </main>
  );
}
