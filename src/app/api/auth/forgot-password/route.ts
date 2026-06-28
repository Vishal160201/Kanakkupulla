import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Return 200 even if user doesn't exist to prevent email enumeration
      return NextResponse.json({ success: true, message: "If that email is in our system, we sent a password reset link to it." });
    }

    // Check if token already exists for this email
    const existingToken = await prisma.passwordResetToken.findFirst({
      where: { email },
    });

    if (existingToken) {
      await prisma.passwordResetToken.delete({
        where: { id: existingToken.id },
      });
    }

    // Generate secure 6-character alphanumeric code
    const token = crypto.randomBytes(3).toString("hex").toUpperCase();
    const expires = new Date(Date.now() + 3600 * 1000); // 1 hour

    await prisma.passwordResetToken.create({
      data: {
        email,
        token,
        expires,
      },
    });

    return NextResponse.json({ success: true, message: "A temporary password has been generated. Please contact your Studio Admin." });
  } catch (error) {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
