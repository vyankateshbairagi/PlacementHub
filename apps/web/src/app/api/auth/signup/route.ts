import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { hashPassword, validatePassword } from '@/lib/auth';
import { hashOpaqueToken } from '@/lib/auth-tokens';

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 45);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const token = typeof body.token === 'string' ? body.token : '';
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const passwordError = validatePassword(password);
    if (!token || name.length < 2 || passwordError) {
      return NextResponse.json({ success: false, error: passwordError || 'A valid invitation and name are required.' }, { status: 400 });
    }

    const invitation = await prisma.authInvitation.findUnique({ where: { tokenHash: hashOpaqueToken(token) } });
    if (!invitation || invitation.acceptedAt || invitation.expiresAt <= new Date()) {
      return NextResponse.json({ success: false, error: 'This invitation is invalid or has expired.' }, { status: 400 });
    }
    const passwordHash = await hashPassword(password);
    const suffix = invitation.id.slice(-6).toLowerCase();
    const user = await prisma.$transaction(async (tx) => {
      const claimed = await tx.authInvitation.updateMany({
        where: { id: invitation.id, acceptedAt: null, expiresAt: { gt: new Date() } },
        data: { acceptedAt: new Date() },
      });
      if (claimed.count !== 1) throw new Error('INVITATION_ALREADY_USED');
      return tx.user.create({
        data: {
          email: invitation.email,
          name,
          passwordHash,
          role: invitation.role,
          institutionId: invitation.institutionId,
          emailVerifiedAt: new Date(),
          ...(invitation.role === 'STUDENT' ? {
            studentProfile: {
              create: {
                rollNo: typeof body.rollNo === 'string' && body.rollNo.trim() ? body.rollNo.trim() : `PENDING-${suffix}`,
                department: typeof body.department === 'string' && body.department.trim() ? body.department.trim() : 'Undeclared',
                course: typeof body.course === 'string' && body.course.trim() ? body.course.trim() : 'B.Tech',
                graduationYear: Number.isInteger(body.graduationYear) ? body.graduationYear : new Date().getFullYear() + 4,
                cgpa: 0,
                talentPassportSlug: `${slugify(name) || 'student'}-${suffix}`,
              },
            },
          } : {}),
        },
        select: { id: true, email: true, name: true, role: true },
      });
    });
    return NextResponse.json({ success: true, user, message: 'Account created. You can now sign in.' }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && (error.message === 'INVITATION_ALREADY_USED' || error.message.includes('Unique constraint'))) {
      return NextResponse.json({ success: false, error: 'This invitation has already been used.' }, { status: 409 });
    }
    console.error(error);
    return NextResponse.json({ success: false, error: 'Could not create the account.' }, { status: 500 });
  }
}

