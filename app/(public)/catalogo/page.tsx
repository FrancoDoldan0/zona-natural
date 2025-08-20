export const runtime = 'edge';
export default async function CatalogoPage() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/api/public/catalogo`, { cache: "no-store" }).catch(() => null);
  const data = res ? await res.json() : { ok: false, items: [] };
  return (
    <main>
      <h1>Catálogo</h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </main>
  );
}