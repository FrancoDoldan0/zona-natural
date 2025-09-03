export async function GET() {
  return Response.json({ ok: true, offers: [] });
}
export async function POST(req: Request) {
  const body = await req.json().catch(() => undefined);
  return Response.json({ ok: true, created: body ?? null });
}
