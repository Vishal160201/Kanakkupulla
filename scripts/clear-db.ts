import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_9yer3vJADMhO@ep-lucky-wildflower-aoouw89k.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function clearDB() {
  console.log('Clearing test data...');
  try {
    // Delete in order of dependencies (child records first)
    await prisma.recycleBin.deleteMany({});
    console.log('Cleared RecycleBin');
    
    await prisma.notification.deleteMany({});
    console.log('Cleared Notifications');
    
    await prisma.systemLog.deleteMany({});
    console.log('Cleared SystemLogs');
    
    await prisma.transaction.deleteMany({});
    console.log('Cleared Transactions');
    
    await prisma.order.deleteMany({});
    console.log('Cleared Orders');
    
    await prisma.productOrder.deleteMany({});
    console.log('Cleared ProductOrders');
    
    await prisma.booking.deleteMany({});
    console.log('Cleared Bookings');
    
    await prisma.client.deleteMany({});
    console.log('Cleared Clients');
    
    console.log('Test database completely cleared!');
  } catch (error) {
    console.error('Error clearing database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearDB();
