// app/route.ts
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'; // evita prerender
export const revalidate = 0;

export function GET(req: Request) {
  return NextResponse.redirect(new URL('/landing', req.url), 308);
}

// opcional: responde a HEAD también
export function HEAD(req: Request) {
  return NextResponse.redirect(new URL('/landing', req.url), 308);
}
