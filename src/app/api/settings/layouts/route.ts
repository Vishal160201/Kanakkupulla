import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const layouts = await prisma.formLayout.findMany({
      orderBy: { name: "asc" }
    });
    return NextResponse.json(layouts);
  } catch (error) {
    console.error("Error fetching form layouts:", error);
    return NextResponse.json({ error: "Failed to fetch form layouts" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userRole = (session.user as any).role;
  if (userRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { formKey, name, description, schema } = body;

    if (!formKey || !name || !schema) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 422 });
    }

    const updated = await prisma.formLayout.upsert({
      where: { formKey },
      update: { name, description, schema },
      create: { formKey, name, description, schema },
    });

    // Invalidate caches so the modal reads the newest layout immediately
    revalidatePath("/api/settings/layouts");
    revalidatePath(`/api/settings/layouts/${formKey}`);

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating form layout:", error);
    return NextResponse.json({ error: "Failed to update form layout" }, { status: 500 });
  }
}
