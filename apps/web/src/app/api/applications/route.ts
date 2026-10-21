import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireSession } from '@/lib/auth';
import { authErrorResponse } from '@/lib/auth-http';
import {
  evaluateEligibility,
  computeFitScoreAndProofSummary,
  toSafeApplicationDto,
} from '@/lib/drive-service';
import { ApplicationStatus, OfferStatus } from '@prisma/client';
import { executeStageTransition } from '@/lib/pipeline-state-machine';
import placementAiClient, { VerifiedProofItem } from '@/lib/placementAiClient';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(request.url);
    const driveId = searchParams.get('driveId');
    const statusParam = searchParams.get('status');

    const where: any = {};
    if (driveId) where.driveId = driveId;
    if (statusParam && statusParam !== 'ALL') {
      where.status = statusParam as ApplicationStatus;
    }

    if (session.role === 'STUDENT') {
      // Identity derived strictly from authenticated session
      const studentProfile = await prisma.studentProfile.findUnique({
        where: { userId: session.userId },
        select: { id: true },
      });
      if (!studentProfile) {
        return NextResponse.json({ success: true, count: 0, applications: [] });
      }
      where.studentProfileId = studentProfile.id;
    } else if (session.role === 'RECRUITER') {
      const recruiterProfile = await prisma.recruiterProfile.findUnique({
        where: { userId: session.userId },
        select: { id: true },
      });
      if (!recruiterProfile) {
        return NextResponse.json({ success: true, count: 0, applications: [] });
      }
      where.drive = { recruiterId: recruiterProfile.id };
      if (driveId) {
        where.driveId = driveId;
      }
    } else if (session.role === 'TPO' || session.role === 'INSTITUTE_ADMIN' || session.role === 'FACULTY') {
      if (session.institutionId) {
        where.drive = { institutionId: session.institutionId };
      }
    }
    // SUPER_ADMIN has global query access

    const applications = await prisma.jobApplication.findMany({
      where,
      include: {
        drive: {
          include: {
            institution: { select: { id: true, name: true, logoUrl: true, city: true } },
          },
        },
        studentProfile: {
          include: {
            user: { select: { id: true, name: true, email: true, avatarUrl: true } },
          },
        },
        interviews: { orderBy: { scheduledAt: 'asc' } },
        offer: true,
      },
      orderBy: { appliedAt: 'desc' },
      take: 200,
    });

    const safeApplications = applications.map(toSafeApplicationDto);

    return NextResponse.json({
      success: true,
      count: safeApplications.length,
      applications: safeApplications,
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession(['STUDENT']);
    const body = await request.json();
    const { driveId } = body;

    if (!driveId) {
      return NextResponse.json(
        { success: false, error: 'Drive ID is required.' },
        { status: 400 }
      );
    }

    // Identity derived directly from verified session - browser email/studentId ignored
    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId: session.userId },
      include: {
        user: { include: { institution: true } },
        offers: { where: { status: 'ACCEPTED' } },
        skillProofs: true,
      },
    });

    if (!studentProfile) {
      return NextResponse.json(
        { success: false, error: 'Student profile not found. Please complete profile setup first.' },
        { status: 404 }
      );
    }

    // Check existing application
    const existing = await prisma.jobApplication.findFirst({
      where: {
        studentProfileId: studentProfile.id,
        driveId,
      },
    });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: `You have already applied for this placement drive (Status: ${existing.status}).`,
        },
        { status: 400 }
      );
    }

    // Fetch drive details to verify eligibility & institutional policy
    const drive = await prisma.placementDrive.findUnique({
      where: { id: driveId },
      include: { institution: true },
    });

    if (!drive) {
      return NextResponse.json(
        { success: false, error: 'Placement drive not found.' },
        { status: 404 }
      );
    }

    // --- Strict Eligibility & Policy Evaluation ---
    const eligibility = evaluateEligibility({
      student: {
        id: studentProfile.id,
        department: studentProfile.department,
        cgpa: studentProfile.cgpa,
        backlogsCount: studentProfile.backlogsCount,
        placementStatus: studentProfile.placementStatus,
        institutionId: studentProfile.user.institutionId,
        offers: studentProfile.offers,
      },
      drive: {
        id: drive.id,
        jobType: drive.jobType,
        status: drive.status,
        deadline: drive.deadline,
        minCgpa: drive.minCgpa,
        maxBacklogs: drive.maxBacklogs,
        eligibleBranches: drive.eligibleBranches,
        ctcAmount: drive.ctcAmount,
        ctc: drive.ctc,
        isDreamCompany: drive.isDreamCompany,
        isSuperDream: drive.isSuperDream,
        institutionId: drive.institutionId,
      },
      institution: drive.institution || studentProfile.user.institution,
    });

    if (!eligibility.isEligible) {
      return NextResponse.json(
        {
          success: false,
          error: eligibility.reasons[0] || 'You do not meet the eligibility requirements for this drive.',
          reasons: eligibility.reasons,
          criteria: eligibility.criteria,
        },
        { status: 400 }
      );
    }

    // --- Verify Resume Truthfulness & Enforce False/Unsupported Claims Policy Block ---
    // 1. Fetch active or latest default resume
    let activeResume = await prisma.resume.findFirst({
      where: { studentProfileId: studentProfile.id, isDefault: true },
      orderBy: { updatedAt: 'desc' },
    });

    if (!activeResume) {
      activeResume = await prisma.resume.findFirst({
        where: { studentProfileId: studentProfile.id },
        orderBy: { updatedAt: 'desc' },
      });
    }

    if (!activeResume) {
      return NextResponse.json(
        {
          success: false,
          applicationBlocked: true,
          error: 'Application Blocked: Institutional placement policy requires an uploaded, evidence-audited resume before applying to campus placement drives. Please upload your resume in the Resume Studio.',
          reasons: ['No verified resume uploaded for your profile.'],
        },
        { status: 400 }
      );
    }

    // 2. Check profile-level flagged claims
    const flaggedProofs = (studentProfile.skillProofs || []).filter(
      (p) => p.confidenceTier === 'FLAGGED_FALSE'
    );
    if (flaggedProofs.length > 0) {
      const flaggedList = flaggedProofs.map((p) => p.canonicalSkill);
      return NextResponse.json(
        {
          success: false,
          applicationBlocked: true,
          error: `Application Blocked: Institutional verification audit disproved skill claims (${flaggedList.join(', ')}) in your profile. Applications to campus placement drives are locked until these flagged claims are cleared by your TPO.`,
          flaggedClaims: flaggedList,
        },
        { status: 400 }
      );
    }

    // 3. Parse active resume data and ensure claims audit is present
    let parsed: any = null;
    try {
      if (activeResume.parsedData) {
        parsed = JSON.parse(activeResume.parsedData);
      }
    } catch (parseErr) {
      console.warn('Error parsing activeResume.parsedData:', parseErr);
    }

    if (!parsed || !parsed.claimsAudit) {
      const verifiedProofItems: VerifiedProofItem[] = (studentProfile.skillProofs || []).map((p) => ({
        canonical_skill: p.canonicalSkill,
        category: p.category,
        confidence_tier: p.confidenceTier as any,
        source_type: p.sourceType as any,
        locator: p.locator,
        metric: p.metric,
        audit_note: p.auditNote,
      }));

      const auditText = [
        activeResume.title,
        activeResume.targetRole,
        parsed?.summary,
        ...(parsed?.skills?.flatMap((s: any) => s.items) || []),
        ...(parsed?.projects?.map((p: any) => `${p.title} ${p.techStack?.join(' ')} ${p.description}`) || []),
      ].filter(Boolean).join('\n');

      let claimsAudit: any = null;
      try {
        claimsAudit = await placementAiClient.auditResumeClaims({
          resume_text: auditText.length > 20 ? auditText : (activeResume.targetRole || 'Software Development Engineer'),
          verified_skills: verifiedProofItems,
        });
      } catch (auditErr) {
        console.warn('On-the-fly claims audit failed, falling back:', auditErr);
      }

      if (!claimsAudit) {
        claimsAudit = placementAiClient.fallbackAuditResumeClaims({
          resume_text: auditText.length > 20 ? auditText : (activeResume.targetRole || 'Software Development Engineer'),
          verified_skills: verifiedProofItems,
        });
      }

      if (!parsed) parsed = {};
      parsed.claimsAudit = claimsAudit;
      parsed.application_blocked = Boolean(claimsAudit.application_blocked);
      parsed.block_reason = claimsAudit.block_reason || null;
      parsed.integrity_score = claimsAudit.integrity_score;

      try {
        await prisma.resume.update({
          where: { id: activeResume.id },
          data: { parsedData: JSON.stringify(parsed) },
        });
      } catch (dbUpdateErr) {
        console.warn('Could not persist updated claimsAudit to resume:', dbUpdateErr);
      }
    }

    // 4. Enforce Resume Claims Policy Blocking
    const audit = parsed?.claimsAudit;
    const isExplicitlyBlocked =
      parsed?.application_blocked === true ||
      parsed?.can_submit_to_drives === false ||
      audit?.application_blocked === true ||
      audit?.can_submit_to_drives === false ||
      (audit?.flagged_count && audit.flagged_count > 0) ||
      (audit?.audited_claims && audit.audited_claims.some((c: any) => c.status === 'FLAGGED_FALSE')) ||
      (audit?.integrity_score !== undefined && audit.integrity_score < 40);

    if (isExplicitlyBlocked) {
      const flaggedClaimsList = (audit?.audited_claims || [])
        .filter((c: any) => c.status === 'FLAGGED_FALSE')
        .map((c: any) => c.claim_text);

      const blockReason =
        parsed?.block_reason ||
        audit?.block_reason ||
        `Application Blocked: Your resume contains ${flaggedClaimsList.length > 0 ? flaggedClaimsList.length : 'flagged'} unverified or contradictory technical claim(s). Institutional placement policy requires resolving flagged claims before applying to placement drives.`;

      return NextResponse.json(
        {
          success: false,
          applicationBlocked: true,
          error: blockReason,
          reasons: [blockReason],
          claimsAudit: audit || null,
          flaggedClaims: flaggedClaimsList,
          integrityScore: audit?.integrity_score ?? 0,
        },
        { status: 400 }
      );
    }

    // 5. Enforce Drive-Required Skills Substantiation
    let driveRequiredSkills: string[] = [];
    try {
      driveRequiredSkills = Array.isArray(drive.requiredSkills)
        ? drive.requiredSkills
        : JSON.parse(drive.requiredSkills || '[]');
    } catch {
      driveRequiredSkills = [];
    }

    if (driveRequiredSkills.length > 0) {
      const verifiedSkillsLower = new Set(
        (studentProfile.skillProofs || [])
          .filter((p) => ['GOLD_VERIFIED', 'SILVER_VALIDATED'].includes(p.confidenceTier))
          .map((p) => p.canonicalSkill.toLowerCase())
      );

      const unsupportedRequired = driveRequiredSkills.filter((reqSkill) => {
        const reqLower = reqSkill.toLowerCase();
        if (verifiedSkillsLower.has(reqLower)) return false;

        const claimedOnResume = (audit?.audited_claims || []).some(
          (c: any) =>
            ((c.claim_text && c.claim_text.toLowerCase().includes(reqLower)) ||
             (c.raw_claim && c.raw_claim.toLowerCase().includes(reqLower))) &&
            c.status === 'UNSUBSTANTIATED'
        );
        return claimedOnResume;
      });

      if (unsupportedRequired.length > 0 && (audit?.integrity_score ?? 100) < 65) {
        const unsupportedMsg = `Application Blocked: Drive requires verified competencies in [${unsupportedRequired.join(', ')}]. Your resume claims for these skills are unsupported by verifiable proof artifacts in your evidence registry.`;
        return NextResponse.json(
          {
            success: false,
            applicationBlocked: true,
            error: unsupportedMsg,
            reasons: [unsupportedMsg],
            claimsAudit: audit || null,
            unsupportedRequiredSkills: unsupportedRequired,
            integrityScore: audit?.integrity_score ?? 0,
          },
          { status: 400 }
        );
      }
    }

    // Calculate match score and verified proof summary
    const { fitScore, matchTier, proofSummary } = computeFitScoreAndProofSummary(
      { skillProofs: studentProfile.skillProofs, trustScore: studentProfile.trustScore },
      { requiredSkills: drive.requiredSkills, preferredSkills: drive.preferredSkills }
    );

    const application = await prisma.jobApplication.create({
      data: {
        studentProfileId: studentProfile.id,
        driveId,
        status: ApplicationStatus.APPLIED,
        fitScore,
        matchTier,
        verifiedProofSummary: proofSummary,
        stageNotes: 'Application submitted via CareerOS Evidence-Backed 1-Click Apply.',
      },
      include: {
        drive: {
          include: {
            institution: { select: { id: true, name: true, logoUrl: true, city: true } },
          },
        },
        studentProfile: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    // Write audit log
    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        institutionId: drive.institutionId || session.institutionId,
        action: 'SUBMIT_JOB_APPLICATION',
        details: JSON.stringify({
          applicationId: application.id,
          driveId,
          companyName: drive.companyName,
          roleTitle: drive.roleTitle,
          fitScore,
          matchTier,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Application submitted successfully for ${drive.roleTitle} at ${drive.companyName}!`,
      application: toSafeApplicationDto(application),
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireSession(['TPO', 'INSTITUTE_ADMIN', 'RECRUITER', 'SUPER_ADMIN']);
    const body = await request.json();
    const {
      applicationId,
      status,
      stageNotes,
      rejectionReason,
      rejectionDetails,
      currentRoundIndex,
      interviewDetails,
      offerDetails,
      assessmentDetails,
    } = body;

    if (!applicationId) {
      return NextResponse.json(
        { success: false, error: 'Application ID is required.' },
        { status: 400 }
      );
    }

    if (!status) {
      return NextResponse.json(
        { success: false, error: 'Target status is required.' },
        { status: 400 }
      );
    }

    const result = await executeStageTransition({
      applicationId,
      targetStatus: status as ApplicationStatus,
      stageNotes,
      rejectionReason,
      rejectionDetails,
      currentRoundIndex,
      interviewDetails,
      offerDetails,
      assessmentDetails,
      sessionUserId: session.userId,
      sessionRole: session.role,
      sessionInstitutionId: session.institutionId,
    });

    return NextResponse.json({
      success: true,
      message: `Candidate stage moved to ${status}.`,
      application: toSafeApplicationDto(result.application),
      interview: result.interview,
      offer: result.offer,
    });
  } catch (error: any) {
    if (
      error?.message &&
      (error.message.includes('Forbidden') ||
        error.message.includes('Invalid stage progression') ||
        error.message.includes('Application not found'))
    ) {
      const status = error.message.includes('Forbidden')
        ? 403
        : error.message.includes('Application not found')
        ? 404
        : 400;
      return NextResponse.json({ success: false, error: error.message }, { status });
    }
    return authErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(request.url);
    const applicationId = searchParams.get('id') || searchParams.get('applicationId');

    if (!applicationId) {
      return NextResponse.json(
        { success: false, error: 'Application ID is required.' },
        { status: 400 }
      );
    }

    const application = await prisma.jobApplication.findUnique({
      where: { id: applicationId },
      include: {
        drive: true,
        studentProfile: true,
      },
    });

    if (!application) {
      return NextResponse.json(
        { success: false, error: 'Application not found.' },
        { status: 404 }
      );
    }

    // Permission check
    if (session.role === 'STUDENT') {
      if (application.studentProfile.userId !== session.userId) {
        return NextResponse.json({ success: false, error: 'Forbidden.' }, { status: 403 });
      }
      // Check if withdrawal is permitted
      if (application.status === 'OFFERED' || application.status === 'SELECTED') {
        return NextResponse.json(
          {
            success: false,
            error: 'You cannot withdraw an application after being selected or offered. Please contact your College TPO.',
          },
          { status: 400 }
        );
      }
    } else if (session.role === 'RECRUITER') {
      const recruiterProfile = await prisma.recruiterProfile.findUnique({
        where: { userId: session.userId },
      });
      if (!recruiterProfile || (application.drive?.recruiterId && application.drive.recruiterId !== recruiterProfile.id)) {
        return NextResponse.json({ success: false, error: 'Forbidden.' }, { status: 403 });
      }
    } else if (session.role === 'TPO' || session.role === 'INSTITUTE_ADMIN') {
      if (application.drive?.institutionId && application.drive.institutionId !== session.institutionId) {
        return NextResponse.json({ success: false, error: 'Forbidden.' }, { status: 403 });
      }
    }

    // Delete application
    await prisma.jobApplication.delete({ where: { id: applicationId } });

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        institutionId: application.drive?.institutionId || session.institutionId || null,
        action: 'WITHDRAW_JOB_APPLICATION',
        details: JSON.stringify({
          applicationId,
          driveId: application.driveId,
          companyName: application.drive?.companyName || 'Company',
          roleTitle: application.drive?.roleTitle || 'Job Role',
          withdrawnByRole: session.role,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Application for ${application.drive?.companyName || 'the position'} withdrawn successfully.`,
      applicationId,
      driveId: application.driveId,
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
