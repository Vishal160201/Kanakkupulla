import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { initialBookings } from '../src/data/mockData';

const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_9yer3vJADMhO@ep-lucky-wildflower-aoouw89k.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database with mock bookings...');
  
  for (const booking of initialBookings) {
    // 1. Create or connect Client
    const client = await prisma.client.create({
      data: {
        name: booking.title,
        phone: booking.phone || '',
        email: booking.email || null,
      }
    });

    // 2. Create Booking
    const newBooking = await prisma.booking.create({
      data: {
        id: booking.id, // preserve the ABK-XXXX ID
        clientId: client.id,
        category: booking.category,
        date: new Date(booking.date),
        time: booking.time,
        location: booking.location,
        status: booking.status,
      }
    });

    // 3. Create Order
    const advanceAmount = parseFloat((booking.advance || '0').replace(/,/g, ''));
    await prisma.order.create({
      data: {
        bookingId: newBooking.id,
        package: parseFloat((booking.package || '0').replace(/,/g, '')),
        advance: advanceAmount,
        due: parseFloat((booking.due || '0').replace(/,/g, '')),
      }
    });

    // 4. Create Transaction for Advance (to fix missing advance amounts in transaction page)
    if (advanceAmount > 0) {
      await prisma.transaction.create({
        data: {
          amount: advanceAmount,
          type: 'INCOME',
          date: newBooking.date, // logged to respective date
          category: 'BOOKING',
          paymentMode: 'Cash',
          description: `Advance Payment for Booking #${newBooking.id.substring(0, 8)}`,
          status: 'SETTLED',
          bookingId: newBooking.id
        }
      });
    }
  }

  console.log('Seeding finished successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
