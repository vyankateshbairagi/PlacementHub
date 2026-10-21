import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { hashOpaqueToken } from '@/lib/auth-tokens';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const token = typeof body.token === 'string' ? body.token : '';
  const record = token ? await prisma.authToken.findUnique({ where: { tokenHash: hashOpaqueToken(token) } }) : null;
  if (!record || record.type !== 'EMAIL_VERIFICATION' || record.usedAt || record.expiresAt <= new Date()) {
    return NextResponse.json({ success: false, error: 'This verification link is invalid or has expired.' }, { status: 400 });
  }
  await prisma.$transaction([
    prisma.authToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    prisma.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: new Date() } }),
  ]);
  return NextResponse.json({ success: true, message: 'Email verified. You can now sign in.' });
}

