import prisma from './src/lib/prisma.js';

async function main() {
  const orders = await prisma.productOrder.findMany({
    include: { transactions: true }
  });

  let updatedCount = 0;

  for (const order of orders) {
    const customData = (order.customData as any) || {};
    const totalAmount = Number(customData.amount) || 0;
    const advanceAmount = Number(customData.advanceAmount) || 0;

    const collectedAmount = order.transactions
      .filter((t: any) => !t.deletedAt)
      .reduce((sum: number, tx: any) => sum + tx.amount, 0) || advanceAmount;

    const expectedDueAmount = Math.max(0, totalAmount - collectedAmount);

    if (Number(customData.dueAmount) !== expectedDueAmount) {
      customData.dueAmount = expectedDueAmount;
      await prisma.productOrder.update({
        where: { id: order.id },
        data: { customData }
      });
      updatedCount++;
      console.log(`Updated Order ${order.id}: Due Amount -> ${expectedDueAmount}`);
    }
  }

  console.log(`Successfully updated ${updatedCount} existing orders.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
