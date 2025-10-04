export const runtime = 'edge';

import { NextResponse } from 'next/server';

export function GET(req: Request) {
  const to = new URL('/landing', req.url);
  return NextResponse.redirect(to, 308);
}
