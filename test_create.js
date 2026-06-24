const { PrismaClient } = require('@prisma/client');
const { generateNextTransactionId } = require('./src/lib/transactionId.js');
const prisma = new PrismaClient();

async function main() {
  try {
    const last = await prisma.transaction.findFirst({
      where: { transactionId: { not: null } },
      orderBy: { transactionId: 'desc' },
      select: { transactionId: true },
    });
    console.log("Last transactionId:", last);

    let nextNum = 1;
    if (last?.transactionId) {
      const match = last.transactionId.match(/#MDTXN-(\d+)/);
      if (match) {
        nextNum = parseInt(match[1], 10) + 1;
      }
    }
    const transactionId = `#MDTXN-${String(nextNum).padStart(3, '0')}`;
    console.log("Generated transactionId:", transactionId);

    const newTransaction = await prisma.transaction.create({
      data: {
        transactionId,
        amount: 10,
        type: "INCOME",
        date: new Date(),
        category: "Test",
        paymentMode: "UPI",
        description: "Test transaction",
        status: "SETTLED",
      },
    });
    console.log("Created successfully:", newTransaction);
  } catch (err) {
    console.error("Prisma Error:", err);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
