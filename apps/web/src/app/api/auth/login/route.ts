import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyPassword, createSessionToken, SESSION_COOKIE_NAME, getRoleDashboardPath } from '@/lib/auth';
import { SESSION_TTL_SECONDS } from '@/lib/session-token';
import { UserRole, ROLE_PROFILES } from '@/lib/roles';

const attempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 8;
const WINDOW_MS = 15 * 60 * 1000;

function throttleKey(req: NextRequest, email: string) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  return createHash('sha256').update(`${ip}:${email}`).digest('hex');
}

function isRateLimited(key: string) {
  const now = Date.now();
  const current = attempts.get(key);
  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 0, resetAt: now + WINDOW_MS });
    return false;
  }
  return current.count >= MAX_ATTEMPTS;
}

function recordFailure(key: string) {
  const current = attempts.get(key) || { count: 0, resetAt: Date.now() + WINDOW_MS };
  attempts.set(key, { ...current, count: current.count + 1 });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    if (!email || !password) {
      return NextResponse.json({ success: false, error: 'Email and password are required.' }, { status: 400 });
    }

    const key = throttleKey(req, email);
    if (isRateLimited(key)) {
      return NextResponse.json({ success: false, error: 'Too many login attempts. Try again later.' }, { status: 429 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { institution: { select: { id: true, name: true } } },
    });
    const validPassword = Boolean(user?.passwordHash) && await verifyPassword(password, user!.passwordHash!);
    if (!user || !validPassword || !user.isActive) {
      recordFailure(key);
      return NextResponse.json({ success: false, error: 'Invalid email or password.' }, { status: 401 });
    }
    if (!user.emailVerifiedAt) {
      return NextResponse.json({ success: false, error: 'Verify your email address before signing in.' }, { status: 403 });
    }

    attempts.delete(key);
    const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '';
    const authSession = await prisma.authSession.create({
      data: {
        userId: user.id,
        expiresAt,
        userAgent: req.headers.get('user-agent')?.slice(0, 500),
        ipHash: ip ? createHash('sha256').update(ip).digest('hex') : null,
      },
    });

    const role = user.role as UserRole;
    const profileTemplate = ROLE_PROFILES[role] || ROLE_PROFILES.STUDENT;
    const token = await createSessionToken({
      userId: user.id,
      sessionId: authSession.id,
      sessionVersion: user.sessionVersion,
      email: user.email,
      name: user.name,
      role,
      institutionId: user.institutionId,
      avatarUrl: user.avatarUrl || profileTemplate.avatarUrl,
    });
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    const redirectPath = getRoleDashboardPath(role);
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role,
        avatarUrl: user.avatarUrl || profileTemplate.avatarUrl,
        badge: profileTemplate.badge,
        roleDescription: profileTemplate.roleDescription,
        dashboardPath: redirectPath,
        institutionName: user.institution?.name || profileTemplate.institutionName,
      },
      redirectPath,
    });
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_TTL_SECONDS,
    });
    return response;
  } catch (error) {
    console.error('Error during login:', error);
    return NextResponse.json({
      success: false,
      error: 'Authentication is temporarily unavailable.',
      ...(process.env.NODE_ENV !== 'production' && error instanceof Error ? { developmentDetail: error.message } : {}),
    }, { status: 500 });
  }
}

