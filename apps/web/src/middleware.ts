import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/lib/session-token';
import type { UserRole } from '@/lib/roles';

const PAGE_ROLES: Array<[string, UserRole[]]> = [
  ['/student', ['STUDENT']],
  ['/tpo', ['TPO', 'INSTITUTE_ADMIN', 'SUPER_ADMIN']],
  ['/recruiter', ['RECRUITER', 'SUPER_ADMIN']],
  ['/faculty', ['FACULTY', 'INSTITUTE_ADMIN', 'SUPER_ADMIN']],
  ['/alumni', ['ALUMNI', 'SUPER_ADMIN']],
  ['/institute', ['INSTITUTE_ADMIN', 'SUPER_ADMIN']],
  ['/super-admin', ['SUPER_ADMIN']],
];

const PUBLIC_API_PREFIXES = [
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/signup',
  '/api/auth/password/',
  '/api/auth/email-verification/',
  '/api/tacie/',
  '/api/ai/',
  '/api/jobs/',
];

function allowedPageRole(pathname: string) {
  return PAGE_ROLES.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`))?.[1];
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const isApi = pathname.startsWith('/api/');
  const pageRoles = allowedPageRole(pathname);
  const publicTalentPassport = pathname === '/api/students' && req.method === 'GET' && req.nextUrl.searchParams.has('slug');
  const publicDrives = (pathname === '/api/drives' || /^\/api\/drives\/[^/]+$/.test(pathname)) &&
    !pathname.includes('/bookmarks') &&
    !pathname.includes('/saved-searches') &&
    req.method === 'GET';
  const publicApi = PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix)) || publicTalentPassport || publicDrives;

  if (!pageRoles && (!isApi || publicApi)) return NextResponse.next();
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session) {
    if (isApi) return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
    const login = new URL('/login', req.url);
    login.searchParams.set('next', `${pathname}${search}`);
    return NextResponse.redirect(login);
  }

  if (pageRoles && !pageRoles.includes(session.role)) {
    if (isApi) return NextResponse.json({ success: false, error: 'Forbidden.' }, { status: 403 });
    return NextResponse.redirect(new URL('/', req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/student/:path*', '/tpo/:path*', '/recruiter/:path*', '/faculty/:path*', '/alumni/:path*', '/institute/:path*', '/super-admin/:path*', '/api/:path*'],
};
