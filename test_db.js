const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tx = await prisma.transaction.findFirst({
    where: { description: { contains: 'Tea' } }
  });
  console.log('User ID for Tea:', tx?.userId);
  
  const allTxs = await prisma.transaction.findMany({
    select: { date: true, description: true }
  });
  console.log('All Txs:', allTxs);
}
main().finally(() => prisma.$disconnect());
