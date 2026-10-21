import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { newOpaqueToken } from '@/lib/auth-tokens';
import { appUrl, sendEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const user = email ? await prisma.user.findUnique({ where: { email }, select: { id: true, email: true, isActive: true } }) : null;
  let developmentResetUrl: string | undefined;
  if (user?.isActive) {
    const { token, tokenHash } = newOpaqueToken();
    await prisma.authToken.create({
      data: { userId: user.id, type: 'PASSWORD_RESET', tokenHash, expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
    });
    const url = appUrl(`/reset-password?token=${encodeURIComponent(token)}`);
    await sendEmail({ to: user.email, subject: 'Reset your CareerOS password', html: `<p><a href="${url}">Reset your password</a>. This link expires in one hour.</p>` });
    if (process.env.NODE_ENV !== 'production') developmentResetUrl = url;
  }
  return NextResponse.json({ success: true, message: 'If the account exists, a reset link has been sent.', ...(developmentResetUrl ? { developmentResetUrl } : {}) });
}

