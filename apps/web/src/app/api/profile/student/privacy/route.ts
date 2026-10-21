import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireSession } from '@/lib/auth';
import { authErrorResponse } from '@/lib/auth-http';

const FIELDS = ['isPublic', 'showEmailPublic', 'showPhonePublic', 'showAcademicsPublic', 'showProjectsPublic', 'showExperiencePublic', 'showResumePublic'] as const;
const privacySelect = { isPublic: true, showEmailPublic: true, showPhonePublic: true, showAcademicsPublic: true, showProjectsPublic: true, showExperiencePublic: true, showResumePublic: true } as const;

export async function GET() {
  try {
    const session = await requireSession(['STUDENT']);
    const privacy = await prisma.studentProfile.findUnique({ where: { userId: session.userId }, select: privacySelect });
    return NextResponse.json({ success: true, privacy });
  } catch (error) { return authErrorResponse(error); }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireSession(['STUDENT']);
    const body = await req.json();
    const data: Record<string, boolean> = {};
    for (const field of FIELDS) if (typeof body[field] === 'boolean') data[field] = body[field];
    if (!Object.keys(data).length) return NextResponse.json({ success: false, error: 'No valid privacy setting supplied.' }, { status: 400 });
    const privacy = await prisma.studentProfile.update({ where: { userId: session.userId }, data, select: privacySelect });
    return NextResponse.json({ success: true, privacy });
  } catch (error) { return authErrorResponse(error); }
}
