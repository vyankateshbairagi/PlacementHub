import prisma from '@/lib/db';
import { PlacementDrive, StudentProfile, JobApplication, Institution } from '@prisma/client';

export interface EligibilityCheckResult {
  isEligible: boolean;
  reasons: string[];
  criteria: {
    driveStatus: { passed: boolean; message: string };
    deadline: { passed: boolean; message: string; deadlineDate: string };
    placementStatus: { passed: boolean; message: string };
    cgpa: { passed: boolean; required: number; actual: number; message: string };
    backlogs: { passed: boolean; maxAllowed: number; actual: number; message: string };
    branch: { passed: boolean; allowed: string[]; actual: string; message: string };
    institution: { passed: boolean; message: string };
    placementPolicy: { passed: boolean; message: string };
  };
}

export interface SavedSearchItem {
  id: string;
  name: string;
  query?: string;
  filters?: {
    jobType?: string;
    jobCategory?: string;
    minCgpa?: number;
    maxBacklogs?: number;
    department?: string;
    eligibleOnly?: boolean;
  };
  createdAt: string;
}

export function parseJsonArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean);
  }
  if (typeof value !== 'string') return [];
  const trimmed = value.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed.map((v) => String(v).trim()).filter(Boolean);
    }
  } catch {
    // Fall back to comma-separated
    return trimmed.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

export function parseCtcAmount(ctc?: string | null, explicitAmount?: number | null): number {
  if (typeof explicitAmount === 'number' && !Number.isNaN(explicitAmount) && explicitAmount > 0) {
    return explicitAmount;
  }
  if (!ctc) return 10.0;
  // Match patterns like "₹14.5 LPA", "18.5 LPA", "12 LPA", "₹50,000 / mo"
  const lpaMatch = ctc.match(/([\d.]+)\s*(?:LPA|lpa|Lakh|lakh)/i);
  if (lpaMatch && lpaMatch[1]) {
    const val = parseFloat(lpaMatch[1]);
    if (!Number.isNaN(val) && val > 0) return val;
  }
  const perMoMatch = ctc.match(/([\d,]+)\s*(?:\/|per)\s*(?:mo|month)/i);
  if (perMoMatch && perMoMatch[1]) {
    const numeric = parseFloat(perMoMatch[1].replace(/,/g, ''));
    if (!Number.isNaN(numeric) && numeric > 0) {
      // Convert monthly stipend to annual LPA equivalent
      return parseFloat(((numeric * 12) / 100000).toFixed(2));
    }
  }
  const genericMatch = ctc.match(/[\d.]+/);
  if (genericMatch) {
    const val = parseFloat(genericMatch[0]);
    if (!Number.isNaN(val) && val > 0) return val;
  }
  return 10.0;
}

function normalizeBranchName(name: string): string {
  return name
    .toLowerCase()
    .replace(/(?:department\s+of|dept\.?\s+of|engineering|engg\.?|technology|tech)/gi, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

export function isBranchEligible(studentDepartment: string, eligibleBranches: string[]): boolean {
  if (!eligibleBranches || eligibleBranches.length === 0) return true;
  if (eligibleBranches.some((b) => b.toUpperCase() === 'ALL' || b === '*')) return true;

  const normalizedStudent = normalizeBranchName(studentDepartment);
  if (!normalizedStudent) return true;

  return eligibleBranches.some((branch) => {
    const norm = normalizeBranchName(branch);
    if (!norm) return true;
    return (
      norm === normalizedStudent ||
      normalizedStudent.includes(norm) ||
      norm.includes(normalizedStudent)
    );
  });
}

export function evaluateEligibility(params: {
  student: {
    id: string;
    department: string;
    cgpa: number;
    backlogsCount: number;
    placementStatus: string;
    institutionId?: string | null;
    offers?: Array<{ ctc: string; status: string }>;
  };
  drive: {
    id: string;
    jobType: string;
    status: string;
    deadline: Date | string;
    minCgpa: number;
    maxBacklogs: number;
    eligibleBranches: string | string[];
    ctcAmount?: number | null;
    ctc: string;
    isDreamCompany?: boolean;
    isSuperDream?: boolean;
    institutionId?: string | null;
  };
  institution?: {
    dreamOfferThreshold?: number;
    superDreamThreshold?: number;
    maxRegularOffers?: number;
  } | null;
}): EligibilityCheckResult {
  const { student, drive, institution } = params;
  const reasons: string[] = [];

  // 1. Drive status check
  const isDriveActive = drive.status === 'ACTIVE';
  const driveStatusMessage = isDriveActive
    ? 'Drive is currently active.'
    : `Drive is not active (current status: ${drive.status}).`;
  if (!isDriveActive) reasons.push(driveStatusMessage);

  // 2. Deadline check
  const deadlineDate = new Date(drive.deadline);
  const now = new Date();
  const isDeadlinePassed = now.getTime() > deadlineDate.getTime();
  const deadlineMessage = isDeadlinePassed
    ? `Drive application deadline passed on ${deadlineDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}.`
    : `Application open until ${deadlineDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}.`;
  if (isDeadlinePassed) reasons.push(deadlineMessage);

  // 3. Student Placement Status check
  const isStudentOptedOut = student.placementStatus === 'OPTED_OUT';
  const placementStatusMessage = isStudentOptedOut
    ? 'Student has opted out of campus placements.'
    : 'Student is active in the placement process.';
  if (isStudentOptedOut) reasons.push(placementStatusMessage);

  // 4. CGPA Cutoff check
  const cgpaPassed = student.cgpa >= drive.minCgpa;
  const cgpaMessage = cgpaPassed
    ? `CGPA ${student.cgpa} meets the minimum requirement of ${drive.minCgpa}.`
    : `CGPA of ${student.cgpa} is below the minimum required ${drive.minCgpa}.`;
  if (!cgpaPassed) reasons.push(cgpaMessage);

  // 5. Backlogs check
  const backlogsPassed = student.backlogsCount <= drive.maxBacklogs;
  const backlogsMessage = backlogsPassed
    ? `${student.backlogsCount} backlogs within permissible limit of ${drive.maxBacklogs}.`
    : `${student.backlogsCount} active backlogs exceeds the allowed limit of ${drive.maxBacklogs}.`;
  if (!backlogsPassed) reasons.push(backlogsMessage);

  // 6. Branch / Department check
  const branchList = Array.isArray(drive.eligibleBranches)
    ? drive.eligibleBranches
    : parseJsonArray(drive.eligibleBranches);
  const branchPassed = isBranchEligible(student.department, branchList);
  const branchMessage = branchPassed
    ? `Department '${student.department}' is eligible.`
    : `Department '${student.department}' is not among eligible branches (${branchList.join(', ')}).`;
  if (!branchPassed) reasons.push(branchMessage);

  // 7. Institution boundary check (for ON_CAMPUS drives)
  let institutionPassed = true;
  let institutionMessage = 'Eligible for this campus drive.';
  if (drive.jobType === 'ON_CAMPUS' && drive.institutionId && student.institutionId) {
    if (drive.institutionId !== student.institutionId) {
      institutionPassed = false;
      institutionMessage = 'This on-campus drive is restricted to its host institution students.';
      reasons.push(institutionMessage);
    }
  }

  // 8. Institutional Dream / Super Dream policy check
  let policyPassed = true;
  let policyMessage = 'Placement policy compliance verified.';
  const acceptedOffers = (student.offers || []).filter((o) => o.status === 'ACCEPTED');

  if (acceptedOffers.length > 0) {
    const highestAcceptedCtc = Math.max(
      ...acceptedOffers.map((o) => parseCtcAmount(o.ctc))
    );
    const targetCtc = parseCtcAmount(drive.ctc, drive.ctcAmount);
    const dreamThreshold = institution?.dreamOfferThreshold ?? 10.0;
    const superDreamThreshold = institution?.superDreamThreshold ?? 20.0;
    const maxRegular = institution?.maxRegularOffers ?? 1;

    if (highestAcceptedCtc >= dreamThreshold && targetCtc < superDreamThreshold) {
      policyPassed = false;
      policyMessage = `Placement Policy: You already hold an accepted offer of ₹${highestAcceptedCtc} LPA. You can only apply for Super Dream roles (≥ ₹${superDreamThreshold} LPA).`;
      reasons.push(policyMessage);
    } else if (acceptedOffers.length >= maxRegular && targetCtc < dreamThreshold) {
      policyPassed = false;
      policyMessage = `Placement Policy: Maximum regular offers limit (${maxRegular}) reached. You can only apply for Dream roles (≥ ₹${dreamThreshold} LPA).`;
      reasons.push(policyMessage);
    }
  }

  const isEligible =
    isDriveActive &&
    !isDeadlinePassed &&
    !isStudentOptedOut &&
    cgpaPassed &&
    backlogsPassed &&
    branchPassed &&
    institutionPassed &&
    policyPassed;

  return {
    isEligible,
    reasons,
    criteria: {
      driveStatus: { passed: isDriveActive, message: driveStatusMessage },
      deadline: {
        passed: !isDeadlinePassed,
        message: deadlineMessage,
        deadlineDate: deadlineDate.toISOString(),
      },
      placementStatus: { passed: !isStudentOptedOut, message: placementStatusMessage },
      cgpa: { passed: cgpaPassed, required: drive.minCgpa, actual: student.cgpa, message: cgpaMessage },
      backlogs: {
        passed: backlogsPassed,
        maxAllowed: drive.maxBacklogs,
        actual: student.backlogsCount,
        message: backlogsMessage,
      },
      branch: { passed: branchPassed, allowed: branchList, actual: student.department, message: branchMessage },
      institution: { passed: institutionPassed, message: institutionMessage },
      placementPolicy: { passed: policyPassed, message: policyMessage },
    },
  };
}

export function computeFitScoreAndProofSummary(
  student: {
    skillProofs?: Array<{ canonicalSkill: string; confidenceTier: string; metric?: string }>;
    trustScore?: number;
  },
  drive: {
    requiredSkills: string | string[];
    preferredSkills?: string | string[];
  }
): { fitScore: number; matchTier: string; proofSummary: string } {
  const proofs = student.skillProofs || [];
  const goldSkills = proofs
    .filter((p) => p.confidenceTier === 'GOLD_VERIFIED')
    .map((p) => p.canonicalSkill);
  const silverSkills = proofs
    .filter((p) => p.confidenceTier === 'SILVER_VALIDATED')
    .map((p) => p.canonicalSkill);

  const reqSkills = Array.isArray(drive.requiredSkills)
    ? drive.requiredSkills
    : parseJsonArray(drive.requiredSkills);
  const prefSkills = Array.isArray(drive.preferredSkills)
    ? drive.preferredSkills
    : parseJsonArray(drive.preferredSkills);

  const matchedReq = reqSkills.filter((s) =>
    goldSkills.some((g) => g.toLowerCase() === s.toLowerCase()) ||
    silverSkills.some((sl) => sl.toLowerCase() === s.toLowerCase())
  );
  const matchedPref = prefSkills.filter((s) =>
    goldSkills.some((g) => g.toLowerCase() === s.toLowerCase()) ||
    silverSkills.some((sl) => sl.toLowerCase() === s.toLowerCase())
  );

  const trust = student.trustScore ?? 75;
  let fitScore = 70;
  if (reqSkills.length > 0) {
    const reqRatio = matchedReq.length / reqSkills.length;
    const prefBonus = prefSkills.length > 0 ? (matchedPref.length / prefSkills.length) * 15 : 5;
    fitScore = Math.round(Math.min(99, reqRatio * 70 + prefBonus + trust * 0.2));
  } else {
    fitScore = Math.round(Math.min(95, 65 + trust * 0.3));
  }

  const matchTier = fitScore >= 80 ? 'STRONG_MATCH' : fitScore >= 60 ? 'POTENTIAL_MATCH' : 'TRAINABLE';

  const proofParts: string[] = [];
  if (goldSkills.length > 0) proofParts.push(`Gold: ${goldSkills.slice(0, 3).join(', ')}`);
  if (silverSkills.length > 0) proofParts.push(`Silver: ${silverSkills.slice(0, 2).join(', ')}`);
  if (proofParts.length === 0) proofParts.push(`Trust Score: ${trust}/100`);

  return {
    fitScore,
    matchTier,
    proofSummary: proofParts.join(' | '),
  };
}

export function toSafeDriveDto(
  drive: any,
  options?: {
    isBookmarked?: boolean;
    hasApplied?: boolean;
    applicationStatus?: string;
    eligibility?: EligibilityCheckResult;
    includeApplicants?: boolean;
  }
) {
  const reqSkills = parseJsonArray(drive.requiredSkills);
  const prefSkills = parseJsonArray(drive.preferredSkills);
  const branches = parseJsonArray(drive.eligibleBranches);
  const rounds = parseJsonArray(drive.selectionRounds);
  const deadlineDate = new Date(drive.deadline);
  const isExpired = new Date().getTime() > deadlineDate.getTime();

  let applicants: any[] | undefined = undefined;
  if (options?.includeApplicants && Array.isArray(drive.applications)) {
    applicants = drive.applications.map((app: any) => {
      const student = app.studentProfile || {};
      const user = student.user || {};
      return {
        id: app.id,
        status: app.status,
        fitScore: app.fitScore,
        matchTier: app.matchTier,
        verifiedProofSummary: app.verifiedProofSummary,
        stageNotes: app.stageNotes,
        appliedAt: app.appliedAt,
        student: {
          id: student.id,
          name: user.name || 'Candidate',
          email: user.email,
          rollNo: student.rollNo,
          department: student.department,
          cgpa: student.cgpa,
          backlogsCount: student.backlogsCount,
          verifiedSkillsCount: student.verifiedSkillsCount,
          trustScore: student.trustScore,
          placementStatus: student.placementStatus,
        },
      };
    });
  }

  return {
    id: drive.id,
    companyName: drive.companyName,
    companyLogo: drive.companyLogo,
    roleTitle: drive.roleTitle,
    jobType: drive.jobType,
    jobCategory: drive.jobCategory,
    description: drive.description,
    ctc: drive.ctc,
    ctcAmount: drive.ctcAmount ?? parseCtcAmount(drive.ctc),
    isDreamCompany: drive.isDreamCompany,
    isSuperDream: drive.isSuperDream,
    requiredSkills: reqSkills,
    preferredSkills: prefSkills,
    source: drive.source,
    stipend: drive.stipend,
    location: drive.location,
    deadline: drive.deadline,
    driveDate: drive.driveDate,
    minCgpa: drive.minCgpa,
    maxBacklogs: drive.maxBacklogs,
    eligibleBranches: branches,
    selectionRounds: rounds,
    status: drive.status,
    isExpired,
    institutionId: drive.institutionId,
    institution: drive.institution
      ? {
          id: drive.institution.id,
          name: drive.institution.name,
          logoUrl: drive.institution.logoUrl,
          city: drive.institution.city,
        }
      : null,
    recruiterId: drive.recruiterId,
    applicantCount: Array.isArray(drive.applications) ? drive.applications.length : 0,
    applicants,
    isBookmarked: options?.isBookmarked ?? false,
    hasApplied: options?.hasApplied ?? false,
    applicationStatus: options?.applicationStatus,
    eligibility: options?.eligibility,
    createdAt: drive.createdAt,
    updatedAt: drive.updatedAt,
  };
}

export function toSafeApplicationDto(app: any) {
  const drive = app.drive ? toSafeDriveDto(app.drive) : null;
  const student = app.studentProfile;
  const user = student?.user;

  return {
    id: app.id,
    driveId: app.driveId,
    studentProfileId: app.studentProfileId,
    status: app.status,
    fitScore: app.fitScore,
    matchTier: app.matchTier,
    verifiedProofSummary: app.verifiedProofSummary,
    stageNotes: app.stageNotes,
    currentRoundIndex: app.currentRoundIndex,
    interviews: app.interviews || [],
    offer: app.offer || null,
    appliedAt: app.appliedAt,
    updatedAt: app.updatedAt,
    drive,
    student: student
      ? {
          id: student.id,
          name: user?.name,
          email: user?.email,
          avatarUrl: user?.avatarUrl,
          rollNo: student.rollNo,
          department: student.department,
          cgpa: student.cgpa,
          backlogsCount: student.backlogsCount,
          verifiedSkillsCount: student.verifiedSkillsCount,
          trustScore: student.trustScore,
        }
      : null,
    studentProfile: student
      ? {
          id: student.id,
          rollNo: student.rollNo,
          department: student.department,
          cgpa: student.cgpa,
          backlogsCount: student.backlogsCount,
          verifiedSkillsCount: student.verifiedSkillsCount,
          trustScore: student.trustScore,
          user: {
            id: user?.id,
            name: user?.name,
            email: user?.email,
            avatarUrl: user?.avatarUrl,
          },
        }
      : null,
  };
}

// -----------------------------------------------------------------------------
// Bookmarks & Saved Searches Persistence via AuditLog
// -----------------------------------------------------------------------------

export async function getStudentBookmarks(userId: string): Promise<string[]> {
  try {
    const record = await prisma.auditLog.findFirst({
      where: { userId, action: 'STUDENT_BOOKMARKS' },
      orderBy: { createdAt: 'desc' },
    });
    if (!record || !record.details) return [];
    const parsed = JSON.parse(record.details);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

export async function setStudentBookmarks(userId: string, bookmarkedIds: string[]): Promise<string[]> {
  const cleaned = Array.from(new Set(bookmarkedIds.filter(Boolean)));
  const existing = await prisma.auditLog.findFirst({
    where: { userId, action: 'STUDENT_BOOKMARKS' },
  });
  if (existing) {
    await prisma.auditLog.update({
      where: { id: existing.id },
      data: { details: JSON.stringify(cleaned) },
    });
  } else {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { institutionId: true } });
    await prisma.auditLog.create({
      data: {
        userId,
        institutionId: user?.institutionId,
        action: 'STUDENT_BOOKMARKS',
        details: JSON.stringify(cleaned),
      },
    });
  }
  return cleaned;
}

export async function toggleStudentBookmark(
  userId: string,
  driveId: string,
  bookmarked: boolean
): Promise<string[]> {
  const current = await getStudentBookmarks(userId);
  let updated: string[];
  if (bookmarked) {
    updated = Array.from(new Set([...current, driveId]));
  } else {
    updated = current.filter((id) => id !== driveId);
  }
  return setStudentBookmarks(userId, updated);
}

export async function getStudentSavedSearches(userId: string): Promise<SavedSearchItem[]> {
  try {
    const record = await prisma.auditLog.findFirst({
      where: { userId, action: 'STUDENT_SAVED_SEARCHES' },
      orderBy: { createdAt: 'desc' },
    });
    if (!record || !record.details) return [];
    const parsed = JSON.parse(record.details);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function addStudentSavedSearch(
  userId: string,
  search: { name: string; query?: string; filters?: any }
): Promise<SavedSearchItem[]> {
  const current = await getStudentSavedSearches(userId);
  const newItem: SavedSearchItem = {
    id: `search_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name: search.name.trim() || 'Saved Placement Search',
    query: search.query?.trim() || '',
    filters: search.filters || {},
    createdAt: new Date().toISOString(),
  };
  const updated = [newItem, ...current.filter((s) => s.name.toLowerCase() !== newItem.name.toLowerCase())].slice(0, 20);

  const existing = await prisma.auditLog.findFirst({
    where: { userId, action: 'STUDENT_SAVED_SEARCHES' },
  });
  if (existing) {
    await prisma.auditLog.update({
      where: { id: existing.id },
      data: { details: JSON.stringify(updated) },
    });
  } else {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { institutionId: true } });
    await prisma.auditLog.create({
      data: {
        userId,
        institutionId: user?.institutionId,
        action: 'STUDENT_SAVED_SEARCHES',
        details: JSON.stringify(updated),
      },
    });
  }
  return updated;
}

export async function removeStudentSavedSearch(userId: string, searchId: string): Promise<SavedSearchItem[]> {
  const current = await getStudentSavedSearches(userId);
  const updated = current.filter((s) => s.id !== searchId);

  const existing = await prisma.auditLog.findFirst({
    where: { userId, action: 'STUDENT_SAVED_SEARCHES' },
  });
  if (existing) {
    await prisma.auditLog.update({
      where: { id: existing.id },
      data: { details: JSON.stringify(updated) },
    });
  }
  return updated;
}
