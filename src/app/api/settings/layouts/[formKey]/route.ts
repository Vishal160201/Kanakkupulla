import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const revalidate = 3600; // Cache for 1 hour

export async function GET(
  request: Request,
  { params }: { params: Promise<{ formKey: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { formKey } = await params;

  try {
    const layout = await prisma.formLayout.findUnique({
      where: { formKey },
    });

    if (!layout) {
      return NextResponse.json({ error: "Layout not found" }, { status: 404 });
    }

    return NextResponse.json(layout);
  } catch (error) {
    console.error(`Error fetching layout ${formKey}:`, error);
    return NextResponse.json({ error: "Failed to fetch form layout" }, { status: 500 });
  }
}
