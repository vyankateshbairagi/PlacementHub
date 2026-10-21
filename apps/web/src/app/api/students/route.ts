import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireSameInstitution, requireSession } from '@/lib/auth';
import { authErrorResponse } from '@/lib/auth-http';
import { studentProfileInclude, toPrivateStudentDto, toPublicStudentDto } from '@/lib/student-profile';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    if (slug) {
      const student = await prisma.studentProfile.findFirst({
        where: { isPublic: true, talentPassportSlug: { equals: slug, mode: 'insensitive' } },
        include: studentProfileInclude,
      });
      if (!student) return NextResponse.json({ success: false, error: 'Public student profile not found.' }, { status: 404 });
      return NextResponse.json({ success: true, student: toPublicStudentDto(student) });
    }

    const session = await requireSession(['STUDENT', 'TPO', 'RECRUITER', 'FACULTY', 'INSTITUTE_ADMIN', 'SUPER_ADMIN']);
    const email = searchParams.get('email');
    if (email) {
      const student = await prisma.studentProfile.findFirst({ where: { user: { email: { equals: email, mode: 'insensitive' } } }, include: studentProfileInclude });
      if (!student) return NextResponse.json({ success: false, error: 'Student profile not found.' }, { status: 404 });
      if (session.role === 'STUDENT' && student.userId !== session.userId) return NextResponse.json({ success: false, error: 'Forbidden.' }, { status: 403 });
      requireSameInstitution(session, student.user.institutionId);
      return NextResponse.json({ success: true, student: toPrivateStudentDto(student) });
    }
    if (session.role === 'STUDENT') return NextResponse.json({ success: false, error: 'Students cannot browse the private student directory.' }, { status: 403 });

    const department = searchParams.get('department');
    const minCgpa = Number(searchParams.get('minCgpa'));
    const maxBacklogs = Number(searchParams.get('maxBacklogs'));
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const where: any = session.role === 'SUPER_ADMIN' || session.role === 'RECRUITER'
      ? {}
      : { user: { institutionId: session.institutionId } };
    if (department && department !== 'ALL') where.department = department;
    if (Number.isFinite(minCgpa) && searchParams.has('minCgpa')) where.cgpa = { gte: minCgpa };
    if (Number.isFinite(maxBacklogs) && searchParams.has('maxBacklogs')) where.backlogsCount = { lte: maxBacklogs };
    if (status && status !== 'ALL') where.placementStatus = status;
    if (search) where.OR = [
      { user: { name: { contains: search, mode: 'insensitive' } } },
      { rollNo: { contains: search, mode: 'insensitive' } },
      { skills: { contains: search, mode: 'insensitive' } },
    ];
    const students = await prisma.studentProfile.findMany({ where, include: studentProfileInclude, orderBy: { cgpa: 'desc' }, take: 250 });
    const dto = session.role === 'RECRUITER' ? students.filter((student) => student.isPublic).map(toPublicStudentDto) : students.map(toPrivateStudentDto);
    return NextResponse.json({ success: true, count: dto.length, students: dto });
  } catch (error) { return authErrorResponse(error); }
}
