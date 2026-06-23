
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// DELETE /api/push-subscriptions/[id]
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    await prisma.pushSubscription.delete({
      where: { id: params.id },
    });
    return NextResponse.json({ message: 'Push subscription deleted successfully' });
  } catch (error) {
    console.error('Error deleting push subscription:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
