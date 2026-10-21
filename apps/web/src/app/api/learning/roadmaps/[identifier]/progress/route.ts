import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireSession } from '@/lib/auth';
import { authErrorResponse } from '@/lib/auth-http';
import { parseJsonArray, roadmapTopics } from '@/lib/learning-assessment';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { identifier: string } }) {
  try {
    const session = await requireSession(['STUDENT']);
    const body = await req.json();
    const topicId = typeof body.topicId === 'string' ? body.topicId : '';
    if (!topicId || typeof body.isCompleted !== 'boolean') {
      return NextResponse.json({ success: false, error: 'topicId and isCompleted are required.' }, { status: 400 });
    }
    const [student, roadmap] = await Promise.all([
      prisma.studentProfile.findUnique({
        where: { userId: session.userId },
        select: { id: true, user: { select: { id: true, name: true } } },
      }),
      prisma.learningRoadmap.findFirst({
        where: { OR: [{ slug: params.identifier }, { id: params.identifier }] },
        include: { modules: { select: { id: true, topics: true } } },
      }),
    ]);
    if (!student) return NextResponse.json({ success: false, error: 'Student profile not found.' }, { status: 404 });
    if (!roadmap) return NextResponse.json({ success: false, error: 'Learning roadmap not found.' }, { status: 404 });
    const topics = roadmapTopics(roadmap.modules);
    const targetTopic = topics.find((topic) => topic.id === topicId);
    if (!targetTopic) {
      return NextResponse.json({ success: false, error: 'Topic does not belong to this roadmap.' }, { status: 400 });
    }

    const existing = await prisma.studentRoadmapProgress.findUnique({
      where: { studentProfileId_roadmapId: { studentProfileId: student.id, roadmapId: roadmap.id } },
    });
    const completed = new Set(parseJsonArray<string>(existing?.completedTopicIds));

    // If marking as completed, check prerequisites
    if (body.isCompleted) {
      const explicitPrereqs: string[] = Array.isArray((targetTopic as any).prerequisites) ? (targetTopic as any).prerequisites : [];
      for (const pId of explicitPrereqs) {
        if (!completed.has(pId)) {
          return NextResponse.json({
            success: false,
            error: 'Cannot complete this topic before completing its prerequisites.',
          }, { status: 400 });
        }
      }
      completed.add(topicId);
    } else {
      completed.delete(topicId);
    }

    const completedItems = completed.size;
    const progressPercentage = topics.length ? Number(((completedItems / topics.length) * 100).toFixed(1)) : 0;
    const status = progressPercentage >= 100 ? 'COMPLETED' : completedItems > 0 ? 'IN_PROGRESS' : 'NOT_STARTED';

    const updated = await prisma.studentRoadmapProgress.upsert({
      where: { studentProfileId_roadmapId: { studentProfileId: student.id, roadmapId: roadmap.id } },
      create: {
        studentProfileId: student.id,
        roadmapId: roadmap.id,
        completedItems,
        completedTopicIds: JSON.stringify(Array.from(completed)),
        progressPercentage,
        status,
        lastActivityAt: new Date(),
      },
      update: {
        completedItems,
        completedTopicIds: JSON.stringify(Array.from(completed)),
        progressPercentage,
        status,
        lastActivityAt: new Date(),
      },
    });

    // Write audit log on topic completion
    if (body.isCompleted) {
      await prisma.auditLog.create({
        data: {
          userId: session.userId,
          institutionId: session.institutionId ?? null,
          action: 'ROADMAP_TOPIC_COMPLETED',
          details: JSON.stringify({
            roadmapId: roadmap.id,
            roadmapTitle: roadmap.title,
            topicId,
            topicTitle: targetTopic.title,
            progressPercentage,
            completedAt: new Date().toISOString(),
          }),
        },
      });
    }

    return NextResponse.json({
      success: true,
      progress: {
        roadmapId: roadmap.id,
        completedItems: updated.completedItems,
        progressPercentage: updated.progressPercentage,
        status: updated.status,
        topicId,
        isCompleted: completed.has(topicId),
      },
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
