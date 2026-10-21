import prisma from '@/lib/db';
import { OfferStatus, PlacementStatus } from '@prisma/client';
import { parseCtcAmount } from '@/lib/drive-service';
import {
  classifyOfferTier,
  evaluateOfferAcceptanceEligibility,
  reconcilePlacementPolicyOnAcceptance,
  PlacementTier,
} from '@/lib/placement-policy-engine';
import { sendPipelineNotification } from '@/lib/notification-service';

export interface OfferMetadata {
  expiresAt?: string; // ISO date string
  isExpired?: boolean;
  daysRemaining?: number;
  digitalSignature?: {
    signerName: string;
    signedAt: string;
    declarationConfirmed: boolean;
    ipAddress?: string;
    userAgent?: string;
    signedLetterUrl?: string;
  };
  packageProof?: {
    proofDocumentUrl: string;
    fixedCtc?: string;
    variableCtc?: string;
    joiningBonus?: string;
    stockEsop?: string;
    totalCtc?: string;
    status: 'UNSUBMITTED' | 'PENDING_VERIFICATION' | 'VERIFIED' | 'REJECTED';
    verificationNotes?: string;
    verifiedBy?: string;
    verifiedByName?: string;
    verifiedAt?: string;
  };
  joiningDetails?: {
    joiningStatus: 'NOT_JOINED' | 'JOINED' | 'DEFERRED' | 'REVOKED' | 'REJECTED_JOINING';
    expectedJoiningDate?: string;
    actualJoiningDate?: string;
    joiningLocation?: string;
    joiningRemarks?: string;
    updatedAt?: string;
    updatedByRole?: string;
  };
  declineDetails?: {
    reason: string;
    notes?: string;
    declinedAt: string;
  };
  placementTier?: PlacementTier;
  policyNotes?: string;
}

export interface SessionContext {
  userId: string;
  role: string;
  institutionId?: string | null;
  name?: string;
  email?: string;
}

/**
 * Retrieves polymorphic offer metadata stored via AuditLog
 */
export async function getOfferMetadata(offerId: string): Promise<OfferMetadata> {
  const log = await prisma.auditLog.findFirst({
    where: {
      action: 'JOB_OFFER_EXTENDED_METADATA',
      details: {
        contains: `"offerId":"${offerId}"`,
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!log) {
    return {
      packageProof: {
        proofDocumentUrl: '',
        status: 'UNSUBMITTED',
      },
      joiningDetails: {
        joiningStatus: 'NOT_JOINED',
      },
    };
  }

  try {
    const parsed = JSON.parse(log.details);
    const metadata: OfferMetadata = parsed.metadata || {};

    // Compute expiration dynamically
    if (metadata.expiresAt) {
      const expDate = new Date(metadata.expiresAt);
      const now = new Date();
      metadata.isExpired = now.getTime() > expDate.getTime();
      const diffMs = expDate.getTime() - now.getTime();
      metadata.daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    }

    return metadata;
  } catch {
    return {};
  }
}

/**
 * Saves/updates offer metadata in AuditLog
 */
export async function saveOfferMetadata(
  offerId: string,
  updates: Partial<OfferMetadata>,
  sessionUserId?: string,
  institutionId?: string | null
): Promise<OfferMetadata> {
  const existing = await getOfferMetadata(offerId);
  const merged: OfferMetadata = {
    ...existing,
    ...updates,
    packageProof: {
      ...(existing.packageProof || { proofDocumentUrl: '', status: 'UNSUBMITTED' }),
      ...(updates.packageProof || {}),
    },
    joiningDetails: {
      ...(existing.joiningDetails || { joiningStatus: 'NOT_JOINED' }),
      ...(updates.joiningDetails || {}),
    },
    digitalSignature: updates.digitalSignature || existing.digitalSignature,
    declineDetails: updates.declineDetails || existing.declineDetails,
  };

  await prisma.auditLog.create({
    data: {
      userId: sessionUserId || null,
      institutionId: institutionId || null,
      action: 'JOB_OFFER_EXTENDED_METADATA',
      details: JSON.stringify({
        offerId,
        metadata: merged,
        savedAt: new Date().toISOString(),
      }),
    },
  });

  return merged;
}

/**
 * Converts raw offer model and metadata into safe, sanitized DTO
 */
export function toSafeOfferDto(offer: any, metadata?: OfferMetadata | null) {
  const student = offer.studentProfile;
  const user = student?.user;
  const drive = offer.application?.drive;
  const institution = drive?.institution || user?.institution;

  const ctcAmount = parseCtcAmount(offer.ctc);
  const tier = metadata?.placementTier || classifyOfferTier(ctcAmount, institution);

  const expiresAt = metadata?.expiresAt || new Date(new Date(offer.issuedAt).getTime() + 7 * 86400000).toISOString();
  const expDate = new Date(expiresAt);
  const now = new Date();
  const isExpired = offer.status === OfferStatus.PENDING && now.getTime() > expDate.getTime();
  const daysRemaining = Math.max(0, Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  return {
    id: offer.id,
    applicationId: offer.applicationId,
    studentProfileId: offer.studentProfileId,
    companyName: offer.companyName,
    roleTitle: offer.roleTitle,
    ctc: offer.ctc,
    ctcAmount,
    tier,
    offerLetterUrl: offer.offerLetterUrl || null,
    status: offer.status,
    issuedAt: offer.issuedAt,
    expiresAt,
    isExpired,
    daysRemaining,
    createdAt: offer.createdAt,
    updatedAt: offer.updatedAt,
    student: student
      ? {
          id: student.id,
          name: user?.name || 'Candidate',
          email: user?.email,
          rollNo: student.rollNo,
          department: student.department,
          cgpa: student.cgpa,
          placementStatus: student.placementStatus,
        }
      : null,
    drive: drive
      ? {
          id: drive.id,
          roleTitle: drive.roleTitle,
          companyName: drive.companyName,
          companyLogo: drive.companyLogo,
          jobType: drive.jobType,
          location: drive.location,
          isDreamCompany: drive.isDreamCompany,
          isSuperDream: drive.isSuperDream,
          institutionId: drive.institutionId,
        }
      : null,
    metadata: {
      expiresAt,
      isExpired,
      daysRemaining,
      digitalSignature: metadata?.digitalSignature || null,
      packageProof: metadata?.packageProof || {
        proofDocumentUrl: '',
        status: 'UNSUBMITTED',
      },
      joiningDetails: metadata?.joiningDetails || {
        joiningStatus: 'NOT_JOINED',
      },
      declineDetails: metadata?.declineDetails || null,
      placementTier: tier,
      policyNotes: metadata?.policyNotes,
    },
  };
}

/**
 * Lists offers with metadata strictly filtered by role-based permissions
 */
export async function listOffers(
  session: SessionContext,
  filters?: {
    status?: OfferStatus;
    driveId?: string;
    studentProfileId?: string;
    search?: string;
  }
) {
  const where: any = {};

  if (filters?.status) {
    where.status = filters.status;
  }

  if (filters?.driveId) {
    where.application = { driveId: filters.driveId };
  }

  if (session.role === 'STUDENT') {
    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId: session.userId },
      select: { id: true },
    });
    if (!studentProfile) return [];
    where.studentProfileId = studentProfile.id;
  } else if (session.role === 'RECRUITER') {
    const recruiterProfile = await prisma.recruiterProfile.findUnique({
      where: { userId: session.userId },
      select: { id: true },
    });
    if (!recruiterProfile) return [];
    where.application = {
      drive: {
        recruiterId: recruiterProfile.id,
      },
    };
  } else if (session.role === 'TPO' || session.role === 'INSTITUTE_ADMIN' || session.role === 'FACULTY') {
    if (session.institutionId) {
      where.application = {
        drive: {
          institutionId: session.institutionId,
        },
      };
    }
  }

  if (filters?.studentProfileId && session.role !== 'STUDENT') {
    where.studentProfileId = filters.studentProfileId;
  }

  const rawOffers = await prisma.jobOffer.findMany({
    where,
    include: {
      studentProfile: {
        include: {
          user: {
            select: { id: true, name: true, email: true, institution: true },
          },
        },
      },
      application: {
        include: {
          drive: {
            include: {
              institution: {
                select: { id: true, name: true, logoUrl: true, dreamOfferThreshold: true, superDreamThreshold: true },
              },
            },
          },
        },
      },
    },
    orderBy: { issuedAt: 'desc' },
  });

  // Attach metadata
  const offersWithMeta = await Promise.all(
    rawOffers.map(async (offer) => {
      const meta = await getOfferMetadata(offer.id);
      return toSafeOfferDto(offer, meta);
    })
  );

  if (filters?.search) {
    const q = filters.search.toLowerCase();
    return offersWithMeta.filter(
      (o) =>
        o.companyName.toLowerCase().includes(q) ||
        o.roleTitle.toLowerCase().includes(q) ||
        o.student?.name.toLowerCase().includes(q) ||
        o.student?.rollNo.toLowerCase().includes(q)
    );
  }

  return offersWithMeta;
}

/**
 * Fetches a single offer by ID with access control validation
 */
export async function getOfferById(offerId: string, session: SessionContext) {
  const offer = await prisma.jobOffer.findUnique({
    where: { id: offerId },
    include: {
      studentProfile: {
        include: {
          user: {
            select: { id: true, name: true, email: true, institution: true },
          },
        },
      },
      application: {
        include: {
          drive: {
            include: {
              institution: true,
              recruiter: true,
            },
          },
        },
      },
    },
  });

  if (!offer) {
    throw new Error('Job offer not found.');
  }

  // Authorization check
  if (session.role === 'STUDENT') {
    const student = await prisma.studentProfile.findUnique({
      where: { userId: session.userId },
      select: { id: true },
    });
    if (!student || student.id !== offer.studentProfileId) {
      throw new Error('Forbidden: You can only view your own job offers.');
    }
  } else if (session.role === 'RECRUITER') {
    const recruiter = await prisma.recruiterProfile.findUnique({
      where: { userId: session.userId },
      select: { id: true },
    });
    if (!recruiter || (offer.application.drive?.recruiterId && offer.application.drive.recruiterId !== recruiter.id)) {
      throw new Error('Forbidden: You can only view offers from your own drives.');
    }
  } else if (session.role === 'TPO' || session.role === 'INSTITUTE_ADMIN') {
    if (session.institutionId && offer.application.drive?.institutionId && offer.application.drive.institutionId !== session.institutionId) {
      throw new Error('Forbidden: Access limited to your institution.');
    }
  }

  const meta = await getOfferMetadata(offer.id);
  return toSafeOfferDto(offer, meta);
}

/**
 * Handles Student response (ACCEPT or DECLINE) with digital signature,
 * expiry check, and institutional placement policy reconciliation.
 */
export async function respondToOffer(params: {
  offerId: string;
  action: 'ACCEPT' | 'DECLINE';
  digitalSignature?: {
    signerName: string;
    declarationConfirmed: boolean;
    ipAddress?: string;
    userAgent?: string;
    signedLetterUrl?: string;
  };
  declineReason?: string;
  declineNotes?: string;
  session: SessionContext;
}) {
  const { offerId, action, digitalSignature, declineReason, declineNotes, session } = params;

  if (session.role !== 'STUDENT') {
    throw new Error('Only the candidate can accept or decline an offer.');
  }

  const student = await prisma.studentProfile.findUnique({
    where: { userId: session.userId },
    include: { user: true },
  });

  if (!student) {
    throw new Error('Student profile not found.');
  }

  const offer = await prisma.jobOffer.findUnique({
    where: { id: offerId },
    include: {
      application: {
        include: {
          drive: {
            include: {
              institution: true,
              recruiter: {
                include: { user: true },
              },
            },
          },
        },
      },
    },
  });

  if (!offer) {
    throw new Error('Job offer not found.');
  }

  if (offer.studentProfileId !== student.id) {
    throw new Error('Forbidden: You can only respond to offers extended to you.');
  }

  if (offer.status !== OfferStatus.PENDING) {
    throw new Error(`This offer has already been ${offer.status.toLowerCase()}.`);
  }

  const currentMeta = await getOfferMetadata(offer.id);

  // Check expiry
  if (currentMeta.expiresAt) {
    const expDate = new Date(currentMeta.expiresAt);
    if (Date.now() > expDate.getTime()) {
      throw new Error(
        `This offer expired on ${expDate.toLocaleDateString()}. Please contact your placement cell or the company recruiter for an extension.`
      );
    }
  }

  if (action === 'DECLINE') {
    const declinedAt = new Date().toISOString();
    const reasonText = declineReason || 'Candidate opted for alternative opportunity / higher studies.';

    await prisma.$transaction(async (tx) => {
      // 1. Update offer status to DECLINED
      await tx.jobOffer.update({
        where: { id: offerId },
        data: { status: OfferStatus.DECLINED },
      });

      // 2. Save metadata in AuditLog
      await tx.auditLog.create({
        data: {
          userId: session.userId,
          institutionId: offer.application.drive?.institutionId || session.institutionId || null,
          action: 'JOB_OFFER_EXTENDED_METADATA',
          details: JSON.stringify({
            offerId,
            metadata: {
              ...currentMeta,
              declineDetails: {
                reason: reasonText,
                notes: declineNotes || '',
                declinedAt,
              },
            },
            savedAt: declinedAt,
          }),
        },
      });
    });

    // Notify Recruiter
    const recruiterUser = offer.application.drive?.recruiter?.user;
    if (recruiterUser) {
      await sendPipelineNotification({
        userId: recruiterUser.id,
        userEmail: recruiterUser.email,
        userName: recruiterUser.name,
        institutionId: offer.application.drive?.institutionId || session.institutionId || null,
        type: 'OFFER_DECLINED',
        title: `Offer Declined - ${student.user.name}`,
        message: `${student.user.name} has declined the offer for ${offer.roleTitle}. Reason: ${reasonText}`,
        metadata: {
          companyName: offer.companyName,
          roleTitle: offer.roleTitle,
          ctc: offer.ctc,
          rejectionReason: reasonText,
        },
      });
    }

    return {
      success: true,
      status: OfferStatus.DECLINED,
      message: 'Offer declined successfully. Notification sent to recruiter.',
    };
  }

  // Action is ACCEPT
  if (!digitalSignature || !digitalSignature.declarationConfirmed || !digitalSignature.signerName?.trim()) {
    throw new Error('Digital signature with explicit declaration confirmation is required to accept an offer.');
  }

  // 1. Check Institutional Placement Policy Eligibility
  const policyCheck = await evaluateOfferAcceptanceEligibility(student.id, {
    id: offer.id,
    ctc: offer.ctc,
    companyName: offer.companyName,
  });

  if (!policyCheck.allowed) {
    throw new Error(policyCheck.reason || 'Institutional placement policy does not permit accepting this offer.');
  }

  // 2. Perform Atomic Policy Reconciliation & Acceptance
  const signedAt = new Date().toISOString();
  let reconciliationSummary: any = null;

  await prisma.$transaction(async (tx) => {
    reconciliationSummary = await reconcilePlacementPolicyOnAcceptance(tx, {
      studentProfileId: student.id,
      acceptedOfferId: offer.id,
      sessionUserId: session.userId,
    });

    // Save extended metadata with digital signature and tier
    await tx.auditLog.create({
      data: {
        userId: session.userId,
        institutionId: offer.application.drive?.institutionId || session.institutionId || null,
        action: 'JOB_OFFER_EXTENDED_METADATA',
        details: JSON.stringify({
          offerId,
          metadata: {
            ...currentMeta,
            placementTier: policyCheck.tier,
            digitalSignature: {
              signerName: digitalSignature.signerName.trim(),
              signedAt,
              declarationConfirmed: true,
              ipAddress: digitalSignature.ipAddress,
              userAgent: digitalSignature.userAgent,
              signedLetterUrl: digitalSignature.signedLetterUrl,
            },
            joiningDetails: currentMeta.joiningDetails || {
              joiningStatus: 'NOT_JOINED',
            },
          },
          savedAt: signedAt,
        }),
      },
    });
  });

  // 3. Dispatch Notifications to Student, Recruiter, and TPO
  // Student notification
  await sendPipelineNotification({
    userId: session.userId,
    userEmail: session.email,
    userName: student.user.name,
    institutionId: offer.application.drive?.institutionId || session.institutionId || null,
    type: 'OFFER_ACCEPTED',
    title: `Offer Accepted - Congratulations!`,
    message: `You have successfully accepted the offer from ${offer.companyName} for ${offer.roleTitle} at ${offer.ctc}. Your placement status is updated to PLACED.`,
    metadata: {
      companyName: offer.companyName,
      roleTitle: offer.roleTitle,
      ctc: offer.ctc,
    },
  });

  // Recruiter notification
  const recruiterUser = offer.application.drive?.recruiter?.user;
  if (recruiterUser) {
    await sendPipelineNotification({
      userId: recruiterUser.id,
      userEmail: recruiterUser.email,
      userName: recruiterUser.name,
      institutionId: offer.application.drive?.institutionId || session.institutionId || null,
      type: 'OFFER_ACCEPTED',
      title: `Offer Accepted - ${student.user.name}`,
      message: `${student.user.name} has digitally signed and accepted your offer for ${offer.roleTitle} at ${offer.ctc}.`,
      metadata: {
        companyName: offer.companyName,
        roleTitle: offer.roleTitle,
        ctc: offer.ctc,
      },
    });
  }

  // Notify TPO
  const instId = offer.application.drive?.institutionId || session.institutionId;
  if (instId) {
    const tpoUsers = await prisma.user.findMany({
      where: {
        institutionId: instId,
        role: { in: ['TPO', 'INSTITUTE_ADMIN'] },
        isActive: true,
      },
      select: { id: true, email: true, name: true },
      take: 3,
    });

    for (const tpo of tpoUsers) {
      await sendPipelineNotification({
        userId: tpo.id,
        userEmail: tpo.email,
        userName: tpo.name,
        institutionId: instId,
        type: 'OFFER_ACCEPTED',
        title: `Placement Confirmed: ${student.user.name} at ${offer.companyName}`,
        message: `${student.user.name} (${student.department}, CGPA ${student.cgpa}) has accepted an offer from ${offer.companyName} at ${offer.ctc} [Tier: ${policyCheck.tier}].`,
        metadata: {
          companyName: offer.companyName,
          roleTitle: offer.roleTitle,
          ctc: offer.ctc,
        },
      });
    }
  }

  return {
    success: true,
    status: OfferStatus.ACCEPTED,
    tier: policyCheck.tier,
    isUpgrade: policyCheck.isUpgrade,
    reconciliation: reconciliationSummary,
    message: `Offer accepted and digitally signed successfully! Placement status updated to PLACED (${policyCheck.tier}).`,
  };
}

/**
 * Submits Package Proof for NAAC/NIRF accreditation audits
 */
export async function submitPackageProof(params: {
  offerId: string;
  proofDocumentUrl: string;
  ctcBreakdown?: {
    fixedCtc?: string;
    variableCtc?: string;
    joiningBonus?: string;
    stockEsop?: string;
    totalCtc?: string;
  };
  session: SessionContext;
}) {
  const { offerId, proofDocumentUrl, ctcBreakdown, session } = params;

  if (!proofDocumentUrl?.trim()) {
    throw new Error('Valid proof document URL or attachment is required.');
  }

  const offer = await prisma.jobOffer.findUnique({
    where: { id: offerId },
    include: {
      studentProfile: {
        include: { user: true },
      },
      application: {
        include: {
          drive: true,
        },
      },
    },
  });

  if (!offer) {
    throw new Error('Job offer not found.');
  }

  // Must be student owner, recruiter, or TPO
  if (session.role === 'STUDENT' && offer.studentProfileId !== (await prisma.studentProfile.findUnique({ where: { userId: session.userId } }))?.id) {
    throw new Error('Forbidden.');
  }

  const meta = await getOfferMetadata(offer.id);
  meta.packageProof = {
    proofDocumentUrl: proofDocumentUrl.trim(),
    fixedCtc: ctcBreakdown?.fixedCtc || offer.ctc,
    variableCtc: ctcBreakdown?.variableCtc || '',
    joiningBonus: ctcBreakdown?.joiningBonus || '',
    stockEsop: ctcBreakdown?.stockEsop || '',
    totalCtc: ctcBreakdown?.totalCtc || offer.ctc,
    status: 'PENDING_VERIFICATION',
  };

  const instId = offer.application.drive?.institutionId || session.institutionId || undefined;
  await saveOfferMetadata(offer.id, meta, session.userId, instId);

  // Notify TPO for verification
  if (instId) {
    const tpos = await prisma.user.findMany({
      where: {
        institutionId: instId,
        role: { in: ['TPO', 'INSTITUTE_ADMIN'] },
        isActive: true,
      },
      select: { id: true, email: true, name: true },
      take: 2,
    });

    for (const tpo of tpos) {
      await sendPipelineNotification({
        userId: tpo.id,
        userEmail: tpo.email,
        userName: tpo.name,
        institutionId: instId,
        type: 'OFFER_VERIFIED',
        title: `Package Proof Submitted: ${offer.studentProfile.user.name}`,
        message: `${offer.studentProfile.user.name} uploaded package documentation for ${offer.companyName} (${offer.ctc}) awaiting TPO accreditation verification.`,
      });
    }
  }

  return {
    success: true,
    message: 'Package proof submitted successfully and queued for TPO verification.',
    packageProof: meta.packageProof,
  };
}

/**
 * Verifies or Rejects Package Proof (TPO / Institute Admin only)
 */
export async function verifyPackageProof(params: {
  offerId: string;
  status: 'VERIFIED' | 'REJECTED';
  verificationNotes?: string;
  session: SessionContext;
}) {
  const { offerId, status, verificationNotes, session } = params;

  if (session.role !== 'TPO' && session.role !== 'INSTITUTE_ADMIN' && session.role !== 'SUPER_ADMIN') {
    throw new Error('Only TPO or Institute Admin can verify package proofs for accreditation.');
  }

  const offer = await prisma.jobOffer.findUnique({
    where: { id: offerId },
    include: {
      studentProfile: {
        include: { user: true },
      },
      application: {
        include: { drive: true },
      },
    },
  });

  if (!offer) {
    throw new Error('Job offer not found.');
  }

  const meta = await getOfferMetadata(offer.id);
  if (!meta.packageProof || !meta.packageProof.proofDocumentUrl) {
    throw new Error('No package proof document has been submitted for this offer yet.');
  }

  meta.packageProof.status = status;
  meta.packageProof.verificationNotes = verificationNotes || (status === 'VERIFIED' ? 'Verified for NAAC/NIRF audit compliance.' : 'Document insufficient.');
  meta.packageProof.verifiedBy = session.userId;
  meta.packageProof.verifiedByName = session.name || 'Placement Officer';
  meta.packageProof.verifiedAt = new Date().toISOString();

  const instId = offer.application.drive?.institutionId || session.institutionId || undefined;
  await saveOfferMetadata(offer.id, meta, session.userId, instId);

  // Notify Student
  await sendPipelineNotification({
    userId: offer.studentProfile.userId,
    userEmail: offer.studentProfile.user.email,
    userName: offer.studentProfile.user.name,
    institutionId: instId || null,
    type: 'OFFER_VERIFIED',
    title: status === 'VERIFIED' ? 'Package Proof Verified' : 'Package Proof Rejected',
    message:
      status === 'VERIFIED'
        ? `Your placement package proof for ${offer.companyName} has been officially verified by the Placement Cell.`
        : `Your placement package proof for ${offer.companyName} was not verified: ${meta.packageProof.verificationNotes}`,
  });

  return {
    success: true,
    packageProof: meta.packageProof,
    message: `Package proof marked ${status.toLowerCase()}.`,
  };
}

/**
 * Updates Joining Status and Details
 */
export async function updateJoiningStatus(params: {
  offerId: string;
  joiningStatus: 'NOT_JOINED' | 'JOINED' | 'DEFERRED' | 'REVOKED' | 'REJECTED_JOINING';
  expectedJoiningDate?: string;
  actualJoiningDate?: string;
  joiningLocation?: string;
  joiningRemarks?: string;
  session: SessionContext;
}) {
  const { offerId, joiningStatus, expectedJoiningDate, actualJoiningDate, joiningLocation, joiningRemarks, session } =
    params;

  const offer = await prisma.jobOffer.findUnique({
    where: { id: offerId },
    include: {
      studentProfile: {
        include: { user: true },
      },
      application: {
        include: { drive: true },
      },
    },
  });

  if (!offer) {
    throw new Error('Job offer not found.');
  }

  const meta = await getOfferMetadata(offer.id);
  meta.joiningDetails = {
    joiningStatus,
    expectedJoiningDate: expectedJoiningDate || meta.joiningDetails?.expectedJoiningDate,
    actualJoiningDate: actualJoiningDate || meta.joiningDetails?.actualJoiningDate,
    joiningLocation: joiningLocation || meta.joiningDetails?.joiningLocation,
    joiningRemarks: joiningRemarks || meta.joiningDetails?.joiningRemarks,
    updatedAt: new Date().toISOString(),
    updatedByRole: session.role,
  };

  const instId = offer.application.drive?.institutionId || session.institutionId || undefined;
  await saveOfferMetadata(offer.id, meta, session.userId, instId);

  // Notify student or recruiter
  const targetUserId =
    session.role === 'STUDENT'
      ? offer.application.drive?.recruiterId
        ? (await prisma.recruiterProfile.findUnique({ where: { id: offer.application.drive.recruiterId } }))?.userId
        : null
      : offer.studentProfile.userId;

  if (targetUserId) {
    await sendPipelineNotification({
      userId: targetUserId,
      institutionId: instId || null,
      type: 'JOINING_UPDATE',
      title: `Joining Status Updated: ${offer.companyName}`,
      message: `Joining status for ${offer.roleTitle} is now marked as ${joiningStatus.replace('_', ' ')}.`,
    });
  }

  return {
    success: true,
    joiningDetails: meta.joiningDetails,
    message: `Joining status updated to ${joiningStatus}.`,
  };
}

/**
 * Extends Offer Expiry Deadline (Recruiter or TPO only)
 */
export async function extendOfferDeadline(params: {
  offerId: string;
  newExpiresAt: string;
  reason?: string;
  session: SessionContext;
}) {
  const { offerId, newExpiresAt, reason, session } = params;

  if (session.role === 'STUDENT') {
    throw new Error('Students cannot extend their own offer deadlines.');
  }

  const newDate = new Date(newExpiresAt);
  if (Number.isNaN(newDate.getTime()) || newDate.getTime() <= Date.now()) {
    throw new Error('New expiry date must be a valid future timestamp.');
  }

  const offer = await prisma.jobOffer.findUnique({
    where: { id: offerId },
    include: {
      studentProfile: {
        include: { user: true },
      },
      application: {
        include: { drive: true },
      },
    },
  });

  if (!offer) {
    throw new Error('Job offer not found.');
  }

  const meta = await getOfferMetadata(offer.id);
  meta.expiresAt = newDate.toISOString();
  meta.isExpired = false;

  const instId = offer.application.drive?.institutionId || session.institutionId || undefined;
  await saveOfferMetadata(offer.id, meta, session.userId, instId);

  // Notify candidate
  await sendPipelineNotification({
    userId: offer.studentProfile.userId,
    userEmail: offer.studentProfile.user.email,
    userName: offer.studentProfile.user.name,
    institutionId: instId || null,
    type: 'OFFER_EXTENDED',
    title: `Offer Validity Extended - ${offer.companyName}`,
    message: `Your offer from ${offer.companyName} for ${offer.roleTitle} has been extended until ${newDate.toLocaleDateString()}. ${
      reason ? `Note: ${reason}` : ''
    }`,
  });

  return {
    success: true,
    expiresAt: meta.expiresAt,
    message: `Offer validity extended to ${newDate.toLocaleDateString()}.`,
  };
}

