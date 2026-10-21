import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { authErrorResponse } from '@/lib/auth-http';
import { updateJoiningStatus } from '@/lib/offer-service';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    const { id } = await params;

    const body = await request.json();
    const { joiningStatus, expectedJoiningDate, actualJoiningDate, joiningLocation, joiningRemarks } = body;

    const validStatuses = ['NOT_JOINED', 'JOINED', 'DEFERRED', 'REVOKED', 'REJECTED_JOINING'];
    if (!validStatuses.includes(joiningStatus)) {
      return NextResponse.json(
        { success: false, error: `Invalid joiningStatus. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    const result = await updateJoiningStatus({
      offerId: id,
      joiningStatus,
      expectedJoiningDate,
      actualJoiningDate,
      joiningLocation,
      joiningRemarks,
      session: {
        userId: session.userId,
        role: session.role,
        institutionId: session.institutionId,
        name: session.email,
        email: session.email,
      },
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return authErrorResponse(error, error.message || 'Failed to update joining status.');
  }
}

