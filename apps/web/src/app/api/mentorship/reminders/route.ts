import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { authErrorResponse } from '@/lib/auth-http';
import { dispatchAutomatedReminders } from '@/lib/notification-service';

export const dynamic = 'force-dynamic';

export async function POST(_request: Request) {
  try {
    await requireSession(['ALUMNI', 'TPO', 'INSTITUTE_ADMIN', 'SUPER_ADMIN']);
    const result = await dispatchAutomatedReminders();

    return NextResponse.json({
      success: true,
      message: `Dispatched ${result.mentorshipReminders} mentorship session reminders.`,
      dispatched: result,
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
