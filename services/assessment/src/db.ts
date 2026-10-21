import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const connectionUrl = process.env.DATABASE_URL_POOLED || process.env.DATABASE_URL;

export const prisma = new PrismaClient({
  datasources: connectionUrl ? { db: { url: connectionUrl } } : undefined,
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

export default prisma;
