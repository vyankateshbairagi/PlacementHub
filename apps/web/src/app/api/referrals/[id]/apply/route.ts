import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireSession } from '@/lib/auth';
import { authErrorResponse } from '@/lib/auth-http';
import { sendPipelineNotification } from '@/lib/notification-service';

export const dynamic = 'force-dynamic';

/**
 * POST /api/referrals/[id]/apply
 * Student applies for an alumni / peer referral posting.
 * Persists directly into ReferralApplication table and notifies the referrer.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireSession(['STUDENT']);
    const body = await req.json().catch(() => ({}));
    const { resumeUrl, coverNote } = body;

    const posting = await prisma.referralPosting.findUnique({
      where: { id: params.id },
      include: {
        alumniProfile: { include: { user: { select: { id: true, name: true, email: true } } } },
        studentProfile: { include: { user: { select: { id: true, name: true, email: true } } } },
      },
    });

    if (!posting) {
      return NextResponse.json(
        { success: false, error: 'Referral posting not found.' },
        { status: 404 }
      );
    }

    if (posting.status !== 'APPROVED') {
      return NextResponse.json(
        { success: false, error: 'This referral posting is not currently open for applications.' },
        { status: 400 }
      );
    }

    // Check expiry
    if (posting.deadline && new Date(posting.deadline) < new Date()) {
      // Auto update status if expired
      await prisma.referralPosting.update({
        where: { id: params.id },
        data: { status: 'EXPIRED' },
      });
      return NextResponse.json(
        { success: false, error: 'This referral posting has expired and is no longer accepting applications.' },
        { status: 410 }
      );
    }

    const studentProfile = await prisma.studentProfile.findFirst({
      where: { user: { id: session.userId } },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    if (!studentProfile) {
      return NextResponse.json(
        { success: false, error: 'Student profile not found.' },
        { status: 404 }
      );
    }

    // Check existing application in DB
    const existingApplication = await prisma.referralApplication.findUnique({
      where: {
        referralId_studentProfileId: {
          referralId: params.id,
          studentProfileId: studentProfile.id,
        },
      },
    });

    if (existingApplication) {
      return NextResponse.json({
        success: false,
        alreadyApplied: true,
        message: 'You have already submitted an application for this referral.',
      });
    }

    const application = await prisma.referralApplication.create({
      data: {
        referralId: params.id,
        studentProfileId: studentProfile.id,
        status: 'APPLIED',
        resumeUrl: resumeUrl || studentProfile.resumeUrl || null,
        coverNote: coverNote?.trim() || null,
      },
    });

    // Notify referrer (Alumni or Student poster)
    const referrerUser = posting.alumniProfile?.user || posting.studentProfile?.user;
    if (referrerUser) {
      await sendPipelineNotification({
        userId: referrerUser.id,
        userEmail: referrerUser.email,
        userName: referrerUser.name,
        type: 'REFERRAL_APPLIED',
        title: `New Referral Application for ${posting.company} - ${posting.jobTitle}`,
        message: `${studentProfile.user.name} applied for your referral posting. Review their profile & resume on CareerOS!`,
        actionUrl: posting.alumniProfileId ? '/alumni' : '/student',
        metadata: {
          referralId: posting.id,
          company: posting.company,
          roleTitle: posting.jobTitle,
        },
      });
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        institutionId: session.institutionId ?? null,
        action: 'REFERRAL_APPLICATION',
        details: JSON.stringify({
          applicationId: application.id,
          referralId: params.id,
          company: posting.company,
          jobTitle: posting.jobTitle,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Referral application submitted successfully!',
      application,
    });
  } catch (error) {
    return authErrorResponse(error, 'Failed to submit referral application.');
  }
}
