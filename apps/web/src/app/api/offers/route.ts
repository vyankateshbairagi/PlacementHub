import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { authErrorResponse } from '@/lib/auth-http';
import { listOffers } from '@/lib/offer-service';
import { OfferStatus, ApplicationStatus } from '@prisma/client';
import { executeStageTransition } from '@/lib/pipeline-state-machine';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(request.url);

    const statusParam = searchParams.get('status') as OfferStatus | null;
    const driveId = searchParams.get('driveId') || undefined;
    const studentProfileId = searchParams.get('studentProfileId') || undefined;
    const search = searchParams.get('search') || undefined;

    const offers = await listOffers(
      {
        userId: session.userId,
        role: session.role,
        institutionId: session.institutionId,
        name: session.email,
        email: session.email,
      },
      {
        status: statusParam && Object.values(OfferStatus).includes(statusParam) ? statusParam : undefined,
        driveId,
        studentProfileId,
        search,
      }
    );

    return NextResponse.json({
      success: true,
      count: offers.length,
      offers,
    });
  } catch (error: any) {
    return authErrorResponse(error, 'Failed to fetch job offers.');
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    if (session.role !== 'RECRUITER' && session.role !== 'TPO' && session.role !== 'INSTITUTE_ADMIN' && session.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Only recruiters or placement officers can issue job offers.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      applicationId,
      ctc,
      offerLetterUrl,
      expiresAt,
      joiningLocation,
      expectedJoiningDate,
      ctcBreakdown,
      stageNotes,
    } = body;

    if (!applicationId) {
      return NextResponse.json(
        { success: false, error: 'applicationId is required.' },
        { status: 400 }
      );
    }

    const result = await executeStageTransition({
      applicationId,
      targetStatus: ApplicationStatus.OFFERED,
      stageNotes: stageNotes || 'Offer extended to candidate.',
      offerDetails: {
        ctc,
        offerLetterUrl,
        expiresAt,
        joiningLocation,
        expectedJoiningDate,
        ctcBreakdown,
      },
      sessionUserId: session.userId,
      sessionRole: session.role,
      sessionInstitutionId: session.institutionId,
    });

    return NextResponse.json({
      success: true,
      message: 'Job offer dispatched successfully to candidate.',
      offer: result.offer,
      application: result.application,
    });
  } catch (error: any) {
    return authErrorResponse(error, 'Failed to create job offer.');
  }
}

