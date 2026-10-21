'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useRole, UserRole } from '@/context/RoleContext';
import { useTheme } from '@/context/ThemeContext';
import { ROLE_PROFILES } from '@/lib/roles';
import {
  GraduationCap,
  Briefcase,
  Building2,
  BookOpen,
  UserCheck,
  Shield,
  Layers,
  ChevronDown,
  LogOut,
  LogIn,
  Sun,
  Moon,
  Sparkles,
  Database,
  ExternalLink,
} from 'lucide-react';

const ROLE_ICONS: Record<UserRole, React.ReactNode> = {
  STUDENT: <GraduationCap className="w-4 h-4 text-blue-500 dark:text-blue-400" />,
  TPO: <Briefcase className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
  RECRUITER: <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />,
  FACULTY: <BookOpen className="w-4 h-4 text-purple-600 dark:text-purple-400" />,
  ALUMNI: <UserCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
  INSTITUTE_ADMIN: <Shield className="w-4 h-4 text-rose-600 dark:text-rose-400" />,
  SUPER_ADMIN: <Layers className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />,
};

export default function Navbar() {
  const { role, user, isAuthenticated, setRole, logout } = useRole();
  const { resolvedTheme, toggleTheme } = useTheme();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const handleSelectRole = (newRole: UserRole) => {
    setRole(newRole);
    setDropdownOpen(false);
    router.push(ROLE_PROFILES[newRole].dashboardPath);
  };

  // Yield on root SaaS landing page, auth, and all platform dashboard pages
  const isExcludedRoute =
    pathname === '/' ||
    pathname === '/login' ||
    pathname.startsWith('/student') ||
    pathname.startsWith('/tpo') ||
    pathname.startsWith('/recruiter') ||
    pathname.startsWith('/faculty') ||
    pathname.startsWith('/alumni') ||
    pathname.startsWith('/institute') ||
    pathname.startsWith('/super-admin');

  if (isExcludedRoute) {
    return null;
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800/80 bg-white/90 dark:bg-[#090D17]/90 backdrop-blur-md transition-colors duration-200">
      {/* Top Enterprise Status Bar */}
      <div className="hidden md:flex items-center justify-between px-6 py-1 text-xs border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/80 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            CareerOS Enterprise v1.0
          </span>
          <span className="text-slate-300 dark:text-slate-700">|</span>
          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-mono">
            <Database className="w-3 h-3" />
            Neon PostgreSQL
          </span>
          <span className="text-slate-300 dark:text-slate-700">|</span>
          <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
            <Sparkles className="w-3 h-3" />
            TACIE AI Engine Active
          </span>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/talent/aditya-shinde"
            className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            Public Talent Passport
          </Link>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <a
            href="https://www.thinkbuild.in"
            target="_blank"
            rel="noreferrer"
            className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1"
          >
            thinkbuild.in <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="flex items-center justify-between px-4 sm:px-6 h-15">
        {/* Left: Brand Logo & Navigation */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shadow-sm group-hover:bg-blue-700 transition-colors">
              <span className="font-heading text-sm">PH</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-heading font-bold text-slate-900 dark:text-white text-base tracking-tight">
                  PlacementHub
                </span>
              </div>
            </div>
          </Link>

          {/* Quick links */}
          <nav className="hidden lg:flex items-center gap-1 ml-4 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <Link
              href="/"
              className={`px-3 py-1.5 rounded-md transition-colors ${
                pathname === '/'
                  ? 'text-blue-600 dark:text-blue-400 bg-slate-100 dark:bg-slate-800/80 font-bold'
                  : 'hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50'
              }`}
            >
              Ecosystem
            </Link>
            <Link
              href={user?.dashboardPath || '/student'}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                pathname.startsWith(user?.dashboardPath || '/student')
                  ? 'text-blue-600 dark:text-blue-400 bg-slate-100 dark:bg-slate-800/80 font-bold'
                  : 'hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50'
              }`}
            >
              My Workspace
            </Link>
            <Link
              href="/talent/aditya-shinde"
              className={`px-3 py-1.5 rounded-md transition-colors ${
                pathname.startsWith('/talent')
                  ? 'text-blue-600 dark:text-blue-400 bg-slate-100 dark:bg-slate-800/80 font-bold'
                  : 'hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50'
              }`}
            >
              Talent Passport
            </Link>
          </nav>
        </div>

        {/* Right: Theme Toggle, Role Switcher, Auth Buttons */}
        <div className="flex items-center gap-2.5">
          {/* Light / Dark Mode Toggle Button */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle Light and Dark Mode"
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={resolvedTheme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          >
            {resolvedTheme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700" />
            )}
          </button>

          {/* Role Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 transition-all text-left shadow-sm"
              aria-label="Switch Stakeholder View"
            >
              <div className="p-1 rounded bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60">
                {ROLE_ICONS[role]}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-[10px] uppercase font-bold tracking-wider text-blue-600 dark:text-blue-400">
                  {role}
                </div>
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[120px]">
                  {user?.name || 'Active User'}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-80 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-2 z-50 animate-in fade-in zoom-in-95">
                <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                  <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    Stakeholder Workspaces
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Switch role identity & test credentials
                  </p>
                </div>

                <div className="py-1 max-h-80 overflow-y-auto space-y-1">
                  {(Object.keys(ROLE_PROFILES) as UserRole[]).map((r) => {
                    const profile = ROLE_PROFILES[r];
                    const isSelected = r === role;
                    return (
                      <button
                        key={r}
                        onClick={() => handleSelectRole(r)}
                        className={`w-full flex items-start gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors ${
                          isSelected
                            ? 'bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-white'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="mt-0.5 p-1 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                          {ROLE_ICONS[r]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wider">
                              {r}
                            </span>
                            {isSelected && (
                              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                                Active
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-medium truncate text-slate-900 dark:text-slate-100">
                            {profile.name}
                          </p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                            {profile.badge}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {isAuthenticated && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Authentication State Button */}
          {isAuthenticated ? (
            <button
              onClick={logout}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs font-medium transition-colors"
              title="Sign Out of Session"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
