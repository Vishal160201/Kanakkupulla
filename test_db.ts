import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL || '';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function run() {
  const b = await prisma.booking.findFirst({ where: { id: 'cmqlrznq30008nprtlhlh31uy' }});
  console.log(b);
  process.exit(0);
}
run();
