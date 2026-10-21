import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { authErrorResponse } from '@/lib/auth-http';
import { sendBroadcastNotification, NotificationType } from '@/lib/notification-service';

export const dynamic = 'force-dynamic';

/** Roles that are authorised to send institution-wide broadcast notifications. */
const BROADCAST_ALLOWED_ROLES = ['TPO', 'INSTITUTE_ADMIN', 'SUPER_ADMIN'] as const;

/**
 * POST /api/notifications/broadcast
 *
 * Sends a notification (and optionally an email) to every active user in the
 * caller's institution.
 *
 * Required roles: TPO | INSTITUTE_ADMIN | SUPER_ADMIN
 *
 * Request body:
 * ```json
 * {
 *   "title":     "string  (required)",
 *   "message":   "string  (required)",
 *   "type":      "NotificationType (optional, defaults to 'SYSTEM')",
 *   "sendEmail": "boolean (optional, defaults to false)"
 * }
 * ```
 *
 * Response:
 * ```json
 * { "success": true, "recipientCount": 42, "message": "Broadcast sent to 42 user(s)." }
 * ```
 */
export async function POST(request: Request) {
  try {
    // Enforce role-based access before doing anything else
    const session = await requireSession(BROADCAST_ALLOWED_ROLES);

    // SUPER_ADMIN operates across institutions; all others require an institutionId
    if (!session.institutionId && session.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Your account is not associated with an institution.' },
        { status: 403 }
      );
    }

    // Parse and validate body
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Request body must be valid JSON.' },
        { status: 400 }
      );
    }

    const { title, message, type, sendEmail } = body as {
      title?: string;
      message?: string;
      type?: NotificationType;
      sendEmail?: boolean;
    };

    if (!title || typeof title !== 'string' || title.trim() === '') {
      return NextResponse.json(
        { success: false, error: '`title` is required and must be a non-empty string.' },
        { status: 400 }
      );
    }

    if (!message || typeof message !== 'string' || message.trim() === '') {
      return NextResponse.json(
        { success: false, error: '`message` is required and must be a non-empty string.' },
        { status: 400 }
      );
    }

    // Validate the optional `type` field
    const VALID_TYPES: NotificationType[] = [
      'APPLICATION_STAGE',
      'INTERVIEW_SCHEDULED',
      'OFFER_RECEIVED',
      'OFFER_ACCEPTED',
      'OFFER_DECLINED',
      'OFFER_VERIFIED',
      'JOINING_UPDATE',
      'OFFER_EXTENDED',
      'ASSESSMENT_ASSIGNED',
      'APPLICATION_REJECTED',
      'SYSTEM',
    ];
    const resolvedType: NotificationType =
      type && VALID_TYPES.includes(type) ? type : 'SYSTEM';

    const recipientCount = await sendBroadcastNotification({
      institutionId: session.institutionId as string,
      type: resolvedType,
      title: title.trim(),
      message: message.trim(),
      senderUserId: session.userId,
      sendEmail: sendEmail === true,
    });

    return NextResponse.json({
      success: true,
      recipientCount,
      message: `Broadcast sent to ${recipientCount} user(s).`,
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
