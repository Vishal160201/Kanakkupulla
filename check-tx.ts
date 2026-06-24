import prisma from './src/lib/prisma';

async function main() {
  const txs = await prisma.transaction.findMany({
    orderBy: { createdAt: 'asc' },
    take: 10
  });
  console.log('Sample old txs:', JSON.stringify(txs.map(t => ({ id: t.id, type: t.type, amount: t.amount, paymentMode: t.paymentMode, userId: t.userId, date: t.date })), null, 2));
}

main().finally(() => prisma.$disconnect());
