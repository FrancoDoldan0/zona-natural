export const runtime = 'edge';
export async function GET(_: Request, ctx: { params: { slug: string } }) {
  return Response.json({ ok: true, category: ctx.params.slug, subcategories: [] });
}
