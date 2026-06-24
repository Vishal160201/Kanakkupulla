import prisma from '@/lib/prisma';

export async function generateNextTransactionId(): Promise<string> {
  const last = await prisma.transaction.findFirst({
    orderBy: { transactionId: 'desc' },
    select: { transactionId: true },
  });

  let nextNum = 1;
  if (last?.transactionId) {
    const match = last.transactionId.match(/#MDTXN-(\d+)/);
    if (match) {
      nextNum = parseInt(match[1], 10) + 1;
    }
  }

  return `#MDTXN-${String(nextNum).padStart(3, '0')}`;
}
