import prisma from '../src/lib/prisma';
// @ts-ignore
import { v4 as uuidv4 } from 'uuid';

async function main() {
  console.log('Seeding 10,000 dummy bookings for load testing...');
  const BATCH_SIZE = 1000;
  const TOTAL_RECORDS = 10000;
  
  // First create a dummy client
  const client = await prisma.client.create({
    data: {
      name: 'Load Test Client',
      phone: '9999999999',
      email: 'loadtest@example.com'
    }
  });

  console.log(`Created test client: ${client.id}`);

  let createdCount = 0;

  for (let i = 0; i < TOTAL_RECORDS / BATCH_SIZE; i++) {
    const records = [];
    for (let j = 0; j < BATCH_SIZE; j++) {
      const idx = i * BATCH_SIZE + j;
      const date = new Date(Date.now() + Math.random() * 10000000000); // random future date
      records.push({
        id: `LOAD_TEST_${uuidv4()}`, // Custom prefix to easily delete later
        bookingNumber: `LT-${idx}`,
        category: 'Wedding',
        date: date,
        time: '10:00 AM',
        location: 'Virtual Test Env',
        status: 'Confirmed',
        clientId: client.id,
        customData: { fld_b_client: `Load Test Booking ${idx}` },
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    await prisma.booking.createMany({
      data: records
    });
    createdCount += BATCH_SIZE;
    console.log(`Created ${createdCount}/${TOTAL_RECORDS} bookings...`);
  }

  console.log('Successfully seeded 10,000 dummy bookings.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
