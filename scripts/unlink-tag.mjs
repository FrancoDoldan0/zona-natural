import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const slug = process.argv[2];
  const tagName = process.argv[3];
  if (!slug || !tagName) {
    console.error("Uso: node scripts/unlink-tag.mjs <slug> <tagName>");
    process.exit(1);
  }
  const product = await prisma.product.findUnique({ where: { slug } });
  const tag = await prisma.tag.findFirst({ where: { name: tagName } });
  if (!product || !tag) {
    console.log(JSON.stringify({ ok: true, note: "Producto o tag no existen, nada que hacer." }, null, 2));
    return;
  }
  let detachedVia = null;
  // Implícita
  try {
    await prisma.product.update({
      where: { id: product.id },
      data: { tags: { disconnect: { id: tag.id } } },
    });
    detachedVia = "product.tags (implícita)";
  } catch (e1) {
    // Explícita
    try {
      await prisma.productTag.deleteMany({ where: { productId: product.id, tagId: tag.id } });
      detachedVia = "ProductTag (explícita)";
    } catch (e2) {
      console.error("No pude desvincular el tag (ni implícita ni explícita).");
      console.error("Error 1:", e1?.message || e1);
      console.error("Error 2:", e2?.message || e2);
      process.exit(3);
    }
  }
  console.log(JSON.stringify({ ok: true, product: product.id, tag: tag.id, detachedVia }, null, 2));
}
main().finally(() => prisma.$disconnect());