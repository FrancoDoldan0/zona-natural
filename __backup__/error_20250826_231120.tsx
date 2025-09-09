'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error('((web)) error boundary:', error); // se ve en consola del navegador
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-3">
      <h1 className="text-lg font-semibold">Ocurrió un error en esta sección</h1>
      <p className="text-sm text-gray-600">Digest: {error?.digest ?? 's/d'}</p>
      <button onClick={() => reset()} className="border rounded px-3 py-1">
        Reintentar
      </button>
    </div>
  );
}
