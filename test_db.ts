import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const schema = await prisma.formLayout.findFirst({ where: { formKey: 'BOOKING_FORM' } });
  if (schema) {
    const layout = schema.schema as any;
    const timeFields = layout.sections.flatMap((s: any) => s.fields).filter((f: any) => f.type === 'TIME' || f.name.toLowerCase().includes('time'));
    console.log(JSON.stringify(timeFields, null, 2));
  } else {
    console.log("Not found");
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
