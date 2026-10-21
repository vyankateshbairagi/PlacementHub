export type UserRole =
  | 'STUDENT'
  | 'TPO'
  | 'RECRUITER'
  | 'FACULTY'
  | 'ALUMNI'
  | 'INSTITUTE_ADMIN'
  | 'SUPER_ADMIN';

export interface UserSession {
  id?: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl: string;
  badge: string;
  roleDescription: string;
  dashboardPath: string;
  institutionName: string;
}

export const ROLE_PROFILES: Record<UserRole, UserSession> = {
  STUDENT: {
    name: 'Aditya Shinde',
    email: 'aditya.shinde@student.gcoen.ac.in',
    role: 'STUDENT',
    avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
    badge: 'Student • B.Tech Computer Engineering (CGPA 9.24)',
    roleDescription: 'Evidence-backed career profile, proof verification, ATS resume & drive applications',
    dashboardPath: '/student',
    institutionName: 'GCOEN Nashik',
  },
  TPO: {
    name: 'Prof. Rajesh Kulkarni',
    email: 'tpo@gcoen.ac.in',
    role: 'TPO',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    badge: 'Head, Training & Placement Cell',
    roleDescription: 'Placement drives, automated eligibility filtering & NIRF analytics',
    dashboardPath: '/tpo',
    institutionName: 'GCOE Nashik',
  },
  RECRUITER: {
    name: 'Arjun Nambiar',
    email: 'recruiter.google@placementhub.org',
    role: 'RECRUITER',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    badge: 'Campus Talent Lead • Google India',
    roleDescription: 'Find talent, evaluate candidates, ATS pipeline & offer management',
    dashboardPath: '/recruiter',
    institutionName: 'Google India',
  },
  FACULTY: {
    name: 'Prof. Anita Patil',
    email: 'faculty.cs@gcoen.ac.in',
    role: 'FACULTY',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    badge: 'Dept of Computer Engineering',
    roleDescription: 'Track student career progress & share placement study materials',
    dashboardPath: '/faculty',
    institutionName: 'GCOE Nashik',
  },
  ALUMNI: {
    name: 'Amit Joshi',
    email: 'alumni.amit@placementhub.org',
    role: 'ALUMNI',
    avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
    badge: 'SDE-II • Amazon (Batch 2022)',
    roleDescription: '1:1 Student mentorship, referral job postings & interview experiences',
    dashboardPath: '/alumni',
    institutionName: 'GCOE Alumni Network',
  },
  INSTITUTE_ADMIN: {
    name: 'Dr. Suresh Deshmukh',
    email: 'principal@gcoen.ac.in',
    role: 'INSTITUTE_ADMIN',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    badge: 'Principal & Head of Institution',
    roleDescription: 'College governance, departments, policies & institutional analytics',
    dashboardPath: '/institute',
    institutionName: 'GCOE Nashik',
  },
  SUPER_ADMIN: {
    name: 'Vyankatesh Bairagi',
    email: 'admin@placementhub.in',
    role: 'SUPER_ADMIN',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    badge: 'Founder & CEO • PlacementHub',
    roleDescription: 'Multi-tenant SaaS, global off-campus engine & platform telemetry',
    dashboardPath: '/super-admin',
    institutionName: 'PlacementHub Technologies',
  },
};

export function getRoleDashboardPath(role: UserRole): string {
  return ROLE_PROFILES[role]?.dashboardPath || '/';
}
