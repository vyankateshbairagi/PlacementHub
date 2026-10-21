import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireSession } from '@/lib/auth';
import { authErrorResponse } from '@/lib/auth-http';
import { sendBroadcastNotification } from '@/lib/notification-service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(req.url);
    const department = searchParams.get('department') || undefined;

    const logs = await prisma.auditLog.findMany({
      where: {
        action: 'FACULTY_ASSIGNMENT',
        ...(session.role !== 'SUPER_ADMIN' && session.institutionId ? { institutionId: session.institutionId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const assignments = logs.map((log) => {
      let parsed: any = {};
      try {
        parsed = JSON.parse(log.details);
      } catch {
        parsed = {};
      }
      return {
        id: log.id,
        title: parsed.title || 'Curriculum Assignment',
        type: parsed.type || 'ROADMAP',
        roadmapSlug: parsed.roadmapSlug || null,
        targetCohort: parsed.targetCohort || 'All Batches',
        department: parsed.department || 'All Departments',
        dueDate: parsed.dueDate || null,
        instructions: parsed.instructions || '',
        assignedBy: parsed.assignedByName || 'Faculty Mentor',
        assignedAt: log.createdAt,
      };
    });

    const filtered = department
      ? assignments.filter((a) => a.department === 'All Departments' || a.department === department)
      : assignments;

    return NextResponse.json({ success: true, count: filtered.length, assignments: filtered });
  } catch (error) {
    return authErrorResponse(error, 'Failed to fetch learning assignments.');
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(['FACULTY', 'TPO', 'INSTITUTE_ADMIN', 'SUPER_ADMIN']);
    const body = await req.json();

    const {
      title,
      type = 'ROADMAP',
      roadmapSlug,
      targetCohort = 'Batch 2026',
      department = 'Computer Engineering',
      dueDate,
      instructions,
    } = body;

    if (!title?.trim()) {
      return NextResponse.json({ success: false, error: 'Assignment title is required.' }, { status: 400 });
    }

    const payload = {
      title: title.trim(),
      type,
      roadmapSlug: roadmapSlug || null,
      targetCohort,
      department,
      dueDate: dueDate || null,
      instructions: instructions || 'Please complete all assigned modules before the placement review date.',
      assignedByUserId: session.userId,
      assignedByName: session.name || 'Faculty Mentor',
      assignedAt: new Date().toISOString(),
    };

    // 1. Persist assignment in AuditLog
    const assignmentLog = await prisma.auditLog.create({
      data: {
        userId: session.userId,
        institutionId: session.institutionId ?? null,
        action: 'FACULTY_ASSIGNMENT',
        details: JSON.stringify(payload),
      },
    });

    // 2. Dispatch broadcast notification to cohort students if institution exists
    if (session.institutionId) {
      await sendBroadcastNotification({
        institutionId: session.institutionId,
        type: 'ASSESSMENT_ASSIGNED',
        title: `📚 New Faculty Assignment: ${title.trim()}`,
        message: `${session.name || 'Your Faculty Mentor'} has assigned <strong>${title.trim()}</strong> for ${targetCohort} (${department}). Due Date: ${dueDate || 'Ongoing'}. ${instructions || ''}`,
        senderUserId: session.userId,
        sendEmail: false,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Assignment "${title.trim()}" dispatched to ${targetCohort} (${department}).`,
      assignment: {
        id: assignmentLog.id,
        ...payload,
      },
    }, { status: 201 });
  } catch (error) {
    return authErrorResponse(error, 'Failed to create faculty assignment.');
  }
}
