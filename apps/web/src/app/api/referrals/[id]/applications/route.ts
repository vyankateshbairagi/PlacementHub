import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireSession } from '@/lib/auth';
import { authErrorResponse } from '@/lib/auth-http';

export const dynamic = 'force-dynamic';

/**
 * GET /api/referrals/[id]/applications
 * Returns all applicants for a specific referral posting.
 * Authorized for: The Referrer (Alumni or Student poster), or TPO / Institute Admin.
 */
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireSession();

    const posting = await prisma.referralPosting.findUnique({
      where: { id: params.id },
      include: {
        alumniProfile: true,
        studentProfile: true,
      },
    });

    if (!posting) {
      return NextResponse.json({ success: false, error: 'Referral posting not found.' }, { status: 404 });
    }

    const isAlumniOwner = posting.alumniProfile?.userId === session.userId;
    const isStudentOwner = posting.studentProfile?.userId === session.userId;
    const isStaff = ['TPO', 'INSTITUTE_ADMIN', 'SUPER_ADMIN'].includes(session.role);

    if (!isAlumniOwner && !isStudentOwner && !isStaff) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You do not own this referral posting.' },
        { status: 403 }
      );
    }

    const applications = await prisma.referralApplication.findMany({
      where: { referralId: params.id },
      include: {
        studentProfile: {
          select: {
            id: true,
            rollNo: true,
            department: true,
            cgpa: true,
            graduationYear: true,
            resumeUrl: true,
            linkedinUrl: true,
            githubUrl: true,
            talentPassportSlug: true,
            trustScore: true,
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
      orderBy: { appliedAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      referralId: params.id,
      company: posting.company,
      jobTitle: posting.jobTitle,
      count: applications.length,
      applications,
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
