import prisma from "@/lib/prisma";

export async function getGoogleDriveToken(session: any): Promise<string> {
  if (!session?.user?.email) {
    throw new Error("Unauthorized");
  }

  const account = await prisma.account.findFirst({
    where: {
      userId: (session.user as any).id,
      provider: "google-drive"
    }
  });

  if (!account || !account.access_token) {
    throw new Error("No Google Drive account connected");
  }

  // Check if token is expired or close to expiring (within 5 minutes)
  const isExpired = account.expires_at ? (Date.now() / 1000) > (account.expires_at - 300) : false;

  if (isExpired) {
    if (!account.refresh_token) {
      throw new Error("reauth_required");
    }

    // Refresh the token
    const url = "https://oauth2.googleapis.com/token";
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: "refresh_token",
        refresh_token: account.refresh_token
      })
    });

    const tokens = await response.json();

    if (!response.ok) {
      if (tokens.error === 'invalid_grant') {
         throw new Error("reauth_required");
      }
      throw new Error(tokens.error || "Failed to refresh token");
    }

    await prisma.account.update({
      where: { id: account.id },
      data: {
        access_token: tokens.access_token,
        expires_at: Math.floor(Date.now() / 1000 + tokens.expires_in),
        refresh_token: tokens.refresh_token ?? account.refresh_token
      }
    });

    return tokens.access_token;
  }

  return account.access_token;
}

export async function getOrCreateFolder(name: string, parentId: string | null, accessToken: string, userId: string): Promise<string> {
  const cacheKey = `google_drive_folder_${userId}_${parentId || 'root'}_${name}`;
  
  try {
    const cachedSetting = await prisma.systemSetting.findUnique({
      where: { key: cacheKey }
    });
    if (cachedSetting && typeof cachedSetting.value === 'string') {
      const ageMs = Date.now() - new Date(cachedSetting.updatedAt).getTime();
      const isExpired = ageMs > 7 * 24 * 60 * 60 * 1000;
      
      if (!isExpired) {
        return cachedSetting.value;
      }
      
      // Cache expired, re-verify folder exists
      const checkRes = await fetch(`https://www.googleapis.com/drive/v3/files/${cachedSetting.value}?fields=id,trashed`, {
        headers: { "Authorization": `Bearer ${accessToken}` }
      });
      
      if (checkRes.ok) {
        const checkData = await checkRes.json();
        if (!checkData.trashed) {
          // Valid, reset TTL by deleting and recreating the cache entry
          await prisma.systemSetting.delete({ where: { key: cacheKey } });
          await prisma.systemSetting.upsert({
            where: { key: cacheKey },
            update: { value: cachedSetting.value },
            create: { key: cacheKey, value: cachedSetting.value }
          });
          return cachedSetting.value;
        }
      }
      
      // If 404 or trashed, delete cache and fall through to recreate
      await prisma.systemSetting.delete({ where: { key: cacheKey } });
    }
  } catch (err) {
  }

  let folderId: string | null = null;
  const parentQuery = parentId ? `'${parentId}' in parents` : "'root' in parents";
  const query = `name='${name.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and ${parentQuery} and trashed=false`;
  
  const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&spaces=drive`, {
    headers: { "Authorization": `Bearer ${accessToken}` }
  });
  
  if (searchRes.ok) {
    const searchData = await searchRes.json();
    if (searchData.files && searchData.files.length > 0) {
      folderId = searchData.files[0].id;
    }
  }

  if (!folderId) {
    const createBody: any = {
      name: name,
      mimeType: "application/vnd.google-apps.folder"
    };
    if (parentId) {
      createBody.parents = [parentId];
    }
    
    const createRes = await fetch("https://www.googleapis.com/drive/v3/files", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(createBody)
    });
    
    if (createRes.ok) {
      const createData = await createRes.json();
      folderId = createData.id;
    } else {
      throw new Error("Failed to create folder " + name);
    }
  }

  if (folderId) {
    try {
      await prisma.systemSetting.upsert({
        where: { key: cacheKey },
        update: { value: folderId },
        create: { key: cacheKey, value: folderId }
      });
    } catch (err) {
    }
  }

  return folderId as string;
}
