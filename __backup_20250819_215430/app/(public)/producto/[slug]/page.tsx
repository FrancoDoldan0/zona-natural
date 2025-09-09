export const runtime = 'edge';

type Props = { params: { slug: string } };

export default function Page({ params }: Props) {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold">Producto: {params.slug}</h1>
      <p className="mt-2 text-sm opacity-75">Stub temporal para compilar.</p>
    </main>
  );
}
