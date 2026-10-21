import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireSession } from '@/lib/auth';
import { authErrorResponse } from '@/lib/auth-http';
import { sendPipelineNotification } from '@/lib/notification-service';
import { sendEmail, appUrl } from '@/lib/email';

export const dynamic = 'force-dynamic';

/**
 * GET /api/mentorship/bookings
 * Requires session.
 * - STUDENT: returns their own bookings with slot + alumni details
 * - ALUMNI: returns bookings on their slots with student details
 * - TPO / INSTITUTE_ADMIN / SUPER_ADMIN: returns all bookings for institution students
 */
export async function GET(_request: Request) {
  try {
    const session = await requireSession();

    let bookings;

    if (session.role === 'STUDENT') {
      const studentProfile = await prisma.studentProfile.findUnique({
        where: { userId: session.userId },
        select: { id: true },
      });
      if (!studentProfile) {
        return NextResponse.json({ success: true, count: 0, bookings: [] });
      }

      bookings = await prisma.mentorshipBooking.findMany({
        where: { studentProfileId: studentProfile.id },
        include: {
          slot: {
            include: {
              alumniProfile: {
                select: {
                  id: true,
                  currentCompany: true,
                  currentRole: true,
                  linkedinUrl: true,
                  user: { select: { id: true, name: true, email: true } },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else if (session.role === 'ALUMNI') {
      const alumniProfile = await prisma.alumniProfile.findUnique({
        where: { userId: session.userId },
        select: { id: true },
      });
      if (!alumniProfile) {
        return NextResponse.json({ success: true, count: 0, bookings: [] });
      }

      bookings = await prisma.mentorshipBooking.findMany({
        where: { slot: { alumniProfileId: alumniProfile.id } },
        include: {
          slot: { select: { id: true, topic: true, date: true, timeSlot: true, durationMinutes: true } },
          studentProfile: {
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else if (
      session.role === 'TPO' ||
      session.role === 'INSTITUTE_ADMIN' ||
      session.role === 'FACULTY' ||
      session.role === 'SUPER_ADMIN'
    ) {
      // Return bookings for all students belonging to the session's institution
      const institutionFilter = session.institutionId
        ? { studentProfile: { user: { institutionId: session.institutionId } } }
        : {};

      bookings = await prisma.mentorshipBooking.findMany({
        where: institutionFilter,
        include: {
          slot: {
            include: {
              alumniProfile: {
                select: {
                  id: true,
                  currentCompany: true,
                  currentRole: true,
                  user: { select: { id: true, name: true, email: true } },
                },
              },
            },
          },
          studentProfile: {
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
      });
    } else {
      return NextResponse.json({ success: false, error: 'Forbidden.' }, { status: 403 });
    }

    return NextResponse.json({ success: true, count: bookings.length, bookings });
  } catch (error) {
    return authErrorResponse(error);
  }
}

/**
 * POST /api/mentorship/bookings
 * STUDENT only — creates a booking for an available slot.
 * Body: { slotId, studentNotes? }
 *
 * Steps:
 *  1. Verify slot exists and isBooked=false
 *  2. Create MentorshipBooking (status=CONFIRMED, generated meetingLink)
 *  3. Mark MentorshipSlot.isBooked = true
 *  4. Notify alumni (sendPipelineNotification + sendEmail)
 *  5. Notify student (sendEmail)
 *  6. AuditLog: MENTORSHIP_BOOKED
 */
export async function POST(request: Request) {
  try {
    const session = await requireSession(['STUDENT']);
    const body = await request.json();
    const { slotId, studentNotes } = body;

    if (!slotId) {
      return NextResponse.json({ success: false, error: 'slotId is required.' }, { status: 400 });
    }

    // Look up the student profile
    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId: session.userId },
      include: { user: { select: { id: true, name: true, email: true, institutionId: true } } },
    });

    if (!studentProfile) {
      return NextResponse.json(
        { success: false, error: 'Student profile not found. Please complete your profile first.' },
        { status: 404 }
      );
    }

    // Look up the slot and verify availability
    const slot = await prisma.mentorshipSlot.findUnique({
      where: { id: slotId },
      include: {
        alumniProfile: {
          include: {
            user: { select: { id: true, name: true, email: true, institutionId: true } },
          },
        },
      },
    });

    if (!slot) {
      return NextResponse.json({ success: false, error: 'Slot not found.' }, { status: 404 });
    }

    if (slot.isBooked) {
      return NextResponse.json(
        { success: false, error: 'This slot is already booked. Please choose another slot.' },
        { status: 409 }
      );
    }

    // Generate a placeholder meeting link
    const meetingLink = `https://meet.google.com/careeros-${Date.now().toString(36)}`;

    // Create the booking and mark the slot as booked atomically via a transaction
    const booking = await prisma.$transaction(async (tx) => {
      const newBooking = await tx.mentorshipBooking.create({
        data: {
          slotId,
          studentProfileId: studentProfile.id,
          meetingLink,
          studentNotes: studentNotes ?? null,
          status: 'CONFIRMED',
        },
        include: {
          slot: {
            include: {
              alumniProfile: {
                select: {
                  id: true,
                  currentCompany: true,
                  currentRole: true,
                  user: { select: { id: true, name: true, email: true } },
                },
              },
            },
          },
          studentProfile: {
            include: { user: { select: { id: true, name: true, email: true } } },
          },
        },
      });

      // Mark slot as booked
      await tx.mentorshipSlot.update({
        where: { id: slotId },
        data: { isBooked: true },
      });

      return newBooking;
    });

    const studentName = studentProfile.user.name ?? 'A student';
    const alumniName = slot.alumniProfile.user.name ?? 'the mentor';
    const slotDate = slot.date;
    const slotTime = slot.timeSlot;

    // Notify alumni via in-app notification + email
    await sendPipelineNotification({
      userId: slot.alumniProfile.user.id,
      userEmail: slot.alumniProfile.user.email,
      userName: alumniName,
      institutionId: slot.alumniProfile.user.institutionId ?? null,
      type: 'INTERVIEW_SCHEDULED',
      title: 'New Mentorship Request',
      message: `${studentName} has booked your slot on ${slotDate} at ${slotTime}`,
      metadata: { meetingLink },
    });

    // Send email to student confirming the booking
    sendEmail({
      to: studentProfile.user.email,
      subject: '[CareerOS] Your Mentorship Session is Confirmed!',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
          <h2 style="color: #0f172a;">Mentorship Session Confirmed 🎉</h2>
          <p style="color: #475569;">Hello ${studentName},</p>
          <p style="color: #334155; background: #f8fafc; padding: 14px; border-radius: 8px; border-left: 4px solid #2563eb;">
            Your mentorship session with <strong>${alumniName}</strong> (${slot.alumniProfile.currentRole ?? ''} at ${slot.alumniProfile.currentCompany ?? ''})
            is confirmed for <strong>${slotDate}</strong> at <strong>${slotTime}</strong>.
          </p>
          <p style="color: #334155;">Topic: <strong>${slot.topic}</strong></p>
          <div style="margin: 20px 0;">
            <a href="${meetingLink}" style="display: inline-block; background: #2563eb; color: #ffffff; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 13px;">
              Join Meeting
            </a>
          </div>
          <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8;">
            View your sessions on the <a href="${appUrl('/student')}" style="color: #2563eb;">CareerOS Dashboard</a>.
          </div>
        </div>
      `,
    }).catch((err) => console.warn('Non-fatal: student email failed:', err));

    // AuditLog
    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        institutionId: studentProfile.user.institutionId ?? null,
        action: 'MENTORSHIP_BOOKED',
        details: JSON.stringify({
          bookingId: booking.id,
          slotId,
          alumniProfileId: slot.alumniProfileId,
          studentProfileId: studentProfile.id,
          topic: slot.topic,
          date: slotDate,
          timeSlot: slotTime,
          meetingLink,
        }),
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: `Mentorship session booked with ${alumniName} on ${slotDate} at ${slotTime}.`,
        booking,
      },
      { status: 201 }
    );
  } catch (error) {
    return authErrorResponse(error);
  }
}

/**
 * PATCH /api/mentorship/bookings
 * Updates a booking status (e.g. COMPLETED, CONFIRMED, CANCELLED) or meetingLink.
 * Allowed: STUDENT, ALUMNI, TPO, SUPER_ADMIN.
 * Body: { bookingId, status?, meetingLink?, studentNotes? }
 */
export async function PATCH(request: Request) {
  try {
    const session = await requireSession();
    const body = await request.json();
    const { bookingId, status, meetingLink, studentNotes } = body;

    if (!bookingId) {
      return NextResponse.json({ success: false, error: 'bookingId is required.' }, { status: 400 });
    }

    const booking = await prisma.mentorshipBooking.findUnique({
      where: { id: bookingId },
      include: {
        slot: { include: { alumniProfile: true } },
        studentProfile: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ success: false, error: 'Booking not found.' }, { status: 404 });
    }

    // Role check
    const isStudentOwner = session.role === 'STUDENT' && booking.studentProfile.userId === session.userId;
    const isAlumniOwner = session.role === 'ALUMNI' && booking.slot.alumniProfile.userId === session.userId;
    const isStaff = ['TPO', 'INSTITUTE_ADMIN', 'SUPER_ADMIN'].includes(session.role);

    if (!isStudentOwner && !isAlumniOwner && !isStaff) {
      return NextResponse.json({ success: false, error: 'Forbidden.' }, { status: 403 });
    }

    // If status is transitioning to CANCELLED, free the slot
    if (status === 'CANCELLED' && booking.status !== 'CANCELLED') {
      await prisma.mentorshipSlot.update({
        where: { id: booking.slotId },
        data: { isBooked: false },
      });
    }

    const updated = await prisma.mentorshipBooking.update({
      where: { id: bookingId },
      data: {
        ...(status ? { status } : {}),
        ...(meetingLink ? { meetingLink } : {}),
        ...(studentNotes !== undefined ? { studentNotes } : {}),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        institutionId: session.institutionId ?? null,
        action: 'MENTORSHIP_BOOKING_UPDATED',
        details: JSON.stringify({ bookingId, status, changes: body }),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Booking updated to ${status || 'new status'}.`,
      booking: updated,
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}

/**
 * DELETE /api/mentorship/bookings
 * Cancels a booking and frees the mentorship slot for other students.
 * Query or Body: { bookingId, reason? }
 */
export async function DELETE(request: Request) {
  try {
    const session = await requireSession();
    let bookingId: string | undefined;
    let cancelReason = 'Cancelled by user';

    try {
      const body = await request.json();
      bookingId = body?.bookingId;
      if (body?.reason) cancelReason = body.reason;
    } catch {
      // Body not provided, try search params
    }

    if (!bookingId) {
      const { searchParams } = new URL(request.url);
      bookingId = searchParams.get('bookingId') || searchParams.get('id') || undefined;
      if (searchParams.get('reason')) cancelReason = searchParams.get('reason')!;
    }

    if (!bookingId) {
      return NextResponse.json({ success: false, error: 'bookingId is required.' }, { status: 400 });
    }

    const booking = await prisma.mentorshipBooking.findUnique({
      where: { id: bookingId },
      include: {
        slot: {
          include: {
            alumniProfile: {
              include: { user: { select: { id: true, name: true, email: true } } },
            },
          },
        },
        studentProfile: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    });

    if (!booking) {
      return NextResponse.json({ success: false, error: 'Booking not found.' }, { status: 404 });
    }

    // Role check
    const isStudentOwner = session.role === 'STUDENT' && booking.studentProfile.userId === session.userId;
    const isAlumniOwner = session.role === 'ALUMNI' && booking.slot.alumniProfile.userId === session.userId;
    const isStaff = ['TPO', 'INSTITUTE_ADMIN', 'SUPER_ADMIN'].includes(session.role);

    if (!isStudentOwner && !isAlumniOwner && !isStaff) {
      return NextResponse.json({ success: false, error: 'Forbidden.' }, { status: 403 });
    }

    // Free the slot and update booking status to CANCELLED atomically
    await prisma.$transaction([
      prisma.mentorshipBooking.update({
        where: { id: bookingId },
        data: { status: 'CANCELLED' },
      }),
      prisma.mentorshipSlot.update({
        where: { id: booking.slotId },
        data: { isBooked: false },
      }),
    ]);

    // Send notification
    try {
      const targetUserId = isStudentOwner
        ? booking.slot.alumniProfile.user.id
        : booking.studentProfile.user.id;
      const targetEmail = isStudentOwner
        ? booking.slot.alumniProfile.user.email
        : booking.studentProfile.user.email;
      const targetName = isStudentOwner
        ? booking.slot.alumniProfile.user.name
        : booking.studentProfile.user.name;

      await sendPipelineNotification({
        userId: targetUserId,
        userEmail: targetEmail,
        userName: targetName,
        institutionId: session.institutionId ?? null,
        type: 'SYSTEM',
        title: 'Mentorship Session Cancelled',
        message: `Mentorship session on ${booking.slot.date} has been cancelled. Reason: ${cancelReason}`,
      });
    } catch (notifErr) {
      console.warn('Could not send cancellation notification:', notifErr);
    }

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        institutionId: session.institutionId ?? null,
        action: 'MENTORSHIP_CANCELLED',
        details: JSON.stringify({ bookingId, slotId: booking.slotId, reason: cancelReason }),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Mentorship session cancelled and slot freed successfully.',
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
