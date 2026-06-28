import prisma from '../lib/prisma';

async function main() {
  await prisma.$executeRaw`DELETE FROM "Notification"`;
  console.log('Notifications wiped');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
