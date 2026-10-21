import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { authErrorResponse } from '@/lib/auth-http';
import { dispatchAutomatedReminders } from '@/lib/notification-service';

export const dynamic = 'force-dynamic';

/**
 * POST /api/notifications/reminders
 * Triggers batch dispatch of reminders for upcoming interviews and mentorship sessions.
 * Can be called by TPO, INSTITUTE_ADMIN, SUPER_ADMIN, or a cron job.
 */
export async function POST(_request: Request) {
  try {
    await requireSession(['TPO', 'INSTITUTE_ADMIN', 'SUPER_ADMIN', 'FACULTY']);

    const result = await dispatchAutomatedReminders();

    return NextResponse.json({
      success: true,
      message: `Dispatched ${result.interviewReminders} interview reminders and ${result.mentorshipReminders} mentorship session reminders.`,
      dispatched: result,
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
