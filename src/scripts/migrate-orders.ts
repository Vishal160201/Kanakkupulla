import prisma from '../lib/prisma';
import { asJsonRecord } from '../lib/validations/common';

async function main() {
  
  const orders = await prisma.productOrder.findMany({
    include: { transactions: true }
  });
  
  
  let migratedCount = 0;
  
  for (const order of orders) {
    const customData = asJsonRecord(order.customData);
    
    const advance = Number(customData.advanceAmount) || 0;
    const due = Number(customData.dueAmount) || 0;
    const currentAmount = customData.amount !== undefined ? Number(customData.amount) : undefined;
    
    // Calculate expected amount
    let expectedAmount = advance + due;
    
    if (expectedAmount === 0 && order.transactions.length > 0) {
      expectedAmount = order.transactions.reduce((sum, tx) => sum + tx.amount, 0);
    }
    
    if (currentAmount === undefined) {
      
      const updatedCustomData = {
        ...customData,
        amount: expectedAmount,
        advanceAmount: advance,
        dueAmount: due
      };
      
      await prisma.productOrder.update({
        where: { id: order.id },
        data: { customData: updatedCustomData }
      });
      
      migratedCount++;
    }
  }

  console.log(`Migrated ${migratedCount} of ${orders.length} orders.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
