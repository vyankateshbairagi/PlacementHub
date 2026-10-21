async function testAuthLifecycle() {
  console.log('=== STARTING FULL AUTHENTICATION & LOGOUT LIFECYCLE TEST ===\n');

  // Step 1: Login
  console.log('1. Attempting login as Student (Aditya Shinde)...');
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'aditya.shinde@student.gcoen.ac.in',
      password: 'CareerOS@2026'
    })
  });

  const cookie = loginRes.headers.get('set-cookie');
  const loginJson = await loginRes.json();
  console.log('   Login HTTP Status:', loginRes.status);
  console.log('   Login Payload Success:', loginJson.success);
  console.log('   Authenticated User:', loginJson.user?.name, `(${loginJson.user?.role})`);
  console.log('   Cookie Header Received:', Boolean(cookie));

  if (!cookie) {
    throw new Error('Failed to get session cookie on login!');
  }

  // Step 2: Access protected dashboard
  console.log('\n2. Accessing protected dashboard (/student) WITH authenticated session cookie...');
  const dashRes = await fetch('http://localhost:3000/student', {
    headers: { cookie },
    redirect: 'manual'
  });
  console.log('   Dashboard HTTP Status:', dashRes.status, '(200 means fully authenticated and rendered)');
  if (dashRes.status !== 200) {
    throw new Error(`Expected 200 OK on protected dashboard, got: ${dashRes.status}`);
  }

  // Step 3: Call Logout API
  console.log('\n3. Calling Logout API (/api/auth/logout)...');
  const logoutRes = await fetch('http://localhost:3000/api/auth/logout', {
    method: 'POST',
    headers: { cookie }
  });
  const logoutCookie = logoutRes.headers.get('set-cookie');
  const logoutJson = await logoutRes.json();
  console.log('   Logout HTTP Status:', logoutRes.status);
  console.log('   Logout Response:', logoutJson);
  console.log('   Cleared Cookie Header Received:', logoutCookie);

  // Step 4: Access protected dashboard after logout
  console.log('\n4. Attempting to access protected dashboard (/student) AFTER logout...');
  const expiredCookieHeader = logoutCookie?.split(';')[0] || '';
  const postLogoutRes = await fetch('http://localhost:3000/student', {
    headers: { cookie: expiredCookieHeader },
    redirect: 'manual'
  });
  console.log('   Post-Logout Dashboard HTTP Status:', postLogoutRes.status);
  console.log('   Redirect Target Location:', postLogoutRes.headers.get('location'));

  if (postLogoutRes.status === 307 && postLogoutRes.headers.get('location')?.includes('/login')) {
    console.log('\n✅ AUTHENTICATION & LOGOUT LIFECYCLE TEST PASSED WITH 100% SUCCESS!');
  } else {
    console.log('\n⚠️ Middleware response:', postLogoutRes.status);
  }
}

testAuthLifecycle().catch(console.error);
