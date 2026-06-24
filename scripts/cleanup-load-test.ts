import prisma from '../src/lib/prisma';

const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  const startTime = Date.now();
  console.log('╔════════════════════════════════════════════╗');
  console.log('║   Kanakkupulla Load Test Data Cleanup      ║');
  console.log('╚════════════════════════════════════════════╝');
  if (DRY_RUN) console.log('\n⚠ DRY RUN MODE — No data will be deleted\n');

  let totalDeleted = 0;

  // 1. Delete product orders linked to test products
  const deletedProductOrders = DRY_RUN ? 0 : (await prisma.productOrder.deleteMany({
    where: {
      product: { description: { startsWith: 'Load test product' } },
    },
  })).count;
  totalDeleted += deletedProductOrders;
  console.log(`Product orders deleted: ${deletedProductOrders}`);

  // 2. Delete orders linked to load test bookings
  const deletedOrders = DRY_RUN ? 0 : (await prisma.order.deleteMany({
    where: {
      bookingId: { startsWith: 'LOAD_TEST_B_' },
    },
  })).count;
  totalDeleted += deletedOrders;
  console.log(`Orders deleted: ${deletedOrders}`);

  // 3. Delete load test transactions
  const deletedTxns = DRY_RUN ? 0 : (await prisma.transaction.deleteMany({
    where: {
      OR: [
        { id: { startsWith: 'LOAD_TEST_TXN_' } },
        { description: { startsWith: 'Load test' } },
      ],
    },
  })).count;
  totalDeleted += deletedTxns;
  console.log(`Transactions deleted: ${deletedTxns}`);

  // 4. Delete load test bookings
  const deletedBookings = DRY_RUN ? 0 : (await prisma.booking.deleteMany({
    where: {
      OR: [
        { id: { startsWith: 'LOAD_TEST_B_' } },
        { bookingNumber: { startsWith: 'LT-' } },
      ],
    },
  })).count;
  totalDeleted += deletedBookings;
  console.log(`Bookings deleted: ${deletedBookings}`);

  // 5. Delete load test clients
  const deletedClients = DRY_RUN ? 0 : (await prisma.client.deleteMany({
    where: {
      OR: [
        { email: { startsWith: 'loadtest_client_' } },
        { name: { startsWith: 'Load Test Client' } },
      ],
    },
  })).count;
  totalDeleted += deletedClients;
  console.log(`Clients deleted: ${deletedClients}`);

  // 6. Delete load test products
  const deletedProducts = DRY_RUN ? 0 : (await prisma.product.deleteMany({
    where: {
      OR: [
        { description: { startsWith: 'Load test product' } },
        { name: { startsWith: 'Load test' } },
      ],
    },
  })).count;
  totalDeleted += deletedProducts;
  console.log(`Products deleted: ${deletedProducts}`);

  // 7. Delete perf test users
  const deletedUsers = DRY_RUN ? 0 : (await prisma.user.deleteMany({
    where: {
      OR: [
        { email: { startsWith: 'perf_user_' } },
        { email: { endsWith: '@kanakku.test' } },
      ],
    },
  })).count;
  totalDeleted += deletedUsers;
  console.log(`Users deleted: ${deletedUsers}`);

  // 8. Clean up any remaining auth-related records for perf users
  const deletedAccounts = DRY_RUN ? 0 : (await prisma.account.deleteMany({
    where: { user: { email: { endsWith: '@kanakku.test' } } },
  })).count;
  totalDeleted += deletedAccounts;
  console.log(`Accounts deleted: ${deletedAccounts}`);

  const deletedSessions = DRY_RUN ? 0 : (await prisma.session.deleteMany({
    where: { user: { email: { endsWith: '@kanakku.test' } } },
  })).count;
  totalDeleted += deletedSessions;
  console.log(`Sessions deleted: ${deletedSessions}`);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\nTotal records cleaned: ${totalDeleted} in ${elapsed}s`);
  console.log('✅ Cleanup completed');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });