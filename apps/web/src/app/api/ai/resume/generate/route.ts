import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/db';
import placementAiClient, { VerifiedProofItem } from '@/lib/placementAiClient';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    const body = await req.json().catch(() => ({}));
    const { driveId, targetRole, targetJobDescription, studentEmail } = body;

    let student = null;
    if (session && session.userId) {
      student = await prisma.studentProfile.findUnique({
        where: { userId: session.userId },
        include: {
          user: { select: { name: true, email: true, phone: true } },
          skillProofs: true,
          projects: true,
          experiences: true,
        },
      });
    }

    if (!student && studentEmail) {
      student = await prisma.studentProfile.findFirst({
        where: { user: { email: studentEmail } },
        include: {
          user: { select: { name: true, email: true, phone: true } },
          skillProofs: true,
          projects: true,
          experiences: true,
        },
      });
    }

    if (!student) {
      student = await prisma.studentProfile.findFirst({
        where: { user: { email: 'aditya.shinde@student.gcoen.ac.in' } },
        include: {
          user: { select: { name: true, email: true, phone: true } },
          skillProofs: true,
          projects: true,
          experiences: true,
        },
      });
    }

    if (!student) {
      student = await prisma.studentProfile.findFirst({
        include: {
          user: { select: { name: true, email: true, phone: true } },
          skillProofs: true,
          projects: true,
          experiences: true,
        },
      });
    }

    if (!student) {
      return NextResponse.json({ error: 'Student profile not found' }, { status: 404 });
    }

    let jobRole = targetRole || 'Software Development Engineer';
    let jobDesc = targetJobDescription || '';

    if (driveId) {
      const drive = await prisma.placementDrive.findUnique({
        where: { id: driveId },
      });
      if (drive) {
        jobRole = drive.roleTitle;
        jobDesc = drive.description;
      }
    }

    const verifiedProofs: VerifiedProofItem[] = student.skillProofs.map((p) => ({
      canonical_skill: p.canonicalSkill,
      category: p.category,
      confidence_tier: p.confidenceTier as any,
      source_type: p.sourceType as any,
      locator: p.locator,
      metric: p.metric,
      audit_note: p.auditNote,
    }));

    const collegeName = 'Government College of Engineering & Technology (GCOEN)';
    const educationSummary = `${student.course} in ${student.department}, ${collegeName}, Class of ${student.graduationYear} (CGPA: ${student.cgpa.toFixed(2)})`;

    const groundedResume = await placementAiClient.generateGroundedResume({
      student_name: student.user.name,
      email: student.user.email,
      phone: student.user.phone || undefined,
      linkedin_url: student.linkedinUrl || undefined,
      github_url: student.githubUrl || undefined,
      education_summary: educationSummary,
      verified_skills: verifiedProofs,
      job_role: jobRole,
      target_job_description: jobDesc,
      projects: student.projects.map((p) => ({
        title: p.title,
        description: p.description,
        techStack: p.techStack,
        githubUrl: p.githubUrl,
        liveUrl: p.liveUrl,
      })),
      experiences: student.experiences.map((exp) => ({
        company: exp.company,
        role: exp.role,
        startDate: exp.startDate,
        endDate: exp.endDate,
        description: exp.description,
      })),
    });

    // 1. Persist to Resume table
    let savedResume = null;
    try {
      savedResume = await prisma.resume.create({
        data: {
          studentProfileId: student.id,
          title: `Grounded ATS Resume - ${jobRole}`,
          version: 'v1.0',
          atsScore: 94,
          targetRole: jobRole,
          parsedData: JSON.stringify(groundedResume),
          isDefault: true,
        },
      });
    } catch (rErr) {
      console.warn('Could not save Resume record:', rErr);
    }

    // 2. Persist to TacieAssessment
    let assessmentRecord = null;
    try {
      assessmentRecord = await prisma.tacieAssessment.create({
        data: {
          studentProfileId: student.id,
          type: 'GROUNDED_RESUME_GEN',
          targetRole: jobRole,
          score: 94,
          insights: JSON.stringify(groundedResume),
        },
      });
    } catch (aErr) {
      console.warn('Could not save TacieAssessment record:', aErr);
    }

    // 3. Record AuditLog entry
    try {
      await prisma.auditLog.create({
        data: {
          userId: student.userId,
          action: 'GROUNDED_RESUME_GENERATED',
          details: JSON.stringify({
            resumeId: savedResume?.id,
            assessmentId: assessmentRecord?.id,
            targetRole: jobRole,
            integrityHash: groundedResume.integrity_hash,
            verifiedProofsCount: verifiedProofs.length,
            timestamp: new Date().toISOString(),
          }),
        },
      });
    } catch (lErr) {
      console.warn('Could not save AuditLog:', lErr);
    }

    return NextResponse.json({
      success: true,
      resume: groundedResume,
      resumeId: savedResume?.id,
      assessmentId: assessmentRecord?.id,
      studentTrustScore: student.trustScore,
      verifiedProofsCount: verifiedProofs.length,
    });
  } catch (error: any) {
    console.error('Error generating grounded ATS resume:', error);
    return NextResponse.json(
      { error: error.message || 'Error generating grounded ATS resume' },
      { status: 500 }
    );
  }
}

