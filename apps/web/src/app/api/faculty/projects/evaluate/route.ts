import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

const SKILL_TAXONOMY: Record<string, { canonical: string; category: string }> = {
  react: { canonical: 'React', category: 'Frontend' },
  'next.js': { canonical: 'Next.js', category: 'Frontend' },
  nextjs: { canonical: 'Next.js', category: 'Frontend' },
  vue: { canonical: 'Vue.js', category: 'Frontend' },
  angular: { canonical: 'Angular', category: 'Frontend' },
  tailwind: { canonical: 'Tailwind CSS', category: 'Frontend' },
  'node.js': { canonical: 'Node.js', category: 'Backend' },
  nodejs: { canonical: 'Node.js', category: 'Backend' },
  express: { canonical: 'Express.js', category: 'Backend' },
  fastapi: { canonical: 'FastAPI', category: 'Backend' },
  django: { canonical: 'Django', category: 'Backend' },
  spring: { canonical: 'Spring Boot', category: 'Backend' },
  'spring boot': { canonical: 'Spring Boot', category: 'Backend' },
  postgresql: { canonical: 'PostgreSQL', category: 'Database' },
  postgres: { canonical: 'PostgreSQL', category: 'Database' },
  mongodb: { canonical: 'MongoDB', category: 'Database' },
  redis: { canonical: 'Redis', category: 'Database' },
  docker: { canonical: 'Docker', category: 'DevOps & Cloud' },
  kubernetes: { canonical: 'Kubernetes', category: 'DevOps & Cloud' },
  python: { canonical: 'Python', category: 'Programming Language' },
  java: { canonical: 'Java', category: 'Programming Language' },
  typescript: { canonical: 'TypeScript', category: 'Programming Language' },
  javascript: { canonical: 'JavaScript', category: 'Programming Language' },
  go: { canonical: 'Go', category: 'Programming Language' },
  'c++': { canonical: 'C++', category: 'Programming Language' },
  'system design': { canonical: 'System Design', category: 'Architecture' },
  microservices: { canonical: 'Microservices', category: 'Architecture' },
};

function normalizeSkill(raw: string): { canonical: string; category: string } {
  const clean = raw.toLowerCase().trim().replace(/[^a-z0-9.+]/g, '');
  if (SKILL_TAXONOMY[clean]) return SKILL_TAXONOMY[clean];
  for (const [k, v] of Object.entries(SKILL_TAXONOMY)) {
    if (clean === k || clean.includes(k) || k.includes(clean)) return v;
  }
  return {
    canonical: raw.trim().replace(/\b\w/g, (c) => c.toUpperCase()),
    category: 'Technical',
  };
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(['FACULTY', 'TPO', 'INSTITUTE_ADMIN', 'SUPER_ADMIN']);
    const body = await req.json();

    const {
      studentId,
      projectId,
      projectTitle,
      description,
      techStack = [],
      githubUrl,
      liveUrl,
      totalScore = 85,
      rubricScores = {},
      evaluationNotes = '',
    } = body;

    if (!studentId) {
      return NextResponse.json({ error: 'studentId is required' }, { status: 400 });
    }

    const student = await prisma.studentProfile.findUnique({
      where: { id: studentId },
      include: { user: true, projects: true },
    });

    if (!student) {
      return NextResponse.json({ error: 'Student profile not found' }, { status: 404 });
    }

    const score = Math.max(0, Math.min(100, Math.round(Number(totalScore))));
    const confidenceTier = score >= 85 ? 'GOLD_VERIFIED' : 'SILVER_VALIDATED';

    // 1. Update or create StudentProject
    let targetProject = null;
    if (projectId) {
      targetProject = await prisma.studentProject.update({
        where: { id: projectId },
        data: {
          verified: true,
          description: description || undefined,
        },
      });
    } else if (projectTitle) {
      targetProject = await prisma.studentProject.create({
        data: {
          studentProfileId: student.id,
          title: projectTitle.trim(),
          description: description || `Capstone Project evaluated by ${session.name || 'Faculty Member'}.`,
          techStack: Array.isArray(techStack) ? techStack.join(', ') : String(techStack),
          githubUrl: githubUrl || null,
          liveUrl: liveUrl || null,
          verified: true,
        },
      });
    }

    // 2. Parse tech stack into skills to certify
    const rawSkillsList = Array.isArray(techStack)
      ? techStack
      : typeof techStack === 'string'
      ? techStack.split(',').map((s) => s.trim())
      : [];

    if (rawSkillsList.length === 0 && targetProject?.techStack) {
      rawSkillsList.push(...targetProject.techStack.split(',').map((s) => s.trim()));
    }

    const locatorStr = githubUrl || targetProject?.githubUrl || liveUrl || targetProject?.liveUrl || `project:${targetProject?.id || 'eval'}`;
    const rubricDetail = rubricScores && Object.keys(rubricScores).length > 0
      ? ` [Architecture: ${rubricScores.architecture ?? 22}/25, Code: ${rubricScores.codeQuality ?? 23}/25, Demo: ${rubricScores.defense ?? 24}/25]`
      : '';
    const metricStr = `Faculty Rubric Score: ${score}/100${rubricDetail}`;
    const auditStr = evaluationNotes.trim()
      ? `Evaluator: ${session.name || 'Faculty'}. Notes: ${evaluationNotes}`
      : `Faculty-evaluated engineering capstone project '${targetProject?.title || projectTitle || 'Major Project'}' assessed by ${session.name || 'Department Faculty'}.`;

    const generatedProofs: any[] = [];

    // 3. Upsert SkillProof for each technology
    for (const rawTech of rawSkillsList) {
      if (!rawTech) continue;
      const { canonical, category } = normalizeSkill(rawTech);

      const existingProof = await prisma.skillProof.findFirst({
        where: {
          studentProfileId: student.id,
          canonicalSkill: canonical,
        },
      });

      if (existingProof) {
        const updated = await prisma.skillProof.update({
          where: { id: existingProof.id },
          data: {
            confidenceTier: existingProof.confidenceTier === 'GOLD_VERIFIED' ? 'GOLD_VERIFIED' : confidenceTier,
            sourceType: 'EVALUATED_PROJECT (Faculty Rubric)',
            locator: locatorStr,
            metric: metricStr,
            auditNote: auditStr,
            verifiedAt: new Date(),
          },
        });
        generatedProofs.push(updated);
      } else {
        const created = await prisma.skillProof.create({
          data: {
            studentProfileId: student.id,
            canonicalSkill: canonical,
            category,
            confidenceTier,
            sourceType: 'EVALUATED_PROJECT (Faculty Rubric)',
            locator: locatorStr,
            metric: metricStr,
            auditNote: auditStr,
          },
        });
        generatedProofs.push(created);
      }
    }

    // 4. Update student trust score and verifiedSkillsCount
    const totalProofs = await prisma.skillProof.count({
      where: { studentProfileId: student.id },
    });
    const goldCount = await prisma.skillProof.count({
      where: { studentProfileId: student.id, confidenceTier: 'GOLD_VERIFIED' },
    });
    const newTrustScore = Math.min(99, 72 + goldCount * 5 + totalProofs * 2);

    await prisma.studentProfile.update({
      where: { id: student.id },
      data: {
        verifiedSkillsCount: totalProofs,
        trustScore: newTrustScore,
      },
    });

    // 5. Record AuditLog
    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        institutionId: session.institutionId,
        action: 'FACULTY_EVALUATED_PROJECT',
        details: JSON.stringify({
          studentId: student.id,
          studentName: student.user.name,
          projectTitle: targetProject?.title || projectTitle,
          score,
          evaluatorName: session.name,
          evaluatorRole: session.role,
          proofsGenerated: generatedProofs.length,
          timestamp: new Date().toISOString(),
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Capstone project evaluated successfully! Certified ${generatedProofs.length} technical skills for ${student.user.name} (${confidenceTier}).`,
      project: targetProject,
      score,
      trustScore: newTrustScore,
      verifiedProofs: generatedProofs,
    });
  } catch (err: any) {
    console.error('Error in faculty project evaluate route:', err);
    return NextResponse.json(
      { error: err.message || 'Internal error evaluating capstone project' },
      { status: 500 }
    );
  }
}
