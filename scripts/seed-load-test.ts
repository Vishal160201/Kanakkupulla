import prisma from '../src/lib/prisma';

const DRY_RUN = process.argv.includes('--dry-run');
const TOTAL_BOOKINGS = parseInt(process.env.SEED_BOOKINGS || '500', 10);
const TOTAL_TRANSACTIONS = parseInt(process.env.SEED_TRANSACTIONS || '250', 10);
const TOTAL_CLIENTS = parseInt(process.env.SEED_CLIENTS || '20', 10);
const TOTAL_PRODUCTS = parseInt(process.env.SEED_PRODUCTS || '10', 10);
const BATCH_SIZE = 500;

const CATEGORIES = ['Wedding', 'Portrait', 'Event', 'Commercial', 'Pre-Wedding', 'Candid', 'Cinematography', 'Baby Shoot', 'Product Shoot'];
const STATUSES = ['Confirmed', 'Pending', 'Partial', 'Completed', 'Cancelled'];
const TXN_TYPES = ['INCOME', 'EXPENSE'];
const INCOME_CATEGORIES = ['Photography Session', 'Photography Session', 'Photography Session', 'Equipment Sale', 'Consultation Fee', 'Print Sale', 'Album Sale'];
const EXPENSE_CATEGORIES = ['Equipment', 'Utilities', 'Rent', 'Software', 'Travel', 'Marketing', 'Misc'];
const PAYMENT_MODES = ['UPI', 'Cash', 'Bank Transfer', 'Card'];
const LOCATIONS = ['Studio A', 'Studio B', 'Outdoor', 'Client Venue', 'Virtual Studio'];
const PRODUCT_NAMES = ['Photo Album 8x10', 'Photo Album 12x12', 'Canvas Print', 'Digital Frame', 'USB Drive', 'Keychain Set', 'Mug', 'T-Shirt', 'Calendar', 'Polaroid Pack'];

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(daysBack: number, daysForward: number): Date {
  const now = Date.now();
  const offset = Math.random() * (daysForward + daysBack) * 86400000 - daysBack * 86400000;
  return new Date(now + offset);
}

function generatePhone(): string {
  return `9${String(Math.floor(Math.random() * 1000000000)).padStart(9, '0')}`;
}

async function seedUsers() {
  console.log('\n=== Seeding test users ===');
  const users: any[] = [];
  for (let i = 0; i < 5; i++) {
    users.push({
      id: `PERF_USER_${i}`,
      name: `Perf Test User ${i}`,
      email: `perf_user_${i}@kanakku.test`,
      password: '$2a$10$placeholder',
      role: i === 0 ? 'ADMIN' : 'STAFF',
      status: 'ACTIVE',
    });
  }
  if (DRY_RUN) { console.log(`[DRY RUN] Would create ${users.length} test users`); return; }
  for (const user of users) {
    await prisma.user.upsert({ where: { email: user.email }, update: user, create: user });
  }
  console.log(`Created ${users.length} test users`);
}

async function seedClients() {
  console.log(`\n=== Seeding ${TOTAL_CLIENTS} clients ===`);
  if (DRY_RUN) { console.log(`[DRY RUN] Would create ${TOTAL_CLIENTS} clients`); return; }
  let createdCount = 0;
  for (let i = 0; i < TOTAL_CLIENTS / BATCH_SIZE; i++) {
    const records = [];
    for (let j = 0; j < Math.min(BATCH_SIZE, TOTAL_CLIENTS - createdCount); j++) {
      const idx = createdCount + j;
      records.push({ name: `Load Test Client ${idx}`, phone: generatePhone(), email: `loadtest_client_${idx}@kanakku.test` });
    }
    await prisma.client.createMany({ data: records });
    createdCount += records.length;
    console.log(`Created ${createdCount}/${TOTAL_CLIENTS} clients...`);
  }
  console.log(`Created ${createdCount} clients total`);
}

async function seedProducts() {
  console.log(`\n=== Seeding ${TOTAL_PRODUCTS} products ===`);
  if (DRY_RUN) { console.log(`[DRY RUN] Would create ${TOTAL_PRODUCTS} products`); return; }
  const products: any[] = [];
  for (let i = 0; i < TOTAL_PRODUCTS; i++) {
    const name = PRODUCT_NAMES[i % PRODUCT_NAMES.length];
    products.push({ name: `${name} ${Math.floor(i / PRODUCT_NAMES.length) + 1}`, description: `Load test product: ${name}`, price: Math.floor(Math.random() * 5000) + 199, stock: Math.floor(Math.random() * 100) + 1 });
  }
  await prisma.product.createMany({ data: products });
  console.log(`Created ${products.length} products`);
}

async function seedBookings() {
  const allClients = DRY_RUN ? [] : await prisma.client.findMany({ select: { id: true }, take: TOTAL_CLIENTS });
  console.log(`\n=== Seeding ${TOTAL_BOOKINGS} bookings ===`);
  if (DRY_RUN) { console.log(`[DRY RUN] Would create ${TOTAL_BOOKINGS} bookings`); return; }
  let createdCount = 0;
  for (let i = 0; i < TOTAL_BOOKINGS / BATCH_SIZE; i++) {
    const records = [];
    for (let j = 0; j < Math.min(BATCH_SIZE, TOTAL_BOOKINGS - createdCount); j++) {
      const idx = createdCount + j;
      const client = allClients[idx % allClients.length];
      records.push({
        id: `LOAD_TEST_B_${idx}`,
        bookingNumber: `LT-${idx}`,
        clientId: client.id,
        category: randomFrom(CATEGORIES),
        date: randomDate(30, 90),
        time: `${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}:${String(Math.floor(Math.random() * 4) * 15).padStart(2, '0')} ${Math.random() > 0.5 ? 'AM' : 'PM'}`,
        location: randomFrom(LOCATIONS),
        status: randomFrom(STATUSES),
        packageName: `Package ${Math.floor(Math.random() * 5) + 1}`,
        notes: `Load test booking #${idx}`,
        customData: { loadTest: true, timestamp: Date.now(), idx },
      });
    }
    await prisma.booking.createMany({ data: records });
    createdCount += records.length;
    console.log(`Created ${createdCount}/${TOTAL_BOOKINGS} bookings...`);
  }
  console.log(`Created ${createdCount} bookings total`);
}

async function seedOrders() {
  const allBookings = DRY_RUN ? [] : await prisma.booking.findMany({ where: { id: { startsWith: 'LOAD_TEST_B_' } }, select: { id: true } });
  console.log(`\n=== Seeding orders for ${allBookings.length} bookings ===`);
  if (DRY_RUN) { console.log(`[DRY RUN] Would create ${allBookings.length} orders`); return; }
  let createdCount = 0;
  for (let i = 0; i < allBookings.length / BATCH_SIZE; i++) {
    const batch = allBookings.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
    const records = batch.map((booking) => ({
      bookingId: booking.id,
      package: Math.floor(Math.random() * 100000) + 5000,
      advance: Math.floor(Math.random() * 50000) + 1000,
      due: Math.floor(Math.random() * 30000) + 1000,
      installments: null,
    }));
    await prisma.order.createMany({ data: records });
    createdCount += records.length;
    console.log(`Created ${createdCount}/${allBookings.length} orders...`);
  }
  console.log(`Created ${createdCount} orders total`);
}

async function seedProductOrders() {
  const allProducts = DRY_RUN ? [] : await prisma.product.findMany({ select: { id: true, name: true } });
  const ORDER_STATUSES = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED'];
  const TOTAL_ORDERS = 100;
  console.log(`\n=== Seeding ${TOTAL_ORDERS} product orders ===`);
  if (DRY_RUN) { console.log(`[DRY RUN] Would create ${TOTAL_ORDERS} product orders`); return; }
  const records = [];
  for (let i = 0; i < TOTAL_ORDERS; i++) {
    const product = allProducts[Math.floor(Math.random() * allProducts.length)];
    records.push({
      productId: product.id,
      quantity: Math.floor(Math.random() * 5) + 1,
      status: randomFrom(ORDER_STATUSES),
      clientName: `Load Test Client ${Math.floor(Math.random() * TOTAL_CLIENTS)}`,
      clientPhone: generatePhone(),
    });
  }
  await prisma.productOrder.createMany({ data: records });
  console.log(`Created ${records.length} product orders`);
}

async function seedTransactions() {
  const allUsers = DRY_RUN ? [] : await prisma.user.findMany({ select: { id: true }, where: { email: { startsWith: 'perf_user_' } } });
  console.log(`\n=== Seeding ${TOTAL_TRANSACTIONS} transactions ===`);
  if (DRY_RUN) { console.log(`[DRY RUN] Would create ${TOTAL_TRANSACTIONS} transactions`); return; }
  let createdCount = 0;
  for (let i = 0; i < TOTAL_TRANSACTIONS / BATCH_SIZE; i++) {
    const records = [];
    for (let j = 0; j < Math.min(BATCH_SIZE, TOTAL_TRANSACTIONS - createdCount); j++) {
      const idx = createdCount + j;
      const type = randomFrom(TXN_TYPES);
      const user = allUsers[idx % allUsers.length];
      records.push({
        amount: Math.floor(Math.random() * 100000) + 100,
        type,
        date: randomDate(90, 0),
        category: type === 'INCOME' ? randomFrom(INCOME_CATEGORIES) : randomFrom(EXPENSE_CATEGORIES),
        paymentMode: randomFrom(PAYMENT_MODES),
        description: `Load test ${type.toLowerCase()} transaction #${idx}`,
        status: Math.random() > 0.1 ? 'SETTLED' : 'PENDING',
        userId: user?.id || undefined,
        customData: { loadTest: true },
      });
    }
    await prisma.transaction.createMany({ data: records });
    createdCount += records.length;
    console.log(`Created ${createdCount}/${TOTAL_TRANSACTIONS} transactions...`);
  }
  console.log(`Created ${createdCount} transactions total`);
}

async function main() {
  const startTime = Date.now();
  console.log('╔══════════════════════════════════════════╗');
  console.log('║   Kanakkupulla Load Test Data Seeder     ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log(`Target: ${TOTAL_BOOKINGS} bookings, ${TOTAL_TRANSACTIONS} transactions, ${TOTAL_CLIENTS} clients, ${TOTAL_PRODUCTS} products`);
  if (DRY_RUN) console.log('\n⚠ DRY RUN MODE\n');

  try {
    await seedClients();
    await seedProducts();
    await seedUsers();
    await seedBookings();
    await seedOrders();
    await seedProductOrders();
    await seedTransactions();
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n✅ Seeding completed in ${elapsed}s`);
  } catch (e) {
    console.error('Seeding failed:', e);
    process.exit(1);
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

main();