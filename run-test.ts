import { chromium } from 'playwright';
import prisma from './src/lib/prisma';
import crypto from 'crypto';

async function run() {
  console.log("Setting up test session...");
  // Find an ACTIVE user
  let user = await prisma.user.findFirst({ where: { status: 'ACTIVE' } });
  
  if (!user) {
    // create one
    user = await prisma.user.create({
      data: {
        name: 'Automated Tester',
        email: 'tester@kanakkupulla.local',
        role: 'ADMIN',
        status: 'ACTIVE'
      }
    });
  }

  // Create a session for this user
  const sessionToken = crypto.randomUUID();
  await prisma.session.create({
    data: {
      sessionToken,
      userId: user.id,
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    }
  });

  console.log("Launching browser...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  // Inject session cookie
  await context.addCookies([
    {
      name: 'next-auth.session-token',
      value: sessionToken,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'Lax'
    }
  ]);

  const page = await context.newPage();
  
  console.log("Navigating to Bookings Overview...");
  await page.goto('http://localhost:3000/bookings/overview');
  
  console.log("Opening Booking Modal...");
  await page.waitForTimeout(2000); // let it load
  await page.getByRole('button', { name: /New Booking/i }).click();

  console.log("Checking if modal opened and loaded layout...");
  await page.waitForSelector('text=Create Studio Booking', { state: 'visible' });
  
  // Verify if it's not stuck on loading
  try {
    await page.waitForSelector('text=Loading form layout...', { state: 'hidden', timeout: 5000 });
    console.log("SUCCESS: Loading spinner disappeared!");
    
    // Check if sections are rendered (e.g. Client Info, Event Details)
    await page.waitForSelector('text=Client Info', { state: 'visible' });
    console.log("SUCCESS: Form sections rendered!");
    
    // Test passed
    console.log("All functionality verified successfully!");
  } catch (err) {
    console.error("FAILED: The form is still stuck on loading or did not render correctly.");
  }

  await browser.close();
  
  // Cleanup session
  await prisma.session.delete({ where: { sessionToken } });
  await prisma.$disconnect();
}

run().catch(console.error);
