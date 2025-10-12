// lib/whatsapp.ts
export function buildWhatsAppHref(phoneE164: string, text: string) {
  return `https://wa.me/${phoneE164}?text=${encodeURIComponent(text)}`;
}
