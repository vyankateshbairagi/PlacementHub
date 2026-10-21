import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSession } from '@/lib/auth';
import { authErrorResponse } from '@/lib/auth-http';

export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// GET /api/referrals/alumni
// Returns only the ReferralPostings created by the authenticated ALUMNI user.
// Supports optional query params: status, includeExpired.
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  try {
    const session = await requireSession(['ALUMNI']);

    // Resolve the AlumniProfile for the current user.
    const alumniProfile = await prisma.alumniProfile.findFirst({
      where: { user: { id: session.userId } },
    });

    if (!alumniProfile) {
      return NextResponse.json(
        { success: false, error: 'Alumni profile not found for this account.' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get('status') ?? undefined;
    const includeExpired = searchParams.get('includeExpired') === 'true';

    const postings = await prisma.referralPosting.findMany({
      where: {
        alumniProfileId: alumniProfile.id,
        ...(statusFilter && { status: statusFilter }),
        // Filter out past-deadline postings unless caller opts in.
        ...(!includeExpired && {
          OR: [{ deadline: null }, { deadline: { gte: new Date() } }],
        }),
      },
      include: {
        studentProfile: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Enrich each posting with an applicant count from AuditLog.
    const enriched = await Promise.all(
      postings.map(async (p) => {
        const applicantCount = await prisma.auditLog.count({
          where: {
            action: 'REFERRAL_APPLICATION',
            details: { contains: p.id },
          },
        });
        return { ...p, applicantCount };
      })
    );

    return NextResponse.json({ success: true, postings: enriched });
  } catch (error) {
    return authErrorResponse(error, 'Failed to fetch alumni referral postings.');
  }
}

// ---------------------------------------------------------------------------
// POST /api/referrals/alumni
// Creates a new ReferralPosting linked to the authenticated alumni's profile.
// Required body fields: company, jobTitle, applyUrl.
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(['ALUMNI']);

    // Resolve the AlumniProfile for the current user.
    const alumniProfile = await prisma.alumniProfile.findFirst({
      where: { user: { id: session.userId } },
      include: { user: { select: { name: true, email: true } } },
    });

    if (!alumniProfile) {
      return NextResponse.json(
        { success: false, error: 'Alumni profile not found for this account.' },
        { status: 404 }
      );
    }

    const body = await req.json();
    const {
      company,
      jobTitle,
      applyUrl,
      location,
      ctc,
      experienceRequired,
      deadline,
      referralNotes,
      rewardPoints,
    } = body as {
      company?: string;
      jobTitle?: string;
      applyUrl?: string;
      location?: string;
      ctc?: string;
      experienceRequired?: string;
      deadline?: string;
      referralNotes?: string;
      rewardPoints?: number;
    };

    // Validate required fields.
    const missing: string[] = [];
    if (!company?.trim()) missing.push('company');
    if (!jobTitle?.trim()) missing.push('jobTitle');
    if (!applyUrl?.trim()) missing.push('applyUrl');

    if (missing.length > 0) {
      return NextResponse.json(
        { success: false, error: `Missing required fields: ${missing.join(', ')}.` },
        { status: 400 }
      );
    }

    const newPosting = await prisma.referralPosting.create({
      data: {
        company: company!.trim(),
        jobTitle: jobTitle!.trim(),
        applyUrl: applyUrl!.trim(),
        ...(location?.trim() ? { location: location.trim() } : {}),
        ctc: ctc?.trim() ?? null,
        ...(experienceRequired?.trim() ? { experienceRequired: experienceRequired.trim() } : {}),
        deadline: deadline ? new Date(deadline) : null,
        referralNotes: referralNotes?.trim() ?? null,
        postedByName: alumniProfile.user?.name ?? session.name,
        postedByEmail: alumniProfile.user?.email ?? session.email,
        alumniProfileId: alumniProfile.id,
        status: 'PENDING',
        rewardPoints: rewardPoints ? Number(rewardPoints) : 100, // Alumni get higher default
      },
    });

    return NextResponse.json({ success: true, posting: newPosting }, { status: 201 });
  } catch (error) {
    return authErrorResponse(error, 'Failed to create alumni referral posting.');
  }
}
