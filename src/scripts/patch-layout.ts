import prisma from '../lib/prisma';
import { DEFAULT_LAYOUTS } from '../lib/defaultLayouts';

async function main() {
  const giftLayout = DEFAULT_LAYOUTS.find(l => l.formKey === 'GIFT_ORDER_FORM');
  if (giftLayout) {
    await prisma.formLayout.upsert({
      where: { formKey: 'GIFT_ORDER_FORM' },
      update: { schema: giftLayout.schema },
      create: { 
        formKey: 'GIFT_ORDER_FORM', 
        name: giftLayout.name, 
        description: giftLayout.description, 
        schema: giftLayout.schema 
      }
    });
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
