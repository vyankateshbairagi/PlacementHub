import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireSession } from '@/lib/auth';
import { authErrorResponse } from '@/lib/auth-http';
import { sendPipelineNotification } from '@/lib/notification-service';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireSession(['ALUMNI', 'TPO', 'INSTITUTE_ADMIN', 'SUPER_ADMIN']);
    const body = await request.json();
    const { status, responseNote } = body;

    if (!status || !['ACCEPTED', 'DECLINED', 'EXPIRED'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Valid status (ACCEPTED, DECLINED, EXPIRED) is required.' },
        { status: 400 }
      );
    }

    const mentorshipRequest = await prisma.mentorshipRequest.findUnique({
      where: { id: params.id },
      include: {
        studentProfile: { include: { user: true } },
        alumniProfile: { include: { user: true } },
      },
    });

    if (!mentorshipRequest) {
      return NextResponse.json(
        { success: false, error: 'Mentorship request not found.' },
        { status: 404 }
      );
    }

    const updated = await prisma.mentorshipRequest.update({
      where: { id: params.id },
      data: {
        status,
        responseNote: responseNote || null,
      },
    });

    // Notify student of response
    const responderName = session.name || 'Alumni Mentor';
    await sendPipelineNotification({
      userId: mentorshipRequest.studentProfile.user.id,
      userEmail: mentorshipRequest.studentProfile.user.email,
      userName: mentorshipRequest.studentProfile.user.name,
      type: 'SYSTEM',
      title: `Mentorship Request ${status === 'ACCEPTED' ? 'Accepted' : 'Updated'}: ${mentorshipRequest.topic}`,
      message: `${responderName} marked your mentorship request as ${status}. ${responseNote ? `Note: "${responseNote}"` : ''}`,
      actionUrl: '/student',
    });

    return NextResponse.json({
      success: true,
      message: `Request status updated to ${status}.`,
      request: updated,
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
