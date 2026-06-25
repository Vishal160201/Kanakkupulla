import prisma from './src/lib/prisma'

async function main() {
  const txs = await prisma.transaction.findMany({
    where: { category: "GIFTS_AND_FRAMES" },
    take: 10,
    orderBy: { createdAt: 'desc' }
  })
  txs.forEach(t => console.log(t.description))
}
main()
