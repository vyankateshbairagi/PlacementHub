import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireSession, SESSION_COOKIE_NAME } from '@/lib/auth';
import { authErrorResponse } from '@/lib/auth-http';
import { syncLegacyActiveFlag } from '@/lib/user-status';

export async function DELETE() {
  try {
    const session = await requireSession();
    await prisma.$transaction([
      prisma.user.update({ where: { id: session.userId }, data: { isActive: false, sessionVersion: { increment: 1 } } }),
      prisma.authSession.updateMany({ where: { userId: session.userId, revokedAt: null }, data: { revokedAt: new Date() } }),
    ]);
    await syncLegacyActiveFlag(session.userId, false);
    const response = NextResponse.json({ success: true, message: 'Account deactivated.' });
    response.cookies.set({ name: SESSION_COOKIE_NAME, value: '', path: '/', maxAge: 0, httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
    return response;
  } catch (error) { return authErrorResponse(error); }
}
