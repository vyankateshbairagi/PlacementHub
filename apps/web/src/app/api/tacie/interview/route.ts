import { NextRequest, NextResponse } from 'next/server';
import { getMockInterviewQuestions, evaluateInterviewAnswerAsync } from '@/lib/tacie';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const company = searchParams.get('company') || 'Google';
    const role = searchParams.get('role') || 'Software Engineer';
    const roundType = searchParams.get('roundType') || 'Technical';
    const studentEmail = searchParams.get('studentEmail') || searchParams.get('email');

    const session = await getSession();

    // 1. History Retrieval
    if (action === 'history') {
      let student = null;
      if (session && session.userId) {
        student = await prisma.studentProfile.findUnique({
          where: { userId: session.userId },
        });
      }
      if (!student && studentEmail) {
        student = await prisma.studentProfile.findFirst({
          where: { user: { email: studentEmail } },
        });
      }
      if (!student) {
        student = await prisma.studentProfile.findFirst({
          where: { user: { email: 'aditya.shinde@student.gcoen.ac.in' } },
        });
      }

      if (!student) {
        return NextResponse.json({ success: true, history: [] });
      }

      const assessments = await prisma.tacieAssessment.findMany({
        where: {
          studentProfileId: student.id,
          type: 'AI_MOCK_INTERVIEW',
        },
        orderBy: { createdAt: 'desc' },
        take: 30,
      });

      const parsedHistory = assessments.map((a) => {
        let details: any = {};
        try {
          details = JSON.parse(a.insights);
        } catch {
          details = { raw: a.insights };
        }
        return {
          id: a.id,
          targetRole: a.targetRole,
          score: a.score,
          createdAt: a.createdAt,
          company: details.company || 'Technical Interview',
          role: details.role || 'Software Engineer',
          roundType: details.roundType || 'Technical',
          question: details.question,
          answer: details.answer,
          evaluation: details.evaluation || {
            score: a.score,
            clarity: a.score,
            technicalAccuracy: a.score,
            structureStar: a.score,
            feedback: 'Evaluation completed.',
          },
        };
      });

      return NextResponse.json({ success: true, history: parsedHistory });
    }

    // 2. Fetch authentic questions: check debriefs in DB first
    let vaultQuestions: string[] = [];
    try {
      const debriefs = await prisma.interviewDebrief.findMany({
        where: {
          companyName: { contains: company, mode: 'insensitive' },
        },
        take: 5,
        orderBy: { createdAt: 'desc' },
      });

      for (const d of debriefs) {
        try {
          const qs = JSON.parse(d.questionsAsked);
          if (Array.isArray(qs)) vaultQuestions.push(...qs);
        } catch {
          if (d.questionsAsked) vaultQuestions.push(d.questionsAsked);
        }
      }
    } catch (dbErr) {
      console.warn('Debriefs query error:', dbErr);
    }

    // Combine with curated company-specific questions
    const curatedQuestions = getMockInterviewQuestions(company, role, roundType);

    // Merge authentic vault questions as high priority items
    const mergedQuestions = [...curatedQuestions];
    vaultQuestions.slice(0, 3).forEach((vq, idx) => {
      if (!mergedQuestions.some((m) => m.question.toLowerCase() === vq.toLowerCase())) {
        mergedQuestions.unshift({
          id: `vault-live-${idx + 1}`,
          question: vq,
          category: (roundType as any) || 'Technical',
          difficulty: 'Hard',
          modelAnswerHints: [
            `Real prompt reported in ${company} campus drives.`,
            'Outline context, data structures, and edge-case handling.',
            'Conclude with time and space complexity tradeoffs.',
          ],
        });
      }
    });

    return NextResponse.json({
      success: true,
      company,
      role,
      roundType,
      questions: mergedQuestions,
    });
  } catch (error: any) {
    console.error('Error in TACIE interview GET:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    const body = await request.json().catch(() => ({}));
    const {
      question,
      answer,
      company = 'Google',
      role = 'Software Engineer',
      roundType = 'Technical',
      difficulty = 'Medium',
      studentEmail,
    } = body;

    if (!question || !answer || !String(answer).trim()) {
      return NextResponse.json(
        { success: false, error: 'Question and answer are required' },
        { status: 400 }
      );
    }

    // 1. Run real AI evaluation via Ollama / PlacementHub AI or fallback
    const evaluation = await evaluateInterviewAnswerAsync(question, answer, {
      company,
      role,
      roundType,
    });

    // 2. Identify student profile for persistence
    let student = null;
    if (session && session.userId) {
      student = await prisma.studentProfile.findUnique({
        where: { userId: session.userId },
        include: { user: true },
      });
    }

    if (!student && studentEmail) {
      student = await prisma.studentProfile.findFirst({
        where: { user: { email: studentEmail } },
        include: { user: true },
      });
    }

    if (!student) {
      student = await prisma.studentProfile.findFirst({
        where: { user: { email: 'aditya.shinde@student.gcoen.ac.in' } },
        include: { user: true },
      });
    }

    if (!student) {
      student = await prisma.studentProfile.findFirst({
        include: { user: true },
      });
    }

    // 3. Persist score & full feedback into TacieAssessment
    let assessmentRecord = null;
    if (student) {
      try {
        assessmentRecord = await prisma.tacieAssessment.create({
          data: {
            studentProfileId: student.id,
            type: 'AI_MOCK_INTERVIEW',
            targetRole: `${company} - ${role} (${roundType})`,
            score: evaluation.score,
            insights: JSON.stringify({
              company,
              role,
              roundType,
              difficulty,
              question,
              answer,
              evaluation,
              timestamp: new Date().toISOString(),
            }),
          },
        });
      } catch (dbErr) {
        console.warn('Could not persist TacieAssessment:', dbErr);
      }

      // 4. Record AuditLog entry
      try {
        await prisma.auditLog.create({
          data: {
            userId: student.userId,
            action: 'MOCK_INTERVIEW_EVALUATED',
            details: JSON.stringify({
              assessmentId: assessmentRecord?.id,
              company,
              role,
              roundType,
              score: evaluation.score,
              clarity: evaluation.clarity,
              technicalAccuracy: evaluation.technicalAccuracy,
              structureStar: evaluation.structureStar,
              timestamp: new Date().toISOString(),
            }),
          },
        });
      } catch (logErr) {
        console.warn('Could not save AuditLog:', logErr);
      }
    }

    return NextResponse.json({
      success: true,
      evaluation,
      assessmentId: assessmentRecord?.id,
      company,
      role,
      roundType,
    });
  } catch (error: any) {
    console.error('Error in TACIE interview evaluation:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
