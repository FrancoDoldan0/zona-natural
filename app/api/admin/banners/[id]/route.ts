export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { createPrisma } from '@/lib/prisma-edge';
import { audit } from '@/lib/audit';


const prisma = createPrisma();
// Helper para leer el id sin pelearse con los tipos de Next 15
function readId(ctx: any): number | null {
  const p = ctx?.params;
  const obj = typeof p?.then === 'function' ? undefined : p; // si es promesa, lo resolvemos abajo
  if (obj && obj.id != null) return Number(obj.id);
  return null;
}

export async function GET(req: Request, ctx: any) {
  // En Next 15, ctx.params puede ser objeto o Promesa
  let id = readId(ctx);
  if (id == null && typeof ctx?.params?.then === 'function') {
    const resolved = await ctx.params;
    id = Number(resolved?.id);
  }
  if (!Number.isFinite(id)) {
    return NextResponse.json({ ok: false, error: 'ID inválido' }, { status: 400 });
  }

  const item = await prisma.banner.findUnique({
    where: { id: id! },
  });

  if (!item) {
    return NextResponse.json({ ok: false, error: 'No encontrado' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, item });
}

export async function PUT(req: Request, ctx: any) {
  let id = readId(ctx);
  if (id == null && typeof ctx?.params?.then === 'function') {
    const resolved = await ctx.params;
    id = Number(resolved?.id);
  }
  if (!Number.isFinite(id)) {
    return NextResponse.json({ ok: false, error: 'ID inválido' }, { status: 400 });
  }

  const body = await req.json<any>().catch(() => ({} as any));
  const data: any = {};

  if (typeof body.title === 'string') data.title = body.title.trim();
  if (typeof body.imageUrl === 'string') data.imageUrl = body.imageUrl.trim();
  if (typeof body.link === 'string' || body.link === null) data.link = body.link ?? null;
  if (typeof body.active === 'boolean') data.active = body.active;
  if (typeof body.sortOrder === 'number') data.sortOrder = body.sortOrder;

  const item = await prisma.banner.update({
    where: { id: id! },
    data,
  });

  await audit(req, 'banner.update', 'banner', String(id), { data });

  return NextResponse.json({ ok: true, item });
}

export async function DELETE(req: Request, ctx: any) {
  let id = readId(ctx);
  if (id == null && typeof ctx?.params?.then === 'function') {
    const resolved = await ctx.params;
    id = Number(resolved?.id);
  }
  if (!Number.isFinite(id)) {
    return NextResponse.json({ ok: false, error: 'ID inválido' }, { status: 400 });
  }

  await prisma.banner.delete({ where: { id: id! } });
  await audit(req, 'banner.delete', 'banner', String(id));

  return NextResponse.json({ ok: true });
}
