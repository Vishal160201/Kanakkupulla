import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
    });

    const userRole = (session.user as any).role;
    if (userRole === "ADMIN") {
      const activeTokens = await prisma.passwordResetToken.findMany({
        where: { expires: { gt: new Date() } }
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
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userRole = (session.user as any).role;
  if (userRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, email, role } = body;

    if (!name?.trim() || !email?.trim()) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 422 });
    }

    const validRoles = ["ADMIN", "STAFF", "PHOTOGRAPHER"];
    if (!role || !validRoles.includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 422 });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
    }

    // Generate temporary password to be used as a token
    const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4).toUpperCase();
    
    // Create an impossible random password for the actual user record so they cannot log in directly
    const impossiblePassword = Math.random().toString(36) + Math.random().toString(36) + Math.random().toString(36);
    const hashedPassword = await bcrypt.hash(impossiblePassword, 12);

    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
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
        email: email.trim().toLowerCase(),
        token: tempPassword,
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days valid
      }
    });

    return NextResponse.json({ user: newUser, tempPassword }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}
