import prisma from '@/lib/prisma';
import crypto from 'crypto';

const candidate = () => `#MDTXN-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

/** Generates `count` unique transaction ids, checking collisions with one query per round. */
export async function generateTransactionIds(count: number): Promise<string[]> {
  const ids = new Set<string>();
  while (ids.size < count) {
    const batch = new Set<string>();
    while (batch.size < count - ids.size) {
      const id = candidate();
      if (!ids.has(id)) batch.add(id);
    }
    const taken = await prisma.transaction.findMany({
      where: { transactionId: { in: [...batch] } },
      select: { transactionId: true },
    });
    const takenIds = new Set(taken.map(t => t.transactionId));
    for (const id of batch) if (!takenIds.has(id)) ids.add(id);
  }
  return [...ids];
}

export async function generateNextTransactionId(): Promise<string> {
  const [id] = await generateTransactionIds(1);
  return id;
}
