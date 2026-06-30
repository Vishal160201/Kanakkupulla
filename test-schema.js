const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const layout = await prisma.layout.findUnique({ where: { id: "BOOKING_FORM" } });
  console.log(JSON.stringify(layout, null, 2));
}
run();
