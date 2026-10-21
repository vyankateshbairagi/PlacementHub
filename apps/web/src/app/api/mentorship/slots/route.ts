import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession, requireSession } from '@/lib/auth';
import { authErrorResponse } from '@/lib/auth-http';

export const dynamic = 'force-dynamic';

/**
 * GET /api/mentorship/slots
 * Public-friendly: returns available (isBooked=false) slots with alumni info.
 * Supports filters: topic, date, alumniProfileId
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const topic = searchParams.get('topic');
    const date = searchParams.get('date');
    const alumniProfileId = searchParams.get('alumniProfileId');

    // Build where clause
    const where: Record<string, unknown> = { isBooked: false };
    if (topic) where.topic = { contains: topic, mode: 'insensitive' };
    if (alumniProfileId) where.alumniProfileId = alumniProfileId;
    if (date) {
      // Filter by date string match (slots store date as DateTime/string)
      const targetDate = new Date(date);
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);
      where.date = { gte: targetDate, lt: nextDay };
    }

    const slots = await prisma.mentorshipSlot.findMany({
      where,
      include: {
        alumniProfile: {
          select: {
            id: true,
            currentCompany: true,
            currentRole: true,
            linkedinUrl: true,
            isMentorAvailable: true,
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
      orderBy: { date: 'asc' },
      take: 100,
    });

    return NextResponse.json({ success: true, count: slots.length, slots });
  } catch (error) {
    return authErrorResponse(error);
  }
}

/**
 * POST /api/mentorship/slots
 * ALUMNI only — creates a new mentorship slot linked to the current user's AlumniProfile.
 * Body: { topic, description, date, timeSlot, durationMinutes? }
 */
export async function POST(request: Request) {
  try {
    const session = await requireSession(['ALUMNI']);
    const body = await request.json();
    const { topic, description, date, timeSlot, durationMinutes } = body;

    // Validate required fields
    if (!topic || !description || !date || !timeSlot) {
      return NextResponse.json(
        { success: false, error: 'topic, description, date, and timeSlot are required.' },
        { status: 400 }
      );
    }

    // Fetch the AlumniProfile for the current user
    const alumniProfile = await prisma.alumniProfile.findUnique({
      where: { userId: session.userId },
      select: { id: true, isMentorAvailable: true },
    });

    if (!alumniProfile) {
      return NextResponse.json(
        { success: false, error: 'Alumni profile not found. Please complete your profile first.' },
        { status: 404 }
      );
    }

    if (!alumniProfile.isMentorAvailable) {
      return NextResponse.json(
        { success: false, error: 'Your profile is not marked as available for mentorship. Please enable mentor availability.' },
        { status: 403 }
      );
    }

    const slot = await prisma.mentorshipSlot.create({
      data: {
        alumniProfileId: alumniProfile.id,
        topic,
        description,
        date: String(date),
        timeSlot,
        durationMinutes: durationMinutes ?? 30,
        isBooked: false,
      },
      include: {
        alumniProfile: {
          select: {
            id: true,
            currentCompany: true,
            currentRole: true,
            linkedinUrl: true,
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        institutionId: session.institutionId ?? null,
        action: 'MENTORSHIP_SLOT_CREATED',
        details: JSON.stringify({ slotId: slot.id, topic, date, timeSlot }),
      },
    });

    return NextResponse.json({ success: true, message: 'Mentorship slot created.', slot }, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}

/**
 * PATCH /api/mentorship/slots
 * ALUMNI only — updates an existing slot (must be owned by the caller).
 * Body: { slotId, topic?, description?, date?, timeSlot?, durationMinutes?, isBooked? }
 */
export async function PATCH(request: Request) {
  try {
    const session = await requireSession(['ALUMNI', 'SUPER_ADMIN']);
    const body = await request.json();
    const { slotId, topic, description, date, timeSlot, durationMinutes, isBooked } = body;

    if (!slotId) {
      return NextResponse.json({ success: false, error: 'slotId is required.' }, { status: 400 });
    }

    const slot = await prisma.mentorshipSlot.findUnique({
      where: { id: slotId },
      include: { alumniProfile: true },
    });

    if (!slot) {
      return NextResponse.json({ success: false, error: 'Slot not found.' }, { status: 404 });
    }

    if (session.role === 'ALUMNI' && slot.alumniProfile.userId !== session.userId) {
      return NextResponse.json({ success: false, error: 'Forbidden: You do not own this slot.' }, { status: 403 });
    }

    const updated = await prisma.mentorshipSlot.update({
      where: { id: slotId },
      data: {
        ...(topic ? { topic } : {}),
        ...(description ? { description } : {}),
        ...(date ? { date: String(date) } : {}),
        ...(timeSlot ? { timeSlot } : {}),
        ...(durationMinutes !== undefined ? { durationMinutes: Number(durationMinutes) } : {}),
        ...(isBooked !== undefined ? { isBooked: Boolean(isBooked) } : {}),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        institutionId: session.institutionId ?? null,
        action: 'MENTORSHIP_SLOT_UPDATED',
        details: JSON.stringify({ slotId, changes: body }),
      },
    });

    return NextResponse.json({ success: true, message: 'Slot updated successfully.', slot: updated });
  } catch (error) {
    return authErrorResponse(error);
  }
}

/**
 * DELETE /api/mentorship/slots
 * ALUMNI or SUPER_ADMIN — deletes an unbooked slot.
 * Accepts slotId in query params (?slotId=...) or body.
 */
export async function DELETE(request: Request) {
  try {
    const session = await requireSession(['ALUMNI', 'SUPER_ADMIN']);
    let slotId: string | undefined;

    try {
      const body = await request.json();
      slotId = body?.slotId;
    } catch {
      // Body not provided, try search params
    }

    if (!slotId) {
      const { searchParams } = new URL(request.url);
      slotId = searchParams.get('slotId') || searchParams.get('id') || undefined;
    }

    if (!slotId) {
      return NextResponse.json({ success: false, error: 'slotId is required.' }, { status: 400 });
    }

    const slot = await prisma.mentorshipSlot.findUnique({
      where: { id: slotId },
      include: { alumniProfile: true },
    });

    if (!slot) {
      return NextResponse.json({ success: false, error: 'Slot not found.' }, { status: 404 });
    }

    if (session.role === 'ALUMNI' && slot.alumniProfile.userId !== session.userId) {
      return NextResponse.json({ success: false, error: 'Forbidden: You do not own this slot.' }, { status: 403 });
    }

    if (slot.isBooked) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete an already booked slot. Cancel the booking first.' },
        { status: 400 }
      );
    }

    await prisma.mentorshipSlot.delete({
      where: { id: slotId },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        institutionId: session.institutionId ?? null,
        action: 'MENTORSHIP_SLOT_DELETED',
        details: JSON.stringify({ slotId, topic: slot.topic }),
      },
    });

    return NextResponse.json({ success: true, message: 'Mentorship slot deleted successfully.' });
  } catch (error) {
    return authErrorResponse(error);
  }
}
