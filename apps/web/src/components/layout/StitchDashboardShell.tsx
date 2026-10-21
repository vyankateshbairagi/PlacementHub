'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useRole, UserRole } from '@/context/RoleContext';
import { useTheme } from '@/context/ThemeContext';
import { ROLE_PROFILES } from '@/lib/roles';
import {
  Sun,
  Moon,
  LogOut,
  ChevronDown,
  Search,
  Bell,
  MessageSquare,
  Plus,
  Menu,
  X,
  ExternalLink,
  Shield,
  Layers,
  GraduationCap,
  Briefcase,
  Building2,
  BookOpen,
  UserCheck,
  Sparkles,
} from 'lucide-react';

export interface StitchDashboardShellProps {
  children: React.ReactNode;
  activePath?: string;
  onPathChange?: (path: string) => void;
  title?: string;
  roleOverride?: UserRole;
  actions?: React.ReactNode;
}

// Role-specific navigation modules for strict encapsulation
const ROLE_NAV_CONFIG: Record<
  UserRole,
  {
    group: string;
    items: { id: string; label: string; icon: string; badge?: string; badgeStyle?: string }[];
  }[]
> = {
  STUDENT: [
    {
      group: 'Core Workspace',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: 'space_dashboard' },
        { id: 'profile', label: 'Student Profile', icon: 'person' },
        { id: 'resumes', label: 'Resume Studio', icon: 'description', badge: 'ATS', badgeStyle: 'bg-emerald-600 text-white' },
      ],
    },
    {
      group: 'Placements & Drives',
      items: [
        { id: 'opportunities', label: 'Jobs & Drives', icon: 'work' },
        { id: 'my-applications', label: 'My Applications', icon: 'assignment_turned_in' },
        { id: 'opportunity-contributions', label: 'Peer Opportunities', icon: 'auto_awesome', badge: 'New', badgeStyle: 'bg-blue-600 text-white' },
      ],
    },
    {
      group: 'Preparation & Growth',
      items: [
        { id: 'assessments', label: 'Skill Assessments', icon: 'quiz' },
        { id: 'interview-prep', label: 'Interview Prep', icon: 'record_voice_over' },
        { id: 'learning', label: 'Learning Roadmaps', icon: 'school' },
      ],
    },
    {
      group: 'Campus & Tools',
      items: [
        { id: 'community', label: 'Campus Community', icon: 'diversity_3' },
        { id: 'messages', label: 'Messages', icon: 'forum' },
        { id: 'events', label: 'Placement Events', icon: 'calendar_month' },
        { id: 'bookmarks', label: 'Saved Bookmarks', icon: 'bookmark' },
        { id: 'settings', label: 'Settings', icon: 'settings' },
      ],
    },
  ],
  TPO: [
    {
      group: 'Placement Management',
      items: [
        { id: 'overview', label: 'Ops Desk Overview', icon: 'space_dashboard' },
        { id: 'drives', label: 'Placement Drives', icon: 'campaign', badge: '14 Live', badgeStyle: 'bg-blue-600 text-white' },
        { id: 'submissions', label: 'Review Submissions', icon: 'verified', badge: '5 Pending', badgeStyle: 'bg-amber-500 text-white' },
        { id: 'batch-ranker', label: 'Batch Ranker & Filter', icon: 'rule' },
        { id: 'fraud-detector', label: 'Fake Job Detector', icon: 'shield_alert', badge: 'Security', badgeStyle: 'bg-rose-600 text-white' },
        { id: 'offers', label: 'Offer Audit & Packages', icon: 'mail' },
      ],
    },
    {
      group: 'Reporting & Compliance',
      items: [
        { id: 'reports', label: 'NIRF / NAAC Reports', icon: 'analytics' },
        { id: 'curriculum', label: 'Curriculum Creator', icon: 'auto_stories' },
      ],
    },
  ],
  RECRUITER: [
    {
      group: 'Talent Acquisition',
      items: [
        { id: 'search', label: 'Candidate Search', icon: 'person_search' },
        { id: 'kanban', label: 'Applicant Pipeline & ATS', icon: 'view_kanban', badge: 'Active', badgeStyle: 'bg-blue-600 text-white' },
        { id: 'interviews', label: 'Interview Schedules', icon: 'schedule' },
        { id: 'analytics', label: 'Hiring Analytics', icon: 'query_stats' },
      ],
    },
  ],
  FACULTY: [
    {
      group: 'Academic Mentorship',
      items: [
        { id: 'students', label: 'Assigned Cohort', icon: 'school', badge: '36 Students', badgeStyle: 'bg-blue-600 text-white' },
        { id: 'resources', label: 'Study Kits & Handbooks', icon: 'menu_book' },
        { id: 'announcements', label: 'Faculty Advisories', icon: 'campaign' },
        { id: 'alumni-connect', label: 'Alumni-Student Bridge', icon: 'diversity_3' },
        { id: 'analytics', label: 'Learning Analytics', icon: 'trending_up' },
        { id: 'curriculum', label: 'Curriculum Creator', icon: 'auto_stories' },
      ],
    },
  ],
  ALUMNI: [
    {
      group: 'Alumni Engagement',
      items: [
        { id: 'mentorship', label: '1:1 Mentorship Sessions', icon: 'forum', badge: '3 Slots', badgeStyle: 'bg-blue-600 text-white' },
        { id: 'referrals', label: 'Post Job Referrals', icon: 'add_link', badge: 'Earn Honors', badgeStyle: 'bg-amber-500 text-white' },
        { id: 'network', label: 'Alumni & Student Network', icon: 'diversity_3' },
        { id: 'stories', label: 'Interview Experiences', icon: 'menu_book' },
      ],
    },
  ],
  INSTITUTE_ADMIN: [
    {
      group: 'Institution Governance',
      items: [
        { id: 'overview', label: 'Executive Dashboard', icon: 'space_dashboard' },
        { id: 'departments', label: 'Departments & Batches', icon: 'account_tree' },
        { id: 'policy', label: 'Placement Policies', icon: 'tune' },
        { id: 'stakeholders', label: 'Stakeholders & RBAC', icon: 'badge' },
        { id: 'accreditation', label: 'Accreditation & NIRF', icon: 'insights' },
      ],
    },
  ],
  SUPER_ADMIN: [
    {
      group: 'Platform Administration',
      items: [
        { id: 'dashboard', label: 'Platform Telemetry', icon: 'hub' },
        { id: 'manage-institutions', label: 'Partner Colleges', icon: 'corporate_fare', badge: '150+', badgeStyle: 'bg-blue-600 text-white' },
        { id: 'manage-recruiters', label: 'Recruiter Accounts', icon: 'business' },
        { id: 'subscriptions', label: 'SaaS Subscriptions', icon: 'credit_card' },
        { id: 'system-audit', label: 'Global Audit Logs', icon: 'security' },
      ],
    },
  ],
};

const ROLE_DISPLAY_NAMES: Record<UserRole, { title: string; badge: string; path: string }> = {
  STUDENT: { title: 'Student Portal', badge: 'Talent & Prep', path: '/student' },
  TPO: { title: 'TPO Placement Desk', badge: 'Governance & Drives', path: '/tpo' },
  RECRUITER: { title: 'Recruiter Suite', badge: 'Pipeline & ATS', path: '/recruiter' },
  FACULTY: { title: 'Faculty Mentor', badge: 'Academic Advising', path: '/faculty' },
  ALUMNI: { title: 'Alumni Network', badge: 'Referrals & Mentors', path: '/alumni' },
  INSTITUTE_ADMIN: { title: 'Principal / Admin', badge: 'College Governance', path: '/institute' },
  SUPER_ADMIN: { title: 'Super Admin', badge: 'PlacementHub Core', path: '/super-admin' },
};

export default function StitchDashboardShell({
  children,
  activePath = 'dashboard',
  onPathChange,
  title,
  roleOverride,
  actions,
}: StitchDashboardShellProps) {
  const { role: contextRole, user, setRole, logout } = useRole();
  const { resolvedTheme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();

  const derivedRoleFromPath: UserRole | undefined =
    pathname?.startsWith('/faculty') ? 'FACULTY' :
    pathname?.startsWith('/tpo') ? 'TPO' :
    pathname?.startsWith('/recruiter') ? 'RECRUITER' :
    pathname?.startsWith('/alumni') ? 'ALUMNI' :
    pathname?.startsWith('/institute') ? 'INSTITUTE_ADMIN' :
    pathname?.startsWith('/super-admin') ? 'SUPER_ADMIN' :
    pathname?.startsWith('/student') ? 'STUDENT' : undefined;

  const activeRole: UserRole = roleOverride || derivedRoleFromPath || contextRole || 'STUDENT';

  // Root fix: always resolve activeUser to match the active role's persona
  const activeUser = (user && user.role === activeRole)
    ? user
    : (ROLE_PROFILES[activeRole] || ROLE_PROFILES.STUDENT);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationsList, setNotificationsList] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications?limit=25');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setNotificationsList(data.notifications || []);
          setUnreadCount(data.unreadCount || 0);
        }
      }
    } catch {}
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch('/api/notifications', { method: 'PATCH' });
      if (res.ok) {
        setUnreadCount(0);
        setNotificationsList((prev) => prev.map((n) => ({ ...n, read: true })));
      }
    } catch {}
  };

  const handleNotificationClick = async (notif: any) => {
    if (!notif.read) {
      try {
        await fetch('/api/notifications', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notificationId: notif.id }),
        });
        setUnreadCount((prev) => Math.max(0, prev - 1));
        setNotificationsList((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
        );
      } catch {}
    }
    if (notif.actionUrl) {
      setNotificationsOpen(false);
      router.push(notif.actionUrl);
    }
  };

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setNotificationsOpen(false);
  }, [pathname]);

  const handleNavClick = (path: string, e?: React.MouseEvent) => {
    if (onPathChange) {
      if (e) e.preventDefault();
      onPathChange(path);
      setMobileMenuOpen(false);
    }
  };

  const handleSwitchRole = (targetRole: UserRole) => {
    setRole(targetRole);
    setRoleModalOpen(false);
    const dest = ROLE_DISPLAY_NAMES[targetRole]?.path || '/student';
    router.push(dest);
  };

  const navConfig = ROLE_NAV_CONFIG[activeRole] || ROLE_NAV_CONFIG.STUDENT;

  return (
    <div className="min-h-screen bg-[#F1F5F9] dark:bg-[#070B14] text-slate-900 dark:text-slate-100 antialiased font-sans flex flex-col selection:bg-blue-600 selection:text-white">
      {/* MOBILE DRAWER BACKDROP */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 lg:hidden transition-opacity duration-200"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ========================================================================= */}
      {/* SIDEBAR: Dark Navy Sidebar (264px) - Cleanly scrollable without clipping   */}
      {/* ========================================================================= */}
      <aside
        className={`fixed left-0 top-0 h-full w-[264px] bg-[#0F172A] z-50 flex flex-col border-r border-slate-800 shadow-xl transition-transform duration-200 ease-out ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header with proper top margin */}
        <div className="pt-4 pb-3 px-4 min-h-[72px] flex items-center justify-between border-b border-slate-800/80 shrink-0 bg-[#0F172A]">
          <Link href="/" className="flex items-center gap-3 group mt-1">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md group-hover:bg-blue-500 transition-colors shrink-0">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-white tracking-tight leading-tight truncate">
                PlacementHub
              </span>
              <span className="text-[10px] text-slate-400 tracking-wider truncate">
                Learn • Prepare • Apply • Grow
              </span>
            </div>
          </Link>

          {/* Mobile close drawer button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Close Navigation Drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Navigation Modules: naturally begins from top, zero clipping on any screen */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 select-none min-h-0 space-y-4 scrollbar-thin">
          {navConfig.map((grp) => (
            <div key={grp.group} className="space-y-1">
              <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400/90 uppercase tracking-wider">
                {grp.group}
              </div>
              <div className="space-y-0.5">
                {grp.items.map((item) => {
                  const isActive = activePath === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={(e) => handleNavClick(item.id, e)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-left transition-all ${
                        isActive
                          ? 'bg-[#1D68BD] text-white font-semibold shadow-sm'
                          : 'text-slate-300 hover:bg-slate-800/80 hover:text-white font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-1.5">
                        <span
                          className={`material-symbols-outlined text-[19px] shrink-0 transition-colors ${
                            isActive ? 'text-white' : 'text-slate-400'
                          }`}
                        >
                          {item.icon}
                        </span>
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-full shrink-0 ${
                            item.badgeStyle || 'bg-blue-500 text-white'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom Compact Institutional Card & Sign Out */}
        <div className="shrink-0 p-3 border-t border-slate-800/80 bg-[#0F172A] space-y-2">
          <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/50 flex items-center justify-between text-white">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center shrink-0">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-white truncate leading-tight">Career Hub</p>
                <p className="text-[9px] text-slate-400 truncate">Skills & Resources</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleNavClick('learning')}
              className="py-1 px-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-semibold transition shrink-0 cursor-pointer"
            >
              Open
            </button>
          </div>

          <button
            type="button"
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-800/60 hover:bg-rose-950/50 text-slate-300 hover:text-rose-300 border border-slate-700/50 hover:border-rose-800/60 text-xs font-semibold transition cursor-pointer"
            title="Sign Out of Institutional ERP"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span className="truncate">Sign Out ({activeUser.name.split(' ')[0]})</span>
          </button>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* TOP HEADER: Light/Clean as in Fig. 2                                      */}
      {/* ========================================================================= */}
      <div className="lg:pl-[264px] flex-1 flex flex-col">
        <header className="fixed top-0 left-0 lg:left-[264px] right-0 h-16 bg-white dark:bg-[#0F172A] border-b border-slate-200 dark:border-slate-800 z-40 px-4 sm:px-6 flex items-center justify-between gap-4 shadow-xs">
          {/* Left: Mobile Toggle + Search Bar */}
          <div className="flex items-center gap-3 flex-1 max-w-xl">
            {/* Mobile hamburger menu toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Open Navigation Drawer"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Universal Search Bar matching Fig. 2 */}
            <div className="relative flex items-center w-full">
              <span className="material-symbols-outlined absolute left-3.5 text-[18px] text-slate-400 pointer-events-none">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for jobs, internships, companies, skills..."
                className="w-full h-9 pl-10 pr-4 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition shadow-2xs"
              />
            </div>
          </div>

          {/* Right: Notifications, Messages, Role Profile Dropdown matching Fig. 2 */}
          <div className="flex items-center gap-3 shrink-0">
            {actions}

            {/* Notification bell with live badge and interactive popover */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setNotificationsOpen((prev) => !prev);
                  if (!notificationsOpen) fetchNotifications();
                }}
                className="relative p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                title="Notifications Inbox"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 min-w-[14px] h-3.5 px-0.5 bg-rose-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Inbox Popover */}
              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="p-3.5 px-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Inbox Notifications
                      </span>
                      {unreadCount > 0 && (
                        <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 rounded-full">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
                    {notificationsList.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 text-xs">
                        No notifications yet. You're all caught up!
                      </div>
                    ) : (
                      notificationsList.map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => handleNotificationClick(notif)}
                          className={`p-3.5 px-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer flex flex-col gap-1 ${
                            !notif.read ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs font-semibold text-slate-900 dark:text-white line-clamp-1">
                              {notif.title}
                            </span>
                            <span className="text-[10px] text-slate-400 shrink-0">
                              {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                            {notif.message}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                              {notif.type.replace(/_/g, ' ')}
                            </span>
                            {notif.actionUrl && (
                              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                                View details →
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Message bubble icon matching Fig. 2 */}
            <button
              type="button"
              onClick={() => handleNavClick('messages')}
              className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              title="Messages"
            >
              <MessageSquare className="w-4 h-4" />
            </button>

            {/* Theme toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              title={resolvedTheme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700" />
              )}
            </button>

            <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 mx-1 hidden sm:block" />

            {/* User Profile matching Fig. 2 (Avatar + Name + Role + Chevron) */}
            <button
              type="button"
              onClick={() => setRoleModalOpen(true)}
              className="flex items-center gap-2.5 p-1 sm:px-2 sm:py-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
              title="Click to Switch Stakeholder Workspace"
            >
              <img
                alt={activeUser.name}
                className="w-8 h-8 rounded-full object-cover border border-slate-300 dark:border-slate-700 shadow-2xs"
                src={activeUser.avatarUrl}
              />
              <div className="hidden sm:flex flex-col min-w-0">
                <span className="text-xs font-bold text-slate-900 dark:text-white truncate leading-tight">
                  {activeUser.name}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate leading-tight">
                  {activeRole === 'STUDENT' ? 'Student' : (ROLE_DISPLAY_NAMES[activeRole]?.title || 'Member')}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
            </button>

            {/* Prominent Header Logout Button */}
            <button
              type="button"
              onClick={logout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-bold transition shadow-2xs cursor-pointer shrink-0"
              title="Sign Out of Institutional ERP"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* Main View Area with generous clearance below fixed header */}
        <main className="w-full pt-[88px] pb-8 bg-[#F1F5F9] dark:bg-[#070B14] px-4 sm:px-6 lg:px-8 min-h-[calc(100vh-4rem)] flex flex-col justify-between">
          <div className="flex-1 w-full pt-1.5 sm:pt-2">
            {children}
          </div>

          {/* ROCK BOTTOM FOOTER */}
          <footer className="mt-12 pt-6 pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200/90 dark:border-slate-800 w-full">
            <div className="flex items-center gap-2 font-medium">
              <GraduationCap className="w-4 h-4 text-blue-600 shrink-0" />
              <span>PlacementHub | Empowering Student Careers</span>
            </div>
            <div className="flex items-center gap-4 text-[11px]">
              <span className="hover:text-blue-600 cursor-pointer transition-colors">About</span>
              <span>•</span>
              <span className="hover:text-blue-600 cursor-pointer transition-colors">Help</span>
              <span>•</span>
              <span className="hover:text-blue-600 cursor-pointer transition-colors">Privacy</span>
              <span>•</span>
              <span className="hover:text-blue-600 cursor-pointer transition-colors">Terms</span>
            </div>
          </footer>
        </main>
      </div>

      {/* ========================================================================= */}
      {/* DIALOG: Role Switcher Modal (Startup Presentable Sub-box)                 */}
      {/* ========================================================================= */}
      {roleModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-surface border border-border-subtle rounded-xl shadow-2xl p-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
              <div>
                <h3 className="font-bold text-base text-text-primary">Switch Stakeholder Role</h3>
                <p className="text-xs text-text-secondary mt-0.5">
                  Select identity partition to test role encapsulation & privileges
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRoleModalOpen(false)}
                className="text-text-muted hover:text-text-primary p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[65vh] overflow-y-auto">
              {(Object.keys(ROLE_DISPLAY_NAMES) as UserRole[]).map((r) => {
                const conf = ROLE_DISPLAY_NAMES[r];
                const isSelected = r === activeRole;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => handleSwitchRole(r)}
                    className={`flex items-start gap-2.5 p-3 rounded-lg border text-left transition-all ${
                      isSelected
                        ? 'border-primary bg-tint-subtle text-text-primary shadow-xs ring-1 ring-primary/20'
                        : 'border-border-subtle bg-surface hover:bg-surface-container-low text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <div className="p-1.5 rounded-md bg-surface border border-border-subtle shrink-0 mt-0.5">
                      <span className="material-symbols-outlined text-[18px] text-primary">
                        {r === 'STUDENT'
                          ? 'school'
                          : r === 'TPO'
                          ? 'account_balance'
                          : r === 'RECRUITER'
                          ? 'apartment'
                          : r === 'FACULTY'
                          ? 'menu_book'
                          : r === 'ALUMNI'
                          ? 'diversity_3'
                          : r === 'INSTITUTE_ADMIN'
                          ? 'corporate_fare'
                          : 'hub'}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-text-primary">{conf.title}</span>
                        {isSelected && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-primary text-white">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-text-muted mt-0.5">{conf.badge}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="pt-3 border-t border-border-subtle flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setRoleModalOpen(false);
                  logout();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 text-xs font-bold transition border border-rose-200 dark:border-rose-900/60"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                <span>Sign Out Completely</span>
              </button>
              <button
                type="button"
                onClick={() => setRoleModalOpen(false)}
                className="px-3.5 py-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container text-xs font-semibold text-text-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
