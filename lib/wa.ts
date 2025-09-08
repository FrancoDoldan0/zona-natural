import { getEnv } from '@/lib/cf-env';
export function normalizePhone(raw?: string | null): string | null {
  if (!raw) return null;
  const digits = String(raw).replace(/\D+/g, '');
  return digits.length ? digits : null;
}
export function buildWaLink(params: { text: string; phone?: string | null }) {
  const phoneFromEnv = normalizePhone(getEnv().WA_PHONE || getEnv().WHATSAPP_PHONE || '');
  const phone = normalizePhone(params.phone) || phoneFromEnv;
  const enc = encodeURIComponent(params.text || '');
  return phone ? `https://wa.me/${phone}?text=${enc}` : `https://wa.me/?text=${enc}`;
}
