import prisma from './src/lib/prisma.js';

async function main() {
  const txs = await prisma.transaction.findMany({
    where: { description: { contains: 'cmq' } }
  });
  
  console.log(`Found ${txs.length} transactions to update.`);
  let updatedCount = 0;

  for (const tx of txs) {
    if (!tx.description) continue;
    
    // Extract the raw CUID starting with cmq
    const match = tx.description.match(/(cmq[a-zA-Z0-9]+)/);
    if (!match) continue;
    
    const orderId = match[1];
    
    const order = await prisma.productOrder.findUnique({
      where: { id: orderId },
      include: { product: true }
    });
    
    if (order) {
      const orderNumber = order.orderNumber || `#MDorder-${order.id.slice(-6).toUpperCase()}`;
      let newDesc = tx.description.replace(orderId, orderNumber);
      
      const productName = order.product?.name || 'Unknown Product';
      // Append product name if not already there
      if (!newDesc.includes(`(${productName})`)) {
        newDesc = `${newDesc} (${productName})`;
      }
      
      await prisma.transaction.update({
        where: { id: tx.id },
        data: { description: newDesc }
      });
      console.log(`Updated: ${tx.description} -> ${newDesc}`);
      updatedCount++;
    } else {
      console.log(`Order not found for ID: ${orderId}`);
    }
  }
  
  console.log(`Successfully updated ${updatedCount} transactions.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
