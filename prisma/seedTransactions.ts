import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL || '';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.transaction.deleteMany({}); // Optional: clear existing transactions

  const transactions = [
    {
      amount: 15000.00,
      type: "INCOME",
      date: new Date(),
      category: "Photography",
      paymentMode: "Bank Transfer",
      description: "Wedding Booking Deposit - Ref: #WP-882",
      status: "SETTLED"
    },
    {
      amount: 4250.00,
      type: "EXPENSE",
      date: new Date(),
      category: "Equipment",
      paymentMode: "UPI",
      description: "Studio Print Supplies - Amazon Business",
      status: "SETTLED"
    },
    {
      amount: 2840.00,
      type: "EXPENSE",
      date: new Date(),
      category: "Utilities",
      paymentMode: "Bank Transfer",
      description: "Electricity Bill - Oct - TNEB Portal",
      status: "PENDING"
    },
    {
      amount: 12000.00,
      type: "INCOME",
      date: new Date(new Date().setDate(new Date().getDate() - 1)),
      category: "Photography",
      paymentMode: "Cash",
      description: "Pre-wedding Shoot Advance",
      status: "SETTLED"
    },
    {
      amount: 1500.00,
      type: "EXPENSE",
      date: new Date(new Date().setDate(new Date().getDate() - 2)),
      category: "Misc",
      paymentMode: "UPI",
      description: "Snacks and Refreshments",
      status: "SETTLED"
    }
  ];

  for (const t of transactions) {
    await prisma.transaction.create({ data: t });
  }

  console.log("Seeded transactions!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
