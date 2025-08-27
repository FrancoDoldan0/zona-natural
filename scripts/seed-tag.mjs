import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const slug = process.argv[2];
  const tagName = process.argv[3];
  if (!slug || !tagName) {
    console.error("Uso: node scripts/seed-tag.mjs <slug> <tagName>");
    process.exit(1);
  }

  // Producto por slug
  const product = await prisma.product.findUnique({ where: { slug } });
  if (!product) {
    console.error("Producto no encontrado por slug:", slug);
    process.exit(2);
  }

  // Tag por nombre (sin upsert por si name no es UNIQUE)
  let tag = await prisma.tag.findFirst({ where: { name: tagName } });
  if (!tag) {
    tag = await prisma.tag.create({ data: { name: tagName } });
  }

  let attachedVia = null;

  // 1) Intento relación implícita: product.tags.connect
  try {
    await prisma.product.update({
      where: { id: product.id },
      data: { tags: { connect: { id: tag.id } } },
    });
    attachedVia = "product.tags (implícita)";
  } catch (e1) {
    // 2) Fallback: tabla puente explícita ProductTag (productId, tagId)
    try {
      const exists = await prisma.productTag.findFirst({
        where: { productId: product.id, tagId: tag.id }
      });
      if (!exists) {
        await prisma.productTag.create({
          data: { productId: product.id, tagId: tag.id }
        });
      }
      attachedVia = "ProductTag (explícita)";
    } catch (e2) {
      console.error("No pude vincular el tag al producto (ni implícita ni explícita).");
      console.error("Error 1 (implícita):", e1?.message || e1);
      console.error("Error 2 (explícita):", e2?.message || e2);
      process.exit(3);
    }
  }

  console.log(JSON.stringify({
    ok: true,
    product: { id: product.id, slug: product.slug },
    tag: { id: tag.id, name: tag.name },
    attachedVia
  }, null, 2));
}

main().finally(() => prisma.$disconnect());