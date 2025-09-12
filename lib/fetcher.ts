// lib/fetcher.ts
export async function api<T>(url: string, init: RequestInit = {}) {
  const res = await fetch(url, {
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
      ...(init.headers || {}),
    },
    ...init,
  });

  if (res.status === 401) {
    if (typeof window !== 'undefined') {
      const next = encodeURIComponent(location.pathname + location.search);
      location.href = `/admin/login?next=${next}`;
    }
    throw new Error('unauthorized');
  }

  return (await res.json()) as T;
}
