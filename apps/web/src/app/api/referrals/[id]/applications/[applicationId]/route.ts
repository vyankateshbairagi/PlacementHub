import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireSession } from '@/lib/auth';
import { authErrorResponse } from '@/lib/auth-http';
import { sendPipelineNotification } from '@/lib/notification-service';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string; applicationId: string } }
) {
  try {
    const session = await requireSession();
    const body = await request.json();
    const { status, alumniNotes } = body;

    const VALID_STATUSES = ['APPLIED', 'REVIEWING', 'REFERRED', 'INTERVIEWING', 'HIRED', 'REJECTED'];
    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { success: false, error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      );
    }

    const application = await prisma.referralApplication.findUnique({
      where: { id: params.applicationId },
      include: {
        referral: {
          include: {
            alumniProfile: { include: { user: true } },
            studentProfile: { include: { user: true } },
          },
        },
        studentProfile: { include: { user: true } },
      },
    });

    if (!application || application.referralId !== params.id) {
      return NextResponse.json({ success: false, error: 'Application not found.' }, { status: 404 });
    }

    const isAlumniOwner = application.referral.alumniProfile?.userId === session.userId;
    const isStudentOwner = application.referral.studentProfile?.userId === session.userId;
    const isStaff = ['TPO', 'INSTITUTE_ADMIN', 'SUPER_ADMIN'].includes(session.role);

    if (!isAlumniOwner && !isStudentOwner && !isStaff) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const updated = await prisma.referralApplication.update({
      where: { id: params.applicationId },
      data: {
        status,
        alumniNotes: alumniNotes !== undefined ? alumniNotes : application.alumniNotes,
      },
    });

    // Notify student about status change
    const studentUser = application.studentProfile.user;
    await sendPipelineNotification({
      userId: studentUser.id,
      userEmail: studentUser.email,
      userName: studentUser.name,
      type: 'REFERRAL_STATUS',
      title: `Referral Status Update: ${status} for ${application.referral.company}`,
      message: `Your referral application for ${application.referral.jobTitle} at ${application.referral.company} has been updated to ${status}.${alumniNotes ? ` Note: "${alumniNotes}"` : ''}`,
      actionUrl: '/student',
      metadata: { referralId: application.referralId, newStatus: status },
    });

    // If candidate is marked HIRED, award bonus reward points (+200) to the referrer!
    if (status === 'HIRED' && application.status !== 'HIRED') {
      const referrerUser = application.referral.alumniProfile?.user || application.referral.studentProfile?.user;
      if (referrerUser) {
        const lastLedger = await prisma.rewardLedger.findFirst({
          where: { userId: referrerUser.id },
          orderBy: { createdAt: 'desc' },
          select: { balanceAfter: true },
        });
        const currentBalance = lastLedger?.balanceAfter || 0;
        const bonusPoints = 200;

        await prisma.rewardLedger.create({
          data: {
            userId: referrerUser.id,
            institutionId: referrerUser.institutionId ?? null,
            points: bonusPoints,
            type: 'REFERRAL_HIRED',
            sourceId: application.id,
            description: `Student ${studentUser.name} hired via referral for ${application.referral.company} - ${application.referral.jobTitle}!`,
            balanceAfter: currentBalance + bonusPoints,
          },
        });

        await sendPipelineNotification({
          userId: referrerUser.id,
          userEmail: referrerUser.email,
          userName: referrerUser.name,
          type: 'REFERRAL_REWARD',
          title: `Candidate Hired! +200 Reward Points Awarded 🎉`,
          message: `Great news! ${studentUser.name} was hired for ${application.referral.jobTitle} at ${application.referral.company}. You earned +200 CareerOS bonus reward points!`,
          actionUrl: isAlumniOwner ? '/alumni' : '/student',
          metadata: { points: bonusPoints },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Application updated to ${status}.`,
      application: updated,
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
