import prisma from '@/lib/db';
import { sendEmail, appUrl } from '@/lib/email';

export type NotificationType =
  | 'APPLICATION_STAGE'
  | 'INTERVIEW_SCHEDULED'
  | 'OFFER_RECEIVED'
  | 'OFFER_ACCEPTED'
  | 'OFFER_DECLINED'
  | 'OFFER_VERIFIED'
  | 'JOINING_UPDATE'
  | 'OFFER_EXTENDED'
  | 'ASSESSMENT_ASSIGNED'
  | 'APPLICATION_REJECTED'
  | 'MENTORSHIP_BOOKED'
  | 'MENTORSHIP_REMINDER'
  | 'MENTORSHIP_CANCELLED'
  | 'MENTORSHIP_COMPLETED'
  | 'REFERRAL_APPLIED'
  | 'REFERRAL_STATUS'
  | 'REFERRAL_REWARD'
  | 'BROADCAST'
  | 'SYSTEM';

export interface NotificationMetadata {
  applicationId?: string;
  driveId?: string;
  companyName?: string;
  roleTitle?: string;
  newStatus?: string;
  rejectionReason?: string;
  meetingLink?: string;
  scheduledAt?: string;
  roundName?: string;
  ctc?: string;
  bookingId?: string;
  referralId?: string;
  points?: number;
  [key: string]: unknown;
}

export interface NotificationItem {
  id: string;
  userId: string;
  institutionId?: string | null;
  type: string;
  title: string;
  message: string;
  read: boolean;
  readAt?: Date | null;
  metadata?: NotificationMetadata;
  actionUrl?: string | null;
  createdAt: Date | string;
}

/**
 * Creates and persists a notification for a user in the Notification table,
 * and sends an email alert if userEmail is supplied.
 */
export async function sendPipelineNotification(params: {
  userId: string;
  userEmail?: string;
  userName?: string;
  institutionId?: string | null;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string;
  metadata?: NotificationMetadata;
}): Promise<NotificationItem> {
  const { userId, userEmail, userName, institutionId, type, title, message, actionUrl, metadata } = params;

  let createdNotification: NotificationItem;

  try {
    const record = await prisma.notification.create({
      data: {
        userId,
        institutionId: institutionId || null,
        type,
        title,
        message,
        read: false,
        actionUrl: actionUrl || null,
        metadata: metadata ? JSON.stringify(metadata) : '{}',
      },
    });

    createdNotification = {
      id: record.id,
      userId: record.userId,
      institutionId: record.institutionId,
      type: record.type,
      title: record.title,
      message: record.message,
      read: record.read,
      readAt: record.readAt,
      actionUrl: record.actionUrl,
      metadata,
      createdAt: record.createdAt,
    };
  } catch (err) {
    console.warn('Fallback to memory/audit log notification due to DB error:', err);
    createdNotification = {
      id: `notif_${Date.now()}`,
      userId,
      institutionId,
      type,
      title,
      message,
      read: false,
      actionUrl: actionUrl || null,
      metadata,
      createdAt: new Date().toISOString(),
    };
  }

  // Also log to AuditLog for security and timeline audit trail
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        institutionId: institutionId || null,
        action: 'USER_NOTIFICATION',
        details: JSON.stringify({
          notificationId: createdNotification.id,
          type,
          title,
          message,
        }),
      },
    });
  } catch {}

  // Dispatch Email Notification (fire & forget)
  if (userEmail) {
    const targetUrl = actionUrl || appUrl('/student');
    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 16px; background: #ffffff;">
        <div style="margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between;">
          <span style="display: inline-block; padding: 6px 14px; font-size: 11px; font-weight: 700; color: #2563eb; background: #eff6ff; border-radius: 24px; text-transform: uppercase; letter-spacing: 0.5px;">
            CareerOS Notification
          </span>
          <span style="font-size: 12px; color: #94a3b8;">${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
        </div>
        <h2 style="color: #0f172a; margin-top: 0; font-size: 22px; font-weight: 700; line-height: 1.3;">${title}</h2>
        <p style="color: #475569; font-size: 14px; line-height: 1.6;">
          Hello <strong>${userName || 'Scholar'}</strong>,
        </p>
        <div style="color: #1e293b; font-size: 14px; line-height: 1.6; background: #f8fafc; padding: 18px; border-radius: 12px; border-left: 4px solid #2563eb; margin: 20px 0;">
          ${message}
        </div>
        ${
          metadata?.meetingLink
            ? `<div style="margin: 24px 0;">
                <a href="${metadata.meetingLink}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; box-shadow: 0 2px 4px rgba(37,99,235,0.2);">
                  👉 Join Live Session
                </a>
              </div>`
            : targetUrl
            ? `<div style="margin: 24px 0;">
                <a href="${targetUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background: #0f172a; color: #ffffff; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 13px;">
                  Open CareerOS Dashboard
                </a>
              </div>`
            : ''
        }
        <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #f1f5f9; font-size: 12px; color: #94a3b8; text-align: center;">
          PlacementHub · Institutional Placement & Career Operating System
        </div>
      </div>
    `;

    sendEmail({
      to: userEmail,
      subject: `[CareerOS] ${title}`,
      html: emailHtml,
    }).catch((err) => {
      console.warn('Non-fatal: email delivery failed:', err);
    });
  }

  return createdNotification;
}

/**
 * Retrieves notifications for a given user from the Notification table.
 */
export async function getUserNotifications(
  userId: string,
  limit = 50,
  unreadOnly = false
): Promise<{ notifications: NotificationItem[]; unreadCount: number }> {
  try {
    const where: any = { userId };
    if (unreadOnly) where.read = false;

    const [records, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.notification.count({
        where: { userId, read: false },
      }),
    ]);

    const notifications: NotificationItem[] = records.map((r) => {
      let parsedMetadata: NotificationMetadata | undefined;
      if (r.metadata) {
        try {
          parsedMetadata = JSON.parse(r.metadata);
        } catch {}
      }
      return {
        id: r.id,
        userId: r.userId,
        institutionId: r.institutionId,
        type: r.type,
        title: r.title,
        message: r.message,
        read: r.read,
        readAt: r.readAt,
        actionUrl: r.actionUrl,
        metadata: parsedMetadata,
        createdAt: r.createdAt,
      };
    });

    return { notifications, unreadCount };
  } catch (err) {
    console.error('Error reading user notifications from Notification table:', err);
    return { notifications: [], unreadCount: 0 };
  }
}

/**
 * Marks a specific notification or all notifications as read for a user.
 */
export async function markNotificationAsRead(
  userId: string,
  notificationId?: string
): Promise<void> {
  const now = new Date();
  if (notificationId) {
    await prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { read: true, readAt: now },
    });
  } else {
    await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true, readAt: now },
    });
  }
}

/**
 * Deletes a notification belonging to the user.
 */
export async function deleteNotification(userId: string, notificationId: string): Promise<void> {
  await prisma.notification.deleteMany({
    where: { id: notificationId, userId },
  });
}

/**
 * Broadcasts an announcement or alert to users across an institution or specific role.
 */
export async function sendBroadcastNotification(params: {
  institutionId: string;
  role?: string;
  type?: NotificationType;
  title: string;
  message: string;
  actionUrl?: string;
  senderUserId: string;
  sendEmail?: boolean;
}): Promise<number> {
  const {
    institutionId,
    role,
    type = 'BROADCAST',
    title,
    message,
    actionUrl,
    senderUserId,
    sendEmail: shouldEmail = false,
  } = params;

  const where: any = { institutionId, isActive: true };
  if (role && role !== 'ALL') {
    where.role = role;
  }

  const users = await prisma.user.findMany({
    where,
    select: { id: true, email: true, name: true },
  });

  if (users.length === 0) return 0;

  const notificationsToInsert = users.map((u) => ({
    userId: u.id,
    institutionId,
    type,
    title,
    message,
    read: false,
    actionUrl: actionUrl || null,
    metadata: JSON.stringify({ senderUserId, broadcast: true }),
  }));

  await prisma.notification.createMany({
    data: notificationsToInsert,
  });

  // Audit log of broadcast
  await prisma.auditLog.create({
    data: {
      userId: senderUserId,
      institutionId,
      action: 'BROADCAST_NOTIFICATION',
      details: JSON.stringify({
        title,
        recipientCount: users.length,
        roleFilter: role || 'ALL',
        sendEmail: shouldEmail,
      }),
    },
  });

  // Send batch emails if requested
  if (shouldEmail) {
    for (const u of users) {
      const emailHtml = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
          <div style="margin-bottom: 16px;">
            <span style="background: #7c3aed; color: #ffffff; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 700;">
              CAMPUS ANNOUNCEMENT
            </span>
          </div>
          <h2 style="color: #0f172a; margin-top: 0;">${title}</h2>
          <p style="color: #334155; font-size: 14px; line-height: 1.6;">Hello ${u.name || 'Member'},</p>
          <div style="background: #f8fafc; border-left: 4px solid #7c3aed; padding: 14px; border-radius: 8px; color: #1e293b; font-size: 14px; line-height: 1.6;">
            ${message}
          </div>
          ${
            actionUrl
              ? `<div style="margin-top: 20px;">
                  <a href="${actionUrl}" style="background: #7c3aed; color: #ffffff; padding: 10px 18px; border-radius: 8px; text-decoration: none; font-size: 13px; font-weight: 600;">View Details</a>
                </div>`
              : ''
          }
        </div>
      `;

      sendEmail({
        to: u.email,
        subject: `[Campus Notice] ${title}`,
        html: emailHtml,
      }).catch((e) => console.warn(`Broadcast email error for ${u.email}:`, e));
    }
  }

  return users.length;
}

/**
 * Returns unread and total notification statistics for a user.
 */
export async function getNotificationStats(
  userId: string
): Promise<{ total: number; unread: number; read: number }> {
  try {
    const [total, unread] = await Promise.all([
      prisma.notification.count({ where: { userId } }),
      prisma.notification.count({ where: { userId, read: false } }),
    ]);
    return { total, unread, read: total - unread };
  } catch (err) {
    console.error('Error fetching notification stats:', err);
    return { total: 0, unread: 0, read: 0 };
  }
}

/**
 * Dispatches automated reminders for upcoming scheduled sessions or deadlines.
 */
export async function dispatchAutomatedReminders(): Promise<{
  interviewReminders: number;
  mentorshipReminders: number;
}> {
  let interviewReminders = 0;
  let mentorshipReminders = 0;

  const now = new Date();
  const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // 1. Upcoming Interview schedules in next 24h
  try {
    const upcomingInterviews = await prisma.interviewSchedule.findMany({
      where: {
        scheduledAt: { gte: now, lte: next24h },
        status: 'SCHEDULED',
      },
      include: {
        application: {
          include: {
            studentProfile: { include: { user: true } },
            drive: true,
          },
        },
      },
    });

    for (const interview of upcomingInterviews) {
      const studentUser = interview.application.studentProfile.user;
      await sendPipelineNotification({
        userId: studentUser.id,
        userEmail: studentUser.email,
        userName: studentUser.name,
        type: 'INTERVIEW_SCHEDULED',
        title: `Upcoming Interview: ${interview.application.drive?.companyName || 'Company'} - ${interview.roundName}`,
        message: `Your ${interview.roundName} interview is scheduled for ${new Date(interview.scheduledAt).toLocaleString()}. Ensure you join on time!`,
        actionUrl: appUrl('/student'),
        metadata: {
          roundName: interview.roundName,
          scheduledAt: interview.scheduledAt.toISOString(),
          meetingLink: interview.meetingLink || undefined,
        },
      });
      interviewReminders++;
    }
  } catch (e) {
    console.error('Error dispatching interview reminders:', e);
  }

  // 2. Upcoming Mentorship bookings with reminderSentAt = null
  try {
    const upcomingBookings = await prisma.mentorshipBooking.findMany({
      where: {
        status: 'CONFIRMED',
        reminderSentAt: null,
      },
      include: {
        slot: {
          include: {
            alumniProfile: { include: { user: true } },
          },
        },
        studentProfile: { include: { user: true } },
      },
    });

    for (const booking of upcomingBookings) {
      const studentUser = booking.studentProfile.user;
      const mentorUser = booking.slot.alumniProfile.user;
      const sessionDate = `${booking.slot.date} at ${booking.slot.timeSlot}`;
      const meetingLink = booking.meetingLink || booking.slot.meetingLink || 'https://meet.google.com/new';

      // Notify student
      await sendPipelineNotification({
        userId: studentUser.id,
        userEmail: studentUser.email,
        userName: studentUser.name,
        type: 'MENTORSHIP_REMINDER',
        title: `Reminder: Mentorship Session on "${booking.slot.topic}"`,
        message: `Your mentorship session with ${mentorUser.name} (${booking.slot.alumniProfile.currentRole} at ${booking.slot.alumniProfile.currentCompany}) is coming up on ${sessionDate}.`,
        actionUrl: appUrl('/student'),
        metadata: {
          bookingId: booking.id,
          meetingLink,
        },
      });

      // Notify mentor
      await sendPipelineNotification({
        userId: mentorUser.id,
        userEmail: mentorUser.email,
        userName: mentorUser.name,
        type: 'MENTORSHIP_REMINDER',
        title: `Reminder: Mentorship Session with ${studentUser.name}`,
        message: `You have an upcoming mentorship session on "${booking.slot.topic}" with ${studentUser.name} on ${sessionDate}.`,
        actionUrl: appUrl('/student'),
        metadata: {
          bookingId: booking.id,
          meetingLink,
        },
      });

      await prisma.mentorshipBooking.update({
        where: { id: booking.id },
        data: { reminderSentAt: new Date() },
      });

      mentorshipReminders++;
    }
  } catch (e) {
    console.error('Error dispatching mentorship reminders:', e);
  }

  return { interviewReminders, mentorshipReminders };
}
