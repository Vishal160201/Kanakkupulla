
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/password-reset-tokens/[token]
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const passwordResetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
    });
    if (!passwordResetToken) {
      return NextResponse.json({ error: 'Password reset token not found' }, { status: 404 });
    }
    return NextResponse.json(passwordResetToken);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/password-reset-tokens/[token]
export async function DELETE(req: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    await prisma.passwordResetToken.delete({
      where: { token },
    });
    return NextResponse.json({ message: 'Password reset token deleted successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
