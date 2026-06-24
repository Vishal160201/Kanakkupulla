import prisma from './src/lib/prisma';

async function main() {
  const items = await prisma.recycleBin.findMany({ where: { itemType: 'booking' } });
  console.log("Bookings in RB:", items.length);
}
main().finally(() => process.exit(0));
