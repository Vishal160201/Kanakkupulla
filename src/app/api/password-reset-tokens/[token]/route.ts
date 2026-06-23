
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/password-reset-tokens/[token]
export async function GET(req: Request, { params }: { params: { token: string } }) {
  try {
    const passwordResetToken = await prisma.passwordResetToken.findUnique({
      where: { token: params.token },
    });
    if (!passwordResetToken) {
      return NextResponse.json({ error: 'Password reset token not found' }, { status: 404 });
    }
    return NextResponse.json(passwordResetToken);
  } catch (error) {
    console.error('Error fetching password reset token:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/password-reset-tokens/[token]
export async function DELETE(req: Request, { params }: { params: { token: string } }) {
  try {
    await prisma.passwordResetToken.delete({
      where: { token: params.token },
    });
    return NextResponse.json({ message: 'Password reset token deleted successfully' });
  } catch (error) {
    console.error('Error deleting password reset token:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
