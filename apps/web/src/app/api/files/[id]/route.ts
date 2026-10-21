import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireSession } from '@/lib/auth';
import { authErrorResponse } from '@/lib/auth-http';
import { canUserAccessFile, canUserDeleteFile } from '@/lib/file-service';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireSession();
    const access = await canUserAccessFile(params.id, session);

    if (!access.allowed) {
      return NextResponse.json(
        { success: false, error: access.reason || 'Forbidden' },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true, file: access.file });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireSession();
    const check = await canUserDeleteFile(params.id, session);

    if (!check.allowed) {
      return NextResponse.json(
        { success: false, error: check.reason || 'Forbidden' },
        { status: 403 }
      );
    }

    // Mark as soft deleted and log
    await prisma.fileAttachment.update({
      where: { id: params.id },
      data: { deletedAt: new Date() },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        institutionId: session.institutionId ?? null,
        action: 'FILE_DELETED',
        details: JSON.stringify({
          fileId: params.id,
          fileName: check.file.fileName,
          fileKey: check.file.fileKey,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'File attachment successfully deleted.',
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
