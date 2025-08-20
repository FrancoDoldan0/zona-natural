export const runtime = 'edge';
export default function ProductoPage({ params }: { params: { slug: string } }) {
  return (
    <main>
      <h1>Producto: {params.slug}</h1>
      <p>Detalle mínimo (stub)</p>
    </main>
  );
}