import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/db';
import placementAiClient, { VerifiedProofItem } from '@/lib/placementAiClient';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    const body = await req.json().catch(() => ({}));
    const { resumeText, studentEmail } = body;

    if (!resumeText || typeof resumeText !== 'string' || !resumeText.trim()) {
      return NextResponse.json(
        { error: 'Resume text is required for claims verification audit' },
        { status: 400 }
      );
    }

    // Fetch student's verified skill proofs from database
    let student = null;
    if (session && session.userId) {
      student = await prisma.studentProfile.findUnique({
        where: { userId: session.userId },
        include: { skillProofs: true },
      });
    }

    if (!student && studentEmail) {
      student = await prisma.studentProfile.findFirst({
        where: { user: { email: studentEmail } },
        include: { skillProofs: true },
      });
    }

    if (!student) {
      student = await prisma.studentProfile.findFirst({
        where: { user: { email: 'aditya.shinde@student.gcoen.ac.in' } },
        include: { skillProofs: true },
      });
    }

    if (!student) {
      student = await prisma.studentProfile.findFirst({
        include: { skillProofs: true },
      });
    }

    if (!student) {
      return NextResponse.json({ error: 'Student profile not found' }, { status: 404 });
    }

    const verifiedProofItems: VerifiedProofItem[] = student.skillProofs.map((p) => ({
      canonical_skill: p.canonicalSkill,
      category: p.category,
      confidence_tier: p.confidenceTier as any,
      source_type: p.sourceType as any,
      locator: p.locator,
      metric: p.metric,
      audit_note: p.auditNote,
    }));

    const auditResponse = await placementAiClient.auditResumeClaims({
      resume_text: resumeText,
      verified_skills: verifiedProofItems,
    });

    // 1. Persist the complete audit response to TacieAssessment
    let assessmentRecord = null;
    try {
      assessmentRecord = await prisma.tacieAssessment.create({
        data: {
          studentProfileId: student.id,
          type: 'RESUME_CLAIMS_AUDIT',
          targetRole: body.targetRole || 'Software Development Engineer',
          score: auditResponse.integrity_score,
          insights: JSON.stringify(auditResponse),
        },
      });
    } catch (dbErr) {
      console.warn('Could not save TacieAssessment record:', dbErr);
    }

    // 2. Persist audit telemetry in AuditLog
    try {
      await prisma.auditLog.create({
        data: {
          userId: student.userId,
          action: 'RESUME_CLAIMS_AUDIT',
          details: JSON.stringify({
            assessmentId: assessmentRecord?.id,
            integrityScore: auditResponse.integrity_score,
            canSubmitToDrives: auditResponse.can_submit_to_drives,
            totalClaims: auditResponse.total_claims_detected,
            verifiedCount: auditResponse.verified_count,
            unsubstantiatedCount: auditResponse.unsubstantiated_count,
            flaggedCount: auditResponse.flagged_count,
            timestamp: new Date().toISOString(),
          }),
        },
      });
    } catch (logErr) {
      console.warn('Could not save AuditLog:', logErr);
    }

    return NextResponse.json({
      success: true,
      audit: auditResponse,
      assessmentId: assessmentRecord?.id,
      studentTrustScore: student.trustScore,
      verifiedSkillsCount: student.skillProofs.length,
    });
  } catch (error: any) {
    console.error('Error auditing resume claims:', error);
    return NextResponse.json(
      { error: error.message || 'Error processing resume claims audit' },
      { status: 500 }
    );
  }
}

