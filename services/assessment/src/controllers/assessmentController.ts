import { Request, Response } from 'express';
import { prisma } from '../db.js';
import { runCode } from '../services/codeRunner.js';

/**
 * List all assessments with optional student completion status
 */
export async function listAssessments(req: Request, res: Response): Promise<void> {
  try {
    const { studentEmail, category } = req.query;

    const where: any = {};
    if (category && category !== 'ALL') {
      where.category = String(category);
    }

    const assessments = await prisma.assessment.findMany({
      where,
      include: {
        questions: {
          select: {
            id: true,
            type: true,
            marks: true,
          },
        },
        attempts: studentEmail
          ? {
              where: {
                studentProfile: {
                  user: {
                    email: String(studentEmail),
                  },
                },
              },
              orderBy: { score: 'desc' },
              take: 1,
            }
          : false,
      },
      orderBy: { createdAt: 'desc' },
    });

    const mapped = assessments.map((a) => {
      const bestAttempt = a.attempts && a.attempts.length > 0 ? a.attempts[0] : null;
      let skillsArray: string[] = [];
      try {
        skillsArray = a.skillsCovered ? JSON.parse(a.skillsCovered) : [];
      } catch {
        skillsArray = [a.title];
      }

      return {
        id: a.id,
        title: a.title,
        slug: a.slug || a.id,
        category: a.category || 'TECHNICAL_MCQ',
        difficulty: a.difficulty || 'MEDIUM',
        durationMin: a.durationMin || 60,
        totalMarks: a.totalMarks || 100,
        passingMarks: a.passingMarks || 60,
        isMandatory: a.isMandatory || false,
        skillsCovered: skillsArray,
        targetBatch: a.targetBatch || '2026 Batch',
        questionCount: a.questions.length,
        hasCoding: a.questions.some((q) => q.type === 'CODING'),
        completed: bestAttempt !== null,
        bestScore: bestAttempt?.score ?? null,
        percentage: bestAttempt?.percentage ?? null,
      };
    });

    res.json({ success: true, count: mapped.length, assessments: mapped });
  } catch (error: any) {
    console.error('Error in listAssessments:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Get assessment details by slug or ID
 */
export async function getAssessment(req: Request, res: Response): Promise<void> {
  try {
    const identifier = String(req.params.identifier);

    const assessment: any = await prisma.assessment.findFirst({
      where: {
        OR: [{ slug: identifier }, { id: identifier }],
      },
      include: {
        questions: {
          select: {
            id: true,
            title: true,
            prompt: true,
            options: true,
            type: true,
            orderIndex: true,
            marks: true,
            negativeMarks: true,
            starterCode: true,
            codingProblemId: true,
            // Keep answerIndex & explanation secret until submission
          },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    if (!assessment) {
      res.status(404).json({ success: false, error: 'Assessment not found' });
      return;
    }

    res.json({ success: true, assessment });
  } catch (error: any) {
    console.error('Error in getAssessment:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Start an assessment attempt session
 */
export async function startAttempt(req: Request, res: Response): Promise<void> {
  try {
    const identifier = String(req.params.identifier);
    const { studentEmail } = req.body;

    if (!studentEmail) {
      res.status(400).json({ success: false, error: 'studentEmail is required' });
      return;
    }

    // Resolve student
    const student = await prisma.studentProfile.findFirst({
      where: {
        user: { email: studentEmail },
      },
    });

    if (!student) {
      res.status(404).json({ success: false, error: `Student profile not found for email ${studentEmail}` });
      return;
    }

    const assessment: any = await prisma.assessment.findFirst({
      where: {
        OR: [{ slug: identifier }, { id: identifier }],
      },
      include: {
        questions: {
          select: {
            id: true,
            title: true,
            prompt: true,
            options: true,
            type: true,
            orderIndex: true,
            marks: true,
            negativeMarks: true,
            starterCode: true,
            codingProblemId: true,
          },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    if (!assessment) {
      res.status(404).json({ success: false, error: 'Assessment not found' });
      return;
    }

    // Create new in-progress attempt
    const attempt = await prisma.assessmentAttempt.create({
      data: {
        assessmentId: assessment.id,
        studentProfileId: student.id,
        questionIds: assessment.questions.map((q: any) => q.id),
        status: 'IN_PROGRESS',
        startedAt: new Date(),
      },
    });

    res.json({
      success: true,
      attemptId: attempt.id,
      assessment: {
        id: assessment.id,
        title: assessment.title,
        slug: assessment.slug,
        durationMin: assessment.durationMin,
        totalMarks: assessment.totalMarks,
        passingMarks: assessment.passingMarks,
        questions: assessment.questions,
      },
    });
  } catch (error: any) {
    console.error('Error in startAttempt:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Submit answers, auto-grade assessment, evaluate code, issue SkillProof, and return scorecard
 */
export async function submitAttempt(req: Request, res: Response): Promise<void> {
  try {
    const identifier = String(req.params.identifier);
    const { attemptId, answers = {}, proctorLogs = [], timeSpentSeconds = 0 } = req.body;

    const assessment: any = await prisma.assessment.findFirst({
      where: {
        OR: [{ slug: identifier }, { id: identifier }],
      },
      include: {
        questions: {
          include: {
            codingProblem: true,
          },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    if (!assessment) {
      res.status(404).json({ success: false, error: 'Assessment not found' });
      return;
    }

    // Load attempt
    let attempt = null;
    if (attemptId) {
      attempt = await prisma.assessmentAttempt.findUnique({
        where: { id: attemptId },
        include: { studentProfile: true },
      });
    }

    let studentProfileId = attempt?.studentProfileId;
    if (!studentProfileId && req.body.studentEmail) {
      const st = await prisma.studentProfile.findFirst({
        where: { user: { email: req.body.studentEmail } },
      });
      studentProfileId = st?.id;
    }

    if (!studentProfileId) {
      res.status(400).json({ success: false, error: 'Student profile could not be identified' });
      return;
    }

    // Auto-grade each question
    let totalScore = 0;
    let totalPossibleMarks = 0;
    const detailedReview: any[] = [];

    for (const q of assessment.questions) {
      const qMarks = q.marks || 10;
      totalPossibleMarks += qMarks;
      const studentAns = answers[q.id];

      if (q.type === 'CODING') {
        const userCode = typeof studentAns === 'object' ? studentAns.code : String(studentAns || '');
        const userLang = typeof studentAns === 'object' ? studentAns.language : 'javascript';

        let testCases: any[] = [];
        try {
          if (q.testCases) {
            testCases = JSON.parse(q.testCases);
          } else if (q.codingProblem?.testCases) {
            testCases = JSON.parse(q.codingProblem.testCases);
          }
        } catch {
          testCases = [];
        }

        const runResult = await runCode(userCode, userLang, testCases);
        const ratio = runResult.totalCount > 0 ? runResult.passedCount / runResult.totalCount : 1;
        const awarded = Math.round(ratio * qMarks);
        totalScore += awarded;

        detailedReview.push({
          questionId: q.id,
          prompt: q.prompt,
          type: 'CODING',
          marksPossible: qMarks,
          marksAwarded: awarded,
          passed: runResult.passed,
          evaluation: runResult,
        });
      } else {
        // MCQ grading
        const selectedIndex = typeof studentAns === 'object' ? studentAns.answerIndex : parseInt(studentAns, 10);
        const isCorrect = selectedIndex === q.answerIndex;
        let awarded = 0;

        if (isCorrect) {
          awarded = qMarks;
        } else if (selectedIndex !== undefined && !isNaN(selectedIndex) && q.negativeMarks) {
          awarded = -q.negativeMarks;
        }

        totalScore = Math.max(0, totalScore + awarded);

        detailedReview.push({
          questionId: q.id,
          prompt: q.prompt,
          type: 'MCQ',
          options: q.options,
          correctOptionIndex: q.answerIndex,
          studentSelectedIndex: isCorrect || !isNaN(selectedIndex) ? selectedIndex : null,
          isCorrect,
          marksPossible: qMarks,
          marksAwarded: awarded,
          explanation: q.explanation,
        });
      }
    }

    const percentage = totalPossibleMarks > 0 ? (totalScore / totalPossibleMarks) * 100 : 0;
    const isPassed = percentage >= (assessment.passingMarks || 60);

    // Proctor Integrity Audit
    let tabSwitches = 0;
    let windowBlurs = 0;
    let copyPastes = 0;
    for (const ev of (Array.isArray(proctorLogs) ? proctorLogs : [])) {
      const t = String(ev?.type || ev?.event || '').toUpperCase();
      if (t.includes('TAB') || t.includes('VISIBILITY')) tabSwitches++;
      if (t.includes('BLUR') || t.includes('FOCUS')) windowBlurs++;
      if (t.includes('COPY') || t.includes('PASTE')) copyPastes++;
    }
    const proctorTrustIndex = Math.max(10, Math.min(100, 100 - (tabSwitches * 12 + windowBlurs * 6 + copyPastes * 15)));
    const integrityFlag = proctorTrustIndex < 60 ? 'FLAGGED_HIGH_ANOMALIES' : 'VERIFIED_CLEAN';

    // Authentic Cohort Percentile Calculation
    const cohort = await prisma.assessmentAttempt.findMany({
      where: { assessmentId: assessment.id, status: 'COMPLETED', percentage: { not: null } },
      select: { percentage: true },
    });
    const below = cohort.filter((item) => (item.percentage || 0) < percentage).length;
    const tied = cohort.filter((item) => (item.percentage || 0) === percentage).length;
    const percentile = cohort.length
      ? Number((((below + tied * 0.5) / cohort.length) * 100).toFixed(1))
      : 50;

    // Update or create Attempt
    const savedAttempt = attemptId
      ? await prisma.assessmentAttempt.update({
          where: { id: attemptId },
          data: {
            score: Math.round(totalScore),
            maxScore: totalPossibleMarks,
            percentage: parseFloat(percentage.toFixed(1)),
            percentile,
            status: 'COMPLETED',
            answers,
            timeSpentSeconds,
            submittedAt: new Date(),
            proctorLogs: JSON.stringify(proctorLogs),
            summary: JSON.stringify({
              totalQuestions: assessment.questions.length,
              correctCount: detailedReview.filter((r) => r.isCorrect || r.passed).length,
              isPassed,
              proctorTrustIndex,
              integrityFlag,
            }),
          },
        })
      : await prisma.assessmentAttempt.create({
          data: {
            assessmentId: assessment.id,
            studentProfileId,
            score: Math.round(totalScore),
            maxScore: totalPossibleMarks,
            percentage: parseFloat(percentage.toFixed(1)),
            percentile,
            status: 'COMPLETED',
            answers,
            timeSpentSeconds,
            submittedAt: new Date(),
            proctorLogs: JSON.stringify(proctorLogs),
            summary: JSON.stringify({
              totalQuestions: assessment.questions.length,
              correctCount: detailedReview.filter((r) => r.isCorrect || r.passed).length,
              isPassed,
              proctorTrustIndex,
              integrityFlag,
            }),
          },
        });

    // Idempotent SkillProof Generation
    let skillProofCreated = false;
    if (isPassed && integrityFlag !== 'FLAGGED_HIGH_ANOMALIES') {
      const canonicalSkill = assessment.title
        .replace(/(Assessment|Challenge|Qualifier|Test|Fundamentals|Basics|Core|Essentials)/gi, '')
        .trim() || 'Software Engineering';

      try {
        const existingProof = await prisma.skillProof.findFirst({
          where: {
            studentProfileId,
            canonicalSkill,
          },
        });

        if (!existingProof) {
          await prisma.$transaction([
            prisma.skillProof.create({
              data: {
                studentProfileId,
                canonicalSkill,
                category: assessment.category || 'TECHNICAL',
                confidenceTier: 'GOLD_VERIFIED',
                sourceType: 'CODING_ASSESSMENT',
                locator: `assessment:${savedAttempt.id}`,
                metric: `Score: ${totalScore}/${totalPossibleMarks} (${percentage.toFixed(0)}%) • Passed ${assessment.title}`,
                auditNote: `Proctored online evaluation passed on ${new Date().toLocaleDateString()}. Proctor Index: ${proctorTrustIndex}%.`,
              },
            }),
            prisma.studentProfile.update({
              where: { id: studentProfileId },
              data: {
                verifiedSkillsCount: { increment: 1 },
                trustScore: { increment: 3 },
              },
            }),
          ]);
          skillProofCreated = true;
        } else {
          await prisma.skillProof.update({
            where: { id: existingProof.id },
            data: {
              locator: `assessment:${savedAttempt.id}`,
              metric: `Score: ${totalScore}/${totalPossibleMarks} (${percentage.toFixed(0)}%) • Passed ${assessment.title}`,
              auditNote: `Re-evaluated on ${new Date().toLocaleDateString()}. Proctor Index: ${proctorTrustIndex}%.`,
            },
          });
        }
      } catch (proofErr) {
        console.warn('SkillProof update note:', proofErr);
      }
    }

    res.json({
      success: true,
      scorecard: {
        attemptId: savedAttempt.id,
        assessmentTitle: assessment.title,
        score: Math.round(totalScore),
        maxScore: totalPossibleMarks,
        percentage: parseFloat(percentage.toFixed(1)),
        percentile,
        isPassed,
        passingMarks: assessment.passingMarks,
        timeSpentSeconds,
        skillProofCreated,
        review: detailedReview,
      },
    });
  } catch (error: any) {
    console.error('Error in submitAttempt:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Execute standalone code sandbox runner
 */
export async function executeCodeSandbox(req: Request, res: Response): Promise<void> {
  try {
    const { code, language = 'javascript', testCases = [], problemSlug } = req.body;

    if (!code) {
      res.status(400).json({ success: false, error: 'code is required' });
      return;
    }

    let effectiveTestCases = testCases;
    if ((!effectiveTestCases || effectiveTestCases.length === 0) && problemSlug) {
      const problem = await prisma.codingProblem.findUnique({
        where: { slug: problemSlug },
      });
      if (problem && problem.testCases) {
        try {
          effectiveTestCases = JSON.parse(problem.testCases);
        } catch {
          effectiveTestCases = [];
        }
      }
    }

    const result = await runCode(code, language, effectiveTestCases);
    res.json(result);
  } catch (error: any) {
    console.error('Error in executeCodeSandbox:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * List coding problems from database
 */
export async function listCodingProblems(req: Request, res: Response): Promise<void> {
  try {
    const problems = await prisma.codingProblem.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        slug: true,
        difficulty: true,
        category: true,
        description: true,
        starterCode: true,
      },
    });

    res.json({ success: true, count: problems.length, problems });
  } catch (error: any) {
    console.error('Error in listCodingProblems:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}
