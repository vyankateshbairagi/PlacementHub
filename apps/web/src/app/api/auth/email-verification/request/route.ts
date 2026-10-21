import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { newOpaqueToken } from '@/lib/auth-tokens';
import { appUrl, sendEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const user = email ? await prisma.user.findUnique({ where: { email }, select: { id: true, email: true, emailVerifiedAt: true, isActive: true } }) : null;
  let developmentVerificationUrl: string | undefined;
  if (user?.isActive && !user.emailVerifiedAt) {
    const { token, tokenHash } = newOpaqueToken();
    await prisma.authToken.create({ data: { userId: user.id, type: 'EMAIL_VERIFICATION', tokenHash, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) } });
    const url = appUrl(`/verify-email?token=${encodeURIComponent(token)}`);
    await sendEmail({ to: user.email, subject: 'Verify your CareerOS email', html: `<p><a href="${url}">Verify your email</a>. This link expires in 24 hours.</p>` });
    if (process.env.NODE_ENV !== 'production') developmentVerificationUrl = url;
  }
  return NextResponse.json({ success: true, message: 'If verification is needed, an email has been sent.', ...(developmentVerificationUrl ? { developmentVerificationUrl } : {}) });
}

