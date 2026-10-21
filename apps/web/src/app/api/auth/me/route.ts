import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession, getRoleDashboardPath } from '@/lib/auth';
import { UserRole, ROLE_PROFILES } from '@/lib/roles';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const payload = await getSession();
    if (!payload) {
      return NextResponse.json(
        { success: false, authenticated: false, user: null },
        { status: 200 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        institution: { select: { id: true, name: true } },
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, authenticated: false, user: null },
        { status: 200 }
      );
    }

    const role = user.role as UserRole;
    const profileTemplate = ROLE_PROFILES[role] || ROLE_PROFILES.STUDENT;
    const dashboardPath = getRoleDashboardPath(role);

    return NextResponse.json({
      success: true,
      authenticated: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: role,
        avatarUrl: user.avatarUrl || profileTemplate.avatarUrl,
        badge: profileTemplate.badge,
        roleDescription: profileTemplate.roleDescription,
        dashboardPath,
        institutionName: user.institution?.name || profileTemplate.institutionName,
      },
    });
  } catch (error) {
    console.error('Error fetching current session:', error);
    return NextResponse.json(
      { success: false, authenticated: false, user: null },
      { status: 500 }
    );
  }
}
