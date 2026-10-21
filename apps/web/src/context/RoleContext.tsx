'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UserRole, UserSession, ROLE_PROFILES, getRoleDashboardPath } from '@/lib/roles';

export { ROLE_PROFILES, getRoleDashboardPath };
export type { UserRole, UserSession };

// Test credentials map for quick switching & demo testing
export const TEST_CREDENTIALS: Record<UserRole, { email: string; password: string; roleName: string }> = {
  STUDENT: {
    email: 'aditya.shinde@student.gcoen.ac.in',
    password: 'CareerOS@2026',
    roleName: 'Student (Aditya Shinde - Gold Verified)',
  },
  TPO: {
    email: 'tpo@gcoen.ac.in',
    password: 'CareerOS@2026',
    roleName: 'Training & Placement Officer',
  },
  RECRUITER: {
    email: 'recruiter.google@placementhub.org',
    password: 'CareerOS@2026',
    roleName: 'Recruiter (Google India)',
  },
  FACULTY: {
    email: 'faculty.cs@gcoen.ac.in',
    password: 'CareerOS@2026',
    roleName: 'Faculty Mentor',
  },
  ALUMNI: {
    email: 'alumni.amit@placementhub.org',
    password: 'CareerOS@2026',
    roleName: 'Alumni (Amazon AWS)',
  },
  INSTITUTE_ADMIN: {
    email: 'principal@gcoen.ac.in',
    password: 'CareerOS@2026',
    roleName: 'Principal / Admin',
  },
  SUPER_ADMIN: {
    email: 'admin@thinkbuild.in',
    password: 'CareerOS@2026',
    roleName: 'Super Admin',
  },
};

interface RoleContextType {
  role: UserRole;
  user: UserSession;
  isAuthenticated: boolean;
  isLoading: boolean;
  setRole: (role: UserRole) => void;
  quickRoleLogin: (role: UserRole) => Promise<boolean>;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; redirectPath?: string }>;
  logout: () => Promise<void>;
  toastMessage: string | null;
  showToast: (msg: string) => void;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<UserRole>('STUDENT');
  const [user, setUser] = useState<UserSession>(ROLE_PROFILES.STUDENT);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const router = useRouter();

  // Hydrate session from /api/auth/me on mount
  useEffect(() => {
    async function checkAuth() {
      try {
        const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
        const pathRole: UserRole | null =
          currentPath.startsWith('/student') ? 'STUDENT' :
          currentPath.startsWith('/faculty') ? 'FACULTY' :
          currentPath.startsWith('/tpo') ? 'TPO' :
          currentPath.startsWith('/recruiter') ? 'RECRUITER' :
          currentPath.startsWith('/alumni') ? 'ALUMNI' :
          currentPath.startsWith('/institute') ? 'INSTITUTE_ADMIN' :
          currentPath.startsWith('/super-admin') ? 'SUPER_ADMIN' : null;

        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (data.success && data.authenticated && data.user) {
          if (pathRole && data.user.role !== pathRole) {
            // Path explicitly demands a different stakeholder workspace
            setRoleState(pathRole);
            setUser(ROLE_PROFILES[pathRole] || ROLE_PROFILES.STUDENT);
            localStorage.setItem('careeros_active_role', pathRole);
          } else {
            setIsAuthenticated(true);
            setRoleState(data.user.role);
            setUser(data.user);
            localStorage.setItem('careeros_active_role', data.user.role);
          }
        } else {
          // Fallback to pathRole or saved role profile for seamless UI preview
          const savedRole = pathRole || (localStorage.getItem('careeros_active_role') as UserRole) || 'STUDENT';
          const effectiveRole = ROLE_PROFILES[savedRole] ? savedRole : 'STUDENT';
          setRoleState(effectiveRole);
          setUser(ROLE_PROFILES[effectiveRole]);
          setIsAuthenticated(false);
        }
      } catch (err) {
        console.warn('Could not verify auth session:', err);
      } finally {
        setIsLoading(false);
      }
    }
    checkAuth();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.success && data.user) {
        setIsAuthenticated(true);
        setRoleState(data.user.role);
        setUser(data.user);
        localStorage.setItem('careeros_active_role', data.user.role);
        showToast(`Welcome, ${data.user.name} (${data.user.role})`);
        return { success: true, redirectPath: data.redirectPath };
      }
      return { success: false, error: data.error || 'Authentication failed' };
    } catch {
      return { success: false, error: 'Network error. Please try again.' };
    } finally {
      setIsLoading(false);
    }
  };

  const quickRoleLogin = async (targetRole: UserRole): Promise<boolean> => {
    const creds = TEST_CREDENTIALS[targetRole];
    if (!creds) return false;
    const result = await login(creds.email, creds.password);
    if (result.success && result.redirectPath) {
      router.push(result.redirectPath);
      return true;
    }
    return false;
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.error('Logout error:', e);
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem('careeros_active_role');
    }
    setIsAuthenticated(false);
    setUser(ROLE_PROFILES.STUDENT);
    setRoleState('STUDENT');
    showToast('Logged out of institutional session successfully');
    window.location.href = '/login';
  };

  const setRole = (newRole: UserRole) => {
    // Quick switch helper that logs in with that role's real credentials in background
    setRoleState(newRole);
    setUser(ROLE_PROFILES[newRole]);
    localStorage.setItem('careeros_active_role', newRole);
    quickRoleLogin(newRole);
  };

  return (
    <RoleContext.Provider
      value={{
        role,
        user,
        isAuthenticated,
        isLoading,
        setRole,
        quickRoleLogin,
        login,
        logout,
        toastMessage,
        showToast,
      }}
    >
      {children}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-slate-900 dark:bg-zinc-900 border border-slate-700 dark:border-zinc-700 text-white px-4 py-3 rounded-lg shadow-xl animate-in fade-in slide-in-from-bottom-5">
          <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
          <p className="text-xs font-medium text-slate-100">{toastMessage}</p>
        </div>
      )}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (!context) throw new Error('useRole must be used within a RoleProvider');
  return context;
}
