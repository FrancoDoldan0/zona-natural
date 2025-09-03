export const runtime = 'edge';
export default async function OfertasPage() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/api/admin/offers`, {
    cache: 'no-store',
  }).catch(() => null);
  const data = res ? await res.json() : { ok: false, data: [] };
  return (
    <main>
      <h1>Ofertas</h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </main>
  );
}
