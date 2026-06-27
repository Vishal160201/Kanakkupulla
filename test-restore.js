const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const recycleBinItems = await prisma.recycleBin.findMany({
    where: { itemType: 'product-order' },
    orderBy: { createdAt: 'desc' },
    take: 1
  });
  console.log("Recycle Bin Item:", JSON.stringify(recycleBinItems, null, 2));

  if (recycleBinItems.length > 0) {
    const item = recycleBinItems[0];
    const data = item.originalData;
    console.log("Original Transactions:", data.transactions);
    
    if (data.transactions) {
      const txIds = data.transactions.map(t => t.id);
      const txsInDb = await prisma.transaction.findMany({
        where: { id: { in: txIds } }
      });
      console.log("Transactions currently in DB:", txsInDb);
    }
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
