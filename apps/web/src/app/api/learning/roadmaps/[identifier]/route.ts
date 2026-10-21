import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireSession } from '@/lib/auth';
import { authErrorResponse } from '@/lib/auth-http';
import { parseJsonArray } from '@/lib/learning-assessment';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { identifier: string } }) {
  try {
    const session = await requireSession(['STUDENT', 'FACULTY', 'TPO', 'INSTITUTE_ADMIN', 'SUPER_ADMIN']);
    const roadmap = await prisma.learningRoadmap.findFirst({
      where: { OR: [{ slug: params.identifier }, { id: params.identifier }] },
      include: {
        modules: { orderBy: { orderIndex: 'asc' } },
        studentProgress: { where: { studentProfile: { userId: session.userId } }, take: 1 },
      },
    });
    if (!roadmap) return NextResponse.json({ success: false, error: 'Learning roadmap not found.' }, { status: 404 });
    const progress = roadmap.studentProgress[0];
    const completed = new Set(parseJsonArray<string>(progress?.completedTopicIds));

    let previousTopicId: string | null = null;
    let previousTopicTitle: string | null = null;

    const modules = roadmap.modules.map((module, mIdx) => {
      const rawTopics = parseJsonArray<any>(module.topics);
      const topics = rawTopics.map((topic, index) => {
        const id = typeof topic.id === 'string' && topic.id ? topic.id : `${module.id}-t-${index}`;
        const isCompleted = completed.has(id);

        // Calculate prerequisites
        const explicitPrereqs: string[] = Array.isArray(topic.prerequisites) ? topic.prerequisites : [];
        const prereqTopicId = explicitPrereqs.length > 0 ? explicitPrereqs[0] : (mIdx === 0 && index === 0 ? null : previousTopicId);
        const prereqTitle = explicitPrereqs.length > 0 ? topic.prerequisiteTitle || 'Prior Module Topic' : previousTopicTitle;

        // Topic is locked if it has a prerequisite that is not completed
        const isLocked = prereqTopicId ? !completed.has(prereqTopicId) : false;

        // Remember current for next topic in progression
        previousTopicId = id;
        previousTopicTitle = topic.title || `Topic ${index + 1}`;

        // Assignment metadata
        const assignment = topic.assignment || (topic.codingProblemSlug ? {
          title: `${topic.title || 'Coding'} Practice Arena`,
          type: 'CODING',
          slug: topic.codingProblemSlug,
        } : (topic.type === 'problem' || topic.type === 'exercise' ? {
          title: `${topic.title || 'Practice'} Assessment Task`,
          type: topic.type === 'problem' ? 'CODING' : 'QUIZ',
          slug: topic.codingProblemSlug || null,
        } : null));

        return {
          id,
          title: topic.title || `Topic ${index + 1}`,
          type: topic.type || 'lesson',
          url: topic.url || null,
          leetcodeUrl: topic.leetcodeUrl || null,
          codingProblemSlug: topic.codingProblemSlug || null,
          completed: isCompleted,
          isLocked,
          prerequisiteTopicId: prereqTopicId,
          prerequisiteTitle: isLocked ? prereqTitle : null,
          assignment,
        };
      });

      return {
        id: module.id,
        title: module.title,
        description: module.description,
        orderIndex: module.orderIndex,
        totalItems: topics.length,
        completedCount: topics.filter((topic) => topic.completed).length,
        topics,
      };
    });

    return NextResponse.json({
      success: true,
      roadmap: {
        id: roadmap.id,
        title: roadmap.title,
        slug: roadmap.slug,
        category: roadmap.category,
        provider: roadmap.provider,
        providerBadge: roadmap.providerBadge,
        badgeColor: roadmap.badgeColor,
        description: roadmap.description,
        totalItems: modules.reduce((sum, module) => sum + module.totalItems, 0),
        estimatedHours: roadmap.estimatedHours,
        difficulty: roadmap.difficulty,
        modules,
        isEnrolled: !!progress && progress.status !== 'NOT_STARTED',
        progress: {
          completedItems: completed.size,
          progressPercentage: progress?.progressPercentage || 0,
          status: progress?.status || 'NOT_STARTED',
          lastActivityAt: progress?.lastActivityAt || null,
        },
      },
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
