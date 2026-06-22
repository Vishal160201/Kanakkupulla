import prisma from './src/lib/prisma';

async function main() {
  console.log('Deleting all transactions...');
  const result = await prisma.transaction.deleteMany();
  console.log(`Deleted ${result.count} transactions.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
