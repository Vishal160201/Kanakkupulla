import prisma from '@/lib/prisma';
import crypto from 'crypto';

export async function generateNextTransactionId(): Promise<string> {
  let isUnique = false;
  let transactionId = '';
  
  while (!isUnique) {
    const suffix = crypto.randomBytes(3).toString('hex').toUpperCase();
    transactionId = `#MDTXN-${suffix}`;
    
    const activeExists = await prisma.transaction.findFirst({
      where: { transactionId }
    });
    
    if (!activeExists) {
      isUnique = true;
    }
  }

  return transactionId;
}
