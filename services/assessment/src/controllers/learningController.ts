import { Request, Response } from 'express';
import { prisma } from '../db.js';

/**
 * List all curated learning roadmaps with optional student progress
 */
export async function listRoadmaps(req: Request, res: Response): Promise<void> {
  try {
    const { studentEmail, category } = req.query;

    const where: any = {};
    if (category && category !== 'ALL') {
      where.category = String(category);
    }

    const roadmaps = await prisma.learningRoadmap.findMany({
      where,
      include: {
        modules: {
          select: {
            id: true,
            title: true,
            totalItems: true,
          },
          orderBy: { orderIndex: 'asc' },
        },
        studentProgress: studentEmail
          ? {
              where: {
                studentProfile: {
                  user: { email: String(studentEmail) },
                },
              },
            }
          : false,
      },
      orderBy: { createdAt: 'asc' },
    });

    const mapped = roadmaps.map((r) => {
      const progress = r.studentProgress && r.studentProgress.length > 0 ? r.studentProgress[0] : null;
      let tagsArray: string[] = [];
      try {
        tagsArray = r.tags ? JSON.parse(r.tags) : [];
      } catch {
        tagsArray = [r.category];
      }

      return {
        id: r.id,
        title: r.title,
        slug: r.slug,
        category: r.category,
        provider: r.provider,
        providerBadge: r.providerBadge,
        badgeColor: r.badgeColor,
        description: r.description,
        totalItems: r.totalItems,
        estimatedHours: r.estimatedHours,
        difficulty: r.difficulty,
        tags: tagsArray,
        moduleCount: r.modules.length,
        studentProgress: {
          completedItems: progress?.completedItems ?? 0,
          progressPercentage: progress?.progressPercentage ?? 0,
          status: progress?.status ?? 'NOT_STARTED',
          lastActivityAt: progress?.lastActivityAt ?? null,
        },
      };
    });

    res.json({ success: true, count: mapped.length, roadmaps: mapped });
  } catch (error: any) {
    console.error('Error in listRoadmaps:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Get roadmap syllabus, modules, and checkable topics
 */
export async function getRoadmap(req: Request, res: Response): Promise<void> {
  try {
    const identifier = String(req.params.identifier);
    const { studentEmail } = req.query;

    const roadmap: any = await prisma.learningRoadmap.findFirst({
      where: {
        OR: [{ slug: identifier }, { id: identifier }],
      },
      include: {
        modules: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    if (!roadmap) {
      res.status(404).json({ success: false, error: 'Learning roadmap not found' });
      return;
    }

    // Resolve student progress
    let completedTopicSet = new Set<string>();
    let progressRecord = null;

    if (studentEmail) {
      progressRecord = await prisma.studentRoadmapProgress.findFirst({
        where: {
          roadmapId: roadmap.id,
          studentProfile: {
            user: { email: String(studentEmail) },
          },
        },
      });

      if (progressRecord && progressRecord.completedTopicIds) {
        try {
          const ids = JSON.parse(progressRecord.completedTopicIds);
          if (Array.isArray(ids)) {
            completedTopicSet = new Set(ids);
          }
        } catch {
          // ignore parse error
        }
      }
    }

    // Format modules with parsed topics
    const formattedModules = roadmap.modules.map((m: any) => {
      let rawTopics: any[] = [];
      try {
        rawTopics = m.topics ? JSON.parse(m.topics) : [];
      } catch {
        rawTopics = [];
      }

      const topicsWithStatus = rawTopics.map((t, idx) => {
        const topicId = t.id || `${m.id}-t-${idx}`;
        return {
          id: topicId,
          title: t.title || `Topic ${idx + 1}`,
          type: t.type || 'lesson',
          url: t.url || null,
          leetcodeUrl: t.leetcodeUrl || null,
          codingProblemSlug: t.codingProblemSlug || null,
          completed: completedTopicSet.has(topicId),
        };
      });

      return {
        id: m.id,
        title: m.title,
        description: m.description,
        orderIndex: m.orderIndex,
        totalItems: m.totalItems || topicsWithStatus.length,
        completedCount: topicsWithStatus.filter((t) => t.completed).length,
        topics: topicsWithStatus,
      };
    });

    res.json({
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
        totalItems: roadmap.totalItems,
        estimatedHours: roadmap.estimatedHours,
        difficulty: roadmap.difficulty,
        modules: formattedModules,
        progress: {
          completedItems: progressRecord?.completedItems ?? completedTopicSet.size,
          progressPercentage: progressRecord?.progressPercentage ?? 0,
          status: progressRecord?.status ?? 'NOT_STARTED',
        },
      },
    });
  } catch (error: any) {
    console.error('Error in getRoadmap:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Toggle topic completion status and recalculate roadmap percentage
 */
export async function toggleTopicProgress(req: Request, res: Response): Promise<void> {
  try {
    const identifier = String(req.params.identifier);
    const { studentEmail, topicId, isCompleted } = req.body;

    if (!studentEmail || !topicId) {
      res.status(400).json({ success: false, error: 'studentEmail and topicId are required' });
      return;
    }

    const student = await prisma.studentProfile.findFirst({
      where: { user: { email: studentEmail } },
    });

    if (!student) {
      res.status(404).json({ success: false, error: 'Student profile not found' });
      return;
    }

    const roadmap = await prisma.learningRoadmap.findFirst({
      where: {
        OR: [{ slug: identifier }, { id: identifier }],
      },
    });

    if (!roadmap) {
      res.status(404).json({ success: false, error: 'Roadmap not found' });
      return;
    }

    // Get current progress or initialize
    let progress = await prisma.studentRoadmapProgress.findUnique({
      where: {
        studentProfileId_roadmapId: {
          studentProfileId: student.id,
          roadmapId: roadmap.id,
        },
      },
    });

    let completedIds: string[] = [];
    if (progress && progress.completedTopicIds) {
      try {
        completedIds = JSON.parse(progress.completedTopicIds);
      } catch {
        completedIds = [];
      }
    }

    if (isCompleted) {
      if (!completedIds.includes(topicId)) {
        completedIds.push(topicId);
      }
    } else {
      completedIds = completedIds.filter((id) => id !== topicId);
    }

    const completedItems = completedIds.length;
    const totalItems = Math.max(1, roadmap.totalItems || 100);
    const progressPercentage = parseFloat(Math.min(100, (completedItems / totalItems) * 100).toFixed(1));
    const status = progressPercentage >= 100 ? 'COMPLETED' : completedItems > 0 ? 'IN_PROGRESS' : 'NOT_STARTED';

    const updated = await prisma.studentRoadmapProgress.upsert({
      where: {
        studentProfileId_roadmapId: {
          studentProfileId: student.id,
          roadmapId: roadmap.id,
        },
      },
      create: {
        studentProfileId: student.id,
        roadmapId: roadmap.id,
        completedItems,
        completedTopicIds: JSON.stringify(completedIds),
        progressPercentage,
        status,
        lastActivityAt: new Date(),
      },
      update: {
        completedItems,
        completedTopicIds: JSON.stringify(completedIds),
        progressPercentage,
        status,
        lastActivityAt: new Date(),
      },
    });

    res.json({
      success: true,
      progress: {
        roadmapId: roadmap.id,
        completedItems: updated.completedItems,
        progressPercentage: updated.progressPercentage,
        status: updated.status,
        topicId,
        isCompleted: completedIds.includes(topicId),
      },
    });
  } catch (error: any) {
    console.error('Error in toggleTopicProgress:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Get aggregated student learning summary
 */
export async function getStudentLearningSummary(req: Request, res: Response): Promise<void> {
  try {
    const { studentEmail } = req.query;

    if (!studentEmail) {
      res.status(400).json({ success: false, error: 'studentEmail is required' });
      return;
    }

    const progresses = await prisma.studentRoadmapProgress.findMany({
      where: {
        studentProfile: {
          user: { email: String(studentEmail) },
        },
      },
      include: {
        roadmap: true,
      },
    });

    const enrolledCount = progresses.length;
    const completedCount = progresses.filter((p) => p.status === 'COMPLETED').length;
    const totalTopicsMastered = progresses.reduce((acc, p) => acc + p.completedItems, 0);
    const avgPercentage =
      enrolledCount > 0
        ? parseFloat((progresses.reduce((acc, p) => acc + p.progressPercentage, 0) / enrolledCount).toFixed(1))
        : 0;

    res.json({
      success: true,
      summary: {
        enrolledCount,
        completedCount,
        totalTopicsMastered,
        avgPercentage,
        roadmaps: progresses.map((p) => ({
          title: p.roadmap.title,
          slug: p.roadmap.slug,
          percentage: p.progressPercentage,
          completedItems: p.completedItems,
          status: p.status,
        })),
      },
    });
  } catch (error: any) {
    console.error('Error in getStudentLearningSummary:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}
