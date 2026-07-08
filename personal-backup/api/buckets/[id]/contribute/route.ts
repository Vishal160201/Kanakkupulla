import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const session = await getServerSession(authOptions);
  if (!session || session.user?.email !== 'nithyavishalr@gmail.com') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const data = await request.json();
    const amount = parseFloat(data.amount);
    const month = parseInt(data.month);
    const year = parseInt(data.year);

    if (isNaN(amount) || amount <= 0 || isNaN(month) || isNaN(year)) {
      return NextResponse.json({ error: 'Invalid contribution amount or date' }, { status: 400 });
    }

    const bucket = await prisma.personalBucket.findUnique({ where: { id } });
    if (!bucket) {
      return NextResponse.json({ error: 'Bucket not found' }, { status: 404 });
    }

    const firstDayOfMonth = new Date(year, month - 1, 1);

    const result = await prisma.$transaction([
      prisma.personalBucketPayment.upsert({
        where: {
          bucketId_month_year: {
            bucketId: id,
            month: month,
            year: year
          }
        },
        update: {
          amount: { increment: amount },
          status: 'PAID',
          notes: data.notes || null,
        },
        create: {
          bucketId: id,
          month: month,
          year: year,
          amount: amount,
          status: 'PAID',
          notes: data.notes || null,
        }
      }),
      prisma.personalBucket.update({
        where: { id },
        data: {
          savedAmount: { increment: amount }
        }
      }),
      ...(bucket.linkedCardId ? [
        prisma.personalExpense.create({
          data: {
            title: bucket.type === 'DEBT' && bucket.debtDirection === 'THEY_OWE' 
              ? `Payment from ${bucket.title}` 
              : (bucket.type === 'DEBT' ? `Payment to ${bucket.title}` : `Transfer to ${bucket.title}`),
            amount: amount,
            type: bucket.type === 'DEBT' && bucket.debtDirection === 'THEY_OWE' ? 'CREDIT' : 'DEBIT',
            category: 'TRANSFER',
            date: firstDayOfMonth,
            paymentSource: bucket.linkedCardId,
          }
        }),
        prisma.personalCard.update({
          where: { id: bucket.linkedCardId },
          data: {
            manualBalance: bucket.type === 'DEBT' && bucket.debtDirection === 'THEY_OWE'
              ? { increment: amount }
              : { decrement: amount }
          }
        })
      ] : [])
    ]);

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
// Dummy comment to force TS refresh
