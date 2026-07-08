import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_9yer3vJADMhO@ep-lucky-wildflower-aoouw89k.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
import crypto from 'crypto';

async function getAuthHeaders() {
  let user = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!user) {
    // create a dummy admin
    user = await prisma.user.create({
      data: { name: 'Admin', email: 'admin@test.com', role: 'ADMIN' }
    });
  }

  const sessionToken = crypto.randomUUID();
  const session = await prisma.session.create({
    data: {
      sessionToken,
      userId: user.id,
      expires: new Date(Date.now() + 1000 * 60 * 60 * 24), // 1 day
    }
  });

  return { 'Cookie': `next-auth.session-token=${sessionToken}` };
}

async function runNegativeTests() {
  console.log('Running Negative API Tests...');
  let passed = 0;
  let failed = 0;
  
  const headers = { 'Content-Type': 'application/json', ...(await getAuthHeaders()) };

  // Test 1: Invalid transaction amount
  try {
    const res = await fetch('http://localhost:3000/api/transactions', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        amount: -500, // Invalid negative amount
        type: 'INCOME',
        date: new Date().toISOString(),
        category: 'BOOKING',
        paymentMode: 'Cash'
      })
    });
    
    if (res.status === 422 || res.status === 400) {
      console.log('✅ Test 1 Passed: Rejected negative transaction amount');
      passed++;
    } else {
      console.error(`❌ Test 1 Failed: Expected 422/400, got ${res.status}`);
      failed++;
    }
  } catch(e) {
    console.error('Test 1 Exception:', e);
  }

  // Test 2: Missing required category
  try {
    const res = await fetch('http://localhost:3000/api/transactions', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        amount: 500,
        type: 'INCOME',
        date: new Date().toISOString(),
        paymentMode: 'Cash'
        // missing category
      })
    });
    
    if (res.status === 422 || res.status === 400) {
      console.log('✅ Test 2 Passed: Rejected missing category');
      passed++;
    } else {
      console.error(`❌ Test 2 Failed: Expected 422/400, got ${res.status}`);
      failed++;
    }
  } catch(e) {
    console.error('Test 2 Exception:', e);
  }

  // Test 3: Invalid Date Format
  try {
    const res = await fetch('http://localhost:3000/api/transactions', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        amount: 500,
        type: 'INCOME',
        date: 'invalid-date', // Invalid date
        category: 'BOOKING',
        paymentMode: 'Cash'
      })
    });
    
    if (res.status === 422 || res.status === 400) {
      console.log('✅ Test 3 Passed: Rejected invalid date format');
      passed++;
    } else {
      console.error(`❌ Test 3 Failed: Expected 422/400, got ${res.status}`);
      failed++;
    }
  } catch(e) {
    console.error('Test 3 Exception:', e);
  }

  console.log(`\nNegative Testing Complete: ${passed} passed, ${failed} failed.`);
  process.exit(0);
}

runNegativeTests().catch(e => {
  console.error(e);
  process.exit(1);
});
