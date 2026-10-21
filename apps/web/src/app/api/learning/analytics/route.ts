import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireSession } from '@/lib/auth';
import { authErrorResponse } from '@/lib/auth-http';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession(['FACULTY', 'TPO', 'INSTITUTE_ADMIN', 'SUPER_ADMIN']);
    const { searchParams } = new URL(req.url);
    const department = searchParams.get('department') || 'Computer Engineering';

    // 1. Fetch all students in the department/institution
    const students = await prisma.studentProfile.findMany({
      where: {
        ...(department !== 'ALL' ? { department } : {}),
        ...(session.role !== 'SUPER_ADMIN' && session.institutionId
          ? { user: { institutionId: session.institutionId } }
          : {}),
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        roadmapProgresses: {
          include: {
            roadmap: { select: { id: true, title: true, slug: true, totalItems: true } },
          },
        },
      },
    });

    // 2. Fetch all roadmaps
    const roadmaps = await prisma.learningRoadmap.findMany({
      include: {
        modules: { select: { id: true, title: true, totalItems: true } },
      },
    });

    // 3. Compute per-roadmap metrics across the cohort
    const roadmapStats = roadmaps.map((rm) => {
      let enrolledCount = 0;
      let completedCount = 0;
      let totalProgressSum = 0;

      for (const student of students) {
        const p = student.roadmapProgresses.find((prog: { roadmapId: string }) => prog.roadmapId === rm.id);
        if (p) {
          enrolledCount += 1;
          totalProgressSum += p.progressPercentage || 0;
          if (p.status === 'COMPLETED' || p.progressPercentage >= 100) {
            completedCount += 1;
          }
        }
      }

      const avgProgress = enrolledCount > 0 ? Number((totalProgressSum / enrolledCount).toFixed(1)) : 0;

      return {
        id: rm.id,
        title: rm.title,
        slug: rm.slug,
        category: rm.category,
        totalItems: rm.totalItems,
        enrolledCount,
        completedCount,
        averageProgress: avgProgress,
        cohortEnrollmentRate: students.length > 0 ? Number(((enrolledCount / students.length) * 100).toFixed(1)) : 0,
      };
    });

    // 4. Identify at-risk vs top performers
    const studentPerformance = students.map((s) => {
      const activeProgresses = s.roadmapProgresses;
      const avgProgress = activeProgresses.length > 0
        ? Number(
            (activeProgresses.reduce((acc: number, curr: { progressPercentage: number }) => acc + curr.progressPercentage, 0) / activeProgresses.length).toFixed(1)
          )
        : 0;

      const isAtRisk =
        s.careerReadinessScore < 75 ||
        s.placementStatus === 'UNPLACED' ||
        (activeProgresses.length > 0 && avgProgress < 40);

      return {
        studentId: s.id,
        name: s.user?.name || 'Student',
        email: s.user?.email || '',
        rollNo: s.rollNo,
        department: s.department,
        careerReadinessScore: s.careerReadinessScore,
        placementStatus: s.placementStatus,
        enrolledRoadmapsCount: activeProgresses.length,
        averageLearningProgress: avgProgress,
        isAtRisk,
      };
    });

    const atRiskStudents = studentPerformance.filter((s) => s.isAtRisk);
    const topPerformers = [...studentPerformance].sort((a, b) => b.averageLearningProgress - a.averageLearningProgress).slice(0, 5);

    // 5. Cohort overall metrics
    const totalStudents = students.length;
    const placedCount = students.filter((s) => s.placementStatus === 'PLACED').length;
    const avgCohortReadiness = totalStudents > 0
      ? Math.round(students.reduce((acc, s) => acc + (s.careerReadinessScore || 0), 0) / totalStudents)
      : 82;
    const avgLearningCompletion = studentPerformance.length > 0
      ? Number(
          (studentPerformance.reduce((acc, s) => acc + s.averageLearningProgress, 0) / studentPerformance.length).toFixed(1)
        )
      : 0;

    return NextResponse.json({
      success: true,
      department,
      cohortSummary: {
        totalStudents,
        placedCount,
        atRiskCount: atRiskStudents.length,
        averageReadinessScore: avgCohortReadiness,
        averageLearningCompletion: avgLearningCompletion,
      },
      roadmaps: roadmapStats,
      atRiskStudents: atRiskStudents.slice(0, 10),
      topPerformers,
    });
  } catch (error) {
    return authErrorResponse(error, 'Failed to generate faculty learning analytics.');
  }
}
