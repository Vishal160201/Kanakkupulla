const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const layout = await prisma.formLayout.findUnique({
    where: { formKey: 'TRANSACTION_FORM' }
  });

  if (!layout) {
    console.log("No layout found in DB. Need to rely on defaultLayouts.");
    return;
  }

  // Get all unique categories from transactions to make sure we don't miss any
  const txs = await prisma.transaction.findMany({ select: { category: true } });
  const dbCategories = [...new Set(txs.map(t => t.category).filter(Boolean))];

  console.log("Categories found in existing transactions:", dbCategories);

  let schema = layout.schema;
  let updated = false;

  if (schema && schema.sections) {
    for (const sec of schema.sections) {
      if (sec.fields) {
        for (const field of sec.fields) {
          if (field.id === 'fld_tx_category') {
            const currentOptions = field.options || [];
            
            // Add missing ones from dbCategories
            for (const cat of dbCategories) {
              if (!currentOptions.includes(cat)) {
                currentOptions.push(cat);
                updated = true;
              }
            }
            
            field.options = currentOptions;
            console.log("Updated field options:", field.options);
          }
        }
      }
    }
  }

  if (updated) {
    await prisma.formLayout.update({
      where: { formKey: 'TRANSACTION_FORM' },
      data: { schema }
    });
    console.log("Successfully updated TRANSACTION_FORM layout in database!");
  } else {
    console.log("No update needed for layout in database.");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
