import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
try {
  const total = await prisma.transaction.count();
  console.log("Total transactions:", total);
  
  const last5 = await prisma.transaction.findMany({ orderBy: { transactionId: 'desc' }, take: 5, select: { transactionId: true, amount: true, type: true, date: true } });
  console.log("Last 5 transactionIds:", last5.map(t => t.transactionId));
  
  const nullIds = await prisma.transaction.count({ where: { transactionId: null } });
  console.log("Null transactionIds:", nullIds);
  
  const userIds = await prisma.transaction.groupBy({ by: ['userId'], _count: true });
  console.log("UserId distribution:", userIds.map(u => `${u.userId || 'null'}: ${u._count}`));
  
  const types = await prisma.transaction.groupBy({ by: ['type'], _count: true });
  console.log("Types:", types.map(t => `${t.type}: ${t._count}`));
  
  const recentDate = await prisma.transaction.findFirst({ orderBy: { date: 'desc' }, select: { date: true, transactionId: true } });
  console.log("Most recent:", recentDate?.transactionId, recentDate?.date);

  const dates = await prisma.transaction.findMany({ orderBy: { date: 'desc' }, take: 10, select: { date: true, transactionId: true, amount: true, type: true } });
  console.log("\nLast 10 transactions by date:");
  dates.forEach(d => console.log(`  ${d.transactionId} | ${d.date.toISOString().split('T')[0]} | ${d.type} | ₹${d.amount}`));
} finally {
  await prisma.$disconnect();
}
