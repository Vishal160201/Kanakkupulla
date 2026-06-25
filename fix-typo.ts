import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const layout = await prisma.formLayout.findUnique({ where: { formKey: "GIFT_ORDER_FORM" } });
  if (layout && layout.schema) {
    const schema = layout.schema as any;
    schema.sections.forEach((sec: any) => {
      sec.fields.forEach((f: any) => {
        if (f.name.toUpperCase() === "REFERANCE IMAGE") {
          f.name = "Reference Image";
        }
      });
    });
    await prisma.formLayout.update({
      where: { formKey: "GIFT_ORDER_FORM" },
      data: { schema }
    });
    console.log("Fixed typo in DB layout");
  }
}
main().finally(() => prisma.$disconnect());
