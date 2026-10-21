import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const payload = token ? await verifySessionToken(token) : null;
  if (payload) {
    await prisma.authSession.updateMany({
      where: { id: payload.sessionId, userId: payload.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  const response = NextResponse.json({ success: true, message: 'Logged out successfully.' });
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}

