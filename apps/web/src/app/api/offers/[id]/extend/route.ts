import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { authErrorResponse } from '@/lib/auth-http';
import { extendOfferDeadline } from '@/lib/offer-service';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    const { id } = await params;

    const body = await request.json();
    const { newExpiresAt, reason } = body;

    if (!newExpiresAt) {
      return NextResponse.json(
        { success: false, error: 'newExpiresAt is required.' },
        { status: 400 }
      );
    }

    const result = await extendOfferDeadline({
      offerId: id,
      newExpiresAt,
      reason,
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
    return authErrorResponse(error, error.message || 'Failed to extend offer deadline.');
  }
}

