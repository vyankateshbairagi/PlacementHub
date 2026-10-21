import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

import fs from 'fs';
import path from 'path';

if (!process.env.DATABASE_URL) {
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      content.split(/\r?\n/).forEach((line) => {
        const match = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
        if (match) {
          let val = match[2].trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          process.env[match[1]] = val;
        }
      });
    }
  } catch (e) {
    console.warn('Could not manually load .env:', e);
  }
}

const dbUrl = process.env.DATABASE_URL_POOLED || process.env.DATABASE_URL;
const prisma = new PrismaClient({
  datasources: dbUrl ? { db: { url: dbUrl } } : undefined
});

const DEFAULT_PASSWORD = 'CareerOS@2026';

async function updatePasswords() {
  console.log('🔒 Starting password hashing and update for all users...');
  
  const salt = await bcrypt.genSalt(12);
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, salt);
  console.log('🔑 Generated bcrypt hash for default password:', DEFAULT_PASSWORD);

  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true }
  });

  console.log(`Found ${users.length} users to update.`);

  for (const user of users) {
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, emailVerifiedAt: new Date(), isActive: true, sessionVersion: { increment: 1 } }
    });
    console.log(`✅ Updated password for [${user.role}] ${user.name} (${user.email})`);
  }

  console.log('🎉 All users successfully updated with hashed passwords!');
}

updatePasswords()
  .catch((e) => {
    console.error('❌ Error updating passwords:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
