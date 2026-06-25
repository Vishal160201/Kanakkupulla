import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const order = await prisma.productOrder.create({
    data: {
      orderNumber: '#MDorder-999',
      productId: 'cm0r31vls00085a6a6xdf6xdf', // need a real ID, skip this or just trust the DB
      clientName: 'Test Client',
    }
  });
  console.log(order);
}
main();
