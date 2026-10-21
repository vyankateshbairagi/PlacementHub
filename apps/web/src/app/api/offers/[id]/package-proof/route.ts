import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { authErrorResponse } from '@/lib/auth-http';
import { submitPackageProof, verifyPackageProof } from '@/lib/offer-service';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    const { id } = await params;

    const body = await request.json();
    const { proofDocumentUrl, fixedCtc, variableCtc, joiningBonus, stockEsop, totalCtc } = body;

    const result = await submitPackageProof({
      offerId: id,
      proofDocumentUrl,
      ctcBreakdown: {
        fixedCtc,
        variableCtc,
        joiningBonus,
        stockEsop,
        totalCtc,
      },
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
    return authErrorResponse(error, error.message || 'Failed to submit package proof.');
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    const { id } = await params;

    if (session.role !== 'TPO' && session.role !== 'INSTITUTE_ADMIN' && session.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Only TPO or Institute Admin can verify package proofs.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { status, verificationNotes } = body;

    if (status !== 'VERIFIED' && status !== 'REJECTED') {
      return NextResponse.json(
        { success: false, error: "Status must be either 'VERIFIED' or 'REJECTED'." },
        { status: 400 }
      );
    }

    const result = await verifyPackageProof({
      offerId: id,
      status,
      verificationNotes,
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
    return authErrorResponse(error, error.message || 'Failed to verify package proof.');
  }
}

