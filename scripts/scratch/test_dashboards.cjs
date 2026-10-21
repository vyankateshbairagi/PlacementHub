async function testRole(email, password, expectedPath) {
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const cookie = loginRes.headers.get('set-cookie');
  const loginData = await loginRes.json();
  console.log(`[LOGIN] ${email} -> success: ${loginData.success}, redirectPath: ${loginData.redirectPath}`);

  if (cookie) {
    const pageRes = await fetch(`http://localhost:3000${expectedPath}`, {
      headers: { cookie }
    });
    console.log(`[DASHBOARD] GET ${expectedPath} -> status: ${pageRes.status} (OK: ${pageRes.ok})`);
  }
}

async function runAll() {
  await testRole('aditya.shinde@student.gcoen.ac.in', 'CareerOS@2026', '/student');
  await testRole('tpo@gcoen.ac.in', 'CareerOS@2026', '/tpo');
  await testRole('recruiter.google@alphabet.com', 'CareerOS@2026', '/recruiter');
  await testRole('faculty.cs@gcoen.ac.in', 'CareerOS@2026', '/faculty');
  await testRole('alumni.amit@amazon.com', 'CareerOS@2026', '/alumni');
}

runAll().catch(console.error);
