const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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
