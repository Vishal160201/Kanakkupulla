import prisma from './src/lib/prisma'

async function main() {
  const recycleBinItem = await prisma.recycleBin.findFirst({
    where: { itemType: { in: ['product-order', 'gift', 'frame'] } },
    orderBy: { trashedAt: 'desc' }
  });

  if (!recycleBinItem) {
    console.log("No deleted orders found in recycle bin.");
    return;
  }

  const orderId = recycleBinItem.itemId;
  console.log(`(2) Exact order.id being used: ${orderId}`);

  // Find by productOrderId (this is what originally failed)
  const txsByFk = await prisma.transaction.findMany({
    where: { productOrderId: orderId }
  });
  console.log(`(1) Found by productOrderId:`, txsByFk.length);
  if (txsByFk.length > 0) {
      console.log(txsByFk);
  }

  // Find by description to see if it lost the FK
  const txsByDesc = await prisma.transaction.findMany({
    where: { description: { contains: orderId } }
  });
  console.log(`Found by description instead:`, txsByDesc.length);
  if (txsByDesc.length > 0) {
      console.log(txsByDesc);
  }

  // Check columns
  const cols = await prisma.$queryRaw`SELECT column_name FROM information_schema.columns WHERE table_name = 'Transaction'`;
  console.log(`(3) Transaction columns:`, cols);
}
main()
