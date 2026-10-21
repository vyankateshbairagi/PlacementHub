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

    const booking = await prisma.mentorshipBooking.findUnique({
      where: { id: params.id },
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
      return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 });
    }

    const isStudentOwner = booking.studentProfile.userId === session.userId;
    const isAlumniOwner = booking.slot.alumniProfile.userId === session.userId;
    const isStaff = ['TPO', 'INSTITUTE_ADMIN', 'SUPER_ADMIN'].includes(session.role);

    if (!isStudentOwner && !isAlumniOwner && !isStaff) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ success: true, booking });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireSession();
    const body = await request.json();
    const { status, meetingLink, studentNotes, cancellationReason } = body;

    const booking = await prisma.mentorshipBooking.findUnique({
      where: { id: params.id },
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
      return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 });
    }

    const isStudentOwner = booking.studentProfile.userId === session.userId;
    const isAlumniOwner = booking.slot.alumniProfile.userId === session.userId;
    const isStaff = ['TPO', 'INSTITUTE_ADMIN', 'SUPER_ADMIN'].includes(session.role);

    if (!isStudentOwner && !isAlumniOwner && !isStaff) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const dataToUpdate: any = {};

    if (status) {
      if (status === 'CANCELLED') {
        dataToUpdate.status = 'CANCELLED';
        dataToUpdate.cancellationReason = cancellationReason || 'Cancelled by user';
        dataToUpdate.cancelledBy = isStudentOwner ? 'STUDENT' : isAlumniOwner ? 'MENTOR' : 'ADMIN';
        dataToUpdate.cancelledAt = new Date();

        // Re-open the slot
        await prisma.mentorshipSlot.update({
          where: { id: booking.slotId },
          data: { isBooked: false, status: 'AVAILABLE' },
        });

        // Notify counterpart
        const notifyTargetUserId = isStudentOwner
          ? booking.slot.alumniProfile.user.id
          : booking.studentProfile.user.id;
        const notifyTargetEmail = isStudentOwner
          ? booking.slot.alumniProfile.user.email
          : booking.studentProfile.user.email;

        await sendPipelineNotification({
          userId: notifyTargetUserId,
          userEmail: notifyTargetEmail,
          type: 'MENTORSHIP_CANCELLED',
          title: 'Mentorship Session Cancelled',
          message: `The mentorship session on "${booking.slot.topic}" scheduled for ${booking.slot.date} at ${booking.slot.timeSlot} has been cancelled. Reason: ${cancellationReason || 'No reason specified.'}`,
        });
      } else if (status === 'COMPLETED' && (isAlumniOwner || isStaff)) {
        dataToUpdate.status = 'COMPLETED';

        // Notify student to submit feedback
        await sendPipelineNotification({
          userId: booking.studentProfile.user.id,
          userEmail: booking.studentProfile.user.email,
          type: 'MENTORSHIP_COMPLETED',
          title: 'Mentorship Session Completed - Share Your Feedback',
          message: `Your mentorship session on "${booking.slot.topic}" with ${booking.slot.alumniProfile.user.name} has concluded. Please take a moment to submit your rating and feedback!`,
          actionUrl: '/student',
          metadata: { bookingId: booking.id },
        });
      }
    }

    if (meetingLink && (isAlumniOwner || isStaff)) {
      dataToUpdate.meetingLink = meetingLink;
      // Notify student of new link
      await sendPipelineNotification({
        userId: booking.studentProfile.user.id,
        userEmail: booking.studentProfile.user.email,
        type: 'INTERVIEW_SCHEDULED',
        title: 'Mentorship Meeting Link Updated',
        message: `Your mentor updated the meeting link for the session on "${booking.slot.topic}": ${meetingLink}`,
        metadata: { meetingLink },
      });
    }

    if (studentNotes && isStudentOwner) {
      dataToUpdate.studentNotes = studentNotes;
    }

    const updated = await prisma.mentorshipBooking.update({
      where: { id: params.id },
      data: dataToUpdate,
    });

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        institutionId: session.institutionId,
        action: 'UPDATE_MENTORSHIP_BOOKING',
        details: JSON.stringify({ bookingId: params.id, changes: Object.keys(dataToUpdate) }),
      },
    });

    return NextResponse.json({ success: true, booking: updated });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireSession();

    const booking = await prisma.mentorshipBooking.findUnique({
      where: { id: params.id },
      include: {
        slot: { include: { alumniProfile: true } },
        studentProfile: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 });
    }

    const isStudentOwner = booking.studentProfile.userId === session.userId;
    const isAlumniOwner = booking.slot.alumniProfile.userId === session.userId;
    const isStaff = ['TPO', 'INSTITUTE_ADMIN', 'SUPER_ADMIN'].includes(session.role);

    if (!isStudentOwner && !isAlumniOwner && !isStaff) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    // Cancel and free the slot
    await prisma.mentorshipSlot.update({
      where: { id: booking.slotId },
      data: { isBooked: false },
    });

    await prisma.mentorshipBooking.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true, message: 'Booking deleted and slot released.' });
  } catch (error) {
    return authErrorResponse(error);
  }
}

