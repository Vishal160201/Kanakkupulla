const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const b = await prisma.booking.findMany({ select: { id: true, status: true, inclusions: true, customData: true }, take: 10 });
  console.log(JSON.stringify(b, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
