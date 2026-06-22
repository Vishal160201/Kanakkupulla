import prisma from './src/lib/prisma';

async function main() {
  console.log('Testing aggregate...');
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  try {
    const res = await prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { type: 'INCOME', date: { gte: todayStart, lte: todayEnd } }
    });
    console.log('Result:', res);
  } catch (error) {
    console.error('Error:', error);
  }
}

main().finally(() => prisma.$disconnect());
