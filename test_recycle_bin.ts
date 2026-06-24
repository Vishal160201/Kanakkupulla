import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  try {
    await prisma.recycleBin.findMany({
      include: {
        trashedBy: { select: { name: true, email: true } },
      }
    });
  } catch (err) {
    console.error("Prisma Error:", err.message);
  }
}
main().finally(() => prisma.$disconnect());
