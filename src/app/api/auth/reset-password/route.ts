import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { parseJsonBody } from "@/lib/validations/http";
import { resetPasswordSchema } from "@/lib/validations/auth";
import { MINUTE, limitRequest } from "@/lib/rateLimit";

export async function POST(req: Request) {
  try {
    const limited = await limitRequest(req, "reset-password", 10, 15 * MINUTE);
    if (limited) return limited;
    const parsed = await parseJsonBody(req, resetPasswordSchema);
    if (parsed.error) return parsed.error;
    const { token, password } = parsed.data;

    const existingToken = await prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!existingToken) {
      return NextResponse.json({ error: "Invalid token!" }, { status: 400 });
    }

    const hasExpired = new Date(existingToken.expires) < new Date();

    if (hasExpired) {
      return NextResponse.json({ error: "Token has expired!" }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: existingToken.email },
      select: { id: true },
    });

    if (!existingUser) {
      return NextResponse.json({ error: "User does not exist!" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id: existingUser.id },
      // Signs out every session started before now (src/lib/auth.ts)
      data: { password: hashedPassword, passwordChangedAt: new Date() },
    });

    await prisma.passwordResetToken.delete({
      where: { id: existingToken.id },
    });

    return NextResponse.json({ success: true, message: "Password updated successfully!" });
  } catch (error) {
    console.error("Reset password failed:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
