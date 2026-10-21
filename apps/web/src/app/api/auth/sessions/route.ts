import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireSession } from '@/lib/auth';
import { authErrorResponse } from '@/lib/auth-http';

export async function GET() {
  try {
    const session = await requireSession();
    const sessions = await prisma.authSession.findMany({
      where: { userId: session.userId, revokedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true, createdAt: true, lastSeenAt: true, expiresAt: true, userAgent: true },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ success: true, currentSessionId: session.sessionId, sessions });
  } catch (error) { return authErrorResponse(error); }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = await req.json().catch(() => ({}));
    const sessionId = typeof body.sessionId === 'string' ? body.sessionId : null;
    const revokeAll = body.all === true;
    if (!revokeAll && !sessionId) return NextResponse.json({ success: false, error: 'sessionId or all=true is required.' }, { status: 400 });
    await prisma.$transaction(async (tx) => {
      await tx.authSession.updateMany({
        where: { userId: session.userId, revokedAt: null, ...(revokeAll ? {} : { id: sessionId! }) },
        data: { revokedAt: new Date() },
      });
      if (revokeAll) await tx.user.update({ where: { id: session.userId }, data: { sessionVersion: { increment: 1 } } });
    });
    return NextResponse.json({ success: true });
  } catch (error) { return authErrorResponse(error); }
}

