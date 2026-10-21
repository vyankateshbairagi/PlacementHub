import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireSession } from '@/lib/auth';
import { authErrorResponse } from '@/lib/auth-http';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const slot = await prisma.mentorshipSlot.findUnique({
      where: { id: params.id },
      include: {
        alumniProfile: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        bookings: {
          include: {
            studentProfile: {
              include: {
                user: { select: { id: true, name: true, email: true } },
              },
            },
          },
        },
      },
    });

    if (!slot) {
      return NextResponse.json({ success: false, error: 'Slot not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, slot });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireSession(['ALUMNI']);
    const body = await request.json();
    const { topic, description, date, timeSlot, durationMinutes, isBooked } = body;

    const slot = await prisma.mentorshipSlot.findUnique({
      where: { id: params.id },
      include: { alumniProfile: true },
    });

    if (!slot) {
      return NextResponse.json({ success: false, error: 'Slot not found' }, { status: 404 });
    }

    if (slot.alumniProfile.userId !== session.userId) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You do not own this slot' },
        { status: 403 }
      );
    }

    const updated = await prisma.mentorshipSlot.update({
      where: { id: params.id },
      data: {
        ...(topic && { topic }),
        ...(description && { description }),
        ...(date && { date: String(date) }),
        ...(timeSlot && { timeSlot }),
        ...(durationMinutes !== undefined && { durationMinutes: Number(durationMinutes) }),
        ...(isBooked !== undefined && { isBooked: Boolean(isBooked) }),
      },
    });

    return NextResponse.json({ success: true, slot: updated });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireSession(['ALUMNI']);

    const slot = await prisma.mentorshipSlot.findUnique({
      where: { id: params.id },
      include: { alumniProfile: true, bookings: true },
    });

    if (!slot) {
      return NextResponse.json({ success: false, error: 'Slot not found' }, { status: 404 });
    }

    if (slot.alumniProfile.userId !== session.userId) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You do not own this slot' },
        { status: 403 }
      );
    }

    if (slot.isBooked || slot.bookings.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete a slot that already has bookings.' },
        { status: 400 }
      );
    }

    await prisma.mentorshipSlot.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true, message: 'Slot deleted successfully.' });
  } catch (error) {
    return authErrorResponse(error);
  }
}

