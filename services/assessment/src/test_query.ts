import { prisma } from './db.js';

async function test() {
  const roadmaps = await prisma.learningRoadmap.findMany();
  console.log('Roadmaps count:', roadmaps.length);

  const assessments = await prisma.assessment.findMany();
  console.log('Assessments count:', assessments.length);

  const rawCount: any = await prisma.$queryRawUnsafe(`SELECT count(*) FROM "LearningRoadmap";`);
  console.log('Raw count LearningRoadmap:', rawCount);

  const rawAssess: any = await prisma.$queryRawUnsafe(`SELECT count(*) FROM "Assessment";`);
  console.log('Raw count Assessment:', rawAssess);
}

test().finally(() => prisma.$disconnect());
