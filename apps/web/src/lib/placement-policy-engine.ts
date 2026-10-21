import prisma from '@/lib/db';
import { ApplicationStatus, OfferStatus, PlacementStatus } from '@prisma/client';
import { parseCtcAmount } from '@/lib/drive-service';

export type PlacementTier = 'REGULAR' | 'DREAM' | 'SUPER_DREAM';

export interface PolicyEvaluationResult {
  allowed: boolean;
  tier: PlacementTier;
  reason?: string;
  isUpgrade: boolean;
  supersededOfferId?: string;
  supersededCompanyName?: string;
}

export interface PolicyReconciliationSummary {
  acceptedOfferId: string;
  studentId: string;
  tier: PlacementTier;
  isUpgrade: boolean;
  supersededOffer?: {
    id: string;
    companyName: string;
    ctc: string;
  };
  autoWithdrawnApplications: {
    applicationId: string;
    companyName: string;
    roleTitle: string;
    tier: PlacementTier;
  }[];
  policyRuleApplied: string;
  reconciledAt: string;
}

/**
 * Classifies an offer or drive into REGULAR, DREAM, or SUPER_DREAM tier based on institutional thresholds
 */
export function classifyOfferTier(
  ctcAmount: number,
  institution?: {
    dreamOfferThreshold?: number | null;
    superDreamThreshold?: number | null;
  } | null
): PlacementTier {
  const dreamCutoff = institution?.dreamOfferThreshold ?? 10.0;
  const superDreamCutoff = institution?.superDreamThreshold ?? 20.0;

  if (ctcAmount >= superDreamCutoff) {
    return 'SUPER_DREAM';
  }
  if (ctcAmount >= dreamCutoff) {
    return 'DREAM';
  }
  return 'REGULAR';
}

const TIER_RANK: Record<PlacementTier, number> = {
  REGULAR: 1,
  DREAM: 2,
  SUPER_DREAM: 3,
};

/**
 * Evaluates whether a student can accept an offer according to their institution's placement policy.
 */
export async function evaluateOfferAcceptanceEligibility(
  studentProfileId: string,
  candidateOffer: {
    id: string;
    ctc: string;
    companyName: string;
  }
): Promise<PolicyEvaluationResult> {
  const student = await prisma.studentProfile.findUnique({
    where: { id: studentProfileId },
    include: {
      user: {
        include: {
          institution: true,
        },
      },
      offers: {
        where: {
          status: OfferStatus.ACCEPTED,
        },
        include: {
          application: {
            include: {
              drive: true,
            },
          },
        },
      },
    },
  });

  if (!student) {
    return {
      allowed: false,
      tier: 'REGULAR',
      reason: 'Student profile not found.',
      isUpgrade: false,
    };
  }

  const institution = student.user.institution;
  const candidateCtcAmount = parseCtcAmount(candidateOffer.ctc);
  const candidateTier = classifyOfferTier(candidateCtcAmount, institution);

  const acceptedOffers = student.offers || [];

  // Case 1: Student has no accepted offers yet -> Fully allowed!
  if (acceptedOffers.length === 0) {
    return {
      allowed: true,
      tier: candidateTier,
      isUpgrade: false,
    };
  }

  // Case 2: Student already holds accepted offer(s)
  // Find highest tier currently held
  let highestHeldTier: PlacementTier = 'REGULAR';
  let primaryAcceptedOffer = acceptedOffers[0];

  for (const offer of acceptedOffers) {
    const offerCtcAmount = parseCtcAmount(offer.ctc);
    const tier = classifyOfferTier(offerCtcAmount, institution);
    if (TIER_RANK[tier] > TIER_RANK[highestHeldTier]) {
      highestHeldTier = tier;
      primaryAcceptedOffer = offer;
    }
  }

  // Check upgrade policy
  const candidateRank = TIER_RANK[candidateTier];
  const highestHeldRank = TIER_RANK[highestHeldTier];

  if (highestHeldTier === 'SUPER_DREAM') {
    return {
      allowed: false,
      tier: candidateTier,
      isUpgrade: false,
      reason: `Institutional policy restriction: Candidate has already secured a Super Dream offer with ${primaryAcceptedOffer.companyName} (${primaryAcceptedOffer.ctc}). No further offers can be accepted.`,
    };
  }

  if (candidateRank <= highestHeldRank) {
    return {
      allowed: false,
      tier: candidateTier,
      isUpgrade: false,
      reason: `Institutional policy restriction: Candidate already holds an accepted ${highestHeldTier} offer with ${primaryAcceptedOffer.companyName} (${primaryAcceptedOffer.ctc}). Under campus policy, candidates may only accept higher-tier upgrade offers (${
        highestHeldTier === 'REGULAR' ? 'Dream [≥ ₹10 LPA] or Super Dream [≥ ₹20 LPA]' : 'Super Dream [≥ ₹20 LPA]'
      }).`,
    };
  }

  // It's a valid policy upgrade! (e.g. REGULAR -> DREAM, or REGULAR/DREAM -> SUPER_DREAM)
  return {
    allowed: true,
    tier: candidateTier,
    isUpgrade: true,
    supersededOfferId: primaryAcceptedOffer.id,
    supersededCompanyName: primaryAcceptedOffer.companyName,
  };
}

/**
 * Reconciles student placement status, supersedes lower-tier offers if upgrading,
 * and auto-withdraws ineligible pending applications across other drives.
 */
export async function reconcilePlacementPolicyOnAcceptance(
  tx: any,
  params: {
    studentProfileId: string;
    acceptedOfferId: string;
    sessionUserId: string;
  }
): Promise<PolicyReconciliationSummary> {
  const { studentProfileId, acceptedOfferId, sessionUserId } = params;

  // 1. Fetch target offer and student
  const offer = await tx.jobOffer.findUnique({
    where: { id: acceptedOfferId },
    include: {
      application: {
        include: {
          drive: {
            include: {
              institution: true,
            },
          },
        },
      },
      studentProfile: {
        include: {
          user: {
            include: {
              institution: true,
            },
          },
        },
      },
    },
  });

  if (!offer) {
    throw new Error('Offer record not found.');
  }

  const institution = offer.studentProfile.user.institution || offer.application.drive.institution;
  const ctcAmount = parseCtcAmount(offer.ctc);
  const tier = classifyOfferTier(ctcAmount, institution);

  // 2. Mark this offer as ACCEPTED
  await tx.jobOffer.update({
    where: { id: acceptedOfferId },
    data: {
      status: OfferStatus.ACCEPTED,
    },
  });

  // 3. Mark the student as PLACED
  await tx.studentProfile.update({
    where: { id: studentProfileId },
    data: {
      placementStatus: PlacementStatus.PLACED,
    },
  });

  // 4. Supersede any existing lower accepted offers
  const existingAcceptedOffers = await tx.jobOffer.findMany({
    where: {
      studentProfileId,
      status: OfferStatus.ACCEPTED,
      id: { not: acceptedOfferId },
    },
  });

  let supersededOfferInfo: PolicyReconciliationSummary['supersededOffer'] = undefined;

  for (const prevOffer of existingAcceptedOffers) {
    await tx.jobOffer.update({
      where: { id: prevOffer.id },
      data: {
        status: OfferStatus.DECLINED,
      },
    });

    supersededOfferInfo = {
      id: prevOffer.id,
      companyName: prevOffer.companyName,
      ctc: prevOffer.ctc,
    };

    // Log the upgrade supersession
    await tx.auditLog.create({
      data: {
        userId: sessionUserId,
        institutionId: institution?.id || null,
        action: 'OFFER_SUPERSEDED_BY_UPGRADE',
        details: JSON.stringify({
          previousOfferId: prevOffer.id,
          previousCompany: prevOffer.companyName,
          previousCtc: prevOffer.ctc,
          newOfferId: acceptedOfferId,
          newCompany: offer.companyName,
          newCtc: offer.ctc,
          newTier: tier,
          studentProfileId,
        }),
      },
    });
  }

  // 5. Auto-withdraw active applications that are ineligible given the new tier
  // Active statuses: APPLIED, SCREENED, ASSESSMENT, SHORTLISTED, INTERVIEW, SELECTED
  const activeApplications = await tx.jobApplication.findMany({
    where: {
      studentProfileId,
      id: { not: offer.applicationId },
      status: {
        in: [
          ApplicationStatus.APPLIED,
          ApplicationStatus.SCREENED,
          ApplicationStatus.ASSESSMENT,
          ApplicationStatus.SHORTLISTED,
          ApplicationStatus.INTERVIEW,
          ApplicationStatus.SELECTED,
        ],
      },
    },
    include: {
      drive: true,
    },
  });

  const autoWithdrawnApplications: PolicyReconciliationSummary['autoWithdrawnApplications'] = [];
  const dreamCutoff = institution?.dreamOfferThreshold ?? 10.0;
  const superDreamCutoff = institution?.superDreamThreshold ?? 20.0;

  for (const activeApp of activeApplications) {
    const driveCtcAmount = activeApp.drive.ctcAmount ?? parseCtcAmount(activeApp.drive.ctc);
    const driveTier = classifyOfferTier(driveCtcAmount, institution);

    let shouldWithdraw = false;
    let withdrawalReason = '';

    if (tier === 'SUPER_DREAM') {
      // Super Dream placed candidates are auto-withdrawn from ALL other campus drives
      shouldWithdraw = true;
      withdrawalReason = `Auto-withdrawn by campus policy: Candidate secured Super Dream offer with ${offer.companyName} (${offer.ctc}).`;
    } else if (tier === 'DREAM') {
      // Dream placed candidates are auto-withdrawn from Regular and equal Dream drives, eligible only for Super Dream
      if (driveCtcAmount < superDreamCutoff) {
        shouldWithdraw = true;
        withdrawalReason = `Auto-withdrawn by campus policy: Candidate secured Dream offer with ${offer.companyName} (${offer.ctc}). Eligible only for Super Dream drives [≥ ₹${superDreamCutoff} LPA].`;
      }
    } else if (tier === 'REGULAR') {
      // Regular placed candidates are auto-withdrawn from all other Regular drives, eligible for Dream/Super Dream
      if (driveCtcAmount < dreamCutoff) {
        shouldWithdraw = true;
        withdrawalReason = `Auto-withdrawn by campus policy: Candidate secured Regular placement with ${offer.companyName} (${offer.ctc}). Eligible only for Dream/Super Dream upgrades [≥ ₹${dreamCutoff} LPA].`;
      }
    }

    if (shouldWithdraw) {
      await tx.jobApplication.update({
        where: { id: activeApp.id },
        data: {
          status: ApplicationStatus.REJECTED,
          stageNotes: withdrawalReason,
        },
      });

      autoWithdrawnApplications.push({
        applicationId: activeApp.id,
        companyName: activeApp.drive.companyName,
        roleTitle: activeApp.drive.roleTitle,
        tier: driveTier,
      });

      await tx.auditLog.create({
        data: {
          userId: sessionUserId,
          institutionId: institution?.id || null,
          action: 'APPLICATION_AUTO_WITHDRAWN_POLICY',
          details: JSON.stringify({
            applicationId: activeApp.id,
            driveId: activeApp.driveId,
            companyName: activeApp.drive.companyName,
            reason: withdrawalReason,
            acceptedOfferId,
            studentProfileId,
          }),
        },
      });
    }
  }

  // 6. Record policy reconciliation summary in AuditLog
  const summary: PolicyReconciliationSummary = {
    acceptedOfferId,
    studentId: studentProfileId,
    tier,
    isUpgrade: Boolean(supersededOfferInfo),
    supersededOffer: supersededOfferInfo,
    autoWithdrawnApplications,
    policyRuleApplied: institution?.placementPolicy || 'Standard Campus Tiered Upgrade Policy',
    reconciledAt: new Date().toISOString(),
  };

  await tx.auditLog.create({
    data: {
      userId: sessionUserId,
      institutionId: institution?.id || null,
      action: 'PLACEMENT_POLICY_RECONCILIATION',
      details: JSON.stringify(summary),
    },
  });

  return summary;
}

