import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireSession } from '@/lib/auth';
import { authErrorResponse } from '@/lib/auth-http';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireSession(['STUDENT']);
    const body = await req.json().catch(() => ({}));
    const isCompleted = body.isCompleted !== undefined ? Boolean(body.isCompleted) : true;

    // Verify resource exists
    const resource = await prisma.resourceItem.findUnique({
      where: { id: params.id },
    });

    if (!resource) {
      return NextResponse.json({ success: false, error: 'Resource not found.' }, { status: 404 });
    }

    if (!isCompleted) {
      // Remove any completion log for this resource by this user
      await prisma.auditLog.deleteMany({
        where: {
          userId: session.userId,
          action: 'RESOURCE_COMPLETED',
          details: { contains: params.id },
        },
      });

      return NextResponse.json({
        success: true,
        resourceId: params.id,
        isCompleted: false,
        message: `Resource marked as incomplete.`,
      });
    }

    // Check if already completed
    const existing = await prisma.auditLog.findFirst({
      where: {
        userId: session.userId,
        action: 'RESOURCE_COMPLETED',
        details: { contains: params.id },
      },
    });

    if (!existing) {
      await prisma.auditLog.create({
        data: {
          userId: session.userId,
          institutionId: session.institutionId ?? null,
          action: 'RESOURCE_COMPLETED',
          details: JSON.stringify({
            resourceItemId: params.id,
            title: resource.title,
            category: resource.category,
            completedAt: new Date().toISOString(),
          }),
        },
      });
    }

    return NextResponse.json({
      success: true,
      resourceId: params.id,
      isCompleted: true,
      message: `Resource "${resource.title}" marked as completed!`,
    });
  } catch (error) {
    return authErrorResponse(error, 'Failed to update resource completion status.');
  }
}
