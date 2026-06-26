const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const accounts = await prisma.account.findMany();
  console.log("Accounts:", accounts);
}
run();
