import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { getEnv } from "./cf-env";

export function createPrisma() {
  const { DATABASE_URL } = getEnv();
  if (!DATABASE_URL) throw new Error("DATABASE_URL no configurada");
  return new PrismaClient({ datasourceUrl: DATABASE_URL }).$extends(withAccelerate());
}