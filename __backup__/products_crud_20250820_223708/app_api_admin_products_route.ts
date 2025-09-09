export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get('q') ?? '';
  const status = url.searchParams.get('status') ?? '';
  const cid = url.searchParams.get('categoryId');
  const sid = url.searchParams.get('subcategoryId');
  const take = Math.min(parseInt(url.searchParams.get('take') || '50', 10), 200);
  const skip = parseInt(url.searchParams.get('skip') || '0', 10);

  const where: any = {};
  if (q)
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { slug: { contains: q, mode: 'insensitive' } },
      { sku: { contains: q, mode: 'insensitive' } },
    ];
  if (status) where.status = status;
  if (cid && Number.isInteger(Number(cid))) where.categoryId = Number(cid);
  if (sid && Number.isInteger(Number(sid))) where.subcategoryId = Number(sid);

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { id: 'desc' },
      take,
      skip,
      include: { category: true, subcategory: true },
    }),
    prisma.product.count({ where }),
  ]);
  return NextResponse.json({ ok: true, items, total });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name: string | undefined = body?.name;
    if (!name || !name.trim())
      return NextResponse.json({ ok: false, error: 'Nombre requerido' }, { status: 400 });

    const slug: string = body?.slug?.trim() ? slugify(body.slug) : slugify(name);
    const data: any = {
      name: name.trim(),
      slug,
      description: typeof body?.description === 'string' ? body.description : null,
      price: body?.price != null && !Number.isNaN(Number(body.price)) ? Number(body.price) : null,
      sku: typeof body?.sku === 'string' ? body.sku : null,
      status: typeof body?.status === 'string' ? body.status : 'ACTIVE',
    };
    if (body?.categoryId != null)
      data.categoryId = Number.isInteger(Number(body.categoryId)) ? Number(body.categoryId) : null;
    if (body?.subcategoryId != null)
      data.subcategoryId = Number.isInteger(Number(body.subcategoryId))
        ? Number(body.subcategoryId)
        : null;

    const item = await prisma.product.create({ data });
    return NextResponse.json({ ok: true, item });
  } catch {
    return NextResponse.json({ ok: false, error: 'Bad request' }, { status: 400 });
  }
}
