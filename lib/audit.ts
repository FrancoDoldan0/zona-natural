import { prisma } from "@/lib/prisma";
import { verifySession } from "./auth";

export async function audit(req: Request, action: string, entity: string, entityId?: string|number, details?: any){
  try{
    const cookie = req.headers.get("cookie") || "";
    const m = /(?:^|;\s*)session=([^;]+)/.exec(cookie);
    const token = m?.[1];
    const user = await verifySession(token || undefined);
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "";
    const agent = req.headers.get("user-agent") || "";
    await prisma.auditLog.create({
      data: {
        action, entity, entityId: entityId ? String(entityId) : null,
        userId: user?.sub ? String(user.sub) : null,
        ip: String(ip), userAgent: String(agent),
        details: details ? JSON.stringify(details).slice(0, 5000) : null
      }
    });
  } catch {}
}