import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";
import { parseJsonBody } from "@/lib/validations/http";
import { forgotPasswordSchema } from "@/lib/validations/auth";
import { identifierLookup } from "@/lib/auth/username";

export async function POST(req: Request) {
  try {
    const parsed = await parseJsonBody(req, forgotPasswordSchema);
    if (parsed.error) return parsed.error;
    const user = await prisma.user.findUnique({
      where: identifierLookup(parsed.data.email),
      select: { email: true },
    });

    // Same reply whether or not the account exists, so the route can't be used to find accounts
    const message = "If that email or username is registered, a temporary password has been generated. Please contact your Studio Admin.";
    if (!user?.email) return NextResponse.json({ success: true, message });
    // Tokens are keyed by the account email, so a username resolves to it here
    const email = user.email.toLowerCase();

    // Keep a live token (reset or invite) as is: this route is public, so anyone could otherwise
    // keep invalidating the temporary password an admin has already handed out.
    const live = await prisma.passwordResetToken.findFirst({
      where: { email, expires: { gt: new Date() } },
      select: { id: true },
    });
    if (live) return NextResponse.json({ success: true, message });

    await prisma.passwordResetToken.deleteMany({ where: { email } });

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

    return NextResponse.json({ success: true, message });
  } catch (error) {
    console.error("Forgot password failed:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
