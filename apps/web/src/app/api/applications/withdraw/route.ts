import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireSession } from '@/lib/auth';
import { authErrorResponse } from '@/lib/auth-http';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const session = await requireSession(['STUDENT']);
    const body = await request.json();
    const { applicationId, reason } = body;

    if (!applicationId) {
      return NextResponse.json(
        { success: false, error: 'applicationId is required.' },
        { status: 400 }
      );
    }

    const application = await prisma.jobApplication.findUnique({
      where: { id: applicationId },
      include: {
        drive: true,
        studentProfile: true,
      },
    });

    if (!application) {
      return NextResponse.json(
        { success: false, error: 'Application not found.' },
        { status: 404 }
      );
    }

    if (application.studentProfile.userId !== session.userId) {
      return NextResponse.json({ success: false, error: 'Forbidden.' }, { status: 403 });
    }

    if (application.status === 'OFFERED' || application.status === 'SELECTED') {
      return NextResponse.json(
        {
          success: false,
          error: 'You cannot withdraw an application after being selected or offered. Please contact your College TPO.',
        },
        { status: 400 }
      );
    }

    // Delete application record so student can unapply cleanly
    await prisma.jobApplication.delete({ where: { id: applicationId } });

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        institutionId: application.drive?.institutionId || session.institutionId || null,
        action: 'WITHDRAW_JOB_APPLICATION',
        details: JSON.stringify({
          applicationId,
          driveId: application.driveId,
          companyName: application.drive?.companyName || 'Unknown Company',
          roleTitle: application.drive?.roleTitle || 'Job Role',
          reason: reason?.trim() || 'Withdrawn by student',
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Application for ${application.drive?.companyName || 'the position'} withdrawn successfully.`,
      applicationId,
      driveId: application.driveId,
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}

