import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { authErrorResponse } from '@/lib/auth-http';
import { canUserAccessFile } from '@/lib/file-service';
import { getDocumentDownloadUrl } from '@/lib/r2';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireSession();
    const access = await canUserAccessFile(params.id, session);

    if (!access.allowed || !access.file) {
      return NextResponse.json(
        { success: false, error: access.reason || 'Forbidden' },
        { status: 403 }
      );
    }

    const file = access.file;
    const downloadUrl = await getDocumentDownloadUrl(file.fileKey, 3600);

    // Audit log download event
    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        institutionId: session.institutionId ?? null,
        action: 'FILE_DOWNLOADED',
        details: JSON.stringify({
          fileId: file.id,
          fileName: file.fileName,
          fileKey: file.fileKey,
        }),
      },
    });

    const { searchParams } = new URL(request.url);
    const redirectParam = searchParams.get('redirect') === 'true';

    if (redirectParam && downloadUrl.startsWith('http')) {
      return NextResponse.redirect(downloadUrl);
    }

    return NextResponse.json({
      success: true,
      fileName: file.fileName,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
      downloadUrl,
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
