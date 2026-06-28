
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// DELETE /api/push-subscriptions/[id]
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.pushSubscription.delete({
      where: { id },
    });
    return NextResponse.json({ message: 'Push subscription deleted successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
