import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const order = await prisma.productOrder.create({
      data: {
        productId: "keychain",
        quantity: 1,
        clientName: "Test Client",
        status: "PENDING",
      }
    });
    console.log("Order created:", order);

    const transaction = await prisma.transaction.create({
      data: {
        productOrderId: order.id,
        amount: 150,
        type: "INCOME",
        date: new Date(),
        category: "GIFTS_AND_FRAMES",
        paymentMode: "CASH",
        status: "SETTLED",
      }
    });
    console.log("Transaction created:", transaction);

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
