export const runtime = 'edge';
export async function GET(_: Request, ctx: { params: { id: string } }) {
  return Response.json({ ok: true, id: ctx.params.id });
}
export async function PUT(req: Request, ctx: { params: { id: string } }) {
  const body = await req.json().catch(() => undefined);
  return Response.json({ ok: true, id: ctx.params.id, updated: body ?? null });
}
export async function DELETE(_: Request, ctx: { params: { id: string } }) {
  return Response.json({ ok: true, id: ctx.params.id, deleted: true });
}