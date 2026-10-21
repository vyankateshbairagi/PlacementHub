import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { authErrorResponse } from '@/lib/auth-http';
import {
  getUserNotifications,
  markNotificationAsRead,
  deleteNotification,
} from '@/lib/notification-service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(request.url);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    const result = await getUserNotifications(session.userId, limit, unreadOnly);

    return NextResponse.json({
      success: true,
      unreadCount: result.unreadCount,
      count: result.notifications.length,
      notifications: result.notifications,
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireSession();
    const body = await request.json().catch(() => ({}));
    const { notificationId } = body;

    await markNotificationAsRead(session.userId, notificationId);

    const updated = await getUserNotifications(session.userId);

    return NextResponse.json({
      success: true,
      message: notificationId ? 'Notification marked as read.' : 'All notifications marked as read.',
      unreadCount: updated.unreadCount,
      notifications: updated.notifications,
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await requireSession();

    let notificationId: string | undefined;
    try {
      const body = await request.json();
      notificationId = body?.notificationId;
    } catch {}

    if (!notificationId) {
      const { searchParams } = new URL(request.url);
      notificationId = searchParams.get('notificationId') ?? undefined;
    }

    if (!notificationId) {
      return NextResponse.json(
        { success: false, error: 'notificationId is required.' },
        { status: 400 }
      );
    }

    await deleteNotification(session.userId, notificationId);

    return NextResponse.json({ success: true, message: 'Notification deleted.' });
  } catch (error) {
    return authErrorResponse(error);
  }
}
