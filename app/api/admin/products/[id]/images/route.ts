// app/api/admin/products/[id]/images/route.ts
export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { r2List, r2Delete, publicR2Url } from '@/lib/storage';

// GET /api/admin/products/:id/images
export async function GET(_req: Request, { params }: any) {
  const id = params?.id as string | undefined;
  if (!id) {
    return NextResponse.json({ error: 'missing product id' }, { status: 400 });
  }

  const prefix = `products/${id}/`;
  const list = await r2List(prefix);
  const images = list.map((o) => ({
    key: o.key,
    url: publicR2Url(o.key),
    size: o.size,
  }));

  return NextResponse.json({ images });
}

// DELETE /api/admin/products/:id/images
export async function DELETE(req: Request, { params }: any) {
  const id = params?.id as string | undefined;
  if (!id) {
    return NextResponse.json({ error: 'missing product id' }, { status: 400 });
  }

  const body = (await req.json<any>().catch(() => ({}))) as { key?: string };
  const key = body?.key;

  if (!key || !key.startsWith(`products/${id}/`)) {
    return NextResponse.json({ error: 'invalid key' }, { status: 400 });
  }

  await r2Delete(key);
  return NextResponse.json({ ok: true });
}
