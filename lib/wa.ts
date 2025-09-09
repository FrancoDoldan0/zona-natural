// lib/wa.ts
import { getEnv } from '@/lib/cf-env';

export function normalizePhone(v?: string | null): string {
  if (!v) return '';
  // Dejá sólo dígitos (soporta prefijos +, espacios, guiones, etc.)
  return String(v).replace(/[^\d]/g, '');
}

/**
 * Construye el link a WhatsApp. Toma el teléfono en este orden:
 * 1) params.phone (si viene)
 * 2) WA_PHONE (binding/env)
 * 3) WHATSAPP_PHONE (binding/env legacy)
 */
export function buildWaLink(params: { text: string; phone?: string | null }) {
  const env = getEnv();

  const waPhone =
    typeof env.WA_PHONE === 'string' && env.WA_PHONE.trim().length > 0
      ? env.WA_PHONE
      : undefined;

  // WHATSAPP_PHONE puede no estar tipado en RuntimeEnv; lo leemos de forma segura
  const legacyAny = (env as Record<string, unknown>)['WHATSAPP_PHONE'];
  const legacyPhone =
    typeof legacyAny === 'string' && legacyAny.trim().length > 0 ? legacyAny : undefined;

  const phoneFromEnv = normalizePhone(waPhone ?? legacyPhone ?? '');
  const phone = normalizePhone(params.phone) || phoneFromEnv;

  const enc = encodeURIComponent(params.text || '');
  return phone ? `https://wa.me/${phone}?text=${enc}` : `https://wa.me/?text=${enc}`;
}
