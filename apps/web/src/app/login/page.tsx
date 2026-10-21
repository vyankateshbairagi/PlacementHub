'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useRole, UserRole, TEST_CREDENTIALS } from '@/context/RoleContext';
import { useTheme } from '@/context/ThemeContext';
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Sun,
  Moon,
  GraduationCap,
  Building2,
  Briefcase,
  Users,
  Award,
  BookOpen,
  Phone,
  HelpCircle,
  Clock,
  Calendar,
  Bell,
  KeyRound,
  FileText,
  ChevronRight,
  Copy,
  Check,
} from 'lucide-react';

interface ErpRoleOption {
  role: UserRole;
  label: string;
  category: string;
  portalName: string;
  userName: string;
  designation: string;
  email: string;
  defaultPassword: string;
  badge: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const ERP_ROLE_OPTIONS: ErpRoleOption[] = [
  {
    role: 'STUDENT',
    label: 'Student',
    category: 'Academics & Placement',
    portalName: 'Student Talent Portal',
    userName: 'Aditya Shinde',
    designation: 'B.Tech Computer Engineering (Final Year)',
    email: 'aditya.shinde@student.gcoen.ac.in',
    defaultPassword: 'CareerOS@2026',
    badge: 'PRN: 2023-CS-0142',
    icon: GraduationCap,
    color: 'from-blue-600 to-indigo-600',
  },
  {
    role: 'TPO',
    label: 'TPO Placement Cell',
    category: 'Administration & Corporate Relations',
    portalName: 'TPO Command Center',
    userName: 'Prof. Rajesh Kulkarni',
    designation: 'Head, Training & Placement Cell',
    email: 'tpo@gcoen.ac.in',
    defaultPassword: 'CareerOS@2026',
    badge: 'Emp ID: TPO-ADM-01',
    icon: Building2,
    color: 'from-emerald-600 to-teal-700',
  },
  {
    role: 'RECRUITER',
    label: 'Corporate Recruiter',
    category: 'Industry Partner',
    portalName: 'Recruiter Drive Suite',
    userName: 'Arjun Nambiar',
    designation: 'Campus Talent Lead • Google India',
    email: 'recruiter.google@alphabet.com',
    defaultPassword: 'CareerOS@2026',
    badge: 'Google Enterprise Partner',
    icon: Briefcase,
    color: 'from-amber-600 to-orange-600',
  },
  {
    role: 'FACULTY',
    label: 'Faculty Mentor',
    category: 'Department of Computer Engineering',
    portalName: 'Academic Advisor Desk',
    userName: 'Prof. Anita Patil',
    designation: 'Associate Professor & Career Mentor',
    email: 'faculty.cs@gcoen.ac.in',
    defaultPassword: 'CareerOS@2026',
    badge: 'Emp ID: FAC-CS-042',
    icon: BookOpen,
    color: 'from-purple-600 to-violet-700',
  },
  {
    role: 'ALUMNI',
    label: 'Alumni Mentor',
    category: 'Alumni Network & Mentorship',
    portalName: 'Alumni Advisory Guild',
    userName: 'Amit Joshi',
    designation: 'Cloud Solutions Architect • AWS',
    email: 'alumni.amit@amazon.com',
    defaultPassword: 'CareerOS@2026',
    badge: 'Batch of 2024 • Amazon',
    icon: Users,
    color: 'from-rose-600 to-pink-600',
  },
  {
    role: 'INSTITUTE_ADMIN',
    label: 'Principal / Admin',
    category: 'Institutional Governance',
    portalName: 'Institutional Control Desk',
    userName: 'Dr. Suresh R. Deshmukh',
    designation: 'Principal & Executive Director',
    email: 'principal@gcoen.ac.in',
    defaultPassword: 'CareerOS@2026',
    badge: 'Executive Authorization',
    icon: Award,
    color: 'from-slate-700 to-slate-900',
  },
];

const CIRCULARS = [
  {
    id: 1,
    tag: 'TPO Circular',
    date: '17 Oct 2026',
    title: 'Phase-1 Campus Placement Drives Schedule & Pre-Placement Talk Timeline',
    isNew: true,
  },
  {
    id: 2,
    tag: 'Technical Assessment',
    date: '16 Oct 2026',
    title: 'TACIE AI Proctored Coding & Domain Screening Test Live for 2027 Cohorts',
    isNew: true,
  },
  {
    id: 3,
    tag: 'Alumni Guild',
    date: '15 Oct 2026',
    title: '1-on-1 Mock Technical & HR Interview Slots Open with Amazon, Google Alumni',
    isNew: false,
  },
  {
    id: 4,
    tag: 'Policy Update',
    date: '14 Oct 2026',
    title: 'Dream & Super-Dream Offer Guidelines (CTC > 12.0 LPA) Released',
    isNew: false,
  },
];

function CollegeErpLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('next') || searchParams.get('redirect') || '';
  const { login, isAuthenticated, user, quickRoleLogin } = useRole();
  const { resolvedTheme, toggleTheme } = useTheme();

  const [selectedRole, setSelectedRole] = useState<ErpRoleOption>(ERP_ROLE_OPTIONS[0]);
  const [email, setEmail] = useState<string>(ERP_ROLE_OPTIONS[0].email);
  const [password, setPassword] = useState<string>(ERP_ROLE_OPTIONS[0].defaultPassword);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showCredentialsDirectory, setShowCredentialsDirectory] = useState<boolean>(false);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  // If already authenticated, redirect to their role dashboard
  useEffect(() => {
    if (isAuthenticated && user?.dashboardPath) {
      router.push(redirectUrl || user.dashboardPath);
    }
  }, [isAuthenticated, user, redirectUrl, router]);

  const handleSelectRole = (opt: ErpRoleOption) => {
    setSelectedRole(opt);
    setEmail(opt.email);
    setPassword(opt.defaultPassword);
    setErrorMessage(null);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedEmail(id);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const result = await login(email, password);
      if (result.success) {
        const dest = redirectUrl || result.redirectPath || (selectedRole.role === 'TPO' ? '/tpo' : '/student');
        router.push(dest);
      } else {
        setErrorMessage(result.error || 'Authentication failed. Please check your credentials.');
      }
    } catch {
      setErrorMessage('Network connection error. Please verify the backend is running.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInstantDemoLogin = async (opt: ErpRoleOption) => {
    handleSelectRole(opt);
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const success = await quickRoleLogin(opt.role);
      if (!success) {
        const result = await login(opt.email, opt.defaultPassword);
        if (result.success) {
          router.push(redirectUrl || result.redirectPath || (opt.role === 'TPO' ? '/tpo' : '/student'));
        } else {
          setErrorMessage(result.error || 'Login failed.');
        }
      }
    } catch {
      setErrorMessage('Login failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const CurrentRoleIcon = selectedRole.icon;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col justify-between font-sans selection:bg-blue-600 selection:text-white">
      {/* ========================================================================= */}
      {/* 1. TOP OFFICIAL INSTITUTION ERP MASTHEAD                                   */}
      {/* ========================================================================= */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            {/* Collegiate Crest Emblem */}
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-700 via-indigo-800 to-slate-900 text-white flex items-center justify-center font-serif font-black shadow-md border-2 border-amber-400/40 shrink-0">
              <span className="text-xl tracking-tighter">DYP</span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-black tracking-wide text-slate-900 dark:text-white uppercase font-serif">
                  D.Y. Patil Educational Federation & Institutions
                </span>
                <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300/60 dark:border-amber-700">
                  NAAC A++ Accr.
                </span>
              </div>
              <span className="text-[11px] sm:text-xs font-semibold text-blue-700 dark:text-blue-400">
                Institutional Campus Career & Placement ERP System • Academic Session 2026-27
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setShowCredentialsDirectory(!showCredentialsDirectory)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition"
              title="View all test role login IDs & passwords"
            >
              <KeyRound className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span className="hidden sm:inline">Role Credentials Directory</span>
              <span className="sm:hidden">Credentials</span>
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition"
              title={resolvedTheme === 'dark' ? 'Light Theme' : 'Dark Theme'}
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. CREDENTIALS DIRECTORY DRAWER (Instant Reference)                       */}
      {/* ========================================================================= */}
      {showCredentialsDirectory && (
        <section className="bg-gradient-to-r from-blue-900 to-indigo-950 text-white border-b border-blue-800 shadow-xl py-4 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between pb-3 border-b border-blue-800/80">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold tracking-wide text-white uppercase">
                  Institutional Role Login Directory (Click to Auto-Fill & Test)
                </h3>
              </div>
              <span className="text-xs text-blue-200 font-mono">Default Password: CareerOS@2026</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
              {ERP_ROLE_OPTIONS.map((opt) => (
                <div
                  key={opt.role}
                  onClick={() => {
                    handleSelectRole(opt);
                    setShowCredentialsDirectory(false);
                  }}
                  className="bg-blue-950/80 hover:bg-blue-800/80 border border-blue-700/60 rounded-xl p-3 cursor-pointer transition flex items-start justify-between group shadow-sm"
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-amber-400 uppercase tracking-wide">
                        {opt.label}
                      </span>
                      <span className="text-[10px] text-blue-300 font-mono">({opt.badge})</span>
                    </div>
                    <div className="text-xs font-semibold text-white mt-0.5 truncate">{opt.userName}</div>
                    <div className="text-[11px] text-blue-200 font-mono mt-0.5 truncate">{opt.email}</div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopy(opt.email, opt.role);
                    }}
                    className="p-1 rounded text-blue-300 hover:text-white transition"
                    title="Copy Email"
                  >
                    {copiedEmail === opt.role ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* 3. MAIN ERP PORTAL WORKSPACE                                              */}
      {/* ========================================================================= */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* ========================================================================= */}
          {/* LEFT COLUMN: Official ERP Notices, Circulars & System Desk                */}
          {/* ========================================================================= */}
          <div className="lg:col-span-5 space-y-5">
            {/* Institutional Profile Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-700 dark:text-blue-400">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white font-serif">
                    Training & Placement Cell
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Central Career & Corporate Relations Directorate
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    Campus Drives
                  </span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">Phase-1 Active</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    System Node
                  </span>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    ERP Online
                  </span>
                </div>
              </div>
            </div>

            {/* Placement Circulars & Notices Desk */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Official Placement Circulars
                  </h3>
                </div>
                <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">
                  View Archive
                </span>
              </div>

              <div className="mt-3.5 space-y-3">
                {CIRCULARS.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100/80 dark:bg-slate-800/40 dark:hover:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/60 transition group cursor-pointer"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="px-2 py-0.5 rounded font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                        {item.tag}
                      </span>
                      <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {item.date}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1.5 group-hover:text-blue-600 dark:group-hover:text-blue-400 leading-snug">
                      {item.title}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* ERP Helpdesk & Support Desk */}
            <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white mb-2">
                <HelpCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Need Assistance Logging In?</span>
              </div>
              <p className="leading-relaxed">
                If you forgot your institutional password or face issues accessing your designated cohort partition,
                contact the Central Placement Cell or use the quick role credentials above.
              </p>
              <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-medium">
                  <Phone className="w-3.5 h-3.5 text-blue-600" /> +91 9822114455
                </span>
                <span className="text-slate-500 font-mono">helpdesk@gcoen.ac.in</span>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* RIGHT COLUMN: Official ERP Authentication Form                             */}
          {/* ========================================================================= */}
          <div className="lg:col-span-7">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-md">
              {/* Form Title & Role Selector */}
              <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <div className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Single Sign-On Authentication</span>
                  </div>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-serif">
                    Sign In to Institutional ERP
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Select your portal role below to pre-load your credentials or enter your institutional ID.
                  </p>
                </div>
              </div>

              {/* ERP Role Tabs */}
              <div className="mt-5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  Select User Partition
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {ERP_ROLE_OPTIONS.map((opt) => {
                    const isSelected = selectedRole.role === opt.role;
                    const RoleIcon = opt.icon;
                    return (
                      <button
                        key={opt.role}
                        type="button"
                        onClick={() => handleSelectRole(opt)}
                        className={`p-2.5 rounded-xl text-left border transition flex flex-col justify-between ${
                          isSelected
                            ? 'bg-blue-50/90 dark:bg-blue-950/60 border-blue-600 dark:border-blue-500 shadow-sm ring-1 ring-blue-600/20'
                            : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700/60'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                              isSelected
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            <RoleIcon className="w-4 h-4" />
                          </div>
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
                        </div>
                        <div className="mt-2">
                          <span
                            className={`text-xs font-bold block truncate ${
                              isSelected ? 'text-blue-900 dark:text-blue-200' : 'text-slate-800 dark:text-slate-200'
                            }`}
                          >
                            {opt.label}
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate block">
                            {opt.userName}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Active Role Selected Notification Banner */}
              <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/70 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                    <CurrentRoleIcon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span className="truncate">{selectedRole.userName}</span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300 font-bold shrink-0">
                        {selectedRole.label}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-300 truncate">
                      {selectedRole.designation}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0 pl-2">
                  <span className="text-[10px] text-slate-600 dark:text-slate-300 block uppercase font-bold">Password</span>
                  <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">CareerOS@2026</span>
                </div>
              </div>

              {/* Error Alert */}
              {errorMessage && (
                <div className="mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 flex items-start gap-2.5 text-xs">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Authentication failed</p>
                    <p>{errorMessage}</p>
                  </div>
                </div>
              )}

              {/* Login Form Inputs */}
              <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="erpEmail"
                      className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide"
                    >
                      Institutional Email / User ID
                    </label>
                    <span className="text-[10px] text-slate-600 dark:text-slate-300 font-mono">
                      Domain: @gcoen.ac.in
                    </span>
                  </div>
                  <div className="relative flex items-center">
                    <Mail className="w-4 h-4 absolute left-3.5 text-slate-400 pointer-events-none" />
                    <input
                      id="erpEmail"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. aditya.shinde@student.gcoen.ac.in"
                      className="w-full h-11 pl-10 pr-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-xs placeholder:text-slate-400 border border-slate-300 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="erpPassword"
                      className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide"
                    >
                      Security Password / PIN
                    </label>
                    <button
                      type="button"
                      onClick={() => setPassword(selectedRole.defaultPassword)}
                      className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                    >
                      Fill Default Password
                    </button>
                  </div>
                  <div className="relative flex items-center">
                    <Lock className="w-4 h-4 absolute left-3.5 text-slate-400 pointer-events-none" />
                    <input
                      id="erpPassword"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your security password"
                      className="w-full h-11 pl-10 pr-10 rounded-xl bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-xs placeholder:text-slate-400 border border-slate-300 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition"
                    />
                    <button
                      type="button"
                      aria-label="Toggle password visibility"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember & Forgot Password */}
                <div className="flex items-center justify-between pt-1 text-xs">
                  <label className="flex items-center gap-2 text-slate-600 dark:text-slate-400 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Remember on this campus workstation</span>
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                  >
                    Forgot Password?
                  </Link>
                </div>

                {/* Primary Action Button */}
                <div className="pt-2 space-y-2.5">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-11 bg-blue-700 hover:bg-blue-800 text-white font-bold text-sm rounded-xl transition flex items-center justify-center gap-2 shadow-sm shadow-blue-700/20 active:scale-[0.99] disabled:opacity-60"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Verifying Credentials...
                      </span>
                    ) : (
                      <>
                        <span>Sign In to {selectedRole.label} Portal</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  {/* 1-Click Fast Pass Demo Login */}
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleInstantDemoLogin(selectedRole)}
                    className="w-full h-10 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-blue-700 dark:text-blue-300 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 border border-slate-200 dark:border-slate-700 disabled:opacity-60"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Instant 1-Click Fast Pass: Login as {selectedRole.label}</span>
                  </button>
                </div>
              </form>

              {/* Quick Role Credentials Table (At a glance) */}
              <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">
                  Institutional Login Credentials Table
                </span>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 text-[10px] uppercase">
                        <th className="py-1.5 font-bold">Role</th>
                        <th className="py-1.5 font-bold">User Email ID</th>
                        <th className="py-1.5 font-bold">Default Password</th>
                        <th className="py-1.5 font-bold text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-[11px]">
                      {ERP_ROLE_OPTIONS.map((opt) => (
                        <tr
                          key={opt.role}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition"
                          onClick={() => handleSelectRole(opt)}
                        >
                          <td className="py-2 font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                            {opt.label}
                          </td>
                          <td className="py-2 text-slate-600 dark:text-slate-400 font-mono truncate max-w-[170px]">
                            {opt.email}
                          </td>
                          <td className="py-2 text-blue-600 dark:text-blue-400 font-mono font-bold">
                            CareerOS@2026
                          </td>
                          <td className="py-2 text-right">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                              Use ID
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ========================================================================= */}
      {/* 4. OFFICIAL INSTITUTIONAL FOOTER                                           */}
      {/* ========================================================================= */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-4 px-4 sm:px-6 lg:px-8 mt-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Campus ERP Security System • 256-bit Encrypted Session • ISO/IEC 27001 Certified</span>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium">
            <Link href="/" className="hover:text-blue-600 dark:hover:text-blue-400 transition">
              Institutional Home
            </Link>
            <span>•</span>
            <Link href="/student" className="hover:text-blue-600 dark:hover:text-blue-400 transition">
              Student Talent Passport
            </Link>
            <span>•</span>
            <Link href="/tpo" className="hover:text-blue-600 dark:hover:text-blue-400 transition">
              TPO Desk
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex items-center justify-center text-xs text-slate-500 font-medium">
          Loading Campus ERP Portal...
        </div>
      }
    >
      <CollegeErpLoginForm />
    </Suspense>
  );
}
