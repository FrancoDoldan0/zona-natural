export const runtime = 'edge';
import { NextRequest } from 'next/server';
import { json } from '@/lib/json';
import prisma from '@/lib/prisma';
import { computePriceForProduct } from '@/lib/pricing';

export async function GET(_req: NextRequest, ctx: { params: { slug: string } }) {
  const slug = ctx.params.slug;
  const p = await prisma.product.findUnique({
    where: { slug },
    include: {
      images: { orderBy: { sortOrder: 'asc' } },
      category: true,
      subcategory: true,
      productTags: { select: { tagId: true } },
    },
  });
  if (!p || p.status !== 'ACTIVE') return json({ ok: false, error: 'not_found' }, { status: 404 });

  const tags = (p.productTags || []).map((t) => t.tagId);
  const { priceOriginal, priceFinal, offer } = await computePriceForProduct({
    id: p.id,
    price: p.price,
    categoryId: p.categoryId,
    tags,
  });

  const hasDiscount = priceOriginal != null && priceFinal != null && priceFinal < priceOriginal;
  const discountPercent = hasDiscount ? Math.round((1 - priceFinal! / priceOriginal!) * 100) : 0;

  const breadcrumbs = [
    { label: 'Inicio', href: '/' },
    p.category ? { label: p.category.name, href: `/c/${p.category.slug}` } : null,
    p.subcategory
      ? { label: p.subcategory.name, href: `/c/${p.category?.slug}/${p.subcategory.slug}` }
      : null,
  ].filter(Boolean) as any[];

  return json({
    ok: true,
    item: {
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description,
      images: p.images.map((i) => ({ url: i.url, alt: i.alt })),
      priceOriginal,
      priceFinal,
      offer,
      hasDiscount,
      discountPercent,
      category: p.category
        ? { id: p.category.id, name: p.category.name, slug: p.category.slug }
        : null,
      subcategory: p.subcategory
        ? { id: p.subcategory.id, name: p.subcategory.name, slug: p.subcategory.slug }
        : null,
      breadcrumbs,
    },
  });
}
