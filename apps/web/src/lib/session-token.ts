import type { JWTPayload } from 'jose';
import { SignJWT } from 'jose/jwt/sign';
import { jwtVerify } from 'jose/jwt/verify';
import type { UserRole } from '@/lib/roles';

export const SESSION_COOKIE_NAME = 'careeros_session';
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const ISSUER = 'placementhub';
const AUDIENCE = 'careeros-web';

export interface SessionPayload extends JWTPayload {
  userId: string;
  sessionId: string;
  sessionVersion: number;
  email: string;
  name: string;
  role: UserRole;
  institutionId?: string | null;
  avatarUrl?: string | null;
}

function jwtSecret(): Uint8Array {
  const configured = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
  if (configured && configured.length >= 32) return new TextEncoder().encode(configured);
  if (process.env.NODE_ENV === 'production') {
    throw new Error('NEXTAUTH_SECRET (or AUTH_SECRET) must be at least 32 characters in production.');
  }
  return new TextEncoder().encode('local-development-only-careeros-secret-change-me');
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(jwtSecret());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, jwtSecret(), {
      algorithms: ['HS256'],
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    if (
      typeof payload.userId !== 'string' ||
      typeof payload.sessionId !== 'string' ||
      typeof payload.sessionVersion !== 'number' ||
      typeof payload.role !== 'string'
    ) return null;
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

