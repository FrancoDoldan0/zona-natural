import { NextResponse } from 'next/server';

export function json(data: any, init?: ResponseInit) {
  const headers = new Headers(init?.headers);

  if (!headers.has('content-type')) {
    headers.set('content-type', 'application/json; charset=utf-8');
  }
  // Cache por defecto (se puede sobreescribir en cada endpoint)
  if (!headers.has('cache-control')) {
    headers.set('cache-control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
  }
  return new NextResponse(JSON.stringify(data), { ...init, headers });
}
