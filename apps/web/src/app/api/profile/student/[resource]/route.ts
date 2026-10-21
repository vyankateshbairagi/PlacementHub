import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireSession } from '@/lib/auth';
import { authErrorResponse } from '@/lib/auth-http';
import { cleanHttpsUrl, cleanText, getStudentProfileForUser, toPrivateStudentDto } from '@/lib/student-profile';

type Resource = 'education' | 'projects' | 'experiences';
const RESOURCES = new Set<Resource>(['education', 'projects', 'experiences']);

async function context(resource: string) {
  if (!RESOURCES.has(resource as Resource)) return null;
  const session = await requireSession(['STUDENT']);
  const profile = await prisma.studentProfile.findUnique({ where: { userId: session.userId }, select: { id: true } });
  if (!profile) return null;
  return { session, profile, resource: resource as Resource };
}

function year(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1950 && parsed <= 2100 ? parsed : null;
}

async function responseProfile(userId: string, status = 200) {
  const profile = await getStudentProfileForUser(userId);
  return NextResponse.json({ success: true, profile: toPrivateStudentDto(profile) }, { status });
}

export async function POST(req: NextRequest, { params }: { params: { resource: string } }) {
  try {
    const ctx = await context(params.resource);
    if (!ctx) return NextResponse.json({ success: false, error: 'Unknown resource or profile.' }, { status: 404 });
    const body = await req.json();
    if (ctx.resource === 'education') {
      const institutionName = cleanText(body.institutionName, 200);
      const qualification = cleanText(body.qualification, 120);
      const startYear = year(body.startYear);
      if (!institutionName || !qualification || !startYear) return NextResponse.json({ success: false, error: 'Institution, qualification and valid start year are required.' }, { status: 400 });
      const endYear = body.endYear == null || body.endYear === '' ? null : year(body.endYear);
      if (body.endYear && !endYear) return NextResponse.json({ success: false, error: 'Invalid end year.' }, { status: 400 });
      await prisma.studentEducation.create({ data: { studentProfileId: ctx.profile.id, institutionName, qualification, startYear, endYear, fieldOfStudy: cleanText(body.fieldOfStudy, 150), score: cleanText(body.score, 50), description: cleanText(body.description, 1000), verified: false } });
    } else if (ctx.resource === 'projects') {
      const title = cleanText(body.title, 160);
      const description = cleanText(body.description, 3000);
      if (!title || !description) return NextResponse.json({ success: false, error: 'Project title and description are required.' }, { status: 400 });
      await prisma.studentProject.create({ data: { studentProfileId: ctx.profile.id, title, description, techStack: cleanText(body.techStack, 1000) || '', liveUrl: cleanHttpsUrl(body.liveUrl), githubUrl: cleanHttpsUrl(body.githubUrl), verified: false } });
    } else {
      const company = cleanText(body.company, 160);
      const role = cleanText(body.role, 160);
      const startDate = cleanText(body.startDate, 30);
      if (!company || !role || !startDate) return NextResponse.json({ success: false, error: 'Company, role and start date are required.' }, { status: 400 });
      await prisma.studentExperience.create({ data: { studentProfileId: ctx.profile.id, company, role, startDate, endDate: cleanText(body.endDate, 30), type: cleanText(body.type, 40) || 'INTERNSHIP', description: cleanText(body.description, 2000), verified: false } });
    }
    return responseProfile(ctx.session.userId, 201);
  } catch (error) { return authErrorResponse(error); }
}

export async function PATCH(req: NextRequest, { params }: { params: { resource: string } }) {
  try {
    const ctx = await context(params.resource);
    if (!ctx) return NextResponse.json({ success: false, error: 'Unknown resource or profile.' }, { status: 404 });
    const body = await req.json();
    const id = typeof body.id === 'string' ? body.id : '';
    if (!id) return NextResponse.json({ success: false, error: 'Record id is required.' }, { status: 400 });
    if (ctx.resource === 'education') {
      const record = await prisma.studentEducation.findFirst({ where: { id, studentProfileId: ctx.profile.id }, select: { id: true } });
      if (!record) return NextResponse.json({ success: false, error: 'Education record not found.' }, { status: 404 });
      const data: Record<string, unknown> = { verified: false };
      for (const field of ['institutionName', 'qualification', 'fieldOfStudy', 'score', 'description'] as const) if (field in body) data[field] = cleanText(body[field], field === 'description' ? 1000 : 200);
      for (const field of ['startYear', 'endYear'] as const) if (field in body) {
        const value = body[field] == null || body[field] === '' ? null : year(body[field]);
        if (field === 'startYear' && !value) return NextResponse.json({ success: false, error: 'A valid start year is required.' }, { status: 400 });
        data[field] = value;
      }
      await prisma.studentEducation.update({ where: { id }, data });
    } else if (ctx.resource === 'projects') {
      const record = await prisma.studentProject.findFirst({ where: { id, studentProfileId: ctx.profile.id }, select: { id: true } });
      if (!record) return NextResponse.json({ success: false, error: 'Project not found.' }, { status: 404 });
      const data: Record<string, unknown> = { verified: false };
      for (const field of ['title', 'description', 'techStack'] as const) if (field in body) data[field] = cleanText(body[field], field === 'description' ? 3000 : 1000) || '';
      for (const field of ['liveUrl', 'githubUrl'] as const) if (field in body) data[field] = cleanHttpsUrl(body[field]);
      await prisma.studentProject.update({ where: { id }, data });
    } else {
      const record = await prisma.studentExperience.findFirst({ where: { id, studentProfileId: ctx.profile.id }, select: { id: true } });
      if (!record) return NextResponse.json({ success: false, error: 'Experience not found.' }, { status: 404 });
      const data: Record<string, unknown> = { verified: false };
      for (const field of ['company', 'role', 'type', 'startDate', 'endDate', 'description'] as const) if (field in body) data[field] = cleanText(body[field], field === 'description' ? 2000 : 160);
      await prisma.studentExperience.update({ where: { id }, data });
    }
    return responseProfile(ctx.session.userId);
  } catch (error) { return authErrorResponse(error); }
}

export async function DELETE(req: NextRequest, { params }: { params: { resource: string } }) {
  try {
    const ctx = await context(params.resource);
    if (!ctx) return NextResponse.json({ success: false, error: 'Unknown resource or profile.' }, { status: 404 });
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'Record id is required.' }, { status: 400 });
    if (ctx.resource === 'education') await prisma.studentEducation.deleteMany({ where: { id, studentProfileId: ctx.profile.id } });
    else if (ctx.resource === 'projects') await prisma.studentProject.deleteMany({ where: { id, studentProfileId: ctx.profile.id } });
    else await prisma.studentExperience.deleteMany({ where: { id, studentProfileId: ctx.profile.id } });
    return responseProfile(ctx.session.userId);
  } catch (error) { return authErrorResponse(error); }
}

