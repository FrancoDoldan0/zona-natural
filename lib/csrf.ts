/** Edge-safe CSRF helpers (no Node "crypto") */

function genRandomHex(bytes = 16): string {
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    const arr = new Uint8Array(bytes);
    crypto.getRandomValues(arr);
    let out = '';
    for (const b of arr) out += b.toString(16).padStart(2, '0');
    return out;
  }
  // Fallback (no Edge): suficiente para dev; en prod siempre hay Web Crypto.
  return (
    Date.now().toString(36) +
    Math.random().toString(36).slice(2) +
    Math.random().toString(36).slice(2)
  )
    .replace(/[^a-f0-9]/gi, '')
    .slice(0, bytes * 2);
}

export function ensureCsrfCookie(
  req: Request,
  setCookie: (name: string, value: string, opts: any) => void,
) {
  const cookie = req.headers.get('cookie') || '';
  const m = /(?:^|;\s*)csrf=([^;]+)/.exec(cookie);
  const val = m?.[1];
  if (!val) {
    const token = genRandomHex(16);
    setCookie('csrf', token, { httpOnly: false, sameSite: 'lax', path: '/' });
    return token;
  }
  return decodeURIComponent(val);
}

export function isStateChanging(method: string) {
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase());
}

export function checkCsrf(req: Request) {
  const cookie = req.headers.get('cookie') || '';
  const m = /(?:^|;\s*)csrf=([^;]+)/.exec(cookie);
  const cookieVal = m?.[1] ? decodeURIComponent(m[1]) : '';
  const hdr = req.headers.get('x-csrf-token') || '';
  return !!cookieVal && cookieVal === hdr;
}
