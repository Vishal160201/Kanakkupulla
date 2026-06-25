import prisma from "../lib/prisma";

async function main() {
  console.log("Starting ProductOrder migration...");
  const orders = await prisma.productOrder.findMany();

  let migratedCount = 0;

  for (const order of orders) {
    const existingCustomData = (order.customData as any) || {};

    const newCustomData = {
      ...existingCustomData,
      clientName: order.clientName,
      clientPhone: order.clientPhone || null,
      productId: order.productId,
      quantity: order.quantity,
      totalAmount: existingCustomData.totalAmount !== undefined 
        ? existingCustomData.totalAmount 
        : (existingCustomData.amount ?? null),
      advanceAmount: existingCustomData.advanceAmount ?? null,
      dueAmount: existingCustomData.dueAmount ?? null,
      paymentMode: existingCustomData.paymentMode ?? null,
      dueDate: existingCustomData.dueDate ?? null,
    };

    // Remove old 'amount' property if it exists to clean up schema to match exactly
    if ('amount' in newCustomData) {
      delete newCustomData.amount;
    }

    await prisma.productOrder.update({
      where: { id: order.id },
      data: {
        customData: newCustomData,
        // We ensure we don't touch orderNumber, thereby preserving it.
      },
    });

    migratedCount++;
  }

  console.log(`Successfully migrated ${migratedCount} ProductOrder records.`);
}

main()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
