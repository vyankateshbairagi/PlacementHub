import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/db';
import placementAiClient, {
  StudentEvidenceProfile,
  VerifiedProofItem,
} from '@/lib/placementAiClient';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    const effectiveRole = session?.role || 'TPO';

    // Role check: Only TPO, Faculty, Institute Admin, or Super Admin can run cohort batch ranking
    const allowedRoles = ['TPO', 'FACULTY', 'INSTITUTE_ADMIN', 'SUPER_ADMIN'];
    if (!allowedRoles.includes(effectiveRole)) {
      return NextResponse.json(
        { error: 'Forbidden: Only placement officers and mentors can perform cohort ranking' },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { driveId, jobDescription, minFitScore = 0, onlyEligible = false } = body;

    // 1. Fetch drive if driveId provided
    let drive: any = null;
    if (driveId) {
      drive = await prisma.placementDrive.findUnique({
        where: { id: driveId },
      });
      if (!drive) {
        return NextResponse.json({ error: 'Placement drive not found' }, { status: 404 });
      }
    } else if (!jobDescription || !jobDescription.trim()) {
      return NextResponse.json(
        { error: 'Either driveId or jobDescription must be provided' },
        { status: 400 }
      );
    }

    // 2. Fetch all students in the institution
    const institutionId = session?.institutionId;
    let students = await prisma.studentProfile.findMany({
      where: institutionId
        ? { user: { institutionId } }
        : {},
      include: {
        user: { select: { name: true, email: true } },
        skillProofs: true,
      },
    });

    if (students.length === 0) {
      students = await prisma.studentProfile.findMany({
        include: {
          user: { select: { name: true, email: true } },
          skillProofs: true,
        },
      });
    }

    if (students.length === 0) {
      return NextResponse.json(
        { error: 'No student profiles found for cohort ranking' },
        { status: 404 }
      );
    }

    // 3. Transform students into Candidate Evidence Profiles
    const candidates = students.map((s) => {
      const proofsMap: Record<string, VerifiedProofItem[]> = {};
      for (const p of s.skillProofs) {
        const item: VerifiedProofItem = {
          canonical_skill: p.canonicalSkill,
          category: p.category,
          confidence_tier: p.confidenceTier as any,
          source_type: p.sourceType as any,
          locator: p.locator,
          metric: p.metric,
          audit_note: p.auditNote,
        };
        if (!proofsMap[p.canonicalSkill]) proofsMap[p.canonicalSkill] = [];
        proofsMap[p.canonicalSkill].push(item);
      }

      const profile: StudentEvidenceProfile = {
        student_id: s.id,
        name: s.user.name,
        trust_score: s.trustScore,
        verified_skills: proofsMap,
        unsubstantiated_claims: [],
        flagged_claims: [],
        summary: s.bio || `${s.department} student with ${s.skillProofs.length} verified proofs`,
      };

      return {
        student_id: s.id,
        name: s.user.name,
        email: s.user.email,
        department: s.department,
        cgpa: s.cgpa,
        backlogs_count: s.backlogsCount,
        profile,
      };
    });

    // 4. Construct parsed_job if drive exists
    const parsedJob = drive
      ? {
          company_name: drive.companyName,
          role_title: drive.roleTitle,
          source: drive.source || 'ON_CAMPUS',
          raw_description: drive.description,
          required_skills: (() => {
            try {
              const s = JSON.parse(drive.requiredSkills || '[]');
              return s.map((name: string) => ({ name, category: 'Technical' }));
            } catch {
              return [];
            }
          })(),
          preferred_skills: (() => {
            try {
              const s = JSON.parse(drive.preferredSkills || '[]');
              return s.map((name: string) => ({ name, category: 'Technical' }));
            } catch {
              return [];
            }
          })(),
          min_cgpa: drive.minCgpa,
          max_backlogs: drive.maxBacklogs,
          eligible_branches: (() => {
            try {
              return JSON.parse(drive.eligibleBranches || '[]');
            } catch {
              return [];
            }
          })(),
          selection_rounds: (() => {
            try {
              return JSON.parse(drive.selectionRounds || '[]');
            } catch {
              return [];
            }
          })(),
          ctc_inr_lpa: drive.ctcAmount,
          ctc_text: drive.ctc,
          location: drive.location,
        }
      : undefined;

    // 5. Run Cohort Ranking through AI service
    const rankResult = await placementAiClient.rankCohortBatch({
      candidates,
      job_description: drive ? drive.description : jobDescription,
      parsed_job: parsedJob,
      min_fit_score: minFitScore,
      only_eligible: onlyEligible,
    });

    return NextResponse.json({
      success: true,
      ranking: rankResult,
    });
  } catch (error: any) {
    console.error('Error running cohort batch ranking:', error);
    return NextResponse.json(
      { error: error.message || 'Error processing cohort ranking' },
      { status: 500 }
    );
  }
}

