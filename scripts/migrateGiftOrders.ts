import prisma from '../src/lib/prisma';

async function main() {
  const orders = await prisma.productOrder.findMany();
  
  const allFieldIds = [
    "fld_g_product",
    "fld_g_quantity",
    "fld_g_due_date",
    "fld_g_reference_image",
    "fld_g_size",
    "fld_g_model",
    "fld_g_type",
    "fld_g_event",
    "fld_g_client_name",
    "fld_g_client_phone",
    "fld_g_amount",
    "fld_g_advance",
    "fld_g_due",
    "fld_g_payment_mode"
  ];
  
  let migratedCount = 0;

  for (const order of orders) {
    let customData: any = {};
    
    if (order.customData) {
      if (typeof order.customData === 'string') {
        try {
          customData = JSON.parse(order.customData);
        } catch (e) {
          customData = {};
        }
      } else {
        customData = { ...(order.customData as any) };
      }
    }
    
    // Fill missing fields with null
    for (const f of allFieldIds) {
      if (customData[f] === undefined) {
        customData[f] = null;
      }
    }
    
    await prisma.productOrder.update({
      where: { id: order.id },
      data: {
        customData
      }
    });
    
    migratedCount++;
  }
  
  console.log(`Successfully migrated ${migratedCount} ProductOrder records.`);
}

main()
  .catch(e => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
