'use client';

import { useState, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function AdminLoginPage() {
  const router = useRouter();
  const search = useSearchParams();

  // Si el middleware agregó ?next=/algo lo respetamos; si no, vamos a /admin.
  const next = decodeURIComponent(search.get('next') || '/admin');

  const [email, setEmail] = useState('');        // mejor no autocompletar admin@local por defecto
  const [password, setPassword] = useState('');  // ni la contraseña
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;

    setError(null);
    setLoading(true);

    try {
      const payload = {
        email: (email || '').trim().toLowerCase(),
        password: password || '',
      };

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include', // necesario para que el browser acepte la cookie httpOnly
      });

      const data: any = await res.json().catch(() => ({}));

      if (!res.ok || !data?.ok) {
        setError(data?.error || 'Credenciales inválidas');
        setLoading(false);
        return;
      }

      // ✅ redirige a ?next si existe, si no al dashboard /admin
      router.replace(next);
    } catch {
      setError('Error de red. Intentalo de nuevo.');
      setLoading(false);
    }
  }

  return (
    <main className="max-w-sm mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Acceso admin</h1>

      <form onSubmit={onSubmit} className="space-y-3">
        <label className="block">
          <span className="sr-only">Email</span>
          <input
            className="border rounded w-full p-2"
            type="email"
            inputMode="email"
            autoComplete="username"
            placeholder="admin@tudominio.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        <label className="block">
          <span className="sr-only">Contraseña</span>
          <input
            className="border rounded w-full p-2"
            type="password"
            autoComplete="current-password"
            placeholder="********"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button
          className="border rounded px-4 py-2 disabled:opacity-60"
          type="submit"
          disabled={loading}
        >
          {loading ? 'Entrando…' : 'Entrar'}
        </button>

        {/* Pista para devs: mostrar a dónde vamos a redirigir luego del login */}
        <p className="text-xs text-gray-500">Redirige a: {next}</p>
      </form>
    </main>
  );
}
