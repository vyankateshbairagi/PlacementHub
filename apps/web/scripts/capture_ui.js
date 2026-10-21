const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function capture() {
  const outDir = path.join(__dirname, '..', 'public', 'screenshots');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  
  // Desktop Context
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await desktopContext.newPage();

  const routes = [
    { name: 'login', url: 'http://localhost:3000/login' },
    { name: 'student', url: 'http://localhost:3000/student' },
    { name: 'tpo', url: 'http://localhost:3000/tpo' },
    { name: 'recruiter', url: 'http://localhost:3000/recruiter' },
    { name: 'faculty', url: 'http://localhost:3000/faculty' },
    { name: 'alumni', url: 'http://localhost:3000/alumni' },
    { name: 'institute', url: 'http://localhost:3000/institute' },
    { name: 'super-admin', url: 'http://localhost:3000/super-admin' },
  ];

  for (const route of routes) {
    console.log(`Capturing Desktop: ${route.name} (${route.url})...`);
    await page.goto(route.url, { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(500); // Allow any animation to settle
    await page.screenshot({ path: path.join(outDir, `${route.name}.png`), fullPage: false });
  }

  // Mobile Context (iPhone 13 / 390x844)
  console.log('Capturing Mobile Viewport (390x844)...');
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
  });
  const mobilePage = await mobileContext.newPage();

  await mobilePage.goto('http://localhost:3000/tpo', { waitUntil: 'networkidle', timeout: 20000 });
  await mobilePage.waitForTimeout(500);
  await mobilePage.screenshot({ path: path.join(outDir, 'mobile_tpo.png') });

  await mobilePage.goto('http://localhost:3000/student', { waitUntil: 'networkidle', timeout: 20000 });
  await mobilePage.waitForTimeout(500);
  await mobilePage.screenshot({ path: path.join(outDir, 'mobile_student.png') });

  await browser.close();
  console.log('All screenshots captured successfully in public/screenshots/!');
}

capture().catch((err) => {
  console.error('Capture error:', err);
  process.exit(1);
});
