export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { siteUrl } from '@/lib/site';
import prisma from '@/lib/prisma';

// ---- utils ----
function isTruthy(v?: string | null) {
  return ['1', 'true', 'yes', 'on'].includes(String(v ?? '').toLowerCase());
}
function digits(s?: string | null) {
  return (s ?? '').replace(/\D+/g, '');
}

/** Normaliza SOLO mÃ³viles UY a E.164: 5989XXXXXXX (9 + 7)
 *  Acepta: 5989XXXXXXX  |  09XXXXXXX  |  9XXXXXXX
 */
function normalizeUyMobile(raw?: string | null): string | null {
  const d = digits(raw);
  if (!d) return null;

  if (d.startsWith('598')) {
    return /^5989\d{7}$/.test(d) ? d : null;
  }
  const noZero = d.replace(/^0+/, ''); // 09xxxxxxx -> 9xxxxxxx
  return /^9\d{7}$/.test(noZero) ? '598' + noZero : null;
}

function isUyMobile(e164: string | null): e164 is string {
  return typeof e164 === 'string' && /^5989\d{7}$/.test(e164);
}

// ---- handler ----
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get('slug') || '';
    const qty = parseInt(String(url.searchParams.get('qty') ?? '1'), 10);
    const dry = isTruthy(url.searchParams.get('dry'));

    // Siempre .env (ignora ?phone)
    const phoneRaw = process.env.WA_PHONE || '';
    const phoneE164 = normalizeUyMobile(phoneRaw);

    if (!isUyMobile(phoneE164)) {
      const msg = 'ConfigurÃ¡ WA_PHONE en .env como mÃ³vil uruguayo en E.164: 5989XXXXXXX.';
      if (dry) {
        return NextResponse.json(
          { ok: false, error: msg },
          {
            status: 400,
            headers: { 'cache-control': 'no-store' },
          },
        );
      }
      return new NextResponse(msg, {
        status: 400,
        headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' },
      });
    }

    // (Opcional) nombre de producto â€” tolerante a fallos
    let name = 'Producto';
    if (slug) {
      try {
        const p = await prisma.product.findUnique({
          where: { slug },
          select: { name: true, status: true },
        });
        if (p && p.status === 'ACTIVE') name = p.name;
      } catch {}
    }

    const q = Number.isFinite(qty) && qty > 0 ? qty : 1;
    const link = slug ? `${siteUrl}/producto/${slug}` : siteUrl;
    const text = `Hola! Quiero pedir: ${name}\nCantidad: ${q}\nLink: ${link}`;
    const wa = `https://wa.me/${phoneE164}?text=${encodeURIComponent(text)}`;

    if (dry) {
      return NextResponse.json(
        { ok: true, url: wa },
        {
          headers: { 'cache-control': 'no-store' },
        },
      );
    }

    {
      const res = NextResponse.redirect(wa, 302);
      res.headers.set('cache-control', 'no-store');
      return res;
    }
  } catch (err: any) {
    // Nunca 500 "en crudo": devolvemos JSON con detalle mÃ­nimo
    return NextResponse.json(
      { ok: false, error: 'wa_endpoint_failed', detail: String(err?.message ?? err) },
      { status: 500, headers: { 'cache-control': 'no-store' } },
    );
  }
}
