import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email') || searchParams.get('studentEmail');

    let student = null;
    if (session && session.userId) {
      student = await prisma.studentProfile.findUnique({
        where: { userId: session.userId },
        include: { user: true },
      });
    }

    if (!student && email) {
      student = await prisma.studentProfile.findFirst({
        where: { user: { email: { equals: email, mode: 'insensitive' } } },
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
      return NextResponse.json({ error: 'Student profile not found' }, { status: 404 });
    }

    // 1. Fetch assessments
    const assessments = await prisma.tacieAssessment.findMany({
      where: { studentProfileId: student.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const parsedAssessments = assessments.map((a) => {
      let parsedInsights = null;
      try {
        parsedInsights = JSON.parse(a.insights);
      } catch {
        parsedInsights = a.insights;
      }
      return {
        id: a.id,
        type: a.type,
        targetRole: a.targetRole,
        score: a.score,
        createdAt: a.createdAt,
        insights: parsedInsights,
      };
    });

    // 2. Fetch resumes
    const resumes = await prisma.resume.findMany({
      where: { studentProfileId: student.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const parsedResumes = resumes.map((r) => {
      let parsedData = null;
      try {
        parsedData = JSON.parse(r.parsedData || '{}');
      } catch {
        parsedData = null;
      }
      return {
        id: r.id,
        title: r.title,
        version: r.version,
        atsScore: r.atsScore,
        targetRole: r.targetRole,
        isDefault: r.isDefault,
        createdAt: r.createdAt,
        data: parsedData,
      };
    });

    // 3. Fetch audit logs
    const auditLogs = await prisma.auditLog.findMany({
      where: { userId: student.userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const parsedLogs = auditLogs.map((l) => {
      let details = null;
      try {
        details = JSON.parse(l.details);
      } catch {
        details = l.details;
      }
      return {
        id: l.id,
        action: l.action,
        createdAt: l.createdAt,
        details,
      };
    });

    return NextResponse.json({
      success: true,
      assessments: parsedAssessments,
      resumes: parsedResumes,
      auditLogs: parsedLogs,
      studentName: student.user.name,
      trustScore: student.trustScore,
    });
  } catch (error: any) {
    console.error('Error fetching AI history:', error);
    return NextResponse.json(
      { error: error.message || 'Error fetching AI tracking history' },
      { status: 500 }
    );
  }
}
