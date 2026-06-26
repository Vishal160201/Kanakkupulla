const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const layout = await prisma.formLayout.findUnique({ where: { formKey: 'GIFT_ORDER_FORM' } });
  console.log(JSON.stringify(layout.schema, null, 2));
}
run();
