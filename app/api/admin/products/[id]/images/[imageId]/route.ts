export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { deleteUpload } from '@/lib/storage';

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; imageId: string } },
) {
  try {
    const productId = Number(params.id);
    const imageId = Number(params.imageId);
    const body = await req.json().catch(() => ({}));
    const move = String(body.move || '');
    const alt = typeof body.alt === 'string' ? body.alt.slice(0, 200) : undefined;

    if (move === 'up' || move === 'down') {
      const imgs = await prisma.productImage.findMany({
        where: { productId },
        orderBy: { sortOrder: 'asc' },
      });
      const idx = imgs.findIndex((x) => x.id === imageId);
      if (idx === -1) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
      const j = move === 'up' ? idx - 1 : idx + 1;
      if (j >= 0 && j < imgs.length) {
        const a = imgs[idx],
          b = imgs[j];
        await prisma.$transaction([
          prisma.productImage.update({ where: { id: a.id }, data: { sortOrder: b.sortOrder } }),
          prisma.productImage.update({ where: { id: b.id }, data: { sortOrder: a.sortOrder } }),
        ]);
      }
    }
    if (alt !== undefined) {
      await prisma.productImage.update({ where: { id: imageId }, data: { alt: alt || null } });
    }
    const item = await prisma.productImage.findUnique({ where: { id: imageId } });
    return NextResponse.json({ ok: true, item });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: 'update_failed', detail: e?.message ?? String(e) },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; imageId: string } },
) {
  try {
    const imageId = Number(params.imageId);
    const img = await prisma.productImage.findUnique({ where: { id: imageId } });
    if (!img) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });

    // Borrar archivo físico si es /uploads/...
    const url = img.url || '';
    const pfx = '/uploads/';
    const i = url.indexOf(pfx);
    if (i !== -1) {
      const rel = url.slice(i + pfx.length);
      await deleteUpload(rel);
    }
    await prisma.productImage.delete({ where: { id: imageId } });
    return NextResponse.json({ ok: true, id: imageId, deleted: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: 'delete_failed', detail: e?.message ?? String(e) },
      { status: 500 },
    );
  }
}
