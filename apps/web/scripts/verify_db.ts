import { PrismaClient } from '@prisma/client';

const p = new PrismaClient();

async function check() {
  const sp = await p.skillProof.count();
  const debriefs = await p.interviewDebrief.count();
  const drives = await p.placementDrive.count();
  const students = await p.studentProfile.findMany({
    select: {
      rollNo: true,
      trustScore: true,
      verifiedSkillsCount: true,
      skillProofs: { select: { canonicalSkill: true, confidenceTier: true } }
    }
  });
  console.log(JSON.stringify({ skillProofs: sp, debriefs, drives, students }, null, 2));
}

check().finally(() => p.$disconnect());

