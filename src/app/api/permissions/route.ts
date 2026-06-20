import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

const DEFAULT_PERMISSIONS = [
  "manage_bookings",
  "view_transactions",
  "manage_transactions",
  "view_analytics",
  "manage_users",
  "view_galleries",
  "manage_galleries",
];

const DEFAULT_MATRIX: Record<string, Record<string, boolean>> = {
  ADMIN: {
    manage_bookings: true,
    view_transactions: true,
    manage_transactions: true,
    view_analytics: true,
    manage_users: true,
    view_galleries: true,
    manage_galleries: true,
  },
  STAFF: {
    manage_bookings: true,
    view_transactions: true,
    manage_transactions: false,
    view_analytics: true,
    manage_users: false,
    view_galleries: true,
    manage_galleries: false,
  },
  PHOTOGRAPHER: {
    manage_bookings: false,
    view_transactions: false,
    manage_transactions: false,
    view_analytics: false,
    manage_users: false,
    view_galleries: true,
    manage_galleries: true,
  },
};

async function ensureDefaultPermissions() {
  const count = await prisma.rolePermission.count();
  if (count === 0) {
    const data: { role: "ADMIN" | "STAFF" | "PHOTOGRAPHER"; permission: string; enabled: boolean }[] = [];
    for (const [role, perms] of Object.entries(DEFAULT_MATRIX)) {
      for (const [permission, enabled] of Object.entries(perms)) {
        data.push({ role: role as "ADMIN" | "STAFF" | "PHOTOGRAPHER", permission, enabled });
      }
    }
    await prisma.rolePermission.createMany({ data });
  }
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureDefaultPermissions();

    const permissions = await prisma.rolePermission.findMany({
      orderBy: [{ role: "asc" }, { permission: "asc" }],
    });

    return NextResponse.json(permissions);
  } catch (error) {
    console.error("Error fetching permissions:", error);
    return NextResponse.json({ error: "Failed to fetch permissions" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
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
    const { role, permission, enabled } = body;

    if (!role || !permission || typeof enabled !== "boolean") {
      return NextResponse.json({ error: "role, permission, and enabled are required" }, { status: 422 });
    }

    // Prevent modifying ADMIN permissions
    if (role === "ADMIN") {
      return NextResponse.json({ error: "Cannot modify ADMIN permissions" }, { status: 400 });
    }

    if (!DEFAULT_PERMISSIONS.includes(permission)) {
      return NextResponse.json({ error: "Invalid permission" }, { status: 422 });
    }

    const updated = await prisma.rolePermission.upsert({
      where: { role_permission: { role, permission } },
      update: { enabled },
      create: { role, permission, enabled },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating permission:", error);
    return NextResponse.json({ error: "Failed to update permission" }, { status: 500 });
  }
}
