import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireSession } from '@/lib/auth';
import { authErrorResponse } from '@/lib/auth-http';

export const dynamic = 'force-dynamic';

const DEFAULT_TEMPLATES = [
  {
    key: 'INTERVIEW_REMINDER',
    name: 'Interview Reminder',
    subject: '[CareerOS] Upcoming Interview Reminder: {{companyName}} - {{roundName}}',
    bodyTemplate: 'Hi {{studentName}}, your {{roundName}} interview with {{companyName}} is scheduled for {{scheduledAt}}. Link: {{meetingLink}}',
    channels: 'IN_APP,EMAIL',
  },
  {
    key: 'OFFER_EXTENDED',
    name: 'Offer Letter Extended',
    subject: '[CareerOS] Congratulations! Offer Extended from {{companyName}}',
    bodyTemplate: 'Hi {{studentName}}, congratulations! You have received a job offer from {{companyName}} for the role of {{roleTitle}} at {{ctc}}.',
    channels: 'IN_APP,EMAIL',
  },
  {
    key: 'MENTORSHIP_SLOT_BOOKED',
    name: 'Mentorship Session Booked',
    subject: '[CareerOS] Mentorship Session Confirmed: {{topic}}',
    bodyTemplate: 'Hello {{name}}, a mentorship session has been scheduled for {{date}} at {{timeSlot}}. Meeting URL: {{meetingLink}}',
    channels: 'IN_APP,EMAIL',
  },
  {
    key: 'REFERRAL_UPDATE',
    name: 'Referral Application Update',
    subject: '[CareerOS] Referral Update: {{company}} - {{jobTitle}}',
    bodyTemplate: 'Hi {{studentName}}, your referral request for {{jobTitle}} at {{company}} has been updated to {{status}}.',
    channels: 'IN_APP,EMAIL',
  },
];

export async function GET() {
  try {
    await requireSession();

    let templates = await prisma.notificationTemplate.findMany({
      orderBy: { key: 'asc' },
    });

    if (templates.length === 0) {
      // Seed default templates
      await prisma.notificationTemplate.createMany({
        data: DEFAULT_TEMPLATES,
        skipDuplicates: true,
      });
      templates = await prisma.notificationTemplate.findMany({
        orderBy: { key: 'asc' },
      });
    }

    return NextResponse.json({ success: true, count: templates.length, templates });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireSession(['TPO', 'INSTITUTE_ADMIN', 'SUPER_ADMIN']);
    const body = await request.json();
    const { key, name, subject, bodyTemplate, channels } = body;

    if (!key || !name || !subject || !bodyTemplate) {
      return NextResponse.json(
        { success: false, error: 'key, name, subject, and bodyTemplate are required.' },
        { status: 400 }
      );
    }

    const template = await prisma.notificationTemplate.upsert({
      where: { key },
      update: {
        name,
        subject,
        bodyTemplate,
        channels: channels || 'IN_APP,EMAIL',
      },
      create: {
        key,
        name,
        subject,
        bodyTemplate,
        channels: channels || 'IN_APP,EMAIL',
      },
    });

    return NextResponse.json({ success: true, template });
  } catch (error) {
    return authErrorResponse(error);
  }
}
