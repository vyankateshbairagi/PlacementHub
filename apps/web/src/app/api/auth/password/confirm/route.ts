import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { hashPassword, validatePassword } from '@/lib/auth';
import { hashOpaqueToken } from '@/lib/auth-tokens';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const token = typeof body.token === 'string' ? body.token : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const passwordError = validatePassword(password);
  if (!token || passwordError) return NextResponse.json({ success: false, error: passwordError || 'Reset token is required.' }, { status: 400 });
  const record = await prisma.authToken.findUnique({ where: { tokenHash: hashOpaqueToken(token) } });
  if (!record || record.type !== 'PASSWORD_RESET' || record.usedAt || record.expiresAt <= new Date()) {
    return NextResponse.json({ success: false, error: 'This reset link is invalid or has expired.' }, { status: 400 });
  }
  const passwordHash = await hashPassword(password);
  await prisma.$transaction(async (tx) => {
    const claimed = await tx.authToken.updateMany({ where: { id: record.id, usedAt: null }, data: { usedAt: new Date() } });
    if (claimed.count !== 1) throw new Error('TOKEN_ALREADY_USED');
    await tx.user.update({ where: { id: record.userId }, data: { passwordHash, sessionVersion: { increment: 1 } } });
    await tx.authSession.updateMany({ where: { userId: record.userId, revokedAt: null }, data: { revokedAt: new Date() } });
  });
  return NextResponse.json({ success: true, message: 'Password updated. Sign in again on all devices.' });
}

