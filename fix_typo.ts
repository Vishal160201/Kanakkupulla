import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const layout = await prisma.formLayout.findUnique({ where: { formKey: 'GIFT_ORDER_FORM' } });
  if (layout) {
    const schemaStr = JSON.stringify(layout.schema).replace(/REFERANCE/g, 'REFERENCE');
    await prisma.formLayout.update({
      where: { formKey: 'GIFT_ORDER_FORM' },
      data: { schema: JSON.parse(schemaStr) }
    });
    console.log("Fixed typo in GIFT_ORDER_FORM layout");
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
