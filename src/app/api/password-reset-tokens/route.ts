
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// POST /api/password-reset-tokens
export async function POST(req: Request) {
  try {
    const { email, token, expires } = await req.json();
    const newPasswordResetToken = await prisma.passwordResetToken.create({
      data: { email, token, expires },
    });
    return NextResponse.json(newPasswordResetToken, { status: 201 });
  } catch (error) {
    console.error('Error creating password reset token:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
