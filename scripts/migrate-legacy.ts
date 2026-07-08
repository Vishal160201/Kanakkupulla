import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_9yer3vJADMhO@ep-lucky-wildflower-aoouw89k.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function migrateLegacyTransactions() {
  console.log('Finding bookings with advance amounts but no transactions...');
  const bookings = await prisma.booking.findMany({
    include: {
      order: true,
      transactions: true,
    }
  });

  let migratedCount = 0;

  for (const booking of bookings) {
    // If it has an order with advance > 0 AND it doesn't have any associated transactions yet
    const advanceAmount = Number(booking.order?.advance || booking.customData?.fld_b_advance || 0);
    
    if (advanceAmount > 0 && booking.transactions.length === 0) {
      console.log(`Migrating booking ${booking.id} - Adding transaction for ${advanceAmount}`);
      
      const paymentMode = booking.customData?.paymentMode || booking.customData?.fld_b_payment_mode || "Cash";
      
      await prisma.transaction.create({
        data: {
          amount: advanceAmount,
          type: 'INCOME',
          date: booking.date,
          category: 'BOOKING',
          paymentMode: paymentMode,
          description: `Advance Payment for Booking #${booking.bookingNumber || booking.id.substring(0, 8)}`,
          status: 'SETTLED',
          bookingId: booking.id
        }
      });
      migratedCount++;
    }
  }

  console.log(`\\nSuccessfully migrated ${migratedCount} bookings!`);
  await prisma.$disconnect();
}

migrateLegacyTransactions().catch(console.error);
