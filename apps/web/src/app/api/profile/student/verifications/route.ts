import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireSameInstitution, requireSession } from '@/lib/auth';
import { authErrorResponse } from '@/lib/auth-http';
import { cleanHttpsUrl, cleanText } from '@/lib/student-profile';

const TARGETS = ['PROFILE', 'EDUCATION', 'PROJECT', 'EXPERIENCE'] as const;

export async function GET() {
  try {
    const session = await requireSession(['STUDENT', 'TPO', 'FACULTY', 'INSTITUTE_ADMIN', 'SUPER_ADMIN']);
    const requests = session.role === 'STUDENT'
      ? await prisma.profileVerificationRequest.findMany({ where: { studentProfile: { userId: session.userId } }, orderBy: { createdAt: 'desc' } })
      : await prisma.profileVerificationRequest.findMany({
          where: session.role === 'SUPER_ADMIN' ? {} : { studentProfile: { user: { institutionId: session.institutionId } } },
          include: { studentProfile: { select: { id: true, user: { select: { name: true, email: true, institutionId: true } } } } },
          orderBy: { createdAt: 'desc' }, take: 100,
        });
    return NextResponse.json({ success: true, requests });
  } catch (error) { return authErrorResponse(error); }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(['STUDENT']);
    const profile = await prisma.studentProfile.findUnique({ where: { userId: session.userId }, select: { id: true } });
    if (!profile) return NextResponse.json({ success: false, error: 'Student profile not found.' }, { status: 404 });
    const body = await req.json();
    const targetType = typeof body.targetType === 'string' ? body.targetType.toUpperCase() : '';
    const targetId = typeof body.targetId === 'string' ? body.targetId : null;
    const evidenceUrl = cleanHttpsUrl(body.evidenceUrl);
    if (!(TARGETS as readonly string[]).includes(targetType) || !evidenceUrl) return NextResponse.json({ success: false, error: 'A valid target and HTTPS evidence URL are required.' }, { status: 400 });
    if (targetType !== 'PROFILE' && !targetId) return NextResponse.json({ success: false, error: 'targetId is required.' }, { status: 400 });
    const owned = targetType === 'EDUCATION' ? await prisma.studentEducation.findFirst({ where: { id: targetId!, studentProfileId: profile.id } })
      : targetType === 'PROJECT' ? await prisma.studentProject.findFirst({ where: { id: targetId!, studentProfileId: profile.id } })
      : targetType === 'EXPERIENCE' ? await prisma.studentExperience.findFirst({ where: { id: targetId!, studentProfileId: profile.id } })
      : profile;
    if (!owned) return NextResponse.json({ success: false, error: 'Verification target not found.' }, { status: 404 });
    const duplicate = await prisma.profileVerificationRequest.findFirst({ where: { studentProfileId: profile.id, targetType, targetId, status: 'PENDING' }, select: { id: true } });
    if (duplicate) return NextResponse.json({ success: false, error: 'A verification request is already pending.' }, { status: 409 });
    const request = await prisma.profileVerificationRequest.create({ data: { studentProfileId: profile.id, targetType, targetId, fieldName: cleanText(body.fieldName, 100), evidenceUrl, note: cleanText(body.note, 1000) } });
    return NextResponse.json({ success: true, request }, { status: 201 });
  } catch (error) { return authErrorResponse(error); }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireSession(['TPO', 'FACULTY', 'INSTITUTE_ADMIN', 'SUPER_ADMIN']);
    const body = await req.json();
    const id = typeof body.id === 'string' ? body.id : '';
    const status = typeof body.status === 'string' ? body.status.toUpperCase() : '';
    if (!id || !['APPROVED', 'REJECTED'].includes(status)) return NextResponse.json({ success: false, error: 'Request id and APPROVED/REJECTED status are required.' }, { status: 400 });
    const request = await prisma.profileVerificationRequest.findUnique({ where: { id }, include: { studentProfile: { select: { id: true, user: { select: { institutionId: true } } } } } });
    if (!request || request.status !== 'PENDING') return NextResponse.json({ success: false, error: 'Pending request not found.' }, { status: 404 });
    requireSameInstitution(session, request.studentProfile.user.institutionId);
    const updates: any[] = [prisma.profileVerificationRequest.update({ where: { id }, data: { status, reviewerId: session.userId, rejectionReason: status === 'REJECTED' ? cleanText(body.rejectionReason, 1000) : null, reviewedAt: new Date() } })];
    if (status === 'APPROVED') {
      if (request.targetType === 'PROFILE') updates.push(prisma.studentProfile.update({ where: { id: request.studentProfileId }, data: { verificationStatus: 'VERIFIED' } }));
      if (request.targetType === 'EDUCATION' && request.targetId) updates.push(prisma.studentEducation.updateMany({ where: { id: request.targetId, studentProfileId: request.studentProfileId }, data: { verified: true } }));
      if (request.targetType === 'PROJECT' && request.targetId) updates.push(prisma.studentProject.updateMany({ where: { id: request.targetId, studentProfileId: request.studentProfileId }, data: { verified: true } }));
      if (request.targetType === 'EXPERIENCE' && request.targetId) updates.push(prisma.studentExperience.updateMany({ where: { id: request.targetId, studentProfileId: request.studentProfileId }, data: { verified: true } }));
    }
    updates.push(prisma.auditLog.create({ data: { userId: session.userId, institutionId: request.studentProfile.user.institutionId, action: `PROFILE_VERIFICATION_${status}`, details: JSON.stringify({ requestId: id, studentProfileId: request.studentProfileId, targetType: request.targetType, targetId: request.targetId }) } }));
    await prisma.$transaction(updates);
    return NextResponse.json({ success: true });
  } catch (error) { return authErrorResponse(error); }
}
