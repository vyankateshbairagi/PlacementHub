import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireSession } from '@/lib/auth';
import { authErrorResponse } from '@/lib/auth-http';
import { arrayToCsv } from '@/lib/report-generator';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await requireSession(['TPO', 'INSTITUTE_ADMIN', 'SUPER_ADMIN']);
    const { searchParams } = new URL(request.url);

    const action = searchParams.get('action') || undefined;
    const userId = searchParams.get('userId') || undefined;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const format = (searchParams.get('format') || 'json').toLowerCase();
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = format === 'csv' ? 1000 : Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '30', 10)));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (session.role !== 'SUPER_ADMIN') {
      where.institutionId = session.institutionId;
    } else if (searchParams.get('institutionId')) {
      where.institutionId = searchParams.get('institutionId');
    }

    if (action) where.action = action;
    if (userId) where.userId = userId;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        const parsedStart = new Date(startDate);
        if (!isNaN(parsedStart.getTime())) where.createdAt.gte = parsedStart;
      }
      if (endDate) {
        const parsedEnd = new Date(endDate);
        if (!isNaN(parsedEnd.getTime())) where.createdAt.lte = parsedEnd;
      }
    }

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    if (format === 'csv') {
      const headers = ['Timestamp', 'Action', 'User Name', 'User Email', 'Role', 'Details'];
      const rows = logs.map((l) => [
        new Date(l.createdAt).toISOString(),
        l.action,
        l.user?.name || 'System',
        l.user?.email || 'N/A',
        l.user?.role || 'SYSTEM',
        l.details,
      ]);

      const csv = arrayToCsv(headers, rows);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="CareerOS_Audit_Trail_${Date.now()}.csv"`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      logs,
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
