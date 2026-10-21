const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const client = new Client({
  connectionString: 'postgresql://neondb_owner:npg_xNOwJlWY3L5t@ep-weathered-smoke-b4s42s9r.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await client.connect();
  const instRes = await client.query('SELECT id FROM "Institution" LIMIT 1');
  const institutionId = instRes.rows[0]?.id;

  const DEFAULT_PASSWORD = 'CareerOS@2026';
  const salt = await bcrypt.genSalt(12);
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, salt);

  const users = [
    {
      email: 'tpo@gcoen.ac.in',
      name: 'Prof. Rajesh Kulkarni',
      role: 'TPO',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      institutionId,
      phone: '+91 9822114455'
    },
    {
      email: 'faculty.cs@gcoen.ac.in',
      name: 'Prof. Anita Patil',
      role: 'FACULTY',
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
      institutionId,
      phone: '+91 9822114466'
    },
    {
      email: 'recruiter.google@alphabet.com',
      name: 'Arjun Nambiar',
      role: 'RECRUITER',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      institutionId: null,
      phone: '+91 9822114477'
    },
    {
      email: 'alumni.amit@amazon.com',
      name: 'Amit Joshi',
      role: 'ALUMNI',
      avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
      institutionId,
      phone: '+91 9822114488'
    },
    {
      email: 'principal@gcoen.ac.in',
      name: 'Dr. Suresh R. Deshmukh',
      role: 'INSTITUTE_ADMIN',
      avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
      institutionId,
      phone: '+91 9822114499'
    }
  ];

  for (const u of users) {
    const existing = await client.query('SELECT id FROM "User" WHERE email = $1', [u.email]);
    let userId;
    if (existing.rows.length === 0) {
      const id = 'usr_' + Math.random().toString(36).substring(2, 12);
      await client.query(
        `INSERT INTO "User" (id, email, name, role, "passwordHash", "avatarUrl", "institutionId", phone, "isActive", "emailVerifiedAt", "updatedAt", "createdAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, NOW(), NOW(), NOW())`,
        [id, u.email, u.name, u.role, passwordHash, u.avatarUrl, u.institutionId, u.phone]
      );
      userId = id;
      console.log(`Created user ${u.role}: ${u.name} (${u.email})`);
    } else {
      userId = existing.rows[0].id;
      await client.query(
        `UPDATE "User" SET "passwordHash" = $1, "isActive" = true, "emailVerifiedAt" = NOW(), role = $2 WHERE id = $3`,
        [passwordHash, u.role, userId]
      );
      console.log(`Updated user ${u.role}: ${u.name} (${u.email})`);
    }

    // Role-specific profiles
    try {
      if (u.role === 'FACULTY') {
        const fp = await client.query('SELECT id FROM "FacultyProfile" WHERE "userId" = $1', [userId]);
        if (fp.rows.length === 0) {
          await client.query(
            `INSERT INTO "FacultyProfile" (id, "userId", department, designation, "employeeId", "updatedAt", "createdAt")
             VALUES ($1, $2, 'Computer Engineering', 'Associate Professor & Career Mentor', 'EMP-CS-042', NOW(), NOW())`,
            ['fp_' + Math.random().toString(36).substring(2, 12), userId]
          );
        }
      } else if (u.role === 'RECRUITER') {
        const rp = await client.query('SELECT id FROM "RecruiterProfile" WHERE "userId" = $1', [userId]);
        if (rp.rows.length === 0) {
          await client.query(
            `INSERT INTO "RecruiterProfile" (id, "userId", "companyName", "companyLogo", website, designation, "updatedAt", "createdAt")
             VALUES ($1, $2, 'Google India', 'https://www.google.com/favicon.ico', 'https://careers.google.com', 'Senior Campus Recruiter', NOW(), NOW())`,
            ['rp_' + Math.random().toString(36).substring(2, 12), userId]
          );
        }
      }
    } catch (pe) {
      console.warn('Profile creation warning:', pe.message);
    }
  }

  console.log('All roles seeded and verified successfully!');
  await client.end();
}

main().catch(e => {
  console.error(e);
  client.end();
});
