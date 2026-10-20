import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";
import { getGoogleDriveToken } from "@/lib/googleDriveAuth";

export async function GET() {
  try {
    const auth = await requireUser();
    if (auth.error) return auth.error;

    const accessToken = await getGoogleDriveToken({ user: auth.user });
    return NextResponse.json({ accessToken });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "reauth_required") {
      return NextResponse.json({ error: 'reauth_required' }, { status: 401 });
    }
    if (message === "No Google Drive account connected") {
      return NextResponse.json({ error: "No Google Drive account connected" }, { status: 404 });
    }
    console.error("Failed to get Google access token:", error);
    return NextResponse.json({ error: "Failed to get access token" }, { status: 500 });
  }
}
