// app/(public)/recetas/[slug]/page.tsx
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { RECIPES } from "../recipes";

export const dynamic = "force-static"; // ok para SSG

export async function generateStaticParams() {
  return RECIPES.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const r = RECIPES.find((x) => x.slug === slug);
  return {
    title: r ? `${r.title} — Recetas` : "Receta no encontrada — Zona Natural",
    description: r?.excerpt || r?.desc || "Recetas ricas y naturales.",
  };
}

export default async function RecipePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const r = RECIPES.find((x) => x.slug === slug);
  if (!r) notFound();

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <nav className="text-sm mb-4">
        <Link href="/recetas" className="text-emerald-700 hover:underline">
          ← Volver a recetas
        </Link>
      </nav>

      <h1 className="text-2xl md:text-3xl font-semibold">{r.title}</h1>
      {r.excerpt ? <p className="mt-2 text-gray-700">{r.excerpt}</p> : null}

      {r.image?.src ? (
        <div className="mt-6 overflow-hidden rounded-2xl ring-1 ring-emerald-100">
          <div className="relative aspect-[16/9]">
            <Image
              src={r.image.src}
              alt={r.image.alt || r.title}
              fill
              sizes="(min-width:1024px) 768px, 100vw"
              className="object-cover"
              priority={false}
              unoptimized
            />
          </div>
        </div>
      ) : null}

      <div className="mt-8 grid gap-8 md:grid-cols-2">
        <section>
          <h2 className="text-lg font-semibold mb-3">Ingredientes</h2>
          <ul className="list-disc list-inside space-y-1">
            {r.ingredients?.map((it, i) => <li key={i}>{it}</li>)}
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">Preparación</h2>
          <ol className="list-decimal list-inside space-y-2">
            {r.steps?.map((s, i) => <li key={i}>{s}</li>)}
          </ol>
        </section>
      </div>

      {r.notes ? (
        <p className="mt-6 text-sm text-gray-600">
          <strong>Tip:</strong> {r.notes}
        </p>
      ) : null}
    </main>
  );
}
