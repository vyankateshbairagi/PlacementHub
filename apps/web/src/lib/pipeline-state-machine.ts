import prisma from '@/lib/db';
import { ApplicationStatus, OfferStatus } from '@prisma/client';
import { sendPipelineNotification } from '@/lib/notification-service';

export type RejectionReasonCode =
  | 'OA_SCORE_BELOW_CUTOFF'
  | 'TECHNICAL_ROUND_FEEDBACK'
  | 'SYSTEM_DESIGN_FEEDBACK'
  | 'CULTURE_FIT_HR'
  | 'ROLE_REQUIREMENTS_MISMATCH'
  | 'POSITION_FILLED'
  | 'VOLUNTARY_WITHDRAWAL'
  | 'ACADEMIC_CRITERIA_UNMET'
  | 'OTHER';

export const REJECTION_REASONS: Record<RejectionReasonCode, string> = {
  OA_SCORE_BELOW_CUTOFF: 'Online assessment score did not meet the benchmark cutoff.',
  TECHNICAL_ROUND_FEEDBACK: 'Technical evaluation in core engineering concepts did not meet the role criteria.',
  SYSTEM_DESIGN_FEEDBACK: 'System architecture and engineering depth evaluation did not satisfy requirements.',
  CULTURE_FIT_HR: 'Behavioral or team communication alignment did not meet expectations.',
  ROLE_REQUIREMENTS_MISMATCH: 'Candidate skill profile does not match the specific project requisites.',
  POSITION_FILLED: 'Target recruitment quota for this campus drive has been reached.',
  VOLUNTARY_WITHDRAWAL: 'Candidate withdrew application from this drive.',
  ACADEMIC_CRITERIA_UNMET: 'Institutional academic credentials or backlog policy was not satisfied.',
  OTHER: 'Recruiter or institutional placement cell decision.',
};

// Valid Forward and Branching Pipeline State Transitions
export const ALLOWED_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  APPLIED: [
    ApplicationStatus.SCREENED,
    ApplicationStatus.ASSESSMENT,
    ApplicationStatus.SHORTLISTED,
    ApplicationStatus.REJECTED,
  ],
  SCREENED: [
    ApplicationStatus.ASSESSMENT,
    ApplicationStatus.SHORTLISTED,
    ApplicationStatus.REJECTED,
  ],
  ASSESSMENT: [
    ApplicationStatus.SHORTLISTED,
    ApplicationStatus.INTERVIEW,
    ApplicationStatus.REJECTED,
  ],
  SHORTLISTED: [
    ApplicationStatus.INTERVIEW,
    ApplicationStatus.SELECTED,
    ApplicationStatus.REJECTED,
  ],
  INTERVIEW: [
    ApplicationStatus.INTERVIEW, // Advancing to next round (e.g. Round 1 -> Round 2)
    ApplicationStatus.SELECTED,
    ApplicationStatus.OFFERED,
    ApplicationStatus.REJECTED,
  ],
  SELECTED: [
    ApplicationStatus.OFFERED,
    ApplicationStatus.REJECTED,
  ],
  OFFERED: [
    ApplicationStatus.REJECTED, // In case of offer revocation before acceptance
  ],
  REJECTED: [
    ApplicationStatus.APPLIED, // Only TPO/Admin can reopen on grievance/re-evaluation
    ApplicationStatus.SHORTLISTED,
  ],
};

export interface StageTransitionPayload {
  applicationId: string;
  targetStatus: ApplicationStatus;
  stageNotes?: string;
  rejectionReason?: RejectionReasonCode | string;
  rejectionDetails?: string;
  currentRoundIndex?: number;
  interviewDetails?: {
    roundName: string;
    scheduledAt: string | Date;
    meetingLink?: string;
    interviewerName?: string;
    feedback?: string;
    rating?: number;
  };
  offerDetails?: {
    ctc?: string;
    offerLetterUrl?: string;
    expiresAt?: string;
    joiningLocation?: string;
    expectedJoiningDate?: string;
    ctcBreakdown?: {
      fixedCtc?: string;
      variableCtc?: string;
      joiningBonus?: string;
      stockEsop?: string;
      totalCtc?: string;
    };
  };
  assessmentDetails?: {
    assessmentId?: string;
    score?: number;
    percentile?: number;
  };
}

export function validateStageTransition(
  currentStatus: ApplicationStatus,
  targetStatus: ApplicationStatus,
  userRole: string
): { valid: boolean; error?: string } {
  if (currentStatus === targetStatus && targetStatus !== ApplicationStatus.INTERVIEW) {
    return { valid: true };
  }

  // Only TPO and Super Admin can reopen a REJECTED application
  if (currentStatus === ApplicationStatus.REJECTED) {
    if (userRole !== 'TPO' && userRole !== 'INSTITUTE_ADMIN' && userRole !== 'SUPER_ADMIN') {
      return {
        valid: false,
        error: 'Only College TPO or Placement Admin can reopen a rejected application.',
      };
    }
  }

  const allowed = ALLOWED_TRANSITIONS[currentStatus];
  if (!allowed || !allowed.includes(targetStatus)) {
    return {
      valid: false,
      error: `Invalid stage progression: cannot transition directly from '${currentStatus}' to '${targetStatus}'. Allowed: ${allowed?.join(', ') || 'None'}.`,
    };
  }

  return { valid: true };
}

export async function executeStageTransition(
  params: StageTransitionPayload & {
    sessionUserId: string;
    sessionRole: string;
    sessionInstitutionId?: string | null;
  }
) {
  const {
    applicationId,
    targetStatus,
    stageNotes,
    rejectionReason,
    rejectionDetails,
    currentRoundIndex,
    interviewDetails,
    offerDetails,
    assessmentDetails,
    sessionUserId,
    sessionRole,
    sessionInstitutionId,
  } = params;

  // 1. Fetch application with drive, student, and institution
  const application = await prisma.jobApplication.findUnique({
    where: { id: applicationId },
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
      interviews: { orderBy: { scheduledAt: 'asc' } },
      offer: true,
    },
  });

  if (!application) {
    throw new Error('Application not found.');
  }

  // 2. Authorization validation
  if (sessionRole === 'STUDENT') {
    throw new Error('Candidates are not authorized to modify application pipeline stages.');
  }

  if (sessionRole === 'RECRUITER') {
    const recruiterProfile = await prisma.recruiterProfile.findUnique({
      where: { userId: sessionUserId },
    });
    if (!recruiterProfile || (application.drive?.recruiterId && application.drive.recruiterId !== recruiterProfile.id)) {
      throw new Error('Forbidden: You can only transition candidates for your own placement drives.');
    }
  } else if (sessionRole === 'TPO' || sessionRole === 'INSTITUTE_ADMIN') {
    if (
      application.drive?.institutionId &&
      sessionInstitutionId &&
      application.drive.institutionId !== sessionInstitutionId
    ) {
      throw new Error('Forbidden: Cross-institution application management is not allowed.');
    }
  }

  // 3. State machine validation
  const validation = validateStageTransition(application.status, targetStatus, sessionRole);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid stage transition.');
  }

  // 4. Validate rejection reason when moving to REJECTED
  let resolvedRejectionNote = stageNotes || application.stageNotes || '';
  if (targetStatus === ApplicationStatus.REJECTED) {
    const reasonText = rejectionReason
      ? REJECTION_REASONS[rejectionReason as RejectionReasonCode] || rejectionReason
      : 'Application review concluded';
    const detailText = rejectionDetails?.trim() ? ` - ${rejectionDetails.trim()}` : '';
    resolvedRejectionNote = `[REJECTED: ${reasonText}${detailText}] ${stageNotes?.trim() || ''}`.trim();
  }

  // 5. Build update payload
  const updateData: any = {
    status: targetStatus,
    stageNotes: resolvedRejectionNote,
    updatedAt: new Date(),
  };

  if (typeof currentRoundIndex === 'number') {
    updateData.currentRoundIndex = currentRoundIndex;
  }

  // 6. Execute atomic transaction
  const result = await prisma.$transaction(async (tx) => {
    // 6.1 Update Application status
    const updatedApp = await tx.jobApplication.update({
      where: { id: applicationId },
      data: updateData,
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
        interviews: { orderBy: { scheduledAt: 'asc' } },
        offer: true,
      },
    });

    // 6.2 Handle Interview Schedule Linkage
    let createdInterview = null;
    if (targetStatus === ApplicationStatus.INTERVIEW && interviewDetails) {
      const scheduledDate = new Date(interviewDetails.scheduledAt);
      createdInterview = await tx.interviewSchedule.create({
        data: {
          applicationId,
          roundName: interviewDetails.roundName || `Round ${(updatedApp.currentRoundIndex || 0) + 1}`,
          scheduledAt: Number.isNaN(scheduledDate.getTime()) ? new Date(Date.now() + 86400000 * 2) : scheduledDate,
          meetingLink: interviewDetails.meetingLink || 'https://meet.google.com/careeros-interview',
          interviewerName: interviewDetails.interviewerName || 'Technical Interview Panel',
          feedback: interviewDetails.feedback || null,
          rating: interviewDetails.rating || null,
          status: 'SCHEDULED',
        },
      });

      // Update current round index on application
      await tx.jobApplication.update({
        where: { id: applicationId },
        data: { currentRoundIndex: (updatedApp.currentRoundIndex || 0) + 1 },
      });
    }

    // 6.3 Handle Offer Creation
    let createdOffer = null;
    if (targetStatus === ApplicationStatus.OFFERED) {
      const offeredCtc = offerDetails?.ctc?.trim() || updatedApp.drive?.ctc || 'Competitive CTC';
      createdOffer = await tx.jobOffer.upsert({
        where: { applicationId },
        create: {
          applicationId,
          studentProfileId: updatedApp.studentProfileId,
          companyName: updatedApp.drive?.companyName || 'Company',
          roleTitle: updatedApp.drive?.roleTitle || 'Job Role',
          ctc: offeredCtc,
          offerLetterUrl: offerDetails?.offerLetterUrl?.trim() || null,
          status: OfferStatus.PENDING, // Strictly PENDING until student accepts!
        },
        update: {
          ctc: offeredCtc,
          offerLetterUrl: offerDetails?.offerLetterUrl?.trim() || undefined,
        },
      });

      if (createdOffer) {
        const expiryDate = offerDetails?.expiresAt
          ? new Date(offerDetails.expiresAt).toISOString()
          : new Date(Date.now() + 7 * 86400000).toISOString();

        await tx.auditLog.create({
          data: {
            userId: sessionUserId,
            institutionId: updatedApp.drive?.institutionId || sessionInstitutionId || null,
            action: 'JOB_OFFER_EXTENDED_METADATA',
            details: JSON.stringify({
              offerId: createdOffer.id,
              metadata: {
                expiresAt: expiryDate,
                joiningDetails: {
                  joiningStatus: 'NOT_JOINED',
                  joiningLocation: offerDetails?.joiningLocation || updatedApp.drive?.location || 'Remote',
                  expectedJoiningDate: offerDetails?.expectedJoiningDate,
                },
                packageProof: {
                  proofDocumentUrl: offerDetails?.offerLetterUrl || '',
                  fixedCtc: offerDetails?.ctcBreakdown?.fixedCtc || offeredCtc,
                  variableCtc: offerDetails?.ctcBreakdown?.variableCtc || '',
                  joiningBonus: offerDetails?.ctcBreakdown?.joiningBonus || '',
                  stockEsop: offerDetails?.ctcBreakdown?.stockEsop || '',
                  totalCtc: offerDetails?.ctcBreakdown?.totalCtc || offeredCtc,
                  status: 'UNSUBMITTED',
                },
              },
              savedAt: new Date().toISOString(),
            }),
          },
        });
      }
    }

    // 6.4 Write AuditLog for transition
    await tx.auditLog.create({
      data: {
        userId: sessionUserId,
        institutionId: updatedApp.drive?.institutionId || sessionInstitutionId || null,
        action: 'APPLICATION_STAGE_TRANSITION',
        details: JSON.stringify({
          applicationId,
          fromStatus: application.status,
          toStatus: targetStatus,
          studentId: updatedApp.studentProfileId,
          studentName: updatedApp.studentProfile.user.name,
          companyName: updatedApp.drive?.companyName || 'Company',
          rejectionReason: rejectionReason || null,
          interviewRound: interviewDetails?.roundName || null,
        }),
      },
    });

    return {
      application: updatedApp,
      interview: createdInterview,
      offer: createdOffer,
    };
  });

  // 7. Dispatch Notification to the Student
  const studentUser = application.studentProfile.user;
  const companyName = application.drive?.companyName || 'Company';
  const roleTitle = application.drive?.roleTitle || 'Job Role';
  let notifTitle = `Application Status Update: ${companyName}`;
  let notifMessage = `Your application for ${roleTitle} at ${companyName} has moved to ${targetStatus}.`;
  let notifType: any = 'APPLICATION_STAGE';

  if (targetStatus === ApplicationStatus.SHORTLISTED) {
    notifTitle = `Congratulations! Shortlisted by ${companyName}`;
    notifMessage = `You have been shortlisted for ${roleTitle} at ${companyName}! Keep your evidence profile ready.`;
  } else if (targetStatus === ApplicationStatus.INTERVIEW) {
    notifType = 'INTERVIEW_SCHEDULED';
    notifTitle = `Interview Scheduled: ${companyName}`;
    notifMessage = `An interview round (${interviewDetails?.roundName || 'Technical Round'}) has been scheduled for ${roleTitle}. Check your dashboard for the schedule and meeting link.`;
  } else if (targetStatus === ApplicationStatus.ASSESSMENT) {
    notifType = 'ASSESSMENT_ASSIGNED';
    notifTitle = `Assessment Assigned: ${companyName}`;
    notifMessage = `Online Qualifier Assessment unlocked for ${companyName}. Launch your simulator in the Coding Hub before the deadline.`;
  } else if (targetStatus === ApplicationStatus.OFFERED) {
    notifType = 'OFFER_RECEIVED';
    notifTitle = `Official Offer Letter: ${companyName}`;
    notifMessage = `Congratulations! You have received an employment offer from ${companyName} for the role of ${roleTitle}. Review and accept your offer in the Offers portal.`;
  } else if (targetStatus === ApplicationStatus.REJECTED) {
    notifType = 'APPLICATION_REJECTED';
    notifTitle = `Application Update: ${companyName}`;
    const reasonText = rejectionReason
      ? REJECTION_REASONS[rejectionReason as RejectionReasonCode] || rejectionReason
      : 'Review concluded';
    notifMessage = `Your application for ${roleTitle} at ${companyName} was not moved forward. Feedback: ${reasonText}.`;
  }

  await sendPipelineNotification({
    userId: studentUser.id,
    userEmail: studentUser.email,
    userName: studentUser.name,
    institutionId: application.drive?.institutionId || sessionInstitutionId || null,
    type: notifType,
    title: notifTitle,
    message: notifMessage,
    metadata: {
      applicationId: application.id,
      driveId: application.driveId || undefined,
      companyName,
      roleTitle,
      newStatus: targetStatus,
      rejectionReason: rejectionReason || undefined,
      meetingLink: interviewDetails?.meetingLink,
      scheduledAt: interviewDetails?.scheduledAt ? new Date(interviewDetails.scheduledAt).toISOString() : undefined,
      roundName: interviewDetails?.roundName,
      ctc: offerDetails?.ctc,
    },
  });

  return result;
}
