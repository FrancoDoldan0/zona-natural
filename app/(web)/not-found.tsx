export default function NotFound() {
  return (
    <div style={{ padding: 24, textAlign: 'center' }}>
      <meta name="robots" content="noindex, follow" />
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Página no encontrada</h1>
      <p>Lo sentimos, el recurso solicitado no existe.</p>
      <a
        href="/"
        style={{
          display: 'inline-block',
          marginTop: 12,
          color: '#2563eb',
          textDecoration: 'underline',
        }}
      >
        Volver al inicio
      </a>
    </div>
  );
}
