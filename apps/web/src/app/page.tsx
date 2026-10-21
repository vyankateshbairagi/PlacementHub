'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRole, UserRole, ROLE_PROFILES } from '@/context/RoleContext';
import { useTheme } from '@/context/ThemeContext';
import {
  GraduationCap,
  Briefcase,
  Building2,
  BookOpen,
  UserCheck,
  Shield,
  Layers,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Database,
  Cloud,
  FileCheck,
  Code2,
  TrendingUp,
  Cpu,
  Users,
  Building,
  Server,
  Terminal,
  Activity,
  Award,
  ChevronRight,
  Lock,
  Search,
  ExternalLink,
  Check,
  Compass,
  Star,
  Zap,
  BarChart3,
  Moon,
  Sun,
  Info,
} from 'lucide-react';

interface PartnerCompany {
  name: string;
  dot?: boolean;
  hiringType: string;
  logo: React.ReactNode;
}

const PARTNER_COMPANIES: PartnerCompany[] = [
  {
    name: 'Google',
    hiringType: 'Software & Cloud',
    logo: (
      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
      </svg>
    ),
  },
  {
    name: 'Microsoft',
    hiringType: 'Engineering',
    logo: (
      <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 21 21">
        <rect x="1" y="1" width="9" height="9" fill="#F25022" />
        <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
        <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
        <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
      </svg>
    ),
  },
  {
    name: 'Deloitte',
    dot: true,
    hiringType: 'Consulting',
    logo: (
      <div className="w-3.5 h-3.5 rounded-full bg-[#86BC25] flex items-center justify-center shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
      </div>
    ),
  },
  {
    name: 'Infosys',
    hiringType: 'Systems & AI',
    logo: (
      <div className="w-3.5 h-3.5 rounded bg-[#007CC3] flex items-center justify-center text-white text-[8px] font-black italic shrink-0">
        i
      </div>
    ),
  },
  {
    name: 'TCS',
    hiringType: 'Digital & Ignite',
    logo: (
      <div className="w-3.5 h-3.5 rounded bg-[#563D7C] flex items-center justify-center text-white text-[8px] font-black shrink-0">
        T
      </div>
    ),
  },
  {
    name: 'amazon',
    hiringType: 'SDE & Cloud',
    logo: (
      <svg className="w-4 h-4 shrink-0 text-[#FF9900]" viewBox="0 0 24 24" fill="currentColor">
        <path d="M13.62 16.905c-3.15 2.32-7.72 3.565-11.66 1.94-1.1-.455-2.07-1.12-1.96-1.77.105-.63 1.1-.73 2.05-.61 3.5.44 7.64-.17 10.92-2.115 1.05-.625 2.07.41 1.54 1.345l-.89 1.21zm1.22-.385c-.41-.53-.28-1.25.32-1.6 1.82-1.07 3.01-2.92 3.01-5.06 0-3.32-2.8-6.02-6.24-6.02-3.44 0-6.24 2.7-6.24 6.02 0 1.25.4 2.41 1.08 3.37.38.54.26 1.28-.27 1.67-.54.39-1.28.26-1.68-.27A9.39 9.39 0 0 1 3.2 9.86C3.2 5.09 7.11 1.2 11.93 1.2c4.82 0 8.73 3.89 8.73 8.66 0 2.94-1.49 5.56-3.82 7.15-.55.37-1.32.25-1.74-.29l-.26-.2z"/>
      </svg>
    ),
  },
  {
    name: 'Zomato',
    hiringType: 'Product & Tech',
    logo: (
      <div className="w-3.5 h-3.5 rounded bg-[#E23744] flex items-center justify-center text-white text-[8px] font-black shrink-0">
        Z
      </div>
    ),
  },
  {
    name: 'Capgemini',
    hiringType: 'Enterprise',
    logo: (
      <svg className="w-3.5 h-3.5 shrink-0 text-[#0070AD] fill-current" viewBox="0 0 24 24">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-5l4 2.5-4 2.5z" />
      </svg>
    ),
  },
  {
    name: 'Razorpay',
    hiringType: 'FinTech',
    logo: (
      <div className="w-3.5 h-3.5 rounded bg-[#0C2340] flex items-center justify-center text-[#3395FF] text-[8px] font-black shrink-0">
        R
      </div>
    ),
  },
  {
    name: 'Apple',
    hiringType: 'Hardware & OS',
    logo: (
      <svg className="w-3.5 h-3.5 shrink-0 fill-current text-slate-800 dark:text-slate-200" viewBox="0 0 170 170">
        <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.69-7.85-11.98-14.42-7.14-11.08-12.59-23.77-16.34-38.07-3.75-14.3-5.63-27.42-5.63-39.37 0-14.12 3.65-26.06 10.96-35.83 7.31-9.77 16.59-14.77 27.84-15 4.9.01 10.42 1.34 16.56 4 6.13 2.66 10.22 4.05 12.26 4.17 1.48 0 5.68-1.39 12.61-4.17 6.92-2.78 12.74-4.05 17.45-3.8 12.38 1.05 22.37 6.08 29.98 15.08-10.9 6.64-16.23 15.77-15.99 27.38.25 9.17 3.75 16.99 10.5 23.46 6.75 6.47 14.88 10.22 24.38 11.25-2.07 6.19-4.51 12.62-7.33 19.3zM119.22 31.84c0-7.3 2.6-14.15 7.8-20.55 5.2-6.4 11.6-10.63 19.2-12.69.4 3.03.36 6.32-.12 9.87-.48 3.55-1.74 7.02-3.78 10.41-2.58 4.2-5.91 7.55-10 10.05-4.09 2.5-8.22 3.96-12.38 4.38-.25-.49-.45-1.04-.59-1.65-.09-.59-.13-1.2-.13-1.82z"/>
      </svg>
    ),
  },
  {
    name: 'Meta',
    hiringType: 'Research & AI',
    logo: (
      <svg className="w-3.5 h-3.5 shrink-0 text-[#0668E1] fill-current" viewBox="0 0 24 24">
        <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
      </svg>
    ),
  },
];

export default function HomePage() {
  const { setRole } = useRole();
  const { resolvedTheme, toggleTheme } = useTheme();
  const router = useRouter();
  const [activeStakeholderTab, setActiveStakeholderTab] = useState<UserRole>('STUDENT');

  const handleLaunchRole = (role: UserRole) => {
    setRole(role);
    router.push(ROLE_PROFILES[role].dashboardPath);
  };

  const STAKEHOLDER_DETAILS: Record<UserRole, {
    title: string;
    badge: string;
    description: string;
    features: string[];
    stat: string;
    statLabel: string;
    path: string;
  }> = {
    STUDENT: {
      title: 'Student Career Operating System',
      badge: 'Vyankatesh Bairagi (B.Tech CS 2026)',
      description: 'Your single career command center: practice coding, assess ATS resume strength, apply to verified drives, track interview status, and share off-campus openings with peers.',
      features: [
        '78% Career Readiness Radar with gap breakdown',
        'Direct 1-click application to Google, Deloitte & Infosys drives',
        'Student-shared off-campus referral repository with +50 reward points',
        'AI Mock Interviews & automated coding assessments',
      ],
      stat: '94.6%',
      statLabel: 'Placement Rate in Top Cohorts',
      path: '/student',
    },
    TPO: {
      title: 'TPO Placement Desk & Governance',
      badge: 'Prof. Rajesh Kulkarni (Head TPO)',
      description: 'Automate complex placement drives, enforce multi-criteria eligibility policies in seconds, review student-contributed job links, and export official NIRF/NAAC reports.',
      features: [
        'Automated eligibility filtering across 1,200+ students in 200ms',
        'Live drive management with stage-by-stage applicant shortlisting',
        'Crowdsourced job submission verification desk',
        'Instant NIRF, NAAC & accreditation compliance exports',
      ],
      stat: '4.2x',
      statLabel: 'Faster Drive Turnaround',
      path: '/tpo',
    },
    RECRUITER: {
      title: 'Recruiter Talent Suite & Pipeline',
      badge: 'Arjun Nambiar (Campus Talent Lead, Google)',
      description: 'Filter verified candidate profiles by verified coding percentile, schedule multi-round interviews with automated candidate notifications, and release offer letters.',
      features: [
        'Verified Talent Passports with authentic university transcripts',
        'Kanban applicant pipeline: Applied -> Shortlist -> Interview -> Offer',
        'Automated interview schedules with Google Meet integration',
        'Digital offer letter issuance and acceptance telemetry',
      ],
      stat: '150+',
      statLabel: 'Enterprise Recruiters Onboarded',
      path: '/recruiter',
    },
    FACULTY: {
      title: 'Faculty Mentorship & Academic Advising',
      badge: 'Prof. Anita Patil (CS Dept)',
      description: 'Monitor career readiness for assigned student mentees, identify students falling behind, refer students to preferred corporate recruiters, and publish study decks.',
      features: [
        'Cohort skill readiness matrix and assessment gradebook',
        'Early-warning telemetry for students with low readiness scores',
        'Direct faculty student endorsements & referral letters',
        'Curated placement study materials and question banks',
      ],
      stat: '100%',
      statLabel: 'Mentee Visibility',
      path: '/faculty',
    },
    ALUMNI: {
      title: 'Alumni Network & Referrals',
      badge: 'Amit Joshi (SDE-II, Amazon AWS)',
      description: 'Give back to your alma mater: post internal corporate referral links, offer 1:1 student mentorship sessions, and guide juniors with real-world interview experience.',
      features: [
        'Post verified referral keys with direct ATS priority',
        '1:1 Student chat & resume critique booking',
        'Alumni directory and campus mentorship badges',
        'Earn alumni honors on college placement wall of fame',
      ],
      stat: '1,400+',
      statLabel: 'Alumni Referral Connections',
      path: '/alumni',
    },
    INSTITUTE_ADMIN: {
      title: 'Institutional Governance & Leadership',
      badge: 'Dr. Suresh Deshmukh (Principal)',
      description: 'Comprehensive college-wide analytics, department comparison charts, TPO officer management, and executive board presentations.',
      features: [
        'Cross-department placement telemetry and salary trends',
        'Recruiter MoUs and corporate partnership tracking',
        'Institutional branding and custom subdomain settings',
        'Board-ready PDF reports and NIRF compliance archives',
      ],
      stat: '100%',
      statLabel: 'Governance Audit Trail',
      path: '/institute',
    },
    SUPER_ADMIN: {
      title: 'Platform Core & Telemetry',
      badge: 'PlacementHub Core Operations',
      description: 'Multi-tenant SaaS management, global university onboarding, system audit logs, and global job aggregation engine.',
      features: [
        'Multi-campus tenant orchestration',
        'Global off-campus crawler and verification pipeline',
        'Enterprise RBAC policy enforcement',
        'System health and API latency monitors',
      ],
      stat: '99.98%',
      statLabel: 'Platform Uptime',
      path: '/super-admin',
    },
  };

  const ROLE_THEMES: Record<UserRole, {
    name: string;
    gradient: string;
    glow: string;
    badgeBg: string;
    badgeBorder: string;
    badgeText: string;
    btnGradient: string;
    btnShadow: string;
    iconBg: string;
    statColor: string;
  }> = {
    STUDENT: {
      name: 'Student',
      gradient: 'from-blue-600 to-cyan-500',
      glow: 'bg-blue-500/15 dark:bg-cyan-500/20',
      badgeBg: 'bg-blue-50 dark:bg-blue-950/70',
      badgeBorder: 'border-blue-200 dark:border-blue-800',
      badgeText: 'text-blue-700 dark:text-cyan-400',
      btnGradient: 'bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:to-cyan-400',
      btnShadow: 'shadow-blue-500/30 hover:shadow-blue-500/50',
      iconBg: 'bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-cyan-400',
      statColor: 'text-blue-600 dark:text-cyan-400',
    },
    TPO: {
      name: 'TPO Desk',
      gradient: 'from-emerald-600 to-teal-500',
      glow: 'bg-emerald-500/15 dark:bg-teal-500/20',
      badgeBg: 'bg-emerald-50 dark:bg-emerald-950/70',
      badgeBorder: 'border-emerald-200 dark:border-emerald-800',
      badgeText: 'text-emerald-700 dark:text-emerald-400',
      btnGradient: 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400',
      btnShadow: 'shadow-emerald-500/30 hover:shadow-emerald-500/50',
      iconBg: 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400',
      statColor: 'text-emerald-600 dark:text-emerald-400',
    },
    RECRUITER: {
      name: 'Recruiter Suite',
      gradient: 'from-indigo-600 to-violet-500',
      glow: 'bg-indigo-500/15 dark:bg-violet-500/20',
      badgeBg: 'bg-indigo-50 dark:bg-indigo-950/70',
      badgeBorder: 'border-indigo-200 dark:border-indigo-800',
      badgeText: 'text-indigo-700 dark:text-indigo-400',
      btnGradient: 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-500 hover:from-indigo-500 hover:to-violet-400',
      btnShadow: 'shadow-indigo-500/30 hover:shadow-indigo-500/50',
      iconBg: 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400',
      statColor: 'text-indigo-600 dark:text-indigo-400',
    },
    FACULTY: {
      name: 'Faculty Mentor',
      gradient: 'from-purple-600 to-pink-500',
      glow: 'bg-purple-500/15 dark:bg-pink-500/20',
      badgeBg: 'bg-purple-50 dark:bg-purple-950/70',
      badgeBorder: 'border-purple-200 dark:border-purple-800',
      badgeText: 'text-purple-700 dark:text-purple-400',
      btnGradient: 'bg-gradient-to-r from-purple-600 via-purple-500 to-pink-500 hover:from-purple-500 hover:to-pink-400',
      btnShadow: 'shadow-purple-500/30 hover:shadow-purple-500/50',
      iconBg: 'bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400',
      statColor: 'text-purple-600 dark:text-purple-400',
    },
    ALUMNI: {
      name: 'Alumni Network',
      gradient: 'from-amber-600 to-orange-500',
      glow: 'bg-amber-500/15 dark:bg-orange-500/20',
      badgeBg: 'bg-amber-50 dark:bg-amber-950/70',
      badgeBorder: 'border-amber-200 dark:border-amber-800',
      badgeText: 'text-amber-700 dark:text-amber-400',
      btnGradient: 'bg-gradient-to-r from-amber-600 via-amber-500 to-orange-500 hover:from-amber-500 hover:to-orange-400',
      btnShadow: 'shadow-amber-500/30 hover:shadow-amber-500/50',
      iconBg: 'bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400',
      statColor: 'text-amber-600 dark:text-amber-400',
    },
    INSTITUTE_ADMIN: {
      name: 'Institute Principal',
      gradient: 'from-rose-600 to-red-500',
      glow: 'bg-rose-500/15 dark:bg-red-500/20',
      badgeBg: 'bg-rose-50 dark:bg-rose-950/70',
      badgeBorder: 'border-rose-200 dark:border-rose-800',
      badgeText: 'text-rose-700 dark:text-rose-400',
      btnGradient: 'bg-gradient-to-r from-rose-600 via-rose-500 to-red-500 hover:from-rose-500 hover:to-red-400',
      btnShadow: 'shadow-rose-500/30 hover:shadow-rose-500/50',
      iconBg: 'bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400',
      statColor: 'text-rose-600 dark:text-rose-400',
    },
    SUPER_ADMIN: {
      name: 'Platform Core',
      gradient: 'from-slate-700 to-slate-900',
      glow: 'bg-blue-500/10',
      badgeBg: 'bg-slate-100 dark:bg-slate-800',
      badgeBorder: 'border-slate-300 dark:border-slate-700',
      badgeText: 'text-slate-800 dark:text-slate-200',
      btnGradient: 'bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800',
      btnShadow: 'shadow-slate-500/30',
      iconBg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
      statColor: 'text-slate-700 dark:text-slate-300',
    },
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#070B14] text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white transition-colors duration-200">

      {/* ========================================================================= */}
      {/* 1. TOP SAAS HEADER                                                        */}
      {/* ========================================================================= */}
      <header className="sticky top-3 sm:top-4 z-50 max-w-7xl mx-auto w-[calc(100%-1.5rem)] sm:w-[calc(100%-3rem)] rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-[#090D17]/90 backdrop-blur-md shadow-md shadow-slate-900/5 transition-all">
        <div className="px-4 sm:px-6 h-16 flex items-center justify-between gap-4">

          {/* Logo & Brand */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md group-hover:bg-blue-500 transition-colors shrink-0">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-base text-slate-900 dark:text-white tracking-tight">
                  PlacementHub
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 hidden sm:inline">
                  v2.0 Enterprise
                </span>
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 -mt-0.5">
                Campus Career &amp; Placement Operating System
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center gap-6 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <a href="#about" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              What is CareerOS?
            </a>
            <a href="#stakeholders" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              All 6 Stakeholder Portals
            </a>
            <a href="#features" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              Architecture &amp; ATS
            </a>
            <a href="#partners" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              Hiring Partners
            </a>
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={resolvedTheme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700" />
              )}
            </button>

            <Link
              href="/login"
              className="hidden sm:inline-flex text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-blue-600 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Sign In
            </Link>

            {/* PRIMARY HERO CTA BUTTON TO ENTER THE SOFTWARE */}
            <Link
              href="/student"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/20 hover:shadow-lg transition-all"
            >
              <span>Explore Software</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. HERO SECTION: IMAGE 1 SPLIT 3D ISOMETRIC CONSOLE & THEME SUPPORT       */}
      {/* ========================================================================= */}
      <section className="relative px-4 sm:px-6 lg:px-8 pt-8 pb-16 lg:pt-14 lg:pb-24 max-w-7xl mx-auto w-full">

        {/* Ambient background glows with theme awareness */}
        <div className="absolute top-10 left-10 w-96 h-96 bg-blue-500/10 dark:bg-blue-600/20 rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute top-20 right-10 w-[420px] h-[420px] bg-purple-500/10 dark:bg-purple-600/15 rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute bottom-10 right-1/3 w-80 h-80 bg-cyan-500/10 dark:bg-cyan-500/15 rounded-full blur-3xl pointer-events-none -z-10" />

        {/* Floating subtle star sparkles */}
        <div className="absolute top-8 left-1/3 text-blue-400/40 text-xs select-none pointer-events-none animate-pulse">✦</div>
        <div className="absolute bottom-12 right-12 text-purple-400/40 text-sm select-none pointer-events-none animate-pulse">✦</div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">

          {/* ===================================================================== */}
          {/* LEFT COLUMN: HERO HEADLINE, EXPLANATION, CTAS & STAKEHOLDER PORTALS   */}
          {/* ===================================================================== */}
          <div className="lg:col-span-6 space-y-6 text-left">

            {/* Top Badge matching Image 1 */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/5 dark:bg-slate-900/80 border border-slate-300/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold backdrop-blur-md shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 animate-pulse shrink-0" />
              <span>Unified Placement Operating System</span>
            </div>

            {/* Massive Bold Headline matching Image 1 */}
            <h1 className="text-4xl sm:text-5xl lg:text-[58px] xl:text-[64px] font-black tracking-tight leading-[1.05] text-slate-900 dark:text-white uppercase">
              CAMPUS
              <br />
              PLACEMENTS,
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 dark:from-blue-400 dark:via-blue-300 dark:to-cyan-400">
                FINALLY UNIFIED.
              </span>
            </h1>

            {/* Subtitle matching Image 1 */}
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed font-normal max-w-xl">
              The Intelligent Platform connecting Students, TPOs, Recruiters, and Mentors to eliminate
              placement chaos with AI-verified results.
            </p>

            {/* Two Action Buttons matching Image 1 */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5">
              <Link
                href="/student"
                className="px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50 flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5"
              >
                <span>Explore CareerOS Software</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <a
                href="#about"
                className="px-6 py-3.5 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-300 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-sm font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors"
              >
                <span>Learn How It Works</span>
                <Compass className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </a>
            </div>
          </div>

          {/* ===================================================================== */}
          {/* RIGHT COLUMN: STRAIGHT SOFTWARE TABLET CONSOLE WITH DUAL THEME SUPPORT */}
          {/* ===================================================================== */}
          <div className="lg:col-span-6 relative pt-6 lg:pt-0">

            {/* Floating Circuit Connection Lines & Floating External Nodes */}
            {/* 1. Corporate HQ floating node (top-right) */}
            <div className="absolute -top-4 right-4 sm:right-8 z-20 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-[#0B132B] border border-slate-200 dark:border-cyan-500/40 text-slate-800 dark:text-white text-xs font-bold shadow-lg shadow-slate-200/80 dark:shadow-cyan-500/20 backdrop-blur-md">
              <div className="w-5 h-5 rounded-md bg-blue-600 flex items-center justify-center text-white">
                <Building className="w-3 h-3" />
              </div>
              <span className="text-[11px] tracking-tight">Corporate HQ</span>
            </div>

            {/* Circuit Line SVG: Tablet to Corporate HQ */}
            <svg
              className="absolute top-1 right-20 w-32 h-16 pointer-events-none z-10 overflow-visible hidden sm:block"
              viewBox="0 0 144 80"
              fill="none"
            >
              <path
                d="M 10 75 Q 70 75 110 25"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray="4 3"
                className="text-blue-500 dark:text-cyan-400 animate-pulse"
              />
              <circle cx="110" cy="25" r="3" className="fill-blue-500 dark:fill-cyan-400" />
            </svg>

            {/* 2. Candidate Pipeline floating node (bottom-left) */}
            <div className="absolute -bottom-4 left-4 sm:left-6 z-20 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-[#0B132B] border border-slate-200 dark:border-blue-500/40 text-slate-800 dark:text-white text-xs font-bold shadow-lg shadow-slate-200/80 dark:shadow-blue-500/20 backdrop-blur-md">
              <div className="w-5 h-5 rounded-md bg-cyan-600 flex items-center justify-center text-white">
                <Users className="w-3 h-3" />
              </div>
              <span className="text-[11px] tracking-tight">Verified Candidate Pool</span>
            </div>

            {/* 3. Floating telemetry chip (middle-left) */}
            <div className="absolute top-1/2 -left-2 sm:-left-4 -translate-y-1/2 z-20 hidden sm:flex flex-col gap-1 p-2 rounded-xl bg-white dark:bg-[#091124] border border-slate-200 dark:border-emerald-500/40 shadow-xl shadow-slate-200/80 dark:shadow-emerald-500/20 backdrop-blur-md">
              <div className="w-10 h-1 bg-emerald-500 rounded-full" />
              <div className="w-7 h-1 bg-cyan-500 rounded-full" />
              <div className="w-9 h-1 bg-blue-500 rounded-full" />
            </div>

            {/* The Console Chassis: Straight in default state, zero cropping, full dual-theme */}
            <div className="relative w-full rounded-2xl sm:rounded-3xl bg-white dark:bg-[#0B132B] border-2 border-slate-200/90 dark:border-cyan-500/30 p-3.5 sm:p-5 shadow-2xl shadow-slate-200/80 dark:shadow-blue-950/50 text-slate-800 dark:text-white transition-all duration-300">

              {/* Console Header Bar */}
              <div className="flex items-center justify-between pb-3 mb-3.5 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white text-[10px] font-black shadow-xs">
                    C
                  </div>
                  <span className="text-xs font-bold tracking-tight text-slate-800 dark:text-slate-100">
                    Application Pipeline
                  </span>
                </div>

                {/* Top Waveform / Audio Frequency Telemetry Bar (Matching Image 1) */}
                <div className="hidden sm:flex items-center gap-1 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-cyan-500/30">
                  {[12, 18, 8, 22, 14, 26, 10, 20, 16, 24, 12, 18, 28, 14, 22, 8, 16, 20, 12, 24, 18, 14, 22, 16].map((h, i) => (
                    <span
                      key={i}
                      className="w-0.5 rounded-full bg-gradient-to-t from-blue-500 to-indigo-500 dark:from-cyan-400 dark:to-purple-500 transition-all duration-300"
                      style={{ height: `${h}px` }}
                    />
                  ))}
                </div>

                <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                  All teams ▾
                </span>
              </div>

              {/* Inner Console Screen Grid */}
              <div className="grid grid-cols-12 gap-2.5 sm:gap-3 items-start pb-6 sm:pb-8">

                {/* Left Mini Sidebar with Navigation Icons */}
                <div className="col-span-1 hidden sm:flex flex-col items-center gap-2.5 pt-1">
                  <div className="p-1 rounded-md bg-blue-50 dark:bg-blue-600/30 text-blue-600 dark:text-cyan-400">
                    <Layers className="w-3.5 h-3.5" />
                  </div>
                  <div className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-white">
                    <Users className="w-3.5 h-3.5" />
                  </div>
                  <div className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-white">
                    <BookOpen className="w-3.5 h-3.5" />
                  </div>
                  <div className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-white">
                    <Briefcase className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* Main Pipeline Kanban Section (Filtered, Interview, Offer) */}
                <div className="col-span-12 sm:col-span-11 grid grid-cols-3 gap-2 sm:gap-2.5">

                  {/* Column 1: Filtered */}
                  <div className="bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-xl p-2 sm:p-2.5 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      <span>Filtered</span>
                      <ArrowRight className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                    </div>
                    <div className="p-2 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 shadow-xs space-y-1">
                      <span className="text-[10px] text-blue-600 dark:text-cyan-400 font-semibold block truncate">
                        Application &amp; Documentation
                      </span>
                      <div className="flex items-center gap-1.5 pt-1">
                        <div className="w-4 h-4 rounded-full bg-amber-500 text-[8px] font-bold flex items-center justify-center text-white shrink-0">
                          S
                        </div>
                        <span className="text-[9px] text-slate-700 dark:text-slate-300 font-medium truncate">Shanon Bode</span>
                      </div>
                    </div>
                  </div>

                  {/* Column 2: Interview */}
                  <div className="bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-xl p-2 sm:p-2.5 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-purple-700 dark:text-purple-300">
                      <span>Interview</span>
                      <ArrowRight className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                    </div>
                    <div className="p-2 rounded-lg bg-white dark:bg-slate-800/80 border border-purple-200 dark:border-purple-500/30 shadow-xs space-y-1">
                      <span className="text-[10px] text-purple-600 dark:text-purple-300 font-semibold block truncate">
                        Technical &amp; Architecture
                      </span>
                      <div className="flex items-center gap-1.5 pt-1">
                        <div className="w-4 h-4 rounded-full bg-blue-500 text-[8px] font-bold flex items-center justify-center text-white shrink-0">
                          C
                        </div>
                        <span className="text-[9px] text-slate-700 dark:text-slate-300 font-medium truncate">Cameron Williamson</span>
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 shadow-xs space-y-1">
                      <span className="text-[10px] text-slate-700 dark:text-slate-300 font-semibold block truncate">
                        HR &amp; Leadership
                      </span>
                      <div className="flex items-center gap-1.5 pt-1">
                        <div className="w-4 h-4 rounded-full bg-emerald-500 text-[8px] font-bold flex items-center justify-center text-white shrink-0">
                          A
                        </div>
                        <span className="text-[9px] text-slate-700 dark:text-slate-300 font-medium truncate">Albert Flores</span>
                      </div>
                    </div>
                  </div>

                  {/* Column 3: Offer */}
                  <div className="bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-xl p-2 sm:p-2.5 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                      <span>Offer</span>
                      <Check className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />
                    </div>
                    <div className="p-2 rounded-lg bg-white dark:bg-slate-800/80 border border-emerald-200 dark:border-emerald-500/30 shadow-xs space-y-1">
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold block truncate">
                        Offer Letter Issued
                      </span>
                      <div className="flex items-center gap-1.5 pt-1">
                        <div className="w-4 h-4 rounded-full bg-indigo-500 text-[8px] font-bold flex items-center justify-center text-white shrink-0">
                          D
                        </div>
                        <span className="text-[9px] text-slate-700 dark:text-slate-300 font-medium truncate">Devon Lane</span>
                      </div>
                    </div>

                    {/* Verified Data Badge Gauge inside tablet */}
                    <div className="p-2 rounded-lg bg-emerald-50 dark:bg-slate-900/90 border border-emerald-200 dark:border-cyan-500/40 flex items-center justify-between shadow-xs">
                      <div>
                        <span className="text-[9px] text-emerald-700 dark:text-emerald-400 font-bold block">verified data</span>
                        <span className="text-[8px] text-slate-500 dark:text-slate-400">100% Tamperproof</span>
                      </div>
                      <div className="w-5 h-5 rounded-full border-2 border-emerald-500 dark:border-emerald-400 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                        <Check className="w-3 h-3" />
                      </div>
                    </div>
                  </div>

                </div>

              </div>

              {/* Floating Bottom-Right Card: NIRF Compliance Matrix with Spider Radar Chart */}
              {/* Perfectly contained with relative/absolute alignment so it never crops */}
              <div className="absolute -bottom-5 sm:-bottom-6 right-2 sm:right-4 w-44 sm:w-52 p-3 rounded-2xl bg-white dark:bg-[#091124] border-2 border-slate-200 dark:border-cyan-500/50 shadow-2xl shadow-slate-300/80 dark:shadow-cyan-950/60 z-30 transition-colors">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] sm:text-[11px] font-bold text-slate-800 dark:text-slate-200">
                    NIRF Compliance Matrix
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-ping" />
                </div>

                {/* Authentic SVG Pentagon Radar / Spider Chart */}
                <div className="relative w-full h-28 sm:h-32 flex items-center justify-center my-1">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 120 120">
                    {/* Outer Pentagon Grid */}
                    <polygon
                      points="60,18 100,47 85,94 35,94 20,47"
                      fill="none"
                      className="stroke-slate-300 dark:stroke-slate-700/60"
                      strokeWidth="1"
                    />
                    {/* Inner Pentagon Grid */}
                    <polygon
                      points="60,39 80,53.5 72.5,77 47.5,77 40,53.5"
                      fill="none"
                      className="stroke-slate-200 dark:stroke-slate-700/40"
                      strokeWidth="1"
                    />
                    {/* Axis lines from center (60,60) */}
                    <line x1="60" y1="60" x2="60" y2="18" className="stroke-slate-200 dark:stroke-slate-700/40" strokeWidth="1" />
                    <line x1="60" y1="60" x2="100" y2="47" className="stroke-slate-200 dark:stroke-slate-700/40" strokeWidth="1" />
                    <line x1="60" y1="60" x2="85" y2="94" className="stroke-slate-200 dark:stroke-slate-700/40" strokeWidth="1" />
                    <line x1="60" y1="60" x2="35" y2="94" className="stroke-slate-200 dark:stroke-slate-700/40" strokeWidth="1" />
                    <line x1="60" y1="60" x2="20" y2="47" className="stroke-slate-200 dark:stroke-slate-700/40" strokeWidth="1" />

                    {/* Glowing Data Polygon */}
                    <polygon
                      points="60,24 94,50 80,90 38,88 24,50"
                      className="fill-blue-500/20 dark:fill-cyan-500/20 stroke-blue-600 dark:stroke-cyan-400 drop-shadow-[0_0_6px_rgba(59,130,246,0.5)] dark:drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]"
                      strokeWidth="2"
                    />

                    {/* Radar Axis Labels (TLP, RPC, GO, OI, PR) */}
                    <text x="60" y="12" textAnchor="middle" className="fill-slate-500 dark:fill-slate-400 font-bold" fontSize="7">TLP</text>
                    <text x="108" y="49" textAnchor="start" className="fill-slate-500 dark:fill-slate-400 font-bold" fontSize="7">RPC</text>
                    <text x="90" y="104" textAnchor="middle" className="fill-slate-500 dark:fill-slate-400 font-bold" fontSize="7">GO</text>
                    <text x="30" y="104" textAnchor="middle" className="fill-slate-500 dark:fill-slate-400 font-bold" fontSize="7">OI</text>
                    <text x="12" y="49" textAnchor="end" className="fill-slate-500 dark:fill-slate-400 font-bold" fontSize="7">PR</text>

                    {/* Vertex points */}
                    <circle cx="60" cy="24" r="2.5" fill="#3B82F6" />
                    <circle cx="94" cy="50" r="2.5" fill="#06B6D4" />
                    <circle cx="80" cy="90" r="2.5" fill="#10B981" />
                    <circle cx="38" cy="88" r="2.5" fill="#A855F7" />
                    <circle cx="24" cy="50" r="2.5" fill="#EC4899" />
                  </svg>
                </div>

                {/* Chart Legend */}
                <div className="flex items-center justify-between text-[8px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                  <span className="flex items-center gap-1 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-cyan-400" />
                    NIRF Score 94.2
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">Grade A++</span>
                </div>
              </div>

            </div>

          </div>

        </div>

        {/* ===================================================================== */}
        {/* CREATIVE CENTERED STAKEHOLDER PORTAL DOCK (ALL IN ONE LINE)          */}
        {/* ===================================================================== */}
        <div className="mt-12 sm:mt-16 pt-8 border-t border-slate-200/60 dark:border-slate-800/80 flex flex-col items-center gap-3">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            <span>Interactive Stakeholder Portals (Click to Launch Live)</span>
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          </div>

          <div className="w-full flex items-center justify-center overflow-x-auto pb-2 scrollbar-none">
            <div className="inline-flex items-center justify-center gap-2 sm:gap-3 p-2 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800/80 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-cyan-950/20">
              
              {/* Student */}
              <button
                onClick={() => handleLaunchRole('STUDENT')}
                className="group px-3.5 py-2 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 hover:bg-blue-500 dark:hover:bg-blue-600 border border-slate-200/80 dark:border-slate-700/60 hover:border-transparent text-slate-700 dark:text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-2 shadow-2xs hover:shadow-md hover:shadow-blue-500/25 transition-all transform hover:-translate-y-0.5 whitespace-nowrap"
              >
                <div className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-950/80 group-hover:bg-white/20 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:text-white transition-colors">
                  <GraduationCap className="w-3.5 h-3.5" />
                </div>
                <span>Student</span>
              </button>

              {/* TPO */}
              <button
                onClick={() => handleLaunchRole('TPO')}
                className="group px-3.5 py-2 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 hover:bg-emerald-500 dark:hover:bg-emerald-600 border border-slate-200/80 dark:border-slate-700/60 hover:border-transparent text-slate-700 dark:text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-2 shadow-2xs hover:shadow-md hover:shadow-emerald-500/25 transition-all transform hover:-translate-y-0.5 whitespace-nowrap"
              >
                <div className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 group-hover:bg-white/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:text-white transition-colors">
                  <Briefcase className="w-3.5 h-3.5" />
                </div>
                <span>TPO Desk</span>
              </button>

              {/* Recruiter */}
              <button
                onClick={() => handleLaunchRole('RECRUITER')}
                className="group px-3.5 py-2 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 hover:bg-indigo-500 dark:hover:bg-indigo-600 border border-slate-200/80 dark:border-slate-700/60 hover:border-transparent text-slate-700 dark:text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-2 shadow-2xs hover:shadow-md hover:shadow-indigo-500/25 transition-all transform hover:-translate-y-0.5 whitespace-nowrap"
              >
                <div className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-950/80 group-hover:bg-white/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:text-white transition-colors">
                  <Building2 className="w-3.5 h-3.5" />
                </div>
                <span>Recruiter Suite</span>
              </button>

              {/* Faculty Mentor */}
              <button
                onClick={() => handleLaunchRole('FACULTY')}
                className="group px-3.5 py-2 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 hover:bg-purple-500 dark:hover:bg-purple-600 border border-slate-200/80 dark:border-slate-700/60 hover:border-transparent text-slate-700 dark:text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-2 shadow-2xs hover:shadow-md hover:shadow-purple-500/25 transition-all transform hover:-translate-y-0.5 whitespace-nowrap"
              >
                <div className="w-6 h-6 rounded-lg bg-purple-100 dark:bg-purple-950/80 group-hover:bg-white/20 flex items-center justify-center text-purple-600 dark:text-purple-400 group-hover:text-white transition-colors">
                  <BookOpen className="w-3.5 h-3.5" />
                </div>
                <span>Faculty Mentor</span>
              </button>

              {/* Alumni */}
              <button
                onClick={() => handleLaunchRole('ALUMNI')}
                className="group px-3.5 py-2 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 hover:bg-amber-500 dark:hover:bg-amber-600 border border-slate-200/80 dark:border-slate-700/60 hover:border-transparent text-slate-700 dark:text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-2 shadow-2xs hover:shadow-md hover:shadow-amber-500/25 transition-all transform hover:-translate-y-0.5 whitespace-nowrap"
              >
                <div className="w-6 h-6 rounded-lg bg-amber-100 dark:bg-amber-950/80 group-hover:bg-white/20 flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:text-white transition-colors">
                  <Users className="w-3.5 h-3.5" />
                </div>
                <span>Alumni Network</span>
              </button>

              {/* Institute Principal */}
              <button
                onClick={() => handleLaunchRole('INSTITUTE_ADMIN')}
                className="group px-3.5 py-2 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 hover:bg-rose-500 dark:hover:bg-rose-600 border border-slate-200/80 dark:border-slate-700/60 hover:border-transparent text-slate-700 dark:text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-2 shadow-2xs hover:shadow-md hover:shadow-rose-500/25 transition-all transform hover:-translate-y-0.5 whitespace-nowrap"
              >
                <div className="w-6 h-6 rounded-lg bg-rose-100 dark:bg-rose-950/80 group-hover:bg-white/20 flex items-center justify-center text-rose-600 dark:text-rose-400 group-hover:text-white transition-colors">
                  <Shield className="w-3.5 h-3.5" />
                </div>
                <span>Institute Principal</span>
              </button>

            </div>
          </div>
        </div>

      </section>

      {/* ========================================================================= */}
      {/* 3. "WHAT IS CAREEROS?" EXPLANATION SECTION                                 */}
      {/* ========================================================================= */}
      <section id="about" className="py-16 bg-white dark:bg-[#0B101D] border-t border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-xs uppercase font-bold tracking-widest text-blue-600 dark:text-blue-400 mb-2">
              Deep-Dive Overview
            </h2>
            <h3 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Why Universities &amp; Students Need CareerOS
            </h3>
            <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              Traditional campus placements suffer from scattered WhatsApp groups, lost resume emails, unverified off-campus job links,
              and stressful manual Excel spreadsheets. PlacementHub replaces this with an intelligent, integrated operating system.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* Pillar 1 */}
            <div className="p-6 rounded-2xl bg-[#F8FAFC] dark:bg-[#111927] border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600 transition-all shadow-xs flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/70 text-blue-600 flex items-center justify-center font-bold mb-4">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                  1. Real-Time Student Career Readiness
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Students don&apos;t just apply blindly. CareerOS computes a dynamic <strong>78% Readiness Score</strong> across
                  Profile Health, ATS Resume Strength, Coding Percentiles, and Mock Interview performance-highlighting clear skill gaps.
                </p>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                Includes AI Mock Interviews &amp; Code Sandbox →
              </div>
            </div>

            {/* Pillar 2 */}
            <div className="p-6 rounded-2xl bg-[#F8FAFC] dark:bg-[#111927] border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600 transition-all shadow-xs flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 flex items-center justify-center font-bold mb-4">
                  <Briefcase className="w-6 h-6" />
                </div>
                <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                  2. Automated TPO Placement Desk
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Training &amp; Placement Officers can publish on-campus drives, filter eligible cohorts across 1,000+ candidates
                  by CGPA, department, and active backlogs with zero manual work, and generate official NAAC / NIRF reports.
                </p>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                1-Click NIRF &amp; NAAC Data Compliance →
              </div>
            </div>

            {/* Pillar 3 */}
            <div className="p-6 rounded-2xl bg-[#F8FAFC] dark:bg-[#111927] border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600 transition-all shadow-xs flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/70 text-amber-600 flex items-center justify-center font-bold mb-4">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                  3. Student-Shared Job Opportunities
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Students crowdsource active off-campus job openings (like Airbnb, Zomato, Ola). Once approved by the TPO cell,
                  the student earns <strong>+50 reputation points</strong> and the opening becomes available campus-wide.
                </p>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                Crowdsourced Referral Economy →
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. INTERACTIVE STAKEHOLDER PORTAL SHOWCASE                                 */}
      {/* ========================================================================= */}
      <section id="stakeholders" className="py-16 max-w-7xl mx-auto px-4 sm:px-6 w-full">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <h2 className="text-xs uppercase font-bold tracking-widest text-blue-600 dark:text-blue-400 mb-2">
            Multi-Stakeholder Architecture
          </h2>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            One Core Database • 6 Dedicated Workspaces
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2">
            Select a role to preview its dedicated modules, workflow, and instant access link:
          </p>
        </div>

        {/* Stakeholder Tab Selector Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 mb-8">
          {(['STUDENT', 'TPO', 'RECRUITER', 'FACULTY', 'ALUMNI', 'INSTITUTE_ADMIN'] as UserRole[]).map((r) => {
            const isSelected = activeStakeholderTab === r;
            const theme = ROLE_THEMES[r];
            return (
              <button
                key={r}
                onClick={() => setActiveStakeholderTab(r)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-xs ${
                  isSelected
                    ? `${theme.btnGradient} text-white shadow-md scale-105`
                    : 'bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {r === 'STUDENT' && <GraduationCap className="w-4 h-4" />}
                {r === 'TPO' && <Briefcase className="w-4 h-4" />}
                {r === 'RECRUITER' && <Building2 className="w-4 h-4" />}
                {r === 'FACULTY' && <BookOpen className="w-4 h-4" />}
                {r === 'ALUMNI' && <Users className="w-4 h-4" />}
                {r === 'INSTITUTE_ADMIN' && <Shield className="w-4 h-4" />}
                <span>{theme.name}</span>
              </button>
            );
          })}
        </div>

        {/* Selected Stakeholder Detail Box: Stylized, Role-Themed & Centered Button */}
        {(() => {
          const detail = STAKEHOLDER_DETAILS[activeStakeholderTab];
          const theme = ROLE_THEMES[activeStakeholderTab];
          return (
            <div className="relative max-w-4xl mx-auto rounded-3xl bg-white dark:bg-[#0C1222] border-2 border-slate-200/90 dark:border-slate-800 shadow-2xl p-6 sm:p-10 transition-all duration-300 overflow-hidden">
              
              {/* Dynamic ambient color glow matching role theme */}
              <div className={`absolute -top-24 -right-24 w-80 h-80 rounded-full blur-3xl pointer-events-none transition-all duration-700 ${theme.glow}`} />
              <div className={`absolute -bottom-24 -left-24 w-80 h-80 rounded-full blur-3xl pointer-events-none transition-all duration-700 ${theme.glow}`} />

              {/* Top Persona Header + Key Stat Badge */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-slate-800/80 relative z-10">
                <div className="space-y-2.5 max-w-xl text-left">
                  {/* Persona Identity Badge */}
                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border backdrop-blur-md transition-colors ${theme.badgeBg} ${theme.badgeBorder} ${theme.badgeText}`}>
                    <span className="w-2 h-2 rounded-full bg-current animate-ping" />
                    <span>{detail.badge}</span>
                  </div>

                  <h4 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                    {detail.title}
                  </h4>

                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                    {detail.description}
                  </p>
                </div>

                {/* Styled Metric Pill Card */}
                <div className="sm:self-center p-4 sm:p-5 rounded-2xl bg-slate-50/90 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 text-center shrink-0 min-w-[180px] shadow-xs">
                  <div className={`text-3xl sm:text-4xl font-black tracking-tight mb-0.5 ${theme.statColor}`}>
                    {detail.stat}
                  </div>
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {detail.statLabel}
                  </div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 uppercase tracking-wider font-semibold">
                    Verified Telemetry
                  </div>
                </div>
              </div>

              {/* 2x2 Feature & Capability Grid */}
              <div className="my-6 relative z-10 text-left">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                  <span>Key Architecture Modules &amp; Capabilities</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {detail.features.map((feat, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/50 hover:bg-white dark:hover:bg-slate-800/70 transition-all flex items-start gap-3 shadow-2xs group"
                    >
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-colors ${theme.iconBg}`}>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs sm:text-[13px] font-medium text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white transition-colors leading-snug">
                        {feat}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Centered Launch Action Button (User's Core Requirement) */}
              <div className="pt-6 border-t border-slate-100 dark:border-slate-800/80 flex flex-col items-center justify-center gap-2.5 relative z-10 text-center">
                <button
                  onClick={() => handleLaunchRole(activeStakeholderTab)}
                  className={`w-full sm:w-auto px-8 py-3.5 rounded-xl text-white text-sm font-bold shadow-lg transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2.5 ${theme.btnGradient} ${theme.btnShadow}`}
                >
                  <span>Launch {theme.name} Workspace</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                  Instant live access • Direct partition switch with persistent demo state
                </span>
              </div>

            </div>
          );
        })()}

      </section>

      {/* ========================================================================= */}
      {/* 5. HIRING PARTNERS LOGO MARQUEE (MODERN + PROPER MARQUEE + STYLIZED MOCK NOTE) */}
      {/* ========================================================================= */}
      <section id="partners" className="py-14 sm:py-16 bg-white dark:bg-[#080D1A] border-t border-slate-200/80 dark:border-slate-800/80 relative overflow-hidden">
        
        {/* Subtle background ambient blur */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-32 bg-blue-500/5 dark:bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center relative z-10">
          
          {/* Header pill & Stylized Supplementary Notice */}
          <div className="flex flex-col items-center gap-2.5 mb-8">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100/90 dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800/80 text-[11px] font-semibold text-slate-600 dark:text-slate-400 backdrop-blur-md shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="tracking-wide uppercase font-bold text-slate-700 dark:text-slate-300">Campus Placement Network</span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className="text-[10px] tracking-wider text-slate-500 dark:text-slate-400 uppercase font-medium">Supplementary Mock Showcase</span>
            </div>

            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Enterprise Partners &amp; Hiring Drives Onboarded
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xl mx-auto font-normal">
              Connecting universities directly with leading tech and consulting recruiters through verified telemetry.
            </p>
          </div>

          {/* Proper Infinite Marquee Container with Left & Right Gradient Masks */}
          <div className="relative w-full overflow-hidden py-3">
            {/* Left Edge Gradient Fade */}
            <div className="absolute left-0 top-0 bottom-0 w-16 sm:w-32 bg-gradient-to-r from-white dark:from-[#080D1A] to-transparent z-10 pointer-events-none" />
            {/* Right Edge Gradient Fade */}
            <div className="absolute right-0 top-0 bottom-0 w-16 sm:w-32 bg-gradient-to-l from-white dark:from-[#080D1A] to-transparent z-10 pointer-events-none" />

            {/* Seamless Infinite Marquee Track (duplicating set for smooth infinite loop) */}
            <div className="animate-marquee flex items-center">
              
              {/* Loop 1 */}
              <div className="flex items-center gap-4 sm:gap-6 shrink-0 pr-4 sm:pr-6">
                {PARTNER_COMPANIES.map((c, i) => (
                  <div
                    key={`p1-${i}`}
                    className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-slate-50/90 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800/80 hover:border-blue-500/60 dark:hover:border-cyan-500/60 hover:bg-white dark:hover:bg-slate-800/90 shadow-2xs hover:shadow-md transition-all cursor-pointer group shrink-0"
                  >
                    <div className="w-5 h-5 flex items-center justify-center shrink-0">
                      {c.logo}
                    </div>
                    <span className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-cyan-400 transition-colors whitespace-nowrap">
                      {c.name}
                      {c.dot && <span className="text-[#86BC25]">.</span>}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-slate-200/60 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium border border-slate-300/40 dark:border-slate-700/50">
                      {c.hiringType}
                    </span>
                  </div>
                ))}
              </div>

              {/* Loop 2 (Infinite duplicate) */}
              <div className="flex items-center gap-4 sm:gap-6 shrink-0 pr-4 sm:pr-6" aria-hidden="true">
                {PARTNER_COMPANIES.map((c, i) => (
                  <div
                    key={`p2-${i}`}
                    className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-slate-50/90 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800/80 hover:border-blue-500/60 dark:hover:border-cyan-500/60 hover:bg-white dark:hover:bg-slate-800/90 shadow-2xs hover:shadow-md transition-all cursor-pointer group shrink-0"
                  >
                    <div className="w-5 h-5 flex items-center justify-center shrink-0">
                      {c.logo}
                    </div>
                    <span className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-cyan-400 transition-colors whitespace-nowrap">
                      {c.name}
                      {c.dot && <span className="text-[#86BC25]">.</span>}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-slate-200/60 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium border border-slate-300/40 dark:border-slate-700/50">
                      {c.hiringType}
                    </span>
                  </div>
                ))}
              </div>

            </div>
          </div>

          {/* Stylish, elegant supplementary note that enhances aesthetics */}
          <div className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500 font-medium tracking-tight">
            <Sparkles className="w-3 h-3 text-blue-500 dark:text-cyan-400 shrink-0" />
            <span>* Supplementary demonstration data: Corporate logos, hiring drives, and telemetry are simulated for prototype preview.</span>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. FINAL HIGH-CONVERSION CTA BANNER                                       */}
      {/* ========================================================================= */}
      <section className="py-16 px-4 sm:px-6 max-w-5xl mx-auto w-full text-center">
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white shadow-2xl relative overflow-hidden">
          <h3 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Ready to Explore the CareerOS Software?
          </h3>
          <p className="mt-3 text-sm sm:text-base text-blue-100 max-w-xl mx-auto leading-relaxed">
            Experience the student dashboard, verified drives, AI mock interviews, and automated TPO governance today.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/student"
              className="px-8 py-3.5 bg-white text-blue-700 hover:bg-blue-50 font-bold rounded-xl text-sm shadow-md transition-all"
            >
              Enter Student Software (Vyankatesh Bairagi) →
            </Link>
            <Link
              href="/login"
              className="px-6 py-3.5 bg-blue-700/60 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm border border-blue-400/40 transition-all"
            >
              Sign In with Institutional ID
            </Link>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. SAAS FOOTER                                                            */}
      {/* ========================================================================= */}
      <footer className="mt-auto border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#070B14] py-8 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-blue-600" />
            <span className="font-bold text-slate-900 dark:text-white">PlacementHub</span>
            <span>•</span>
            <span>Enterprise Campus Career Operating System</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1.5 text-emerald-600 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Neon DB &amp; Cloudflare R2 Online
            </span>
            <span>•</span>
            <span>© 2026 PlacementHub Technologies</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
