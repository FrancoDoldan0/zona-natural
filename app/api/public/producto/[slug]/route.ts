export const runtime = 'edge';
export async function GET(_: Request, ctx: { params: { slug: string } }) {
  return Response.json({ ok: true, slug: ctx.params.slug, product: null });
}