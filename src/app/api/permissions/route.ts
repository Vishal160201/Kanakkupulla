import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { DEFAULT_MATRIX, isPermission, isRole } from "@/lib/permissions";
import { requireAdmin, requireUser } from "@/lib/authz";
import { parseJsonBody } from "@/lib/validations/http";
import { permissionUpdateSchema } from "@/lib/validations/admin";

async function ensureDefaultPermissions() {
  const count = await prisma.rolePermission.count();
  if (count === 0) {
    const data: { role: "ADMIN" | "STAFF" | "PHOTOGRAPHER"; permission: string; enabled: boolean }[] = [];
    for (const [role, perms] of Object.entries(DEFAULT_MATRIX)) {
      if (!isRole(role)) continue;
      for (const [permission, enabled] of Object.entries(perms)) {
        data.push({ role, permission, enabled });
      }
    }
    await prisma.rolePermission.createMany({ data });
  }
}

export async function GET() {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  try {
    await ensureDefaultPermissions();

    const permissions = await prisma.rolePermission.findMany({
      orderBy: [{ role: "asc" }, { permission: "asc" }],
    });

    return NextResponse.json(permissions);
  } catch (error) {
    console.error("Failed to fetch permissions:", error);
    return NextResponse.json({ error: "Failed to fetch permissions" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const parsed = await parseJsonBody(request, permissionUpdateSchema);
    if (parsed.error) return parsed.error;
    const { role, permission, enabled } = parsed.data;

    // Prevent modifying core ADMIN permissions, but allow notification preferences
    if (role === "ADMIN" && !permission.startsWith("notify_")) {
      return NextResponse.json({ error: "Cannot modify core ADMIN permissions" }, { status: 400 });
    }

    if (!isPermission(permission) && !permission.startsWith("notify_")) {
      return NextResponse.json({ error: "Invalid permission" }, { status: 422 });
    }

    const updated = await prisma.rolePermission.upsert({
      where: { role_permission: { role, permission } },
      update: { enabled },
      create: { role, permission, enabled },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update permission:", error);
    return NextResponse.json({ error: "Failed to update permission" }, { status: 500 });
  }
}
