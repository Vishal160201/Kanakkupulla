import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.email !== 'nithyavishalr@gmail.com') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const buckets = await prisma.personalBucket.findMany({
      where: { isActive: true }
    });

    let totalAllocated = 0;
    let totalTarget = 0;
    const byType = { SAVINGS: 0, DEBT: 0, EMI: 0 };
    let kvbAllocated = 0;

    const kvbCard = await prisma.personalCard.findFirst({
      where: { bank: { contains: 'KVB', mode: 'insensitive' } }
    });

    let totalReserved = 0;

    for (const bucket of buckets) {
      totalAllocated += bucket.savedAmount;
      totalTarget += bucket.targetAmount;
      if (bucket.type === 'SAVINGS') byType.SAVINGS += bucket.savedAmount;
      if (bucket.type === 'DEBT') byType.DEBT += bucket.savedAmount;
      if (bucket.type === 'EMI') byType.EMI += bucket.savedAmount;

      if (kvbCard && bucket.linkedCardId === kvbCard.id) {
        kvbAllocated += bucket.savedAmount;
      }
      if (bucket.type === 'DEBT' && bucket.debtDirection === 'THEY_OWE' && bucket.deductFromBalance) {
        totalReserved += bucket.targetAmount;
      }
    }

    const freeBalance = kvbCard ? Math.max((kvbCard.manualBalance || 0) - kvbAllocated - totalReserved, 0) : 0;
    const monthlyOutflow = buckets.reduce((acc, b) => acc + b.monthlyContribution, 0);

    return NextResponse.json({
      totalAllocated,
      totalTarget,
      byType,
      freeBalance,
      monthlyOutflow,
      kvbCardBalance: kvbCard ? kvbCard.manualBalance || 0 : 0
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
