import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getGoogleDriveToken } from "@/lib/googleDriveAuth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const accessToken = await getGoogleDriveToken(session);
    return NextResponse.json({ accessToken });
  } catch (error: any) {
    console.error("Error fetching/refreshing Google token", error);
    if (error.message === "reauth_required") {
      return NextResponse.json({ error: 'reauth_required' }, { status: 401 });
    }
    if (error.message === "No Google Drive account connected") {
      return NextResponse.json({ error: "No Google Drive account connected" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to get access token" }, { status: 500 });
  }
}
