const http = require('http');

async function testSetDefault() {
  const loginData = JSON.stringify({ email: 'aditya.shinde@student.gcoen.ac.in', password: 'CareerOS@2026' });
  const cookie = await new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3001,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(loginData) },
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(res.headers['set-cookie'][0].split(';')[0]));
    });
    req.write(loginData);
    req.end();
  });

  // Fetch resumes
  const resumesRes = await new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3001,
      path: '/api/resumes',
      method: 'GET',
      headers: { 'Cookie': cookie },
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.end();
  });

  console.log('Found resumes:', resumesRes.resumes?.length);
  if (resumesRes.resumes?.length > 0) {
    const targetId = resumesRes.resumes[0].id;
    console.log('Testing PATCH /api/resumes/' + targetId + '/default');
    const patchRes = await new Promise((resolve) => {
      const req = http.request({
        hostname: 'localhost',
        port: 3001,
        path: `/api/resumes/${targetId}/default`,
        method: 'PATCH',
        headers: { 'Cookie': cookie },
      }, (res) => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
      });
      req.end();
    });
    console.log('Default Patch result:', patchRes);
  }
}

testSetDefault().catch(console.error);
