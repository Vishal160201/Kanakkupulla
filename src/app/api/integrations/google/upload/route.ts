import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getGoogleDriveToken, getOrCreateFolder } from "@/lib/googleDriveAuth";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const accessToken = await getGoogleDriveToken(session);

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const moduleName = formData.get("module") as string || "Uncategorized";
    const categoryName = formData.get("category") as string || "Uncategorized";
    let dateStr = formData.get("date") as string;
    if (!dateStr) {
      dateStr = new Intl.DateTimeFormat('en-GB', { 
        timeZone: 'Asia/Kolkata', 
        day: '2-digit', month: '2-digit', year: 'numeric' 
      }).format(new Date()).replace(/\//g, '-');
    }

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // --- FOLDER MANAGEMENT ---
    const getFolders = async () => {
      const rootFid = await getOrCreateFolder("Kanakkupulla", null, accessToken, userId);
      const modFid = await getOrCreateFolder(moduleName, rootFid, accessToken, userId);
      const catFid = await getOrCreateFolder(categoryName, modFid, accessToken, userId);
      return await getOrCreateFolder(dateStr, catFid, accessToken, userId);
    };

    let folderId = await getFolders();

    // Construct multipart/related payload for Google Drive API
    const boundary = "314159265358979323846";

    const buildBody = (fid: string) => {
      const metadata: any = { name: file.name, mimeType: file.type };
      if (fid) metadata.parents = [fid];
      
      const metadataPart = 
        `--${boundary}\r\n` +
        `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
        `${JSON.stringify(metadata)}\r\n` +
        `--${boundary}\r\n` +
        `Content-Type: ${file.type}\r\n\r\n`;

      const closeDelim = `\r\n--${boundary}--\r\n`;
      return Buffer.concat([
        Buffer.from(metadataPart, 'utf8'),
        fileBuffer,
        Buffer.from(closeDelim, 'utf8')
      ]);
    };

    // Convert file to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    let body = buildBody(folderId);

    // --- DEBUG LOGGING ---
    try {
      const tokenInfoRes = await fetch(`https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${accessToken}`);
      const tokenInfo = await tokenInfoRes.text();
    } catch (tokenErr: any) {
    }

    const uploadUrl = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";
    console.log("Request Headers:", {
      "Authorization": `Bearer [REDACTED]`,
      "Content-Type": `multipart/related; boundary=${boundary}`
    });

    const doUpload = () => fetch(uploadUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`
      },
      body: body
    });

    let uploadRes = await doUpload();

    // RETRY LOGIC ON 404
    if (uploadRes.status === 404) {
      await prisma.systemSetting.deleteMany({
        where: { key: { startsWith: `google_drive_folder_${userId}_` } }
      });
      folderId = await getFolders();
      body = buildBody(folderId);
      uploadRes = await doUpload();
    }

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      return NextResponse.json({ error: "Failed to upload file to Google Drive" }, { status: uploadRes.status });
    }

    const uploadedFile = await uploadRes.json();
    const fileId = uploadedFile.id;

    // 2. Set permissions to "anyone with link can view"
    const permUrl = `https://www.googleapis.com/drive/v3/files/${fileId}/permissions`;
    await fetch(permUrl, {
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

    // 3. Fetch the metadata (webViewLink, iconLink)
    const getUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,webViewLink,iconLink`;
    const getRes = await fetch(getUrl, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`
      }
    });

    const finalFile = await getRes.json();

    return NextResponse.json({
      id: finalFile.id,
      name: finalFile.name,
      url: finalFile.webViewLink,
      iconUrl: finalFile.iconLink
    });

  } catch (err: any) {
    if (err.message === "reauth_required" || err.message === "No Google Drive account connected") {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    return NextResponse.json({ error: err.message, details: err.response?.data }, { status: 500 });
  }
}
