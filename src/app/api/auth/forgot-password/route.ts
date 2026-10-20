import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";
import { parseJsonBody } from "@/lib/validations/http";
import { forgotPasswordSchema } from "@/lib/validations/auth";

export async function POST(req: Request) {
  try {
    const parsed = await parseJsonBody(req, forgotPasswordSchema);
    if (parsed.error) return parsed.error;
    const { email } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (!user) {
      // Return 200 even if user doesn't exist to prevent email enumeration
      return NextResponse.json({ success: true, message: "If that email is in our system, we sent a password reset link to it." });
    }

    // Replace any existing token for this email
    await prisma.passwordResetToken.deleteMany({
      where: { email },
    });

    // Temporary password the admin hands to the user; long enough that it can't be brute-forced
    const token = crypto.randomBytes(9).toString("base64url");
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
    console.error("Forgot password failed:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
