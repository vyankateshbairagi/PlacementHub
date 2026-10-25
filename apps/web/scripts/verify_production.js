const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function verifyProduction() {
  const PROD_URL = process.env.PROD_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://placementhub.vercel.app';
  console.log(`Starting live production verification on ${PROD_URL}...`);

  const outDir = path.join(__dirname, '..', 'public', 'prod_screenshots');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  const routes = [
    { name: 'prod_home', path: '/' },
    { name: 'prod_login', path: '/login' },
    { name: 'prod_tpo', path: '/tpo' },
    { name: 'prod_student', path: '/student' },
    { name: 'prod_recruiter', path: '/recruiter' },
    { name: 'prod_faculty', path: '/faculty' },
    { name: 'prod_alumni', path: '/alumni' },
    { name: 'prod_institute', path: '/institute' },
    { name: 'prod_super_admin', path: '/super-admin' },
  ];

  const results = [];

  for (const route of routes) {
    const fullUrl = `${PROD_URL}${route.path}`;
    try {
      const response = await page.goto(fullUrl, { waitUntil: 'networkidle', timeout: 25000 });
      const status = response ? response.status() : 'No response';
      console.log(`✓ [${status}] ${route.path}`);
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(outDir, `${route.name}.png`) });
      results.push({ path: route.path, status, success: status === 200 });
    } catch (err) {
      console.error(`✗ Error on ${route.path}:`, err.message);
      results.push({ path: route.path, status: 'ERROR', error: err.message, success: false });
    }
  }

  // Also test live login flow via API on production
  console.log('\nTesting live API authentication on production...');
  const testPassword = process.env.TEST_PASSWORD || 'CareerOS@2026';
  try {
    const loginRes = await page.evaluate(async ({ url, password }) => {
      const res = await fetch(`${url}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'tpo@gcoen.ac.in',
          password,
        }),
      });
      return { status: res.status, data: await res.json() };
    }, { url: PROD_URL, password: testPassword });
    console.log('Production login test response:', JSON.stringify(loginRes));
  } catch (err) {
    console.error('Login test error:', err.message);
  }

  await browser.close();
  console.log('\nProduction verification complete!');
  console.log(JSON.stringify(results, null, 2));
}

verifyProduction().catch((err) => {
  console.error('Fatal verification error:', err);
  process.exit(1);
});
