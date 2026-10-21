import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/db';
import { listStudentResumes, createResumeVersion } from '@/lib/resume-service';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const targetStudentId = searchParams.get('studentId');

    let targetUserId = session.userId;

    if (targetStudentId && ['TPO', 'RECRUITER', 'FACULTY'].includes(session.role)) {
      const student = await prisma.studentProfile.findUnique({
        where: { id: targetStudentId },
        select: { userId: true },
      });
      if (!student) {
        return NextResponse.json({ error: 'Student not found' }, { status: 404 });
      }
      targetUserId = student.userId;
    }

    const resumes = await listStudentResumes(targetUserId);
    return NextResponse.json({ resumes });
  } catch (err: any) {
    console.error('Error listing resumes:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Unauthorized: Student account required' }, { status: 403 });
    }

    const body = await req.json();
    const { title, version, targetRole, fileUrl, parsedData, atsScore, isDefault } = body;

    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const newResume = await createResumeVersion({
      userId: session.userId,
      title: title.trim(),
      version,
      targetRole,
      fileUrl,
      parsedData,
      atsScore,
      isDefault: Boolean(isDefault),
    });

    return NextResponse.json({ resume: newResume, message: 'Resume version saved successfully' }, { status: 201 });
  } catch (err: any) {
    console.error('Error creating resume version:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

