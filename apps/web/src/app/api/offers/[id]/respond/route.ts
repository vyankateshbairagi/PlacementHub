import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { authErrorResponse } from '@/lib/auth-http';
import { respondToOffer } from '@/lib/offer-service';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    const { id } = await params;

    const body = await request.json();
    const { action, digitalSignature, declineReason, declineNotes } = body;

    if (action !== 'ACCEPT' && action !== 'DECLINE') {
      return NextResponse.json(
        { success: false, error: "Action must be either 'ACCEPT' or 'DECLINE'." },
        { status: 400 }
      );
    }

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || 'Browser Client';

    const result = await respondToOffer({
      offerId: id,
      action,
      digitalSignature: digitalSignature
        ? {
            signerName: digitalSignature.signerName,
            declarationConfirmed: Boolean(digitalSignature.declarationConfirmed),
            ipAddress: ip,
            userAgent,
            signedLetterUrl: digitalSignature.signedLetterUrl,
          }
        : undefined,
      declineReason,
      declineNotes,
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
    return authErrorResponse(error, error.message || 'Failed to process offer response.');
  }
}

