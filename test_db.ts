import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const txs = await prisma.transaction.findMany({ select: { category: true } })
  const categories = [...new Set(txs.map(t => t.category))]
  console.log("Categories in DB:")
  console.log(categories)
}
main().finally(() => prisma.$disconnect())
