import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireSession } from '@/lib/auth';
import { authErrorResponse } from '@/lib/auth-http';
import { cleanHttpsUrl, cleanText, getStudentProfileForUser, toPrivateStudentDto } from '@/lib/student-profile';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await requireSession(['STUDENT']);
    const profile = await getStudentProfileForUser(session.userId);
    if (!profile) return NextResponse.json({ success: false, error: 'Student profile not found.' }, { status: 404 });
    return NextResponse.json({ success: true, profile: toPrivateStudentDto(profile) });
  } catch (error) { return authErrorResponse(error); }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireSession(['STUDENT']);
    const body = await req.json();
    const existing = await prisma.studentProfile.findUnique({ where: { userId: session.userId }, select: { id: true } });
    if (!existing) return NextResponse.json({ success: false, error: 'Student profile not found.' }, { status: 404 });

    const profileData: Record<string, unknown> = {};
    const userData: Record<string, unknown> = {};
    if ('name' in body) {
      const name = cleanText(body.name, 120);
      if (!name || name.length < 2) return NextResponse.json({ success: false, error: 'Name must contain at least 2 characters.' }, { status: 400 });
      userData.name = name;
    }
    if ('phone' in body) userData.phone = cleanText(body.phone, 30);
    if ('avatarUrl' in body) userData.avatarUrl = cleanHttpsUrl(body.avatarUrl);
    for (const field of ['bio', 'gender'] as const) if (field in body) profileData[field] = cleanText(body[field], field === 'bio' ? 2000 : 50);
    for (const field of ['linkedinUrl', 'githubUrl', 'portfolioUrl'] as const) if (field in body) profileData[field] = cleanHttpsUrl(body[field]);
    for (const field of ['department', 'course', 'rollNo', 'prn'] as const) if (field in body) {
      const value = cleanText(body[field], 150);
      if (!value && field !== 'prn') return NextResponse.json({ success: false, error: `${field} cannot be empty.` }, { status: 400 });
      profileData[field] = value;
    }
    if ('graduationYear' in body) {
      const value = Number(body.graduationYear);
      if (!Number.isInteger(value) || value < 1990 || value > 2100) return NextResponse.json({ success: false, error: 'Invalid graduation year.' }, { status: 400 });
      profileData.graduationYear = value;
    }
    if ('cgpa' in body) {
      const value = Number(body.cgpa);
      if (!Number.isFinite(value) || value < 0 || value > 10) return NextResponse.json({ success: false, error: 'CGPA must be between 0 and 10.' }, { status: 400 });
      profileData.cgpa = value;
    }
    if ('backlogsCount' in body) {
      const value = Number(body.backlogsCount);
      if (!Number.isInteger(value) || value < 0 || value > 100) return NextResponse.json({ success: false, error: 'Invalid backlog count.' }, { status: 400 });
      profileData.backlogsCount = value;
    }
    if ('skills' in body) {
      if (!Array.isArray(body.skills) || body.skills.length > 50) return NextResponse.json({ success: false, error: 'skills must be an array of at most 50 entries.' }, { status: 400 });
      profileData.skills = JSON.stringify(Array.from(new Set(body.skills.map((item: unknown) => cleanText(item, 80)).filter(Boolean))));
    }
    const academicFields = ['department', 'course', 'rollNo', 'prn', 'graduationYear', 'cgpa', 'backlogsCount'];
    if (academicFields.some((field) => field in profileData)) profileData.verificationStatus = 'UNVERIFIED';

    await prisma.$transaction([
      ...(Object.keys(userData).length ? [prisma.user.update({ where: { id: session.userId }, data: userData })] : []),
      ...(Object.keys(profileData).length ? [prisma.studentProfile.update({ where: { id: existing.id }, data: profileData })] : []),
      prisma.auditLog.create({ data: { userId: session.userId, institutionId: session.institutionId, action: 'STUDENT_PROFILE_UPDATED', details: JSON.stringify({ userFields: Object.keys(userData), profileFields: Object.keys(profileData) }) } }),
    ]);
    const profile = await getStudentProfileForUser(session.userId);
    return NextResponse.json({ success: true, profile: toPrivateStudentDto(profile) });
  } catch (error) { return authErrorResponse(error); }
}

