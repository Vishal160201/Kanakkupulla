import prisma from './src/lib/prisma.js';

async function main() {
  const txs = await prisma.transaction.findMany({
    where: { description: { contains: 'Advance' } }
  });
  console.log(txs.map(t => ({ id: t.id, desc: t.description, deletedAt: t.deletedAt, productOrderId: t.productOrderId })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
