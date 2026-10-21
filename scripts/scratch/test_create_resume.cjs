const http = require('http');

async function testCreateResume() {
  // 1. Login as Student
  const loginData = JSON.stringify({ email: 'aditya.shinde@student.gcoen.ac.in', password: 'CareerOS@2026' });
  const cookie = await new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3001,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginData),
      },
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        const cookies = res.headers['set-cookie'];
        if (cookies && cookies.length > 0) {
          resolve(cookies[0].split(';')[0]);
        } else {
          reject(new Error('No cookie: ' + data));
        }
      });
    });
    req.on('error', reject);
    req.write(loginData);
    req.end();
  });

  console.log('Logged in, cookie:', cookie);

  // 2. Post to /api/resumes
  const resumePayload = JSON.stringify({
    title: 'Aditya Shinde - Full Stack Engineer (ATS Grounded)',
    targetRole: 'Full Stack Engineer',
    version: 'v1.0',
    parsedData: {
      personalInfo: { fullName: 'Aditya Shinde', email: 'aditya.shinde@student.gcoen.ac.in' },
      summary: 'Passionate software engineer',
      skills: [{ category: 'Core', items: ['React', 'Node.js', 'PostgreSQL'] }],
      experience: [],
      projects: [],
      education: [],
      atsAnalysis: {
        score: 94,
        breakdown: { contactCompleteness: 15, structureCompleteness: 35, quantifiableImpact: 22, keywordRelevance: 22 },
        strengths: ['Verified portfolio'],
        improvements: [],
        detectedKeywords: ['React', 'Node.js'],
        missingKeywords: [],
      },
    },
    atsScore: 94,
    isDefault: true,
  });

  const resData = await new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3001,
      path: '/api/resumes',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(resumePayload),
        'Cookie': cookie,
      },
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        resolve({ status: res.statusCode, data });
      });
    });
    req.on('error', reject);
    req.write(resumePayload);
    req.end();
  });

  console.log('Response status:', resData.status);
  console.log('Response data:', resData.data);
}

testCreateResume().catch(console.error);
