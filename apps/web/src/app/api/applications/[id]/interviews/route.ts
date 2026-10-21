import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireSession } from '@/lib/auth';
import { authErrorResponse } from '@/lib/auth-http';
import { sendPipelineNotification } from '@/lib/notification-service';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireSession();
    const applicationId = params.id;

    const application = await prisma.jobApplication.findUnique({
      where: { id: applicationId },
      include: {
        drive: true,
        studentProfile: true,
        interviews: { orderBy: { scheduledAt: 'asc' } },
      },
    });

    if (!application) {
      return NextResponse.json({ success: false, error: 'Application not found.' }, { status: 404 });
    }

    // Role check
    if (session.role === 'STUDENT' && application.studentProfile.userId !== session.userId) {
      return NextResponse.json({ success: false, error: 'Forbidden.' }, { status: 403 });
    } else if (session.role === 'RECRUITER') {
      const recruiterProfile = await prisma.recruiterProfile.findUnique({
        where: { userId: session.userId },
      });
      if (!recruiterProfile || (application.drive?.recruiterId && application.drive.recruiterId !== recruiterProfile.id)) {
        return NextResponse.json({ success: false, error: 'Forbidden.' }, { status: 403 });
      }
    } else if (session.role === 'TPO' || session.role === 'INSTITUTE_ADMIN') {
      if (application.drive?.institutionId && application.drive.institutionId !== session.institutionId) {
        return NextResponse.json({ success: false, error: 'Forbidden.' }, { status: 403 });
      }
    }

    return NextResponse.json({
      success: true,
      count: application.interviews.length,
      interviews: application.interviews,
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireSession(['RECRUITER', 'TPO', 'INSTITUTE_ADMIN', 'SUPER_ADMIN']);
    const applicationId = params.id;
    const body = await request.json();
    const {
      roundName,
      scheduledAt,
      meetingLink,
      interviewerName,
      feedback,
      rating,
      status = 'SCHEDULED',
      interviewId,
    } = body;

    const application = await prisma.jobApplication.findUnique({
      where: { id: applicationId },
      include: {
        drive: true,
        studentProfile: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    if (!application) {
      return NextResponse.json({ success: false, error: 'Application not found.' }, { status: 404 });
    }

    // Ownership check
    if (session.role === 'RECRUITER') {
      const recruiterProfile = await prisma.recruiterProfile.findUnique({
        where: { userId: session.userId },
      });
      if (!recruiterProfile || (application.drive?.recruiterId && application.drive.recruiterId !== recruiterProfile.id)) {
        return NextResponse.json({ success: false, error: 'Forbidden.' }, { status: 403 });
      }
    } else if (session.role === 'TPO' || session.role === 'INSTITUTE_ADMIN') {
      if (application.drive?.institutionId && application.drive.institutionId !== session.institutionId) {
        return NextResponse.json({ success: false, error: 'Forbidden.' }, { status: 403 });
      }
    }

    let interviewRecord;

    if (interviewId) {
      // Update existing interview
      interviewRecord = await prisma.interviewSchedule.update({
        where: { id: interviewId },
        data: {
          ...(roundName && { roundName: roundName.trim() }),
          ...(scheduledAt && { scheduledAt: new Date(scheduledAt) }),
          ...(meetingLink !== undefined && { meetingLink: meetingLink?.trim() || null }),
          ...(interviewerName !== undefined && { interviewerName: interviewerName?.trim() || null }),
          ...(feedback !== undefined && { feedback: feedback?.trim() || null }),
          ...(rating !== undefined && { rating: parseInt(rating.toString(), 10) }),
          ...(status && { status }),
        },
      });
    } else {
      // Create new interview round
      if (!roundName?.trim() || !scheduledAt) {
        return NextResponse.json(
          { success: false, error: 'roundName and scheduledAt are required.' },
          { status: 400 }
        );
      }

      const parsedDate = new Date(scheduledAt);
      if (Number.isNaN(parsedDate.getTime())) {
        return NextResponse.json(
          { success: false, error: 'Invalid scheduledAt date format.' },
          { status: 400 }
        );
      }

      interviewRecord = await prisma.interviewSchedule.create({
        data: {
          applicationId,
          roundName: roundName.trim(),
          scheduledAt: parsedDate,
          meetingLink: meetingLink?.trim() || 'https://meet.google.com/careeros-interview',
          interviewerName: interviewerName?.trim() || 'Technical Interview Panel',
          feedback: feedback?.trim() || null,
          rating: rating ? parseInt(rating.toString(), 10) : null,
          status,
        },
      });

      // Update application round index & ensure status is INTERVIEW
      await prisma.jobApplication.update({
        where: { id: applicationId },
        data: {
          status: 'INTERVIEW',
          currentRoundIndex: { increment: 1 },
        },
      });

      // Dispatch notification to student
      const student = application.studentProfile.user;
      const compName = application.drive?.companyName || 'Company';
      const rTitle = application.drive?.roleTitle || 'Job Role';
      await sendPipelineNotification({
        userId: student.id,
        userEmail: student.email,
        userName: student.name,
        institutionId: application.drive?.institutionId || session.institutionId || null,
        type: 'INTERVIEW_SCHEDULED',
        title: `Interview Invite: ${compName}`,
        message: `You are invited to ${roundName} for ${rTitle} at ${compName} on ${parsedDate.toLocaleString()}.`,
        metadata: {
          applicationId,
          driveId: application.driveId || undefined,
          companyName: compName,
          roleTitle: rTitle,
          roundName,
          meetingLink: interviewRecord.meetingLink || undefined,
          scheduledAt: parsedDate.toISOString(),
        },
      });
    }

    // Write audit log
    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        institutionId: application.drive?.institutionId || session.institutionId || null,
        action: interviewId ? 'UPDATE_INTERVIEW_SCHEDULE' : 'SCHEDULE_INTERVIEW_ROUND',
        details: JSON.stringify({
          applicationId,
          roundName: interviewRecord.roundName,
          scheduledAt: interviewRecord.scheduledAt,
          status: interviewRecord.status,
          rating: interviewRecord.rating,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: interviewId
        ? 'Interview details updated successfully.'
        : `Interview round '${interviewRecord.roundName}' scheduled and candidate notified!`,
      interview: interviewRecord,
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}

