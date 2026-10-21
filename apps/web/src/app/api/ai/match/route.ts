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
    const body = await req.json().catch(() => ({}));
    const { driveId, jobDescription, roleTitle, companyName, studentEmail, skillsRequired } = body;

    // 1. Fetch student profile with verified skill proofs
    let student = null;
    if (session && session.userId) {
      student = await prisma.studentProfile.findUnique({
        where: { userId: session.userId },
        include: {
          skillProofs: true,
          user: { select: { name: true, email: true } },
        },
      });
    }

    if (!student && studentEmail) {
      student = await prisma.studentProfile.findFirst({
        where: { user: { email: studentEmail } },
        include: {
          skillProofs: true,
          user: { select: { name: true, email: true } },
        },
      });
    }

    if (!student) {
      student = await prisma.studentProfile.findFirst({
        where: { user: { email: 'aditya.shinde@student.gcoen.ac.in' } },
        include: {
          skillProofs: true,
          user: { select: { name: true, email: true } },
        },
      });
    }

    if (!student) {
      student = await prisma.studentProfile.findFirst({
        include: {
          skillProofs: true,
          user: { select: { name: true, email: true } },
        },
      });
    }

    if (!student) {
      return NextResponse.json({ error: 'Student profile not found' }, { status: 404 });
    }

    // 2. Fetch drive details if driveId provided
    let drive: any = null;
    if (driveId) {
      drive = await prisma.placementDrive.findUnique({
        where: { id: driveId },
      });
      if (!drive) {
        return NextResponse.json({ error: 'Placement drive not found' }, { status: 404 });
      }
    }

    // 3. Assemble StudentEvidenceProfile from database SkillProofs
    const verifiedSkillsMap: Record<string, VerifiedProofItem[]> = {};
    for (const proof of student.skillProofs) {
      const item: VerifiedProofItem = {
        canonical_skill: proof.canonicalSkill,
        category: proof.category,
        confidence_tier: proof.confidenceTier as any,
        source_type: proof.sourceType as any,
        locator: proof.locator,
        metric: proof.metric,
        audit_note: proof.auditNote,
      };
      if (!verifiedSkillsMap[proof.canonicalSkill]) {
        verifiedSkillsMap[proof.canonicalSkill] = [];
      }
      verifiedSkillsMap[proof.canonicalSkill].push(item);
    }

    const studentProfilePayload: StudentEvidenceProfile = {
      student_id: student.id,
      name: student.user.name,
      trust_score: student.trustScore,
      verified_skills: verifiedSkillsMap,
      unsubstantiated_claims: [],
      flagged_claims: [],
      summary: student.bio || `${student.department} student with ${student.skillProofs.length} verified evidence proofs.`,
    };

    // 4. Construct candidate object
    const candidate = {
      student_id: student.id,
      name: student.user.name,
      email: student.user.email,
      department: student.department,
      cgpa: student.cgpa,
      backlogs_count: student.backlogsCount,
      profile: studentProfilePayload,
    };

    // 5. Evaluate match with AI Microservice
    const matchResult = await placementAiClient.evaluateCandidateMatch({
      candidate,
      job_description: drive ? drive.description : jobDescription,
      parsed_job: drive
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
            summary: drive.description?.slice(0, 150) || `${drive.companyName} ${drive.roleTitle} campus placement drive.`,
          }
        : {
            company_name: companyName || 'Target Employer',
            role_title: roleTitle || 'Software Engineer',
            source: 'OFF_CAMPUS',
            raw_description: jobDescription || '',
            summary: jobDescription?.slice(0, 150) || `${roleTitle || 'Software Engineer'} opening requiring verified core engineering skills.`,
            required_skills: Array.isArray(skillsRequired)
              ? skillsRequired.map((name: string) => ({ name, category: 'Technical' }))
              : [],
            preferred_skills: [],
            min_cgpa: 7.0,
            max_backlogs: 0,
            eligible_branches: ['Computer Engineering', 'Information Technology'],
            selection_rounds: ['Online Assessment', 'Technical Round 1', 'System Design'],
          },
    });

    // 1. Persist match evaluation to TacieAssessment
    let assessmentRecord = null;
    try {
      assessmentRecord = await prisma.tacieAssessment.create({
        data: {
          studentProfileId: student.id,
          type: 'JOB_FIT_MATCH',
          targetRole: drive ? drive.roleTitle : roleTitle || 'Software Engineer',
          score: matchResult.fit_score,
          insights: JSON.stringify(matchResult),
        },
      });
    } catch (aErr) {
      console.warn('Could not save TacieAssessment for match:', aErr);
    }

    // 2. Persist audit log entry
    try {
      await prisma.auditLog.create({
        data: {
          userId: student.userId,
          action: 'JOB_FIT_MATCH_EVALUATED',
          details: JSON.stringify({
            assessmentId: assessmentRecord?.id,
            driveId: drive?.id,
            company: drive ? drive.companyName : companyName,
            role: drive ? drive.roleTitle : roleTitle,
            fitScore: matchResult.fit_score,
            matchTier: matchResult.match_tier,
            isEligible: matchResult.is_eligible,
            timestamp: new Date().toISOString(),
          }),
        },
      });
    } catch (lErr) {
      console.warn('Could not save AuditLog for match:', lErr);
    }

    return NextResponse.json({
      success: true,
      match: matchResult,
      assessmentId: assessmentRecord?.id,
      studentTrustScore: student.trustScore,
      verifiedSkillsCount: student.skillProofs.length,
    });
  } catch (error: any) {
    console.error('Error evaluating candidate match:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error while evaluating match' },
      { status: 500 }
    );
  }
}

