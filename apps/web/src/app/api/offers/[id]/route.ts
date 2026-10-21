import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { authErrorResponse } from '@/lib/auth-http';
import { getOfferById, saveOfferMetadata } from '@/lib/offer-service';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    const { id } = await params;

    const offer = await getOfferById(id, {
      userId: session.userId,
      role: session.role,
      institutionId: session.institutionId,
      name: session.email,
      email: session.email,
    });

    return NextResponse.json({
      success: true,
      offer,
    });
  } catch (error: any) {
    return authErrorResponse(error, 'Failed to retrieve offer details.');
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    const { id } = await params;

    if (session.role === 'STUDENT') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Candidates cannot edit core offer terms.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { ctc, offerLetterUrl, expiresAt } = body;

    const updated = await prisma.jobOffer.update({
      where: { id },
      data: {
        ctc: ctc?.trim() || undefined,
        offerLetterUrl: offerLetterUrl?.trim() || undefined,
      },
    });

    if (expiresAt) {
      await saveOfferMetadata(id, { expiresAt }, session.userId, session.institutionId);
    }

    const fullOffer = await getOfferById(id, {
      userId: session.userId,
      role: session.role,
      institutionId: session.institutionId,
      name: session.email,
      email: session.email,
    });

    return NextResponse.json({
      success: true,
      message: 'Offer updated successfully.',
      offer: fullOffer,
    });
  } catch (error: any) {
    return authErrorResponse(error, 'Failed to update offer.');
  }
}

