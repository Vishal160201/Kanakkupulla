import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireOwner, requireUser } from "@/lib/authz";
import { parseJsonBody } from "@/lib/validations/http";
import { userCreateSchema } from "@/lib/validations/users";
import { formatAssignments, setUserAssignments, userAssignmentsSelect, validateAssignments } from "@/lib/userAccess";
import { ShopError } from "@/lib/shops";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export async function GET() {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  // Every signed-in user gets the team list for picklists; owners also get shop assignments
  // and pending temporary passwords.
  const isOwner = auth.user.role === "OWNER";

  try {
    const rows = await prisma.user.findMany({
      select: {
        id: true,
        idNumber: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        invitedAt: true,
        ...userAssignmentsSelect,
      },
      orderBy: { name: "asc" },
      take: 500,
    });
    const users = rows.map(({ shopMemberships, ...user }) => (isOwner ? { ...user, assignments: formatAssignments(shopMemberships) } : user));

    if (isOwner) {
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
  const auth = await requireOwner();
  if (auth.error) return auth.error;

  try {
    const parsed = await parseJsonBody(request, userCreateSchema);
    if (parsed.error) return parsed.error;
    const { name, email, phone, isOwner, assignments } = parsed.data; // email is trimmed + lower-cased

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

    const newUser = await prisma.$transaction(async tx => {
      const valid = isOwner ? [] : await validateAssignments(tx, assignments);
      const created = await tx.user.create({
        data: {
          name,
          email,
          phone,
          password: hashedPassword,
          role: isOwner ? "OWNER" : "MEMBER",
          status: "ACTIVE", // Removed approval concept
          invitedAt: new Date(),
        },
        select: { id: true },
      });
      await setUserAssignments(tx, created.id, valid);
      return tx.user.findUniqueOrThrow({
        where: { id: created.id },
        select: { id: true, name: true, email: true, phone: true, role: true, status: true, invitedAt: true, ...userAssignmentsSelect },
      });
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

    const { shopMemberships, ...userFields } = newUser;
    return NextResponse.json({ user: { ...userFields, assignments: formatAssignments(shopMemberships) }, tempPassword }, { status: 201 });
  } catch (error) {
    if (error instanceof ShopError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Failed to create user:", error);
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}
