import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireSession } from '@/lib/auth';
import { authErrorResponse } from '@/lib/auth-http';
import { sendPipelineNotification } from '@/lib/notification-service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/mentorship/feedback
 * Returns feedback records.
 * Query params:
 *   alumniProfileId - filter feedback by mentor
 *   bookingId       - get feedback for specific booking
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const alumniProfileId = searchParams.get('alumniProfileId');
    const bookingId = searchParams.get('bookingId');

    const where: any = {};
    if (bookingId) where.bookingId = bookingId;
    if (alumniProfileId) {
      where.booking = { slot: { alumniProfileId } };
    }

    const feedbacks = await prisma.mentorshipFeedback.findMany({
      where,
      include: {
        booking: {
          include: {
            slot: {
              select: {
                id: true,
                topic: true,
                category: true,
                date: true,
                alumniProfile: {
                  select: {
                    id: true,
                    currentCompany: true,
                    currentRole: true,
                    user: { select: { id: true, name: true } },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const averageRating =
      feedbacks.length > 0
        ? parseFloat((feedbacks.reduce((acc, f) => acc + f.rating, 0) / feedbacks.length).toFixed(1))
        : 5.0;

    return NextResponse.json({
      success: true,
      count: feedbacks.length,
      averageRating,
      feedbacks,
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}

/**
 * POST /api/mentorship/feedback
 * STUDENT only — submit feedback for a mentorship session.
 * Body: { bookingId, rating (1-5), feedback, skillsDiscussed?, mentorNotes? }
 */
export async function POST(request: Request) {
  try {
    const session = await requireSession(['STUDENT']);
    const body = await request.json();
    const { bookingId, rating, feedback, skillsDiscussed, mentorNotes } = body;

    if (!bookingId || rating === undefined || !feedback) {
      return NextResponse.json(
        { success: false, error: 'bookingId, rating, and feedback are required.' },
        { status: 400 }
      );
    }

    const parsedRating = Number(rating);
    if (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return NextResponse.json(
        { success: false, error: 'rating must be an integer between 1 and 5.' },
        { status: 400 }
      );
    }

    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId: session.userId },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    if (!studentProfile) {
      return NextResponse.json(
        { success: false, error: 'Student profile not found.' },
        { status: 404 }
      );
    }

    const booking = await prisma.mentorshipBooking.findUnique({
      where: { id: bookingId },
      include: {
        slot: {
          include: {
            alumniProfile: {
              include: { user: { select: { id: true, name: true, email: true, institutionId: true } } },
            },
          },
        },
        feedback: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ success: false, error: 'Booking not found.' }, { status: 404 });
    }

    if (booking.studentProfileId !== studentProfile.id) {
      return NextResponse.json(
        { success: false, error: 'You are not authorised to review this booking.' },
        { status: 403 }
      );
    }

    if (booking.feedback) {
      return NextResponse.json(
        { success: false, error: 'Feedback has already been submitted for this session.' },
        { status: 409 }
      );
    }

    // Persist into MentorshipFeedback
    const newFeedback = await prisma.mentorshipFeedback.create({
      data: {
        bookingId,
        studentProfileId: studentProfile.id,
        rating: parsedRating,
        feedback: String(feedback).trim(),
        skillsDiscussed: skillsDiscussed ? JSON.stringify(skillsDiscussed) : '[]',
        mentorNotes: mentorNotes || null,
      },
    });

    // Mark booking status as COMPLETED
    await prisma.mentorshipBooking.update({
      where: { id: bookingId },
      data: { status: 'COMPLETED' },
    });

    // Award +50 reward points to mentor in RewardLedger
    const mentorUser = booking.slot.alumniProfile.user;
    const lastLedger = await prisma.rewardLedger.findFirst({
      where: { userId: mentorUser.id },
      orderBy: { createdAt: 'desc' },
      select: { balanceAfter: true },
    });
    const currentBalance = lastLedger?.balanceAfter || 0;
    const pointsAwarded = 50;

    await prisma.rewardLedger.create({
      data: {
        userId: mentorUser.id,
        institutionId: mentorUser.institutionId ?? null,
        points: pointsAwarded,
        type: 'MENTORSHIP_COMPLETED',
        sourceId: bookingId,
        description: `Completed mentorship session on "${booking.slot.topic}" with ${studentProfile.user.name} (Rated ${parsedRating}★)`,
        balanceAfter: currentBalance + pointsAwarded,
      },
    });

    // Notify mentor of review and reward points
    await sendPipelineNotification({
      userId: mentorUser.id,
      userEmail: mentorUser.email,
      userName: mentorUser.name,
      type: 'REFERRAL_REWARD',
      title: `New Mentorship Review (${parsedRating}★) & +50 Points!`,
      message: `${studentProfile.user.name} left a ${parsedRating}★ review for your session: "${feedback}". You earned +50 CareerOS reward points!`,
      actionUrl: '/alumni',
      metadata: { bookingId, points: pointsAwarded },
    });

    return NextResponse.json({
      success: true,
      message: 'Feedback submitted successfully. Thank you!',
      feedback: newFeedback,
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
