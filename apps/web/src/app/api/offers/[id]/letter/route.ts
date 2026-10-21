import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { authErrorResponse } from '@/lib/auth-http';
import { uploadDocument } from '@/lib/r2';
import prisma from '@/lib/db';
import { getOfferMetadata, saveOfferMetadata } from '@/lib/offer-service';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    const { id } = await params;

    const offer = await prisma.jobOffer.findUnique({
      where: { id },
      include: {
        studentProfile: true,
        application: {
          include: { drive: true },
        },
      },
    });

    if (!offer) {
      return NextResponse.json({ success: false, error: 'Job offer not found.' }, { status: 404 });
    }

    const contentTypeHeader = request.headers.get('content-type') || '';
    let documentUrl = '';
    let isSignedCopy = false;

    if (contentTypeHeader.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      isSignedCopy = formData.get('isSignedCopy') === 'true';

      if (!file) {
        return NextResponse.json({ success: false, error: 'No file uploaded.' }, { status: 400 });
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const uploadResult = await uploadDocument(buffer, file.name, file.type, 'offers');
      documentUrl = uploadResult.url;
    } else {
      const body = await request.json();
      documentUrl = body.url || body.offerLetterUrl;
      isSignedCopy = Boolean(body.isSignedCopy);
    }

    if (!documentUrl?.trim()) {
      return NextResponse.json({ success: false, error: 'Valid document URL or file is required.' }, { status: 400 });
    }

    if (isSignedCopy) {
      const meta = await getOfferMetadata(offer.id);
      if (meta.digitalSignature) {
        meta.digitalSignature.signedLetterUrl = documentUrl.trim();
      } else {
        meta.digitalSignature = {
          signerName: session.name || 'Candidate',
          declarationConfirmed: true,
          signedAt: new Date().toISOString(),
          signedLetterUrl: documentUrl.trim(),
        };
      }
      await saveOfferMetadata(offer.id, meta, session.userId, offer.application.drive?.institutionId || session.institutionId || undefined);
    } else {
      await prisma.jobOffer.update({
        where: { id },
        data: { offerLetterUrl: documentUrl.trim() },
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        institutionId: offer.application.drive?.institutionId || session.institutionId || null,
        action: isSignedCopy ? 'SIGNED_OFFER_LETTER_UPLOADED' : 'OFFER_LETTER_UPLOADED',
        details: JSON.stringify({
          offerId: offer.id,
          documentUrl,
          uploadedByRole: session.role,
          uploadedAt: new Date().toISOString(),
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: isSignedCopy ? 'Signed offer copy attached successfully.' : 'Offer letter attached successfully.',
      documentUrl,
    });
  } catch (error: any) {
    return authErrorResponse(error, error.message || 'Failed to upload offer letter.');
  }
}

