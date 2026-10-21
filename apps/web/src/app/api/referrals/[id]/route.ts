import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSession } from '@/lib/auth';
import { authErrorResponse } from '@/lib/auth-http';
import { sendPipelineNotification } from '@/lib/notification-service';

export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// GET /api/referrals/[id]
// Returns a single ReferralPosting with its alumni and student profiles.
// Public — no auth required for read.
// ---------------------------------------------------------------------------
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const posting = await prisma.referralPosting.findUnique({
      where: { id: params.id },
      include: {
        alumniProfile: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        studentProfile: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    });

    if (!posting) {
      return NextResponse.json(
        { success: false, error: 'Referral posting not found.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, posting });
  } catch (error) {
    return authErrorResponse(error, 'Failed to fetch referral posting.');
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/referrals/[id]
// Updates status (PENDING → APPROVED / REJECTED), rewardPoints, or notes.
// Allowed roles: TPO, INSTITUTE_ADMIN, or the original poster (ALUMNI / STUDENT).
// Side-effects on APPROVED: creates AuditLog entry + sends notification.
// ---------------------------------------------------------------------------
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireSession();

    // Fetch the existing posting so we can verify ownership / role.
    const existing = await prisma.referralPosting.findUnique({
      where: { id: params.id },
      include: {
        alumniProfile: { include: { user: true } },
        studentProfile: { include: { user: true } },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Referral posting not found.' },
        { status: 404 }
      );
    }

    // Determine whether the requester is authorised.
    const isAdmin = ['TPO', 'INSTITUTE_ADMIN', 'SUPER_ADMIN'].includes(session.role);
    const isOriginalPoster =
      existing.alumniProfile?.user?.id === session.userId ||
      existing.studentProfile?.user?.id === session.userId ||
      existing.postedByEmail === session.email;

    if (!isAdmin && !isOriginalPoster) {
      return NextResponse.json(
        { success: false, error: 'You do not have permission to update this posting.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { status, rewardPoints, referralNotes } = body as {
      status?: string;
      rewardPoints?: number;
      referralNotes?: string;
    };

    // Only admins may change status.
    if (status && !isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Only admins can change the status of a referral posting.' },
        { status: 403 }
      );
    }

    const validStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'CLOSED'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}.` },
        { status: 400 }
      );
    }

    const updated = await prisma.referralPosting.update({
      where: { id: params.id },
      data: {
        ...(status && { status }),
        ...(rewardPoints !== undefined && { rewardPoints: Number(rewardPoints) }),
        ...(referralNotes !== undefined && { referralNotes }),
      },
    });

    // ------------------------------------------------------------------
    // Side-effects when a posting is APPROVED for the first time.
    // ------------------------------------------------------------------
    if (status === 'APPROVED' && existing.status !== 'APPROVED') {
      const posterUser =
        existing.alumniProfile?.user ?? existing.studentProfile?.user;
      const posterUserId = posterUser?.id;
      const posterEmail = posterUser?.email ?? existing.postedByEmail ?? undefined;
      const posterName = posterUser?.name ?? existing.postedByName ?? 'Contributor';

      const pointsToCredit = updated.rewardPoints || 50;

      // 1. Persist genuine RewardLedger record
      if (posterUserId) {
        const lastLedger = await prisma.rewardLedger.findFirst({
          where: { userId: posterUserId },
          orderBy: { createdAt: 'desc' },
          select: { balanceAfter: true },
        });
        const currentBalance = lastLedger?.balanceAfter || 0;

        await prisma.rewardLedger.create({
          data: {
            userId: posterUserId,
            institutionId: session.institutionId ?? null,
            points: pointsToCredit,
            type: 'REFERRAL_POSTED',
            sourceId: existing.id,
            description: `Referral posting approved: ${existing.company} - ${existing.jobTitle}`,
            balanceAfter: currentBalance + pointsToCredit,
          },
        });
      }

      // 2. Persist an AuditLog record for the approval event.
      await prisma.auditLog.create({
        data: {
          userId: session.userId,
          institutionId: session.institutionId ?? null,
          action: 'REFERRAL_APPROVED',
          details: JSON.stringify({
            referralId: existing.id,
            company: existing.company,
            jobTitle: existing.jobTitle,
            approvedBy: session.userId,
            rewardPoints: pointsToCredit,
          }),
        },
      });

      // 3. Send an in-app / email notification to the original poster.
      if (posterUserId) {
        await sendPipelineNotification({
          userId: posterUserId,
          userEmail: posterEmail,
          userName: posterName,
          institutionId: session.institutionId,
          type: 'REFERRAL_REWARD',
          title: '🎉 Your Referral Posting Was Approved!',
          message: `Your referral for <strong>${existing.jobTitle}</strong> at <strong>${existing.company}</strong> has been approved. You've earned <strong>${pointsToCredit} reward points</strong> deposited to your CareerOS Reward Ledger!`,
          actionUrl: '/student',
          metadata: { companyName: existing.company, roleTitle: existing.jobTitle, points: pointsToCredit },
        });
      }
    }

    return NextResponse.json({ success: true, posting: updated });
  } catch (error) {
    return authErrorResponse(error, 'Failed to update referral posting.');
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/referrals/[id]
// Permanently deletes a referral posting.
// Allowed roles: TPO, INSTITUTE_ADMIN, SUPER_ADMIN.
// ---------------------------------------------------------------------------
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireSession(['TPO', 'INSTITUTE_ADMIN', 'SUPER_ADMIN']);

    const existing = await prisma.referralPosting.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Referral posting not found.' },
        { status: 404 }
      );
    }

    await prisma.referralPosting.delete({ where: { id: params.id } });

    return NextResponse.json({
      success: true,
      message: `Referral posting for ${existing.jobTitle} at ${existing.company} has been deleted.`,
    });
  } catch (error) {
    return authErrorResponse(error, 'Failed to delete referral posting.');
  }
}
