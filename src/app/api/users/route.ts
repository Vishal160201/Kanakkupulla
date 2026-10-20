import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/authz";
import { parseJsonBody } from "@/lib/validations/http";
import { userCreateSchema } from "@/lib/validations/users";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export async function GET() {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  // Allow all authenticated users to see the team list for picklists
  // (We removed the ADMIN-only restriction for GET)

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        idNumber: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        invitedAt: true,
      },
      orderBy: { name: "asc" },
      take: 500,
    });

    if (auth.user.role === "ADMIN") {
      const activeTokens = await prisma.passwordResetToken.findMany({
        where: { expires: { gt: new Date() } },
        select: { email: true, token: true },
      });
      
      const usersWithTokens = users.map(user => {
        if (!user.email) return user;
        const userToken = activeTokens.find(t => t.email.toLowerCase() === user.email!.toLowerCase());
        if (userToken) {
          return { ...user, tempPassword: userToken.token };
        }
        return user;
      });
      
      return NextResponse.json(usersWithTokens);
    }

    return NextResponse.json(users);
  } catch (error) {
    console.error("Failed to fetch users:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const parsed = await parseJsonBody(request, userCreateSchema);
    if (parsed.error) return parsed.error;
    const { name, email, role } = parsed.data; // email is trimmed + lower-cased

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
    }

    // Generate temporary password to be used as a token
    const tempPassword = crypto.randomBytes(9).toString("base64url");
    
    // Create an impossible random password for the actual user record so they cannot log in directly
    const impossiblePassword = crypto.randomBytes(32).toString("hex");
    const hashedPassword = await bcrypt.hash(impossiblePassword, 12);

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        status: "ACTIVE", // Removed approval concept
        invitedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        invitedAt: true,
      },
    });

    // Create a PasswordResetToken containing the temporary password
    // This allows the auth system to detect it and force a password reset
    await prisma.passwordResetToken.create({
      data: {
        email,
        token: tempPassword,
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days valid
      }
    });

    return NextResponse.json({ user: newUser, tempPassword }, { status: 201 });
  } catch (error) {
    console.error("Failed to create user:", error);
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}
