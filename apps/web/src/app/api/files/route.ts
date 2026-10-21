import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireSession } from '@/lib/auth';
import { authErrorResponse } from '@/lib/auth-http';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(request.url);

    const folder = searchParams.get('folder') || undefined;
    const entityType = searchParams.get('entityType') || undefined;
    const entityId = searchParams.get('entityId') || undefined;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '30', 10)));
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };

    // Role-based visibility scoping
    if (session.role === 'STUDENT') {
      where.OR = [
        { uploadedById: session.userId },
        { isPublic: true },
        { folder: 'resources' },
      ];
    } else if (['TPO', 'INSTITUTE_ADMIN', 'FACULTY'].includes(session.role)) {
      if (session.institutionId) {
        where.OR = [
          { institutionId: session.institutionId },
          { uploadedById: session.userId },
          { isPublic: true },
        ];
      }
    }
    // SUPER_ADMIN sees all

    if (folder) where.folder = folder;
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;

    const [total, files] = await Promise.all([
      prisma.fileAttachment.count({ where }),
      prisma.fileAttachment.findMany({
        where,
        include: {
          uploadedBy: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      success: true,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      files,
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
