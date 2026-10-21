import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireSession } from '@/lib/auth';
import { authErrorResponse } from '@/lib/auth-http';
import { assessmentMarkScale, parseStringArray } from '@/lib/learning-assessment';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession([
      'STUDENT',
      'TPO',
      'FACULTY',
      'INSTITUTE_ADMIN',
      'SUPER_ADMIN',
    ]);
    const category = req.nextUrl.searchParams.get('category');
    const isManagement = ['TPO', 'FACULTY', 'INSTITUTE_ADMIN', 'SUPER_ADMIN'].includes(
      session.role
    );

    const assessments = await prisma.assessment.findMany({
      where: category && category !== 'ALL' ? { category } : {},
      include: {
        questions: {
          select: {
            id: true,
            title: true,
            prompt: true,
            type: true,
            marks: true,
            options: true,
            answerIndex: true,
            explanation: true,
            orderIndex: true,
          },
          orderBy: { orderIndex: 'asc' },
        },
        attempts: {
          select: {
            id: true,
            score: true,
            percentage: true,
            status: true,
            studentProfile: {
              select: {
                user: { select: { name: true, email: true } },
              },
            },
          },
          orderBy: { score: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      count: assessments.length,
      assessments: assessments.map((assessment) => {
        const studentAttempts = assessment.attempts.filter(
          (a) => a.studentProfile?.user?.email === session.email && a.status === 'COMPLETED'
        );
        const best = studentAttempts[0];
        const marks = assessmentMarkScale(assessment);
        const totalAttempts = assessment.attempts.length;
        const avgScore =
          totalAttempts > 0
            ? Math.round(
                assessment.attempts.reduce((sum, a) => sum + (a.score || 0), 0) / totalAttempts
              )
            : null;

        return {
          id: assessment.id,
          title: assessment.title,
          slug: assessment.slug || assessment.id,
          category: assessment.category || 'TECHNICAL_MCQ',
          difficulty: assessment.difficulty || 'MEDIUM',
          durationMin: assessment.durationMin,
          totalMarks: marks.totalMarks,
          passingMarks: marks.passingMarks,
          isMandatory: Boolean(assessment.isMandatory),
          skillsCovered: parseStringArray(assessment.skillsCovered),
          targetBatch: assessment.targetBatch || 'All batches',
          instructions: assessment.instructions,
          status: assessment.status || 'ACTIVE',
          questionCount: assessment.questions.length,
          hasCoding: assessment.questions.some((q) => q.type === 'CODING'),
          completed: Boolean(best),
          bestScore: best?.score ?? null,
          percentage: best?.percentage ?? null,
          totalAttempts,
          averageScore: avgScore,
          questions: isManagement ? assessment.questions : undefined,
          createdAt: assessment.createdAt,
        };
      }),
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(['TPO', 'FACULTY', 'INSTITUTE_ADMIN', 'SUPER_ADMIN']);
    const body = await req.json().catch(() => ({}));

    const {
      title,
      category = 'TECHNICAL_MCQ',
      difficulty = 'MEDIUM',
      durationMin = 30,
      totalMarks = 100,
      passingMarks = 60,
      skillsCovered = [],
      targetBatch = '2026 Batch',
      instructions = 'Read each question carefully before submitting.',
      isMandatory = false,
      questions = [],
    } = body;

    if (!title || !String(title).trim()) {
      return NextResponse.json(
        { success: false, error: 'Assessment title is required.' },
        { status: 400 }
      );
    }

    const slug = `${title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')}-${Date.now().toString().slice(-4)}`;

    const formattedSkills = Array.isArray(skillsCovered)
      ? JSON.stringify(skillsCovered)
      : JSON.stringify(['Computer Science', 'General Technical']);

    const newAssessment = await prisma.assessment.create({
      data: {
        title: title.trim(),
        slug,
        category,
        difficulty,
        durationMin: Number(durationMin) || 30,
        totalMarks: Number(totalMarks) || 100,
        passingMarks: Number(passingMarks) || 60,
        skillsCovered: formattedSkills,
        targetBatch,
        instructions,
        isMandatory: Boolean(isMandatory),
        status: 'ACTIVE',
        questions: {
          create: (Array.isArray(questions) && questions.length > 0
            ? questions
            : [
                {
                  prompt: `What is the optimal time complexity to retrieve a value from a distributed Redis cache by key?`,
                  options: ['O(1)', 'O(log N)', 'O(N)', 'O(N^2)'],
                  answerIndex: 0,
                  explanation: 'Redis hash table lookup by key is average case O(1).',
                  type: 'MCQ',
                  marks: 25,
                  orderIndex: 0,
                },
                {
                  prompt: `In distributed databases, which property is sacrificed during network partitions under the CAP theorem if Availability is chosen?`,
                  options: ['Consistency', 'Partition Tolerance', 'Durability', 'Atomicity'],
                  answerIndex: 0,
                  explanation: 'Under CAP, in presence of a partition (P), you choose between Consistency (C) and Availability (A).',
                  type: 'MCQ',
                  marks: 25,
                  orderIndex: 1,
                },
              ]
          ).map((q: any, idx: number) => ({
            prompt: q.prompt || `Question ${idx + 1}`,
            options: Array.isArray(q.options) && q.options.length > 0 ? q.options : ['Option A', 'Option B', 'Option C', 'Option D'],
            answerIndex: typeof q.answerIndex === 'number' ? q.answerIndex : 0,
            explanation: q.explanation || 'Verified standard answer.',
            type: q.type || 'MCQ',
            marks: Number(q.marks) || 20,
            starterCode: q.starterCode || null,
            testCases: q.testCases ? JSON.stringify(q.testCases) : null,
            orderIndex: idx,
          })),
        },
      },
      include: {
        questions: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Assessment created and published successfully to student portal.',
      assessment: newAssessment,
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireSession(['TPO', 'FACULTY', 'INSTITUTE_ADMIN', 'SUPER_ADMIN']);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Assessment ID is required.' },
        { status: 400 }
      );
    }

    await prisma.assessment.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Assessment deleted successfully.',
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
