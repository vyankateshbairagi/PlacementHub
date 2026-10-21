import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status');
    const companyParam = searchParams.get('company');
    const alumniOnly = searchParams.get('alumniOnly') === 'true';
    const includeExpired = searchParams.get('includeExpired') === 'true';

    const where: any = {};

    if (statusParam && statusParam !== 'ALL') {
      where.status = statusParam;
    }

    if (companyParam) {
      where.company = { contains: companyParam, mode: 'insensitive' };
    }

    if (alumniOnly) {
      where.alumniProfileId = { not: null };
    }

    if (!includeExpired) {
      where.OR = [
        { deadline: null },
        { deadline: { gte: new Date() } },
      ];
    }

    const postings = await prisma.referralPosting.findMany({
      where,
      include: {
        alumniProfile: {
          include: { user: true },
        },
        studentProfile: {
          include: { user: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const mapped = postings.map((p) => ({
      id: p.id,
      company: p.company,
      role: p.jobTitle,
      ctc: p.ctc || 'Competitive CTC',
      location: p.location,
      url: p.applyUrl || '#',
      postedBy: p.postedByName || p.alumniProfile?.user?.name || p.studentProfile?.user?.name || 'Anonymous Student',
      postedByEmail: p.postedByEmail || p.alumniProfile?.user?.email || p.studentProfile?.user?.email || '',
      status: p.status,
      rewardPoints: p.rewardPoints,
      referralNotes: p.referralNotes,
      createdAt: p.createdAt,
    }));

    return NextResponse.json({ success: true, postings: mapped });
  } catch (error: any) {
    console.error('Error fetching referral postings:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    const body = await request.json();
    const { company, jobTitle, role, applyUrl, url, ctc, studentName, studentEmail, referralNotes } = body;

    const companyName = company?.trim();
    const title = (jobTitle || role)?.trim();

    if (!companyName || !title) {
      return NextResponse.json({ success: false, error: 'Company and Job Title are required.' }, { status: 400 });
    }

    // Attempt to locate student profile if logged in
    let studentProfileId: string | null = null;
    const emailToFind = studentEmail || session?.email;
    if (emailToFind) {
      const student = await prisma.studentProfile.findFirst({
        where: { user: { email: emailToFind } },
      });
      if (student) studentProfileId = student.id;
    }

    const newPosting = await prisma.referralPosting.create({
      data: {
        company: companyName,
        jobTitle: title,
        applyUrl: applyUrl || url || null,
        ctc: ctc || 'Stipend / CTC Disclosed in Portal',
        postedByName: studentName || session?.name || 'Student Contributor',
        postedByEmail: emailToFind || null,
        studentProfileId,
        referralNotes: referralNotes || 'Opportunity shared by campus student via CareerOS Off-Campus module.',
        status: 'PENDING',
        rewardPoints: 50,
      },
    });

    return NextResponse.json({ success: true, posting: newPosting });
  } catch (error: any) {
    console.error('Error creating referral posting:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, status, rewardPoints } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Posting ID is required' }, { status: 400 });
    }

    const updated = await prisma.referralPosting.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(rewardPoints !== undefined && { rewardPoints: parseInt(rewardPoints.toString(), 10) }),
      },
    });

    return NextResponse.json({ success: true, posting: updated });
  } catch (error: any) {
    console.error('Error updating referral posting:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

