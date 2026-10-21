import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireSameInstitution, requireSession } from '@/lib/auth';
import { authErrorResponse } from '@/lib/auth-http';
import { syncLegacyActiveFlag } from '@/lib/user-status';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireSession(['INSTITUTE_ADMIN', 'SUPER_ADMIN']);
    const body = await req.json();
    if (typeof body.isActive !== 'boolean') {
      return NextResponse.json({ success: false, error: 'isActive must be a boolean.' }, { status: 400 });
    }
    const target = await prisma.user.findUnique({ where: { id: params.id }, select: { id: true, institutionId: true, role: true } });
    if (!target) return NextResponse.json({ success: false, error: 'User not found.' }, { status: 404 });
    requireSameInstitution(session, target.institutionId);
    if (target.role === 'SUPER_ADMIN' && session.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ success: false, error: 'Only a super admin can update this account.' }, { status: 403 });
    }
    await prisma.$transaction([
      prisma.user.update({ where: { id: target.id }, data: { isActive: body.isActive, sessionVersion: { increment: 1 } } }),
      prisma.authSession.updateMany({ where: { userId: target.id, revokedAt: null }, data: { revokedAt: new Date() } }),
      prisma.auditLog.create({ data: { userId: session.userId, institutionId: target.institutionId, action: body.isActive ? 'USER_REACTIVATED' : 'USER_DEACTIVATED', details: JSON.stringify({ targetUserId: target.id }) } }),
    ]);
    await syncLegacyActiveFlag(target.id, body.isActive);
    return NextResponse.json({ success: true });
  } catch (error) { return authErrorResponse(error); }
}
