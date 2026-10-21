import { PrismaClient } from '@prisma/client';

const p = new PrismaClient();

async function run() {
  const raw: any = await p.$queryRawUnsafe(`SELECT * FROM "LearningRoadmap";`);
  console.log('Raw query on LearningRoadmap:', raw);
}

run().finally(() => p.$disconnect());
