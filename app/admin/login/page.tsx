'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('admin@local');
  const [password, setPassword] = useState('admin123');
  const [err, setErr] = useState('');
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json<any>();
    if (data.ok) router.push('/admin/ofertas');
    else setErr(data.error || 'Error');
  }

  return (
    <main className="max-w-sm mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Acceso admin</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <input
          className="border rounded w-full p-2"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
        />
        <input
          className="border rounded w-full p-2"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
        />
        {err && <p className="text-red-600 text-sm">{err}</p>}
        <button className="border rounded px-4 py-2" type="submit">
          Entrar
        </button>
      </form>
    </main>
  );
}
