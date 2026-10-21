import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireSession } from '@/lib/auth';
import { authErrorResponse } from '@/lib/auth-http';
import { newOpaqueToken } from '@/lib/auth-tokens';
import { appUrl, sendEmail } from '@/lib/email';
import type { UserRole } from '@/lib/roles';

const ROLES: UserRole[] = ['STUDENT', 'TPO', 'RECRUITER', 'FACULTY', 'ALUMNI', 'INSTITUTE_ADMIN', 'SUPER_ADMIN'];

export async function GET() {
  try {
    const session = await requireSession(['TPO', 'INSTITUTE_ADMIN', 'SUPER_ADMIN']);
    const invitations = await prisma.authInvitation.findMany({
      where: session.role === 'SUPER_ADMIN' ? {} : { institutionId: session.institutionId || '__none__' },
      select: { id: true, email: true, role: true, institutionId: true, expiresAt: true, acceptedAt: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return NextResponse.json({ success: true, invitations });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(['TPO', 'INSTITUTE_ADMIN', 'SUPER_ADMIN']);
    const body = await req.json();
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const role = body.role as UserRole;
    if (!/^\S+@\S+\.\S+$/.test(email) || !ROLES.includes(role)) {
      return NextResponse.json({ success: false, error: 'A valid email and role are required.' }, { status: 400 });
    }
    if (session.role === 'TPO' && role !== 'STUDENT') {
      return NextResponse.json({ success: false, error: 'TPO users may invite students only.' }, { status: 403 });
    }
    if (role === 'SUPER_ADMIN' && session.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ success: false, error: 'Only a super admin may invite another super admin.' }, { status: 403 });
    }
    const institutionId = session.role === 'SUPER_ADMIN'
      ? (typeof body.institutionId === 'string' ? body.institutionId : null)
      : session.institutionId;
    if (role !== 'SUPER_ADMIN' && !institutionId) {
      return NextResponse.json({ success: false, error: 'An institution is required for this role.' }, { status: 400 });
    }
    if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) {
      return NextResponse.json({ success: false, error: 'An account already exists for this email.' }, { status: 409 });
    }

    const { token, tokenHash } = newOpaqueToken();
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);
    const invitation = await prisma.authInvitation.create({
      data: { email, role, institutionId, tokenHash, expiresAt, createdById: session.userId },
      select: { id: true, email: true, role: true, expiresAt: true },
    });
    const signupUrl = appUrl(`/signup?token=${encodeURIComponent(token)}`);
    const delivered = await sendEmail({
      to: email,
      subject: 'You are invited to PlacementHub',
      html: `<p>You have been invited to PlacementHub.</p><p><a href="${signupUrl}">Create your account</a>. This link expires in 72 hours.</p>`,
    });
    return NextResponse.json({
      success: true,
      invitation,
      delivered,
      ...(process.env.NODE_ENV !== 'production' ? { developmentSignupUrl: signupUrl } : {}),
    }, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}

