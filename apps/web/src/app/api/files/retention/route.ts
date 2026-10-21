import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { authErrorResponse } from '@/lib/auth-http';
import { runRetentionCleanup } from '@/lib/file-service';

export const dynamic = 'force-dynamic';

/**
 * POST /api/files/retention
 * Runs the retention cleanup job to soft-delete / purge expired files.
 * Restricted to TPO, INSTITUTE_ADMIN, SUPER_ADMIN.
 */
export async function POST(_request: Request) {
  try {
    await requireSession(['TPO', 'INSTITUTE_ADMIN', 'SUPER_ADMIN']);

    const result = await runRetentionCleanup();

    return NextResponse.json({
      success: true,
      message: `Retention sweep complete. Purged/archived ${result.purgedCount} expired files.`,
      result,
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
