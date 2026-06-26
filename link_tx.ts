import prisma from './src/lib/prisma.js';

async function main() {
  const result = await prisma.transaction.update({
    where: { id: 'cmqunm2yc001y29gvf5d2re5d' },
    data: { productOrderId: 'cmqunm2wy001x29gvey1l3424' }
  });
  console.log("Updated transaction:", result);
}

main().catch(console.error).finally(() => prisma.$disconnect());
