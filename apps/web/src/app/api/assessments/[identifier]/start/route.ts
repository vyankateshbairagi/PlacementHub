import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireSession } from '@/lib/auth';
import { authErrorResponse } from '@/lib/auth-http';
import { assessmentMarkScale, publicQuestion } from '@/lib/learning-assessment';

export async function POST(_req: NextRequest, { params }: { params: { identifier: string } }) {
  try {
    const session = await requireSession(['STUDENT']);
    const student = await prisma.studentProfile.findUnique({ where: { userId: session.userId }, select: { id: true } });
    if (!student) return NextResponse.json({ success: false, error: 'Student profile not found.' }, { status: 404 });
    const assessment = await prisma.assessment.findFirst({
      where: { OR: [{ slug: params.identifier }, { id: params.identifier }], status: 'ACTIVE' },
      include: { questions: { include: { codingProblem: { select: { testCases: true } } }, orderBy: { orderIndex: 'asc' } } },
    });
    if (!assessment) return NextResponse.json({ success: false, error: 'Active assessment not found.' }, { status: 404 });
    if (!assessment.questions.length) return NextResponse.json({ success: false, error: 'This assessment has no published questions.' }, { status: 409 });
    const marks = assessmentMarkScale(assessment);

    const validSince = new Date(Date.now() - (assessment.durationMin * 60 + 300) * 1000);
    let attempt = await prisma.assessmentAttempt.findFirst({
      where: { assessmentId: assessment.id, studentProfileId: student.id, status: 'IN_PROGRESS', startedAt: { gte: validSince } },
      orderBy: { startedAt: 'desc' },
    });
    if (!attempt) {
      await prisma.assessmentAttempt.updateMany({
        where: { assessmentId: assessment.id, studentProfileId: student.id, status: 'IN_PROGRESS', startedAt: { lt: validSince } },
        data: { status: 'EXPIRED' },
      });
      attempt = await prisma.assessmentAttempt.create({
        data: { assessmentId: assessment.id, studentProfileId: student.id, questionIds: assessment.questions.map((question) => question.id), status: 'IN_PROGRESS', startedAt: new Date() },
      });
    }
    return NextResponse.json({
      success: true,
      attemptId: attempt.id,
      assessment: {
        id: assessment.id, title: assessment.title, slug: assessment.slug || assessment.id,
        category: assessment.category, durationMin: assessment.durationMin,
        totalMarks: marks.totalMarks, passingMarks: marks.passingMarks,
        instructions: assessment.instructions,
        questions: assessment.questions.map((question) => publicQuestion({ ...question, testCases: question.testCases || question.codingProblem?.testCases })),
      },
    });
  } catch (error) { return authErrorResponse(error); }
}

