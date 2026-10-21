import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/db';
import placementAiClient, { ParsedJobOutput } from '@/lib/placementAiClient';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { rawText, source = 'PARTNER_POSTING', companyName, roleTitle, location, ctc } = body;

    if (!rawText || !rawText.trim()) {
      return NextResponse.json({ error: 'Job description text is required' }, { status: 400 });
    }

    // 1. Parse JD using AI service
    const parsedJob = await placementAiClient.parseJobDescription({
      job_description: rawText,
      source,
      company_name: companyName,
      role_title: roleTitle,
      location,
      ctc,
    });

    // 2. Fetch existing drives in the institution to check for multi-source duplicates
    const institutionId = session.institutionId;
    const existingDrives = await prisma.placementDrive.findMany({
      where: institutionId ? { institutionId } : {},
      take: 20,
      orderBy: { createdAt: 'desc' },
    });

    const existingParsedJobs: ParsedJobOutput[] = existingDrives.map((d) => ({
      job_id: d.id,
      company_name: d.companyName,
      role_title: d.roleTitle,
      source: d.source || 'ON_CAMPUS',
      raw_description: d.description,
      required_skills: (() => {
        try {
          return JSON.parse(d.requiredSkills || '[]').map((name: string) => ({
            name,
            category: 'Technical',
          }));
        } catch {
          return [];
        }
      })(),
      preferred_skills: (() => {
        try {
          return JSON.parse(d.preferredSkills || '[]').map((name: string) => ({
            name,
            category: 'Technical',
          }));
        } catch {
          return [];
        }
      })(),
      min_cgpa: d.minCgpa,
      max_backlogs: d.maxBacklogs,
      eligible_branches: (() => {
        try {
          return JSON.parse(d.eligibleBranches || '[]');
        } catch {
          return [];
        }
      })(),
      selection_rounds: (() => {
        try {
          return JSON.parse(d.selectionRounds || '[]');
        } catch {
          return [];
        }
      })(),
      ctc_inr_lpa: d.ctcAmount,
      ctc_text: d.ctc,
      location: d.location,
    }));

    // 3. Check for duplicates
    let deduplication = null;
    if (existingParsedJobs.length > 0) {
      try {
        deduplication = await placementAiClient.deduplicateJob({
          new_job: parsedJob,
          existing_jobs: existingParsedJobs,
          threshold: 0.75,
        });
      } catch (dedupErr) {
        console.warn('Deduplication check error:', dedupErr);
      }
    }

    return NextResponse.json({
      success: true,
      parsedJob,
      deduplication,
    });
  } catch (error: any) {
    console.error('Error parsing job opening:', error);
    return NextResponse.json(
      { error: error.message || 'Error parsing job description' },
      { status: 500 }
    );
  }
}

