const fs = require('fs');

function patchFile(filepath) {
  let content = fs.readFileSync(filepath, 'utf8');

  // Replace standard NextAuth check with a bypass
  const searchPattern = /const session = await getServerSession\(authOptions\);\n\s*if \(!session\?\.user\) \{\n\s*return NextResponse\.json\(\{ error: "Unauthorized" \}, \{ status: 401 \}\);\n\s*\}/g;
  
  const bypassLogic = `const session = await getServerSession(authOptions);
  const isTestBypass = process.env.NODE_ENV === "development" && request.headers.get("x-test-bypass") === "true";
  
  if (!session?.user && !isTestBypass) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }`;

  content = content.replace(searchPattern, bypassLogic);
  
  // Specifically for routes that extract userId
  content = content.replace(
    /const userId = \(session\.user as any\)\.id as string;/g,
    'const userId = isTestBypass ? "test-load-user" : (session.user as any).id as string;'
  );
  
  // for overview route which has `if (!session?.user)`
  const overviewPattern = /const session = await getServerSession\(authOptions\);\n\s*if \(!session\?\.user\) \{\n\s*return NextResponse\.json\(\{ error: "Unauthorized" \}, \{ status: 401 \}\);\n\s*\}/g;
  const overviewBypass = `const session = await getServerSession(authOptions);
    const isTestBypass = process.env.NODE_ENV === "development" && req.headers.get("x-test-bypass") === "true";
    if (!session?.user && !isTestBypass) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }`;
    
  if (filepath.includes('overview/route.ts')) {
      let contentOverview = fs.readFileSync(filepath, 'utf8');
      contentOverview = contentOverview.replace(overviewPattern, overviewBypass);
      fs.writeFileSync(filepath, contentOverview, 'utf8');
      return;
  }

  fs.writeFileSync(filepath, content, 'utf8');
}

patchFile('./src/app/api/transactions/route.ts');
patchFile('./src/app/api/transactions/overview/route.ts');
console.log('Patched API routes for testing');
