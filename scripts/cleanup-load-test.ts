import prisma from '../src/lib/prisma';

async function main() {
  console.log('Cleaning up 10,000 dummy bookings...');
  
  const result = await prisma.booking.deleteMany({
    where: {
      id: {
        startsWith: 'LOAD_TEST_'
      }
    }
  });

  console.log(`Deleted ${result.count} test bookings.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
