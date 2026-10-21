import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { UserRole, getRoleDashboardPath } from '@/lib/roles';
import prisma from '@/lib/db';
import {
  SESSION_COOKIE_NAME,
  SessionPayload,
  createSessionToken,
  verifySessionToken,
} from '@/lib/session-token';

export { SESSION_COOKIE_NAME, createSessionToken, verifySessionToken };
export type { SessionPayload };

export class AuthError extends Error {
  constructor(message: string, public status = 401) {
    super(message);
    this.name = 'AuthError';
  }
}

export function validatePassword(password: string): string | null {
  if (password.length < 12) return 'Password must be at least 12 characters.';
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password)) return 'Password must include upper and lower case letters.';
  if (!/\d/.test(password)) return 'Password must include a number.';
  if (!/[^A-Za-z0-9]/.test(password)) return 'Password must include a symbol.';
  return null;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hash);
  } catch (err) {
    console.error('Error verifying password:', err);
    return false;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;
    const payload = await verifySessionToken(token);
    if (!payload) return null;

    const [user, session] = await Promise.all([
      prisma.user.findUnique({
        where: { id: payload.userId },
        select: { isActive: true, sessionVersion: true, emailVerifiedAt: true },
      }),
      prisma.authSession.findUnique({
        where: { id: payload.sessionId },
        select: { userId: true, expiresAt: true, revokedAt: true },
      }),
    ]);
    if (
      !user?.isActive ||
      !user.emailVerifiedAt ||
      user.sessionVersion !== payload.sessionVersion ||
      !session ||
      session.userId !== payload.userId ||
      session.revokedAt ||
      session.expiresAt <= new Date()
    ) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function requireSession(allowedRoles?: readonly UserRole[]): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new AuthError('Authentication required.');
  if (allowedRoles && !allowedRoles.includes(session.role)) {
    throw new AuthError('You do not have permission to perform this action.', 403);
  }
  return session;
}

export function requireSameInstitution(session: SessionPayload, institutionId?: string | null): void {
  if (session.role === 'SUPER_ADMIN') return;
  if (!session.institutionId || session.institutionId !== institutionId) {
    throw new AuthError('Cross-institution access is not allowed.', 403);
  }
}

export { getRoleDashboardPath };
