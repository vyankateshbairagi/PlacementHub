import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/db';
import { deleteResumeVersion } from '@/lib/resume-service';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = params;
    const resume = await prisma.resume.findUnique({
      where: { id },
      include: {
        studentProfile: {
          select: {
            userId: true,
            user: { select: { name: true, email: true } },
          },
        },
      },
    });

    if (!resume) {
      return NextResponse.json({ error: 'Resume not found' }, { status: 404 });
    }

    // Role check: student owner or institutional staff
    if (
      session.role === 'STUDENT' &&
      resume.studentProfile.userId !== session.userId
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let parsedData = null;
    try {
      if (resume.parsedData) parsedData = JSON.parse(resume.parsedData);
    } catch {}

    return NextResponse.json({
      resume: {
        id: resume.id,
        title: resume.title,
        version: resume.version,
        targetRole: resume.targetRole,
        fileUrl: resume.fileUrl,
        atsScore: resume.atsScore,
        isDefault: resume.isDefault,
        parsedData,
        createdAt: resume.createdAt,
        updatedAt: resume.updatedAt,
        studentName: resume.studentProfile.user.name,
      },
    });
  } catch (err: any) {
    console.error('Error fetching resume:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Unauthorized: Student account required' }, { status: 403 });
    }

    const { id } = params;
    const student = await prisma.studentProfile.findUnique({
      where: { userId: session.userId },
      select: { id: true },
    });

    if (!student) {
      return NextResponse.json({ error: 'Student profile not found' }, { status: 404 });
    }

    const resume = await prisma.resume.findFirst({
      where: { id, studentProfileId: student.id },
    });

    if (!resume) {
      return NextResponse.json({ error: 'Resume not found or unauthorized' }, { status: 404 });
    }

    const body = await req.json();
    const updateData: any = {};

    if (body.title && typeof body.title === 'string') updateData.title = body.title.trim();
    if (body.targetRole && typeof body.targetRole === 'string') updateData.targetRole = body.targetRole.trim();
    if (body.version && typeof body.version === 'string') updateData.version = body.version.trim();
    if (body.atsScore !== undefined) updateData.atsScore = Number(body.atsScore);
    if (body.parsedData !== undefined) {
      updateData.parsedData = typeof body.parsedData === 'string' ? body.parsedData : JSON.stringify(body.parsedData);
    }

    const updated = await prisma.resume.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ resume: updated, message: 'Resume updated successfully' });
  } catch (err: any) {
    console.error('Error updating resume:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = params;
    const result = await deleteResumeVersion(id, session.userId);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Error deleting resume:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 400 });
  }
}

