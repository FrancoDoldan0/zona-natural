// app/api/admin/products/[id]/images/route.ts
export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { r2List, r2Delete, publicR2Url } from '@/lib/storage';

type Ctx = { params: { id: string } };

export async function GET(_req: Request, ctx: Ctx) {
  const prefix = `products/${ctx.params.id}/`;
  const list = await r2List(prefix);
  const images = list.map(o => ({ key: o.key, url: publicR2Url(o.key), size: o.size }));
  return NextResponse.json({ images });
}

export async function DELETE(req: Request, ctx: Ctx) {
  const { key } = await req.json().catch(() => ({}));
  if (!key || !key.startsWith(`products/${ctx.params.id}/`)) {
    return NextResponse.json({ error: 'invalid key' }, { status: 400 });
  }
  await r2Delete(key);
  return NextResponse.json({ ok: true });
}
