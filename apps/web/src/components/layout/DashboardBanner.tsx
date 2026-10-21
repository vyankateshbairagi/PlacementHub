'use client';

import React from 'react';
import { useRole, TEST_CREDENTIALS, UserRole } from '@/context/RoleContext';
import { ShieldCheck, UserCheck, Sparkles, LogIn, LogOut, ArrowRight, Server } from 'lucide-react';
import Link from 'next/link';

interface DashboardBannerProps {
  currentDashboardRole: UserRole;
  roleTitle: string;
  roleBadge: string;
}

export default function DashboardBanner({
  currentDashboardRole,
  roleTitle,
  roleBadge,
}: DashboardBannerProps) {
  const { user, role, isAuthenticated, quickRoleLogin, logout } = useRole();
  const isMatchingRole = role === currentDashboardRole;

  return (
    <div className="mb-6 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-[#0D1322] shadow-sm overflow-hidden transition-colors">
      {/* ERP Console Top Ribbon Strip */}
      <div className="px-4 py-1.5 bg-slate-100 dark:bg-slate-900/90 border-b border-slate-300 dark:border-slate-800 flex items-center justify-between text-[11px] font-mono">
        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
          <Server className="w-3 h-3 text-blue-600 dark:text-blue-400" />
          <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider">{roleTitle}</span>
          <span className="text-slate-400">•</span>
          <span className="text-slate-600 dark:text-slate-400 font-sans">{roleBadge}</span>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-slate-500 dark:text-slate-400">
          <span>PORT: 5432</span>
          <span>•</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">SESSION VERIFIED</span>
        </div>
      </div>

      <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Active identity status */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-blue-100 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
                ACTIVE IDENTITY:
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  isMatchingRole
                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                    : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                }`}
              >
                {isMatchingRole ? '● ROLE MATCHED' : `▲ VIEWING AS ${role}`}
              </span>
            </div>
            <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
              {user.name}{' '}
              <span className="text-xs font-mono font-normal text-slate-500 dark:text-slate-400">
                ({user.email})
              </span>
            </p>
          </div>
        </div>

        {/* Right: Quick test-switcher for 3 core roles */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-600 dark:text-slate-400 font-bold mr-1 hidden sm:inline font-mono">
            FAST ROLE SWITCH:
          </span>

          {(['STUDENT', 'TPO', 'RECRUITER'] as UserRole[]).map((r) => {
            const isTarget = r === currentDashboardRole;
            const isCurrent = r === role;
            return (
              <button
                key={r}
                onClick={() => quickRoleLogin(r)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  isCurrent
                    ? 'bg-blue-900 dark:bg-blue-600 text-white shadow-sm ring-1 ring-blue-900'
                    : 'bg-white dark:bg-[#0E1424] text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700'
                }`}
                title={`Switch to ${TEST_CREDENTIALS[r].roleName} (${TEST_CREDENTIALS[r].email})`}
              >
                {isCurrent && <UserCheck className="w-3.5 h-3.5" />}
                <span>{r}</span>
              </button>
            );
          })}

          {isAuthenticated ? (
            <button
              type="button"
              onClick={logout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 ml-1 transition shadow-2xs"
              title="Sign Out of Institutional ERP"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              <span>Sign Out</span>
            </button>
          ) : (
            <Link
              href={`/login?redirect=/${currentDashboardRole.toLowerCase()}`}
              className="erp-btn-primary text-xs ml-1"
            >
              <LogIn className="w-3 h-3" />
              <span>Login</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
