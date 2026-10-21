const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const count = await prisma.auditLog.count();
    console.log('AuditLog table exists! Count:', count);
    const sample = await prisma.auditLog.findFirst();
    console.log('Sample auditLog:', sample);
  } catch (err) {
    console.error('AuditLog query failed:', err);
  }
}

main().finally(() => prisma.$disconnect());
