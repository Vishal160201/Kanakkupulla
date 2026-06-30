const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const layout = await prisma.formLayout.findUnique({ where: { formKey: "BOOKING_FORM" } });
  console.log(JSON.stringify((layout?.schema?.sections || []).find((s) => s.title === "Focus"), null, 2));
}
main();
