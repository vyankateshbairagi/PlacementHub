import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireSession } from '@/lib/auth';
import { authErrorResponse } from '@/lib/auth-http';
import { sendPipelineNotification } from '@/lib/notification-service';

export const dynamic = 'force-dynamic';

export async function POST(_req: NextRequest, { params }: { params: { identifier: string } }) {
  try {
    const session = await requireSession(['STUDENT']);
    const [student, roadmap] = await Promise.all([
      prisma.studentProfile.findUnique({
        where: { userId: session.userId },
        select: { id: true, user: { select: { id: true, name: true, email: true } } },
      }),
      prisma.learningRoadmap.findFirst({
        where: { OR: [{ slug: params.identifier }, { id: params.identifier }] },
        include: { modules: { select: { id: true } } },
      }),
    ]);

    if (!student) {
      return NextResponse.json({ success: false, error: 'Student profile not found.' }, { status: 404 });
    }
    if (!roadmap) {
      return NextResponse.json({ success: false, error: 'Learning roadmap not found.' }, { status: 404 });
    }

    // Upsert student progress record indicating active enrollment
    const progress = await prisma.studentRoadmapProgress.upsert({
      where: {
        studentProfileId_roadmapId: {
          studentProfileId: student.id,
          roadmapId: roadmap.id,
        },
      },
      create: {
        studentProfileId: student.id,
        roadmapId: roadmap.id,
        completedItems: 0,
        completedTopicIds: JSON.stringify([]),
        progressPercentage: 0,
        status: 'IN_PROGRESS',
        lastActivityAt: new Date(),
      },
      update: {
        lastActivityAt: new Date(),
      },
    });

    // Write audit log
    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        institutionId: session.institutionId ?? null,
        action: 'ROADMAP_ENROLLED',
        details: JSON.stringify({
          roadmapId: roadmap.id,
          roadmapTitle: roadmap.title,
          roadmapSlug: roadmap.slug,
          enrolledAt: new Date().toISOString(),
        }),
      },
    });

    // Send pipeline notification
    await sendPipelineNotification({
      userId: session.userId,
      userEmail: student.user?.email || session.email,
      userName: student.user?.name || session.name,
      institutionId: session.institutionId,
      type: 'SYSTEM',
      title: `🎓 Enrolled in ${roadmap.title}`,
      message: `You have successfully enrolled in <strong>${roadmap.title}</strong> (${roadmap.category} track). Complete all modules to boost your campus readiness score!`,
      metadata: {
        companyName: roadmap.provider,
        roleTitle: roadmap.title,
      },
    });

    return NextResponse.json({
      success: true,
      enrolled: true,
      message: `Successfully enrolled in ${roadmap.title}`,
      progress: {
        roadmapId: roadmap.id,
        completedItems: progress.completedItems,
        progressPercentage: progress.progressPercentage,
        status: progress.status,
      },
    });
  } catch (error) {
    return authErrorResponse(error, 'Failed to enroll in roadmap.');
  }
}
