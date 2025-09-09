import { createPrisma } from '@/lib/prisma-edge';
import { verifySession } from './auth';

export async function audit(
  req: Request,
  action: string,
  entity: string,
  entityId?: string | number,
  details?: unknown,
): Promise<void> {
  try {
    const prisma = createPrisma();

    // Cookie -> token de sesión (simple, compatible con Edge)
    const cookie = req.headers.get('cookie') || '';
    const m = /(?:^|;\s*)session=([^;]+)/.exec(cookie);
    const token = m?.[1];

    // Usuario (si existe sesión)
    const user = await verifySession(token || undefined);

    // IP en Cloudflare/Edge: cf-connecting-ip es la más confiable
    const ip =
      req.headers.get('cf-connecting-ip') ||
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      '';

    const agent = req.headers.get('user-agent') || '';

    await prisma.auditLog.create({
      data: {
        action,
        entity,
        entityId: entityId != null ? String(entityId) : null,
        userId: user?.sub ? String(user.sub) : null,
        ip: String(ip),
        userAgent: String(agent),
        details:
          details !== undefined && details !== null
            ? String(
                typeof details === 'string' ? details : JSON.stringify(details)
              ).slice(0, 5000)
            : null,
      },
    });
  } catch {
    // No interrumpimos el flujo del request por errores de auditoría
  }
}
