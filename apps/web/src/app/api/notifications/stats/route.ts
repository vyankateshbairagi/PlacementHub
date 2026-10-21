import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { authErrorResponse } from '@/lib/auth-http';
import { getNotificationStats } from '@/lib/notification-service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/notifications/stats
 *
 * Returns aggregate notification counts for the authenticated user.
 *
 * Response:
 * ```json
 * {
 *   "success": true,
 *   "stats": {
 *     "total":  12,
 *     "unread": 5,
 *     "read":   7
 *   }
 * }
 * ```
 */
export async function GET() {
  try {
    const session = await requireSession();
    const stats = await getNotificationStats(session.userId);

    return NextResponse.json({ success: true, stats });
  } catch (error) {
    return authErrorResponse(error);
  }
}
