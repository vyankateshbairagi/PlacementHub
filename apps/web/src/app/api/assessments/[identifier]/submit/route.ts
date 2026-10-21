import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireSession } from '@/lib/auth';
import { authErrorResponse } from '@/lib/auth-http';
import { assessmentMarkScale, parseJsonArray } from '@/lib/learning-assessment';
import { runCodeInSandbox } from '@/lib/code-runner';

export const runtime = 'nodejs';

export async function POST(req: NextRequest, { params }: { params: { identifier: string } }) {
  try {
    const session = await requireSession(['STUDENT']);
    const body = await req.json();
    const attemptId = typeof body.attemptId === 'string' ? body.attemptId : '';
    const answers = body.answers && typeof body.answers === 'object' && !Array.isArray(body.answers) ? body.answers : {};
    if (!attemptId) {
      return NextResponse.json({ success: false, error: 'attemptId is required.' }, { status: 400 });
    }

    const attempt = await prisma.assessmentAttempt.findFirst({
      where: { id: attemptId, studentProfile: { userId: session.userId } },
      include: { studentProfile: { select: { id: true, trustScore: true, verifiedSkillsCount: true } } },
    });
    if (!attempt) {
      return NextResponse.json({ success: false, error: 'Assessment attempt not found.' }, { status: 404 });
    }
    if (attempt.status === 'COMPLETED') {
      return NextResponse.json({ success: false, error: 'This attempt has already been submitted.' }, { status: 409 });
    }

    const assessment = await prisma.assessment.findFirst({
      where: { id: attempt.assessmentId, OR: [{ slug: params.identifier }, { id: params.identifier }] },
      include: { questions: { include: { codingProblem: true }, orderBy: { orderIndex: 'asc' } } },
    });
    if (!assessment) {
      return NextResponse.json({ success: false, error: 'Assessment not found.' }, { status: 404 });
    }

    const maximumSeconds = assessment.durationMin * 60 + 300;
    if ((Date.now() - attempt.startedAt.getTime()) / 1000 > maximumSeconds) {
      return NextResponse.json({ success: false, error: 'The assessment session has expired.' }, { status: 410 });
    }

    // 1. Evaluate questions with real code execution (JS + Python)
    let score = 0;
    const markScale = assessmentMarkScale(assessment);
    const totalMarks = markScale.totalMarks;
    const detailedReview: any[] = [];

    for (const question of assessment.questions) {
      const marks = question.marks || 10;
      const answer = answers[question.id];

      if (question.type === 'CODING') {
        const code = typeof answer?.code === 'string' ? answer.code : '';
        const language = typeof answer?.language === 'string' ? answer.language.toLowerCase() : 'javascript';
        const tests = parseJsonArray<any>(question.testCases || question.codingProblem?.testCases);

        let result;
        if (!code.trim()) {
          result = {
            success: true,
            passed: false,
            passedCount: 0,
            totalCount: tests.length || 1,
            runtimeMs: 0,
            stdout: '',
            output: '',
            results: [],
            message: 'No code submitted.',
          };
        } else {
          result = await runCodeInSandbox({
            code,
            language,
            testCases: tests,
            revealHidden: false,
          });
        }

        const awarded = result.totalCount ? Math.round((result.passedCount / result.totalCount) * marks) : 0;
        score += awarded;
        detailedReview.push({
          questionId: question.id,
          prompt: question.prompt,
          type: 'CODING',
          marksPossible: marks,
          marksAwarded: awarded,
          passed: result.passed,
          evaluation: result,
        });
      } else {
        const selected = typeof answer === 'object' ? Number(answer?.answerIndex) : Number(answer);
        const answered = Number.isInteger(selected);
        const correct = answered && selected === question.answerIndex;
        const awarded = correct ? marks : answered ? -(question.negativeMarks || 0) : 0;
        score += awarded;
        detailedReview.push({
          questionId: question.id,
          prompt: question.prompt,
          type: 'MCQ',
          options: question.options,
          correctOptionIndex: question.answerIndex,
          studentSelectedIndex: answered ? selected : null,
          isCorrect: correct,
          marksPossible: marks,
          marksAwarded: awarded,
          explanation: question.explanation,
        });
      }
    }

    score = Math.max(0, Math.round(score));
    const percentage = totalMarks ? Number(((score / totalMarks) * 100).toFixed(1)) : 0;
    const passingMarks = markScale.passingMarks;
    const isPassed = score >= passingMarks;
    const submittedAt = new Date();

    // 2. Proctor Integrity Analysis
    const proctorEvents = Array.isArray(body.proctorLogs) ? body.proctorLogs : [];
    let tabSwitches = 0;
    let windowBlurs = 0;
    let copyPastes = 0;

    for (const ev of proctorEvents) {
      const type = String(ev?.type || ev?.event || '').toUpperCase();
      if (type.includes('TAB') || type.includes('VISIBILITY')) tabSwitches++;
      if (type.includes('BLUR') || type.includes('FOCUS')) windowBlurs++;
      if (type.includes('COPY') || type.includes('PASTE')) copyPastes++;
    }

    let proctorTrustIndex = 100 - (tabSwitches * 12 + windowBlurs * 6 + copyPastes * 15);
    proctorTrustIndex = Math.max(10, Math.min(100, proctorTrustIndex));

    const integrityFlag =
      proctorTrustIndex < 60
        ? 'FLAGGED_HIGH_ANOMALIES'
        : proctorTrustIndex < 80
        ? 'MINOR_ANOMALIES'
        : 'VERIFIED_CLEAN';

    // 3. Update attempt record
    await prisma.assessmentAttempt.update({
      where: { id: attempt.id },
      data: {
        score,
        maxScore: totalMarks,
        percentage,
        status: 'COMPLETED',
        answers,
        timeSpentSeconds: Math.max(0, Number(body.timeSpentSeconds) || 0),
        submittedAt,
        proctorLogs: JSON.stringify(proctorEvents.slice(0, 500)),
        summary: JSON.stringify({
          totalQuestions: assessment.questions.length,
          correctCount: detailedReview.filter((item) => item.isCorrect || item.passed).length,
          isPassed,
          proctorTrustIndex,
          integrityFlag,
          tabSwitches,
          windowBlurs,
        }),
      },
    });

    // 4. Authentic Cohort Percentile Calculation
    const cohort = await prisma.assessmentAttempt.findMany({
      where: { assessmentId: assessment.id, status: 'COMPLETED', percentage: { not: null } },
      select: { percentage: true },
    });
    const below = cohort.filter((item) => (item.percentage || 0) < percentage).length;
    const tied = cohort.filter((item) => (item.percentage || 0) === percentage).length;
    const percentile = cohort.length
      ? Number((((below + tied * 0.5) / cohort.length) * 100).toFixed(1))
      : 50;

    await prisma.assessmentAttempt.update({
      where: { id: attempt.id },
      data: { percentile },
    });

    // 5. Idempotent Skill Proof Generation
    let skillProofIssued: { skillName: string; tier: string; isNew: boolean } | null = null;

    if (isPassed && integrityFlag !== 'FLAGGED_HIGH_ANOMALIES') {
      const skillName =
        assessment.title
          .replace(/(Assessment|Challenge|Qualifier|Test|Fundamentals|Basics|Core|Essentials)/gi, '')
          .trim() || 'Software Engineering';

      // Check if student ALREADY has a SkillProof for this canonical skill
      const existingProof = await prisma.skillProof.findFirst({
        where: {
          studentProfileId: attempt.studentProfileId,
          canonicalSkill: skillName,
        },
      });

      if (!existingProof) {
        // First time verifying this skill: create proof and increment counters safely
        await prisma.$transaction([
          prisma.skillProof.create({
            data: {
              studentProfileId: attempt.studentProfileId,
              canonicalSkill: skillName,
              category: assessment.category || 'TECHNICAL',
              confidenceTier: 'GOLD_VERIFIED',
              sourceType: 'CODING_ASSESSMENT',
              locator: `assessment:${attempt.id}`,
              metric: `Score: ${score}/${totalMarks} (${percentage}%) • Proctor Index: ${proctorTrustIndex}%`,
              auditNote: `Assessment passed on ${submittedAt.toISOString()}. Authenticated session tied to attempt ${attempt.id}.`,
            },
          }),
          prisma.studentProfile.update({
            where: { id: attempt.studentProfileId },
            data: {
              verifiedSkillsCount: { increment: 1 },
              trustScore: Math.min(100, (attempt.studentProfile.trustScore || 85) + 3),
            },
          }),
        ]);
        skillProofIssued = { skillName, tier: 'GOLD_VERIFIED', isNew: true };
      } else {
        // Skill already verified: update metric if score improved, but DO NOT duplicate or inflate counters
        await prisma.skillProof.update({
          where: { id: existingProof.id },
          data: {
            locator: `assessment:${attempt.id}`,
            metric: `Score: ${score}/${totalMarks} (${percentage}%) • Proctor Index: ${proctorTrustIndex}%`,
            auditNote: `Re-verified on ${submittedAt.toISOString()} (Attempt: ${attempt.id}).`,
          },
        });
        skillProofIssued = { skillName, tier: existingProof.confidenceTier, isNew: false };
      }
    }

    return NextResponse.json({
      success: true,
      scorecard: {
        attemptId: attempt.id,
        assessmentTitle: assessment.title,
        score,
        totalMarks,
        percentage,
        percentile,
        isPassed,
        passingMarks,
        timeSpentSeconds: Math.max(0, Number(body.timeSpentSeconds) || 0),
        proctorTrustIndex,
        integrityFlag,
        skillProofIssued,
        detailedReview,
      },
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
