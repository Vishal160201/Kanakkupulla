import prisma from '../src/lib/prisma';

async function runTests() {
  console.log("=== STARTING DATABASE INTEGRITY TESTS ===\n");
  let passed = 0;
  let failed = 0;

  const runTest = async (name: string, testFn: () => Promise<void>) => {
    try {
      await testFn();
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } catch (e: any) {
      console.error(`❌ [FAIL] ${name}\n   Error: ${e.message}`);
      failed++;
    }
  };

  // Test 1: Users Table
  await runTest("Users Table Read", async () => {
    const users = await prisma.user.findMany({ take: 1 });
    if (!users) throw new Error("Could not fetch users");
  });

  // Test 2: Clients Table Read/Write
  let testClientId = "";
  await runTest("Clients Table Write & Read", async () => {
    const client = await prisma.client.create({
      data: {
        name: "Test Client API",
        phone: "+1234567890",
        email: "testclient@example.com"
      }
    });
    testClientId = client.id;
    const fetched = await prisma.client.findUnique({ where: { id: testClientId } });
    if (!fetched) throw new Error("Client was created but could not be fetched.");
  });

  // Test 3: FormLayouts Table
  await runTest("FormLayouts Table Read", async () => {
    const layouts = await prisma.formLayout.findMany({ take: 1 });
    if (!layouts) throw new Error("Could not fetch form layouts");
  });

  // Test 4: Bookings & Orders Table
  let testBookingId = "";
  await runTest("Bookings & Orders Table Write & Read", async () => {
    const booking = await prisma.booking.create({
      data: {
        clientId: testClientId,
        category: "Test",
        date: new Date(),
        time: "10:00 AM",
        location: "Studio",
        status: "Pending",
        order: {
          create: {
            package: 5000,
            advance: 1000,
            due: 4000
          }
        }
      },
      include: { order: true }
    });
    testBookingId = booking.id;
    if (!booking.order) throw new Error("Order was not created with Booking.");
  });

  // Test 5: Transactions Table
  await runTest("Transactions Table Write & Read", async () => {
    const tx = await prisma.transaction.create({
      data: {
        amount: 1000,
        type: "INCOME",
        date: new Date(),
        category: "Booking Advance",
        paymentMode: "Cash",
        bookingId: testBookingId,
        status: "SETTLED"
      }
    });
    const fetched = await prisma.transaction.findUnique({ where: { id: tx.id } });
    if (!fetched) throw new Error("Transaction was created but not fetched.");
  });

  // Test 6: SystemLogs Table
  await runTest("SystemLogs Table Write & Read", async () => {
    const log = await prisma.systemLog.create({
      data: {
        action: "DB_TEST_RUN",
        details: "Automated DB integrity test run."
      }
    });
    if (!log) throw new Error("Could not create system log.");
  });

  // Cleanup Test Data
  await runTest("Cleanup Test Data", async () => {
    await prisma.transaction.deleteMany({ where: { bookingId: testBookingId } });
    await prisma.order.deleteMany({ where: { bookingId: testBookingId } });
    await prisma.booking.delete({ where: { id: testBookingId } });
    await prisma.client.delete({ where: { id: testClientId } });
    await prisma.systemLog.deleteMany({ where: { action: "DB_TEST_RUN" } });
  });

  console.log(`\n=== TEST SUMMARY ===`);
  console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  
  if (failed > 0) process.exit(1);
}

runTests()
  .catch(e => {
    console.error("Fatal Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
