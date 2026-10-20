import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";
import { getGoogleDriveToken } from "@/lib/googleDriveAuth";
import { parseJsonBody } from "@/lib/validations/http";
import { driveShareSchema } from "@/lib/validations/integrations";

export async function POST(req: Request) {
  try {
    const auth = await requireUser();
    if (auth.error) return auth.error;

    const parsed = await parseJsonBody(req, driveShareSchema);
    if (parsed.error) return parsed.error;
    const { fileId } = parsed.data;

    let accessToken: string;
    try {
      accessToken = await getGoogleDriveToken({ user: auth.user });
    } catch (e) {
      return NextResponse.json({ error: (e instanceof Error && e.message) || "No Google Drive account connected" }, { status: 401 });
    }

    // Call Google Drive API to add "anyone with link can view" permission
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}/permissions`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        role: "reader",
        type: "anyone"
      })
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to share file" }, { status: response.status });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to share Drive file:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
