import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireSession } from '@/lib/auth';
import { authErrorResponse } from '@/lib/auth-http';
import { sendPipelineNotification } from '@/lib/notification-service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;

    const where: any = {};
    if (status) where.status = status;

    if (session.role === 'STUDENT') {
      const student = await prisma.studentProfile.findUnique({
        where: { userId: session.userId },
        select: { id: true },
      });
      if (!student) return NextResponse.json({ success: true, count: 0, requests: [] });
      where.studentProfileId = student.id;
    } else if (session.role === 'ALUMNI') {
      const alumni = await prisma.alumniProfile.findUnique({
        where: { userId: session.userId },
        select: { id: true },
      });
      if (!alumni) return NextResponse.json({ success: true, count: 0, requests: [] });
      where.OR = [
        { alumniProfileId: alumni.id },
        { alumniProfileId: null }, // Open requests
      ];
    }

    const requests = await prisma.mentorshipRequest.findMany({
      where,
      include: {
        studentProfile: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        alumniProfile: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json({ success: true, count: requests.length, requests });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession(['STUDENT']);
    const body = await request.json();
    const { topic, targetCompany, message, preferredDate, alumniProfileId } = body;

    if (!topic || !message) {
      return NextResponse.json(
        { success: false, error: 'topic and message are required.' },
        { status: 400 }
      );
    }

    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId: session.userId },
      include: { user: true },
    });

    if (!studentProfile) {
      return NextResponse.json(
        { success: false, error: 'Student profile not found.' },
        { status: 404 }
      );
    }

    const newRequest = await prisma.mentorshipRequest.create({
      data: {
        studentProfileId: studentProfile.id,
        alumniProfileId: alumniProfileId || null,
        topic: topic.trim(),
        targetCompany: targetCompany?.trim() || null,
        message: message.trim(),
        preferredDate: preferredDate || null,
        status: 'PENDING',
      },
      include: {
        alumniProfile: { include: { user: true } },
      },
    });

    // Notify targeted alumni or log
    if (newRequest.alumniProfile?.user) {
      await sendPipelineNotification({
        userId: newRequest.alumniProfile.user.id,
        userEmail: newRequest.alumniProfile.user.email,
        userName: newRequest.alumniProfile.user.name,
        type: 'SYSTEM',
        title: `Mentorship Request from ${studentProfile.user.name}`,
        message: `${studentProfile.user.name} submitted a custom mentorship request on "${topic}".`,
        actionUrl: '/alumni',
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Mentorship request submitted successfully.',
      request: newRequest,
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
