import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.email !== 'nithyavishalr@gmail.com') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const buckets = await prisma.personalBucket.findMany({
      where: { type: 'DEBT' }
    });

    for (const bucket of buckets) {
      if (bucket.title === 'Suba') {
        await prisma.personalBucket.update({
          where: { id: bucket.id },
          data: {
            debtDirection: 'THEY_OWE',
            deductFromBalance: true
          }
        });
      } else if (bucket.title === 'Trolley') {
        await prisma.personalBucket.update({
          where: { id: bucket.id },
          data: {
            debtDirection: 'I_OWE'
          }
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
