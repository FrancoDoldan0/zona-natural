'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error('ROOT ERROR BOUNDARY:', error);
  return (
    <div style={{ padding: 16, fontFamily: 'ui-sans-serif,system-ui' }}>
      <h1 style={{ fontSize: 18, fontWeight: 600 }}>Se produjo un error</h1>
      <p>
        <b>Mensaje:</b> {String(error?.message ?? 's/d')}
      </p>
      <p>
        <b>Digest:</b> {String((error as any)?.digest ?? 's/d')}
      </p>
      <button
        onClick={() => reset()}
        style={{ border: '1px solid #ccc', borderRadius: 8, padding: '6px 10px' }}
      >
        Reintentar
      </button>
    </div>
  );
}
