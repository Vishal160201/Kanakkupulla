const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const booking = await prisma.booking.findFirst({
    orderBy: { updatedAt: 'desc' },
    include: { order: true, transactions: true }
  });
  console.log("Booking found:", booking.id);
  console.log("Order:", booking.order);
  console.log("Custom Data:", booking.customData);
  console.log("Transactions:", booking.transactions);
}
run();
