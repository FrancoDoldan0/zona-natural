'use client';
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{ padding: 24, textAlign: 'center' }}>
      <meta name="robots" content="noindex, follow" />
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Se produjo un error</h1>
      <p>Intentá recargar la página.</p>
      <button
        onClick={() => reset()}
        style={{ marginTop: 12, padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8 }}
      >
        Reintentar
      </button>
    </div>
  );
}
