const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const TOTAL = 1000;
let success = 0;
let errors = 0;

async function test() {
  const start = Date.now();
  const promises = [];
  
  for(let i = 0; i < TOTAL; i++) {
    promises.push(
      prisma.formLayout.findUnique({ where: { formKey: 'BOOKING_FORM' } })
        .then(() => success++)
        .catch(e => {
          errors++;
          // console.error(e);
        })
    );
  }
  
  await Promise.all(promises);
  console.log(`Prisma DB Load Test Completed in ${Date.now() - start}ms`);
  console.log(`Success: ${success}, Errors: ${errors}`);
  await prisma.$disconnect();
}
test();
