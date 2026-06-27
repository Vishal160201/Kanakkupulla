const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // 1. Create a mock product order
  const order = await prisma.productOrder.create({
    data: {
      orderNumber: "TEST-DEL-123",
      productId: "test-product",
      quantity: 1,
      clientName: "Test Client",
      status: "PENDING"
    }
  });
  
  // 2. Create a mock transaction
  const tx = await prisma.transaction.create({
    data: {
      amount: 100,
      type: "INCOME",
      date: new Date(),
      category: "TEST",
      paymentMode: "Cash",
      productOrderId: order.id
    }
  });

  console.log("Created order and tx:", order.id, tx.id);

  // 3. Delete order
  await prisma.productOrder.delete({ where: { id: order.id } });
  console.log("Deleted order");

  // 4. Check if tx still exists
  const checkTx = await prisma.transaction.findUnique({ where: { id: tx.id } });
  console.log("Tx after order delete:", checkTx ? "EXISTS, productOrderId = " + checkTx.productOrderId : "DELETED");

  // Cleanup
  if (checkTx) {
    await prisma.transaction.delete({ where: { id: tx.id } });
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
