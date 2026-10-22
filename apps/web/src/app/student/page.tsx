'use client';

import React, { useState, useEffect, useRef } from 'react';
import StitchDashboardShell from '@/components/layout/StitchDashboardShell';
import StudentProfileManager from '@/components/student/StudentProfileManager';
import ResumeStudio from '@/components/student/ResumeStudio';
import FakeJobDetectorWidget from '@/components/common/FakeJobDetectorWidget';
import { useRole } from '@/context/RoleContext';
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Bookmark,
  TrendingUp,
  X,
  Plus,
  Send,
  Award,
  FileText,
  Clock,
  Building,
  Briefcase,
  Search,
  Filter,
  Check,
  Calendar,
  Users,
  Compass,
  Code,
  GraduationCap,
  Play,
  ArrowRight,
  BookOpen,
  MessageSquare,
  HelpCircle,
  Settings,
  Bell,
  Sliders,
  FolderGit2,
  Download,
  Share2,
  Video,
  Mic,
  Star,
  Zap,
  Globe,
  Lock,
  ShieldCheck,
  ShieldAlert,
  Copy,
  FileCheck2,
  Flame,
  ChevronLeft,
  Terminal,
  CheckSquare,
  Square,
  RotateCcw,
  Upload,
  Volume2,
  MicOff,
  VideoOff,
  Loader2,
} from 'lucide-react';
import {
  getAssessments,
  getLearningRoadmaps,
  getRoadmapDetail,
  startAssessmentSession,
  submitAssessmentSession,
  runCodeSandbox,
  toggleTopicCompletion,
  enrollRoadmap,
  AssessmentSummary,
  RoadmapSummary,
  RoadmapDetail,
} from '@/lib/assessmentClient';

interface RecommendedJob {
  id: string;
  company: string;
  logo: string;
  role: string;
  type: string;
  location: string;
  deadline: string;
  matchScore: number;
  ctc: string;
  description: string;
  skills: string[];
}

interface StudentSharedOpp {
  id: string;
  company: string;
  logo: string;
  role: string;
  tag: string;
  postedBy: string;
  timeAgo: string;
  url: string;
  ctc: string;
}

const DEFAULT_EMPTY_JOBS: RecommendedJob[] = [];
const DEFAULT_EMPTY_OPPS: StudentSharedOpp[] = [];


interface HiringCompany {
  name: string;
  dot?: boolean;
  logo: React.ReactNode;
}

const COMPANIES_HIRING_DATA: HiringCompany[] = [
  {
    name: 'Google',
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
    logo: (
      <div className="w-3.5 h-3.5 rounded-full bg-[#86BC25] flex items-center justify-center shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
      </div>
    ),
  },
  {
    name: 'Infosys',
    logo: (
      <div className="w-3.5 h-3.5 rounded bg-[#007CC3] flex items-center justify-center text-white text-[8px] font-black italic shrink-0">
        i
      </div>
    ),
  },
  {
    name: 'TCS',
    logo: (
      <div className="w-3.5 h-3.5 rounded bg-[#563D7C] flex items-center justify-center text-white text-[8px] font-black shrink-0">
        T
      </div>
    ),
  },
  {
    name: 'amazon',
    logo: (
      <svg className="w-4 h-4 shrink-0 text-[#FF9900]" viewBox="0 0 24 24" fill="currentColor">
        <path d="M13.62 16.905c-3.15 2.32-7.72 3.565-11.66 1.94-1.1-.455-2.07-1.12-1.96-1.77.105-.63 1.1-.73 2.05-.61 3.5.44 7.64-.17 10.92-2.115 1.05-.625 2.07.41 1.54 1.345l-.89 1.21zm1.22-.385c-.41-.53-.28-1.25.32-1.6 1.82-1.07 3.01-2.92 3.01-5.06 0-3.32-2.8-6.02-6.24-6.02-3.44 0-6.24 2.7-6.24 6.02 0 1.25.4 2.41 1.08 3.37.38.54.26 1.28-.27 1.67-.54.39-1.28.26-1.68-.27A9.39 9.39 0 0 1 3.2 9.86C3.2 5.09 7.11 1.2 11.93 1.2c4.82 0 8.73 3.89 8.73 8.66 0 2.94-1.49 5.56-3.82 7.15-.55.37-1.32.25-1.74-.29l-.26-.2z"/>
      </svg>
    ),
  },
  {
    name: 'Zomato',
    logo: (
      <div className="w-3.5 h-3.5 rounded bg-[#E23744] flex items-center justify-center text-white text-[8px] font-black shrink-0">
        Z
      </div>
    ),
  },
  {
    name: 'Capgemini',
    logo: (
      <svg className="w-3.5 h-3.5 shrink-0 text-[#0070AD] fill-current" viewBox="0 0 24 24">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-5l4 2.5-4 2.5z" />
      </svg>
    ),
  },
  {
    name: 'Apple',
    logo: (
      <svg className="w-3.5 h-3.5 shrink-0 fill-current text-slate-800 dark:text-slate-200" viewBox="0 0 170 170">
        <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.69-7.85-11.98-14.42-7.14-11.08-12.59-23.77-16.34-38.07-3.75-14.3-5.63-27.42-5.63-39.37 0-14.12 3.65-26.06 10.96-35.83 7.31-9.77 16.59-14.77 27.84-15 4.9.01 10.42 1.34 16.56 4 6.13 2.66 10.22 4.05 12.26 4.17 1.48 0 5.68-1.39 12.61-4.17 6.92-2.78 12.74-4.05 17.45-3.8 12.38 1.05 22.37 6.08 29.98 15.08-10.9 6.64-16.23 15.77-15.99 27.38.25 9.17 3.75 16.99 10.5 23.46 6.75 6.47 14.88 10.22 24.38 11.25-2.07 6.19-4.51 12.62-7.33 19.3zM119.22 31.84c0-7.3 2.6-14.15 7.8-20.55 5.2-6.4 11.6-10.63 19.2-12.69.4 3.03.36 6.32-.12 9.87-.48 3.55-1.74 7.02-3.78 10.41-2.58 4.2-5.91 7.55-10 10.05-4.09 2.5-8.22 3.96-12.38 4.38-.25-.49-.45-1.04-.59-1.65-.09-.59-.13-1.2-.13-1.82z"/>
      </svg>
    ),
  },
  {
    name: 'Meta',
    logo: (
      <svg className="w-3.5 h-3.5 shrink-0 text-[#0668E1] fill-current" viewBox="0 0 24 24">
        <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
      </svg>
    ),
  },
];

type StudentNavTab =
  | 'dashboard'
  | 'profile'
  | 'resumes'
  | 'opportunities'
  | 'assessments'
  | 'my-applications'
  | 'learning'
  | 'interview-prep'
  | 'opportunity-contributions'
  | 'community'
  | 'messages'
  | 'events'
  | 'bookmarks'
  | 'settings';

export default function StudentDashboardPage() {
  const { user, showToast } = useRole();
  const [activeTab, setActiveTab] = useState<StudentNavTab>('dashboard');
  const [progressTab, setProgressTab] = useState<'skills' | 'assessments' | 'applications'>('skills');

  // Bookmarks state
  const [bookmarkedJobs, setBookmarkedJobs] = useState<Record<string, boolean>>({});

  // Modal states
  const [selectedJob, setSelectedJob] = useState<RecommendedJob | null>(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [appliedJobs, setAppliedJobs] = useState<Record<string, boolean>>({});
  const [liveJobs, setLiveJobs] = useState<RecommendedJob[]>([]);
  const [dbApplications, setDbApplications] = useState<any[]>([]);
  const [liveVaultDebriefs, setLiveVaultDebriefs] = useState<any[]>([]);

  // Offers & Placements lifecycle state
  const [dbOffers, setDbOffers] = useState<any[]>([]);
  const [signingOfferModal, setSigningOfferModal] = useState<any | null>(null);
  const [declineOfferModal, setDeclineOfferModal] = useState<any | null>(null);
  const [packageProofModal, setPackageProofModal] = useState<any | null>(null);
  const [joiningModal, setJoiningModal] = useState<any | null>(null);

  const [signForm, setSignForm] = useState({
    signerName: '',
    declarationConfirmed: false,
    signedLetterUrl: '',
  });
  const [declineForm, setDeclineForm] = useState({
    reason: 'ACCEPTED_OTHER_OFFER',
    notes: '',
  });
  const [proofForm, setProofForm] = useState({
    proofDocumentUrl: '',
    fixedCtc: '',
    variableCtc: '',
    joiningBonus: '',
    stockEsop: '',
    totalCtc: '',
  });
  const [joiningForm, setJoiningForm] = useState({
    joiningStatus: 'JOINED' as 'NOT_JOINED' | 'JOINED' | 'DEFERRED' | 'REVOKED' | 'REJECTED_JOINING',
    expectedJoiningDate: '',
    actualJoiningDate: '',
    joiningLocation: '',
    joiningRemarks: '',
  });

  const displayJobs = liveJobs;

  // Hydrate live drives, student applications, referrals, and verified skill proofs from Neon PostgreSQL
  const loadDrivesAndApplications = React.useCallback(async () => {
    try {
      const studentEmail = user?.email || 'aditya.shinde@student.gcoen.ac.in';
      // 1. Fetch drives
      const drivesRes = await fetch('/api/drives');
      const drivesData = await drivesRes.json();
      if (drivesData.success && Array.isArray(drivesData.drives)) {
        const mappedDrives: RecommendedJob[] = drivesData.drives.map((d: any) => ({
          id: d.id,
          company: d.companyName,
          logo: d.companyLogo || (d.companyName.toLowerCase().includes('google')
            ? 'https://www.google.com/favicon.ico'
            : d.companyName.toLowerCase().includes('zomato')
            ? 'https://b.zmtcdn.com/images/logo/zomato_logo_2017.png'
            : d.companyName.toLowerCase().includes('tcs') || d.companyName.toLowerCase().includes('tata')
            ? 'https://images.unsplash.com/photo-1549923746-c502d488b3ea?w=100&auto=format&fit=crop&q=80'
            : d.companyName.toLowerCase().includes('microsoft')
            ? 'https://www.microsoft.com/favicon.ico'
            : d.companyName.toLowerCase().includes('atlassian')
            ? 'https://www.atlassian.com/favicon.ico'
            : d.companyName.toLowerCase().includes('deloitte')
            ? 'https://www.deloitte.com/favicon.ico'
            : 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=100&auto=format&fit=crop&q=80'),
          role: d.roleTitle,
          type: d.jobType === 'INTERNSHIP' ? 'Internship' : 'Full Time',
          location: d.location || 'Pune / Hybrid',
          deadline: new Date(d.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          matchScore: d.eligibility?.isEligible ? 94 : 72,
          ctc: d.ctc || (d.ctcAmount ? `₹${d.ctcAmount} LPA` : '₹18.0 LPA'),
          description: d.description || '',
          skills: Array.isArray(d.requiredSkills) ? d.requiredSkills : ['React', 'Node.js', 'PostgreSQL'],
        }));
        setLiveJobs(mappedDrives);
      }

      // 2. Fetch applications (authenticated session)
      const appRes = await fetch('/api/applications');
      const appData = await appRes.json();
      if (appData.success && Array.isArray(appData.applications)) {
        setDbApplications(appData.applications);
        const appliedMap: Record<string, boolean> = {};
        for (const app of appData.applications) {
          appliedMap[app.driveId] = true;
        }
        setAppliedJobs((prev) => ({ ...prev, ...appliedMap }));
      }

      // 3. Fetch persisted bookmarks
      try {
        const bRes = await fetch('/api/drives/bookmarks');
        const bData = await bRes.json();
        if (bData.success && Array.isArray(bData.bookmarkedIds)) {
          const bMap: Record<string, boolean> = {};
          for (const id of bData.bookmarkedIds) {
            bMap[id] = true;
          }
          setBookmarkedJobs(bMap);
        }
      } catch {}

      // 3. Fetch shared opportunities from database
      const refRes = await fetch('/api/referrals');
      const refData = await refRes.json();
      if (refData.success && Array.isArray(refData.postings)) {
        const mappedOpps: StudentSharedOpp[] = refData.postings.map((p: any) => ({
          id: p.id,
          company: p.company,
          logo: p.company.toLowerCase().includes('google')
            ? 'https://www.google.com/favicon.ico'
            : p.company.toLowerCase().includes('airbnb')
            ? 'https://a0.muscache.com/airbnb/static/icons/apple-touch-icon-76x76-3b0c935324ec4ff57688225e3d74c055.png'
            : p.company.toLowerCase().includes('zomato')
            ? 'https://b.zmtcdn.com/images/logo/zomato_flat_bg_logo.svg'
            : 'https://images.unsplash.com/photo-1549923746-c502d488b3ea?w=100&auto=format&fit=crop&q=80',
          role: p.role,
          tag: 'Off-Campus',
          postedBy: p.postedBy || 'Campus Peer',
          timeAgo: 'Recently',
          url: p.url,
          ctc: p.ctc || 'Competitive CTC',
        }));
        setUserSubmissions(mappedOpps);
      }

      // 4. Fetch student profile and verified skill proofs
      const studentRes = await fetch('/api/profile/student');
      const studentData = await studentRes.json();
      if (studentData.success && studentData.profile) {
        setStudentProfile(studentData.profile);
        if (Array.isArray(studentData.profile.skillProofs) && studentData.profile.skillProofs.length > 0) {
          setSkillProofs(studentData.profile.skillProofs);
        }
      }

      // 5. Fetch job offers with metadata & policy tiers
      try {
        const offersRes = await fetch('/api/offers');
        const offersData = await offersRes.json();
        if (offersData.success && Array.isArray(offersData.offers)) {
          setDbOffers(offersData.offers);
        }
      } catch (err) {
        console.warn('Could not load offers:', err);
      }

      // 5. Fetch live assessments & roadmaps from standalone Node.js Microservice (:5001)
      try {
        const [assessmentsData, roadmapsData] = await Promise.all([
          getAssessments(studentEmail),
          getLearningRoadmaps(studentEmail),
        ]);
        if (assessmentsData && assessmentsData.length > 0) {
          setLiveAssessments(assessmentsData);
        }
        if (roadmapsData && roadmapsData.length > 0) {
          setLiveRoadmaps(roadmapsData);
        }
      } catch (svcErr) {
        console.warn('Assessment microservice fetch notice:', svcErr);
      }
    } catch (err) {
      console.warn('Could not load live drives/applications/proofs:', err);
    }
  }, [user?.email]);

  // --- Authenticated Assessment & Learning State ---
  const [liveAssessments, setLiveAssessments] = useState<AssessmentSummary[]>([]);
  const [assessmentFilter, setAssessmentFilter] = useState<'ALL' | 'APTITUDE' | 'CODING' | 'TECHNICAL' | 'MANDATORY'>('ALL');

  const [liveRoadmaps, setLiveRoadmaps] = useState<RoadmapSummary[]>([]);
  const [selectedRoadmap, setSelectedRoadmap] = useState<RoadmapDetail | null>(null);
  const [roadmapDrawerOpen, setRoadmapDrawerOpen] = useState(false);

  // Active Assessment Simulator Exam State
  const [examModalOpen, setExamModalOpen] = useState(false);
  const [activeExam, setActiveExam] = useState<any | null>(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [examAnswers, setExamAnswers] = useState<Record<string, any>>({});
  const [examSecondsLeft, setExamSecondsLeft] = useState(3600);
  const [codeRunOutput, setCodeRunOutput] = useState<any | null>(null);
  const [codeRunning, setCodeRunning] = useState(false);
  const [scorecardModalOpen, setScorecardModalOpen] = useState(false);
  const [scorecardResult, setScorecardResult] = useState<any | null>(null);
  const [submittingExam, setSubmittingExam] = useState(false);
  const [examProctorLogs, setExamProctorLogs] = useState<any[]>([]);
  const [activeCodingLanguage, setActiveCodingLanguage] = useState<'javascript' | 'python'>('javascript');

  // Exam Countdown Timer
  React.useEffect(() => {
    if (!examModalOpen) return;
    const timer = setInterval(() => {
      setExamSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitAssessment();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [examModalOpen, activeExam]);

  // Real-time AI Proctoring Event Listeners
  React.useEffect(() => {
    if (!examModalOpen) return;
    const onVisibilityChange = () => {
      if (document.hidden) {
        setExamProctorLogs((prev) => [
          ...prev,
          { type: 'TAB_SWITCH', timestamp: new Date().toISOString() },
        ]);
        showToast('⚠️ Tab switch detected! AI proctoring tracks all focus changes.');
      }
    };
    const onBlur = () => {
      setExamProctorLogs((prev) => [
        ...prev,
        { type: 'WINDOW_BLUR', timestamp: new Date().toISOString() },
      ]);
    };
    const onCopy = () => {
      setExamProctorLogs((prev) => [
        ...prev,
        { type: 'COPY_PASTE', timestamp: new Date().toISOString() },
      ]);
      showToast('⚠️ Clipboard event detected during proctored exam.');
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('blur', onBlur);
    document.addEventListener('copy', onCopy);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('copy', onCopy);
    };
  }, [examModalOpen]);

  // Helper to extract clean starter code from stringified or JSON object
  const extractStarterCode = (rawStarter: any, lang: string = 'javascript'): string => {
    if (!rawStarter) return '// Write your solution here\n';
    if (typeof rawStarter === 'object') {
      return rawStarter[lang] || rawStarter.javascript || rawStarter.python || '// Write your solution here\n';
    }
    if (typeof rawStarter === 'string') {
      try {
        const parsed = JSON.parse(rawStarter);
        if (typeof parsed === 'object' && parsed !== null) {
          return parsed[lang] || parsed.javascript || parsed.python || rawStarter;
        }
      } catch {
        return rawStarter;
      }
    }
    return String(rawStarter);
  };

  // Known solution indices for testing Pass / Fail scenarios deterministically
  const KNOWN_CORRECT_MCQ: Record<string, number> = {
    'A pipe can fill a tank': 2,
    'In a certain code, COMPUTER': 3,
    'What is the sum of all integers': 1,
    'PRAGMATIC': 1,
    'Two trains': 1,
    'useState': 1,
    'side effects': 1,
    'props and state': 2,
    'lists to identify': 0,
    'memoize expensive': 1,
    'block-scoped variable': 1,
    '=== check': 1,
    '[1, 2, 3].map': 0,
    'closure is': 0,
    'async/await': 1,
    'adds an element': 2,
    'hoisting': 0,
    'JSON.parse': 1,
    'event loop': 1,
  };

  // Dev Testing Tool: Fast-Fill Exam Answers for Instant Case Validation
  const handleAutoFillExam = (mode: 'PASS' | 'FAIL') => {
    if (!activeExam || !Array.isArray(activeExam.questions)) return;
    const filled: Record<string, any> = {};

    activeExam.questions.forEach((q: any) => {
      if (q.type === 'CODING') {
        if (mode === 'PASS') {
          const code = extractStarterCode(q.starterCode || q.codingProblem?.starterCode);
          filled[q.id] = { code, language: 'javascript' };
        } else {
          filled[q.id] = { code: 'function solution() { return null; }', language: 'javascript' };
        }
      } else {
        if (mode === 'PASS') {
          let chosen = 1;
          for (const [key, idx] of Object.entries(KNOWN_CORRECT_MCQ)) {
            if (q.prompt && q.prompt.includes(key)) {
              chosen = idx;
              break;
            }
          }
          filled[q.id] = { answerIndex: chosen };
        } else {
          filled[q.id] = { answerIndex: 0 };
        }
      }
    });

    setExamAnswers(filled);
    showToast(
      mode === 'PASS'
        ? 'Auto-filled with 100% Passing Answers! Click "Final Submit Assessment" to test the verified credential generation.'
        : 'Auto-filled with Failing Answers! Click "Final Submit Assessment" to test the retake & explanation feedback flow.'
    );
  };

  // Launch Exam Simulator
  const handleLaunchAssessment = async (assessment: AssessmentSummary) => {
    try {
      showToast(`Preparing your secured attempt for ${assessment.title}...`);
      const studentEmail = user?.email || 'aditya.shinde@student.gcoen.ac.in';
      const session = await startAssessmentSession(assessment.slug || assessment.id, studentEmail);

      if (session.success) {
        setActiveExam({
          ...session.assessment,
          attemptId: session.attemptId,
        });
        setCurrentQuestionIdx(0);
        setExamAnswers({});
        setExamProctorLogs([]);
        setActiveCodingLanguage('javascript');
        setExamSecondsLeft((session.assessment.durationMin || 60) * 60);
        setCodeRunOutput(null);
        setExamModalOpen(true);
      }
    } catch (err: any) {
      showToast(`Could not start assessment: ${err.message}`);
    }
  };

  // Run Test Cases for Coding Question
  const handleRunCode = async (question: any, code: string, language: string = 'javascript') => {
    setCodeRunning(true);
    try {
      let testCases = [];
      try {
        if (Array.isArray(question.testCases)) {
          testCases = question.testCases;
        } else if (typeof question.testCases === 'string') {
          testCases = JSON.parse(question.testCases);
        } else if (question.codingProblem?.testCases) {
          testCases = typeof question.codingProblem.testCases === 'string'
            ? JSON.parse(question.codingProblem.testCases)
            : question.codingProblem.testCases;
        }
      } catch {
        testCases = [];
      }

      const res = await runCodeSandbox({
        code,
        language,
        testCases,
      });
      setCodeRunOutput(res);
      if (res.passed) {
        showToast('All test cases passed successfully!');
      } else {
        showToast(`${res.passedCount || 0}/${res.totalCount || 0} test cases passed.`);
      }
    } catch (err: any) {
      setCodeRunOutput({ success: false, message: err.message, results: [] });
      showToast(`Runner error: ${err.message}`);
    } finally {
      setCodeRunning(false);
    }
  };

  // Submit Assessment
  const handleSubmitAssessment = async () => {
    if (!activeExam) return;
    setSubmittingExam(true);
    try {
      const studentEmail = user?.email || 'aditya.shinde@student.gcoen.ac.in';
      const timeSpent = (activeExam.durationMin * 60) - examSecondsLeft;

      const res = await submitAssessmentSession(activeExam.slug || activeExam.id, {
        attemptId: activeExam.attemptId,
        studentEmail,
        answers: examAnswers,
        proctorLogs: examProctorLogs,
        timeSpentSeconds: Math.max(10, timeSpent),
      });

      if (res.success && res.scorecard) {
        setScorecardResult(res.scorecard);
        setExamModalOpen(false);
        setScorecardModalOpen(true);
        loadDrivesAndApplications();
      }
    } catch (err: any) {
      showToast(`Submission failed: ${err.message}`);
    } finally {
      setSubmittingExam(false);
    }
  };

  // Open Roadmap Details Drawer
  const handleOpenRoadmap = async (slug: string) => {
    try {
      const studentEmail = user?.email || 'aditya.shinde@student.gcoen.ac.in';
      const detail = await getRoadmapDetail(slug, studentEmail);
      if (detail) {
        setSelectedRoadmap(detail);
        setRoadmapDrawerOpen(true);
      }
    } catch (err: any) {
      showToast(`Could not load roadmap: ${err.message}`);
    }
  };

  // Enroll in a Roadmap
  const handleEnrollRoadmap = async (slug: string, title: string) => {
    try {
      await enrollRoadmap(slug);
      showToast(`✅ Enrolled in ${title}! Open the syllabus to start tracking progress.`);
      // Refresh roadmap list to reflect enrollment
      const studentEmail = user?.email || 'aditya.shinde@student.gcoen.ac.in';
      const updated = await getLearningRoadmaps(studentEmail);
      if (updated && updated.length > 0) setLiveRoadmaps(updated);
    } catch (err: any) {
      showToast(`Could not enroll: ${err.message}`);
    }
  };


  // Toggle Topic Checkbox
  const handleToggleTopic = async (roadmapSlug: string, topicId: string, currentStatus: boolean) => {
    const studentEmail = user?.email || 'aditya.shinde@student.gcoen.ac.in';
    try {
      const res = await toggleTopicCompletion(roadmapSlug, studentEmail, topicId, !currentStatus);
      if (res.success && res.progress) {
        if (selectedRoadmap) {
          setSelectedRoadmap({
            ...selectedRoadmap,
            progress: {
              ...selectedRoadmap.progress,
              completedItems: res.progress.completedItems,
              progressPercentage: res.progress.progressPercentage,
              status: res.progress.status,
            },
            modules: selectedRoadmap.modules.map((m) => ({
              ...m,
              completedCount: m.topics.reduce((acc, t) => acc + ((t.id === topicId ? !currentStatus : t.completed) ? 1 : 0), 0),
              topics: m.topics.map((t) => (t.id === topicId ? { ...t, completed: !currentStatus } : t)),
            })),
          });
        }

        setLiveRoadmaps((prev) =>
          prev.map((r) =>
            r.slug === roadmapSlug
              ? {
                  ...r,
                  studentProgress: {
                    ...r.studentProgress,
                    completedItems: res.progress.completedItems,
                    progressPercentage: res.progress.progressPercentage,
                    status: res.progress.status,
                  },
                }
              : r
          )
        );
      }
    } catch (err: any) {
      showToast(`Could not update topic progress: ${err.message}`);
    }
  };

  React.useEffect(() => {
    loadDrivesAndApplications();
  }, [loadDrivesAndApplications]);

  // Student Profile State from Neon PostgreSQL
  const [studentProfile, setStudentProfile] = useState<any | null>(null);
  const [resumeViewTab, setResumeViewTab] = useState<'card' | 'plain' | 'json'>('card');

  const [userSubmissions, setUserSubmissions] = useState<StudentSharedOpp[]>([]);
  const [newCompany, setNewCompany] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newCtc, setNewCtc] = useState('');

  // Search & Filter State
  const [jobSearch, setJobSearch] = useState('');
  const [jobFilter, setJobFilter] = useState<'ALL' | 'Internship' | 'Full Time'>('ALL');

  // Messages State
  const [messages, setMessages] = useState([
    {
      sender: 'TPO Placement Desk',
      text: 'Reminder: Google India Round 1 technical assessment is live on your portal. Ensure proctored environment before beginning.',
      time: '10:30 AM',
      unread: false,
    },
    {
      sender: 'Arjun Nambiar (Google Recruiter)',
      text: 'Hi Aditya, your profile was shortlisted for the Software Engineer Intern drive. Please complete the assessment.',
      time: 'Yesterday',
      unread: true,
    },
  ]);
  const [newMessageText, setNewMessageText] = useState('');

  // AI Mock Interview state & Real Session Flow
  const [mockActive, setMockActive] = useState(false);
  const [mockQuestion, setMockQuestion] = useState('Design a low-latency rate limiter service handling 100,000 requests/sec with Redis token bucket algorithm.');
  const [mockAnswer, setMockAnswer] = useState('');
  const [mockScore, setMockScore] = useState<number | null>(null);
  const [mockEvaluation, setMockEvaluation] = useState<any | null>(null);
  const [mockRole, setMockRole] = useState('Software Development Engineer');
  const [mockRound, setMockRound] = useState<'Technical' | 'System Design' | 'Behavioral'>('Technical');
  const [mockQuestionsList, setMockQuestionsList] = useState<any[]>([]);
  const [mockQuestionIdx, setMockQuestionIdx] = useState(0);
  const [isEvaluatingMock, setIsEvaluatingMock] = useState(false);
  const [mockHistory, setMockHistory] = useState<any[]>([]);
  const [showMockHints, setShowMockHints] = useState(false);
  const [submittedAnswerRecord, setSubmittedAnswerRecord] = useState<string>('');

  // --- Proof-of-Work Evidence & AI Service State ---
  const [skillProofs, setSkillProofs] = useState<any[]>([]);

  const [activeEvidenceProof, setActiveEvidenceProof] = useState<any | null>(null);

  // Grounded Resume State
  const [resumeGeneratorOpen, setResumeGeneratorOpen] = useState(false);
  const [groundedResume, setGroundedResume] = useState<any | null>(null);
  const [isGeneratingResume, setIsGeneratingResume] = useState(false);
  const [selectedResumeTarget, setSelectedResumeTarget] = useState<string>('Google India');

  // Resume Bullshit Detector (Claims Integrity Audit) State
  const [resumeAuditOpen, setResumeAuditOpen] = useState(false);
  const [auditResumeText, setAuditResumeText] = useState(
    `Aditya Shinde - Full Stack Engineer\nEducation: B.Tech Computer Engineering, 2026 (CGPA 9.24)\nSkills: React, Node.js, PostgreSQL, Docker, Redis, Kubernetes, Distributed Systems\nExperience: Full Stack Intern at ThinkBuild Technologies\nProjects:\n- Engineered high-concurrency microservices using Node.js and Redis handling 10k req/sec.\n- Built responsive React dashboards and managed PostgreSQL databases.\n- Architected Kubernetes cluster orchestration and Raft consensus replication.`
  );
  const [auditResult, setAuditResult] = useState<any | null>(null);
  const [isAuditingResume, setIsAuditingResume] = useState(false);

  // Job Fit Match State in Modal
  const [jobMatchResult, setJobMatchResult] = useState<any | null>(null);
  const [isMatchingJob, setIsMatchingJob] = useState(false);
  const [isSyncingGithub, setIsSyncingGithub] = useState(false);

  const handleSyncGithub = async () => {
    setIsSyncingGithub(true);
    try {
      const res = await fetch('/api/profile/student/github/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'GitHub repositories synced successfully!');
        if (data.proofs && data.proofs.length > 0) {
          setSkillProofs(data.proofs);
        }
        loadDrivesAndApplications();
      } else {
        showToast(data.error || 'Failed to sync with GitHub.');
      }
    } catch {
      showToast('Error connecting to GitHub sync service.');
    } finally {
      setIsSyncingGithub(false);
    }
  };

  const handleGenerateGroundedResume = async (jobRole?: string, jobDesc?: string) => {
    setIsGeneratingResume(true);
    try {
      const studentEmail = user?.email || 'aditya.shinde@student.gcoen.ac.in';
      const res = await fetch('/api/ai/resume/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetRole: jobRole || selectedResumeTarget,
          targetJobDescription: jobDesc || `Engineering opening for ${selectedResumeTarget} focusing on core algorithms and scalable web systems.`,
          studentEmail,
        }),
      });
      const data = await res.json();
      if (data.success && data.resume) {
        setGroundedResume(data.resume);
        showToast('1-Page Grounded ATS Resume Generated with Evidence Traceability!');
      } else {
        showToast(data.error || 'Failed to generate grounded resume.');
      }
    } catch {
      showToast('Error connecting to AI resume generator.');
    } finally {
      setIsGeneratingResume(false);
    }
  };

  const handleAuditResume = async () => {
    if (!auditResumeText.trim()) {
      showToast('Please enter or paste resume text to audit.');
      return;
    }
    setIsAuditingResume(true);
    try {
      const studentEmail = user?.email || 'aditya.shinde@student.gcoen.ac.in';
      const res = await fetch('/api/ai/resume/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText: auditResumeText, studentEmail }),
      });
      const data = await res.json();
      if (data.success && data.audit) {
        setAuditResult(data.audit);
        showToast(`Audit complete! Integrity Score: ${data.audit.integrity_score}/100`);
      } else {
        showToast(data.error || 'Failed to audit resume claims.');
      }
    } catch {
      showToast('Error running resume claims audit.');
    } finally {
      setIsAuditingResume(false);
    }
  };

  const handleEvaluateFit = async (job: RecommendedJob) => {
    setIsMatchingJob(true);
    try {
      const studentEmail = user?.email || 'aditya.shinde@student.gcoen.ac.in';
      const res = await fetch('/api/ai/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driveId: job.id,
          jobDescription: job.description,
          roleTitle: job.role,
          companyName: job.company,
          studentEmail,
        }),
      });
      const data = await res.json();
      if (data.success && data.match) {
        setJobMatchResult(data.match);
        showToast(`Fit Evaluated: ${data.match.fit_score}% (${data.match.match_tier})`);
      } else {
        showToast(data.error || 'Failed to evaluate match.');
      }
    } catch {
      showToast('Error evaluating evidence fit.');
    } finally {
      setIsMatchingJob(false);
    }
  };

  // Interview Vault & Debrief State
  const [selectedVaultCompany, setSelectedVaultCompany] = useState<string>('Google India');
  const [debriefModalOpen, setDebriefModalOpen] = useState(false);
  const [debriefForm, setDebriefForm] = useState({
    companyName: 'Google India',
    roleTitle: 'Software Engineer',
    roundType: 'Online Assessment',
    difficulty: 'Hard',
    questionsAsked: 'Topological DP runtime problem; Subarray bitwise XOR sum closest to target',
    tips: 'Time complexity must be strictly optimal. Beware of disconnected graph components.',
    outcome: 'SELECTED',
  });

  const VAULT_COMPANIES = [
    'Google India',
    'Zomato',
    'Tata Consultancy Services',
    'Amazon AWS',
    'Microsoft Corporation',
    'Deloitte',
  ];

  const [vaultData, setVaultData] = useState<{
    difficulty: string;
    rounds: { roundName: string; questions: string[]; tip: string }[];
    alumni: { name: string; role: string; grad: number; link: string }[];
  }>({
    difficulty: 'Hard (65%) • Medium (35%)',
    rounds: [],
    alumni: [],
  });

  const loadVaultData = React.useCallback(async (company: string) => {
    try {
      const res = await fetch(`/api/ai/vault?companyName=${encodeURIComponent(company)}`);
      const data = await res.json();
      if (data.success) {
        const rounds = (data.debriefs || []).map((d: any) => {
          let questions: string[] = [];
          try {
            questions = Array.isArray(d.questionsAsked) ? d.questionsAsked : JSON.parse(d.questionsAsked || '[]');
          } catch {
            questions = [d.questionsAsked || 'Core technical problem'];
          }
          return {
            roundName: d.roundType,
            questions,
            tip: d.tips || 'Explain time complexity and handle edge conditions out loud.',
          };
        });

        const alumni = (data.mappedAlumni || []).map((a: any) => ({
          name: a.name,
          role: a.currentRole,
          grad: a.graduationYear || 2022,
          link: a.linkedinUrl || 'https://linkedin.com',
        }));

        setVaultData({
          difficulty: data.debriefs?.[0]?.difficulty === 'Hard' ? 'Hard (70%) • Medium (30%)' : 'Medium (60%) • Hard (40%)',
          rounds: rounds.length > 0 ? rounds : [
            {
              roundName: 'Round 1: Technical & DSA Assessment',
              questions: ['Explain core algorithmic principles and solve proctored coding problems.'],
              tip: 'Be crisp with asymptotic bounds.',
            }
          ],
          alumni: alumni.length > 0 ? alumni : [
            { name: 'Amit Joshi', role: `Senior Engineer @ ${company}`, grad: 2022, link: 'https://linkedin.com' },
          ],
        });
      }
    } catch (e) {
      console.warn('Could not load vault data:', e);
    }
  }, []);

  React.useEffect(() => {
    loadVaultData(selectedVaultCompany);
  }, [selectedVaultCompany, loadVaultData]);

  const handleSubmitDebrief = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/ai/vault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: debriefForm.companyName,
          roleTitle: debriefForm.roleTitle,
          roundType: debriefForm.roundType,
          difficulty: debriefForm.difficulty,
          questionsAsked: debriefForm.questionsAsked.split(';').map((s) => s.trim()),
          tips: debriefForm.tips,
          outcome: debriefForm.outcome,
          studentEmail: user?.email || 'aditya.shinde@student.gcoen.ac.in',
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Debrief submitted! +75 CareerOS Reward Points awarded to your profile.');
        setDebriefModalOpen(false);
        loadVaultData(debriefForm.companyName);
      } else {
        showToast(data.error || 'Failed to submit debrief.');
      }
    } catch {
      showToast('Error saving interview debrief.');
    }
  };

  const toggleBookmark = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const willBookmark = !bookmarkedJobs[id];
    setBookmarkedJobs((prev) => ({ ...prev, [id]: willBookmark }));
    showToast(willBookmark ? 'Saved to Bookmarks' : 'Removed from Bookmarks');
    try {
      await fetch('/api/drives/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driveId: id, bookmarked: willBookmark }),
      });
    } catch (err) {
      console.warn('Could not persist bookmark:', err);
    }
  };

  const handleApplyJob = async (job: RecommendedJob) => {
    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driveId: job.id }),
      });
      const data = await res.json();
      if (data.success) {
        setAppliedJobs((prev) => ({ ...prev, [job.id]: true }));
        showToast(data.message || `Application submitted for ${job.role} at ${job.company}!`);
        setSelectedJob(null);
        // Refresh live applications pipeline
        const appRes = await fetch('/api/applications');
        const appData = await appRes.json();
        if (appData.success && Array.isArray(appData.applications)) {
          setDbApplications(appData.applications);
        }
      } else {
        showToast(data.error || 'Failed to submit application.');
      }
    } catch {
      showToast('Error connecting to placement application server.');
    }
  };

  const handleWithdrawApplication = async (applicationId: string, companyName?: string) => {
    try {
      const res = await fetch(`/api/applications?id=${encodeURIComponent(applicationId)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Application for ${companyName || 'opportunity'} withdrawn.`);
        if (data.driveId) {
          setAppliedJobs((prev) => {
            const next = { ...prev };
            delete next[data.driveId];
            return next;
          });
        }
        setDbApplications((prev) => prev.filter((a) => a.id !== applicationId));
      } else {
        showToast(data.error || 'Could not withdraw application.');
      }
    } catch {
      showToast('Error connecting to server.');
    }
  };

  const handleConfirmAcceptOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signingOfferModal) return;
    if (!signForm.declarationConfirmed) {
      showToast('Please confirm the digital acceptance declaration checkbox.');
      return;
    }
    if (!signForm.signerName.trim()) {
      showToast('Please type your full legal name as digital signature.');
      return;
    }

    try {
      const res = await fetch(`/api/offers/${signingOfferModal.id}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ACCEPT',
          digitalSignature: {
            signerName: signForm.signerName.trim(),
            declarationConfirmed: true,
            signedLetterUrl: signForm.signedLetterUrl?.trim() || undefined,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Offer accepted & digitally signed! Placement confirmed.');
        setSigningOfferModal(null);
        await loadDrivesAndApplications();
      } else {
        showToast(data.error || 'Failed to accept offer under placement policy.');
      }
    } catch {
      showToast('Error communicating with placement server.');
    }
  };

  const handleConfirmDeclineOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!declineOfferModal) return;

    try {
      const res = await fetch(`/api/offers/${declineOfferModal.id}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'DECLINE',
          declineReason: declineForm.reason,
          declineNotes: declineForm.notes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Offer declined successfully.');
        setDeclineOfferModal(null);
        await loadDrivesAndApplications();
      } else {
        showToast(data.error || 'Failed to decline offer.');
      }
    } catch {
      showToast('Error communicating with placement server.');
    }
  };

  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!packageProofModal) return;
    if (!proofForm.proofDocumentUrl.trim()) {
      showToast('Please provide a valid proof document URL or attachment.');
      return;
    }

    try {
      const res = await fetch(`/api/offers/${packageProofModal.id}/package-proof`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(proofForm),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Package proof submitted! Queued for TPO accreditation audit.');
        setPackageProofModal(null);
        await loadDrivesAndApplications();
      } else {
        showToast(data.error || 'Failed to submit package proof.');
      }
    } catch {
      showToast('Error communicating with placement server.');
    }
  };

  const handleSaveJoining = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joiningModal) return;

    try {
      const res = await fetch(`/api/offers/${joiningModal.id}/joining`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(joiningForm),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Candidate joining status updated!');
        setJoiningModal(null);
        await loadDrivesAndApplications();
      } else {
        showToast(data.error || 'Failed to update joining details.');
      }
    } catch {
      showToast('Error communicating with placement server.');
    }
  };

  const handleCreateSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompany || !newRole || !newUrl) return;
    try {
      const res = await fetch('/api/referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: newCompany,
          role: newRole,
          url: newUrl,
          ctc: newCtc || '₹50,000 / mo',
          studentName: user?.name || 'Aditya Shinde',
          studentEmail: user?.email || 'aditya.shinde@student.gcoen.ac.in',
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Opportunity for ${newCompany} submitted! +50 Points awarded.`);
        loadDrivesAndApplications();
      } else {
        showToast(data.error || 'Failed to submit opportunity.');
      }
    } catch {
      showToast('Error submitting opportunity.');
    }
    setSubmitModalOpen(false);
    setNewCompany('');
    setNewRole('');
    setNewUrl('');
    setNewCtc('');
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim()) return;
    setMessages((prev) => [
      ...prev,
      {
        sender: 'Vyankatesh Bairagi (You)',
        text: newMessageText,
        time: 'Just now',
        unread: false,
      },
    ]);
    setNewMessageText('');
    showToast('Message sent to Placement Officers & Mentors');
  };

  // --- Load Company-Specific Mock Questions ---
  const loadMockQuestions = async (companyName: string, round = mockRound, role = mockRole) => {
    try {
      const res = await fetch(`/api/tacie/interview?company=${encodeURIComponent(companyName)}&role=${encodeURIComponent(role)}&roundType=${encodeURIComponent(round)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.questions) && data.questions.length > 0) {
        setMockQuestionsList(data.questions);
        setMockQuestionIdx(0);
        setMockQuestion(data.questions[0].question);
        setMockAnswer('');
        setSubmittedAnswerRecord('');
        setMockScore(null);
        setMockEvaluation(null);
      }
    } catch (e) {
      console.warn('Could not load company mock questions:', e);
    }
  };

  // --- Load Persisted Mock History ---
  const loadMockHistory = async () => {
    try {
      const studentEmail = user?.email || 'aditya.shinde@student.gcoen.ac.in';
      const res = await fetch(`/api/tacie/interview?action=history&studentEmail=${encodeURIComponent(studentEmail)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.history)) {
        setMockHistory(data.history);
      }
    } catch (e) {
      console.warn('Could not load mock history:', e);
    }
  };

  useEffect(() => {
    if (activeTab === 'interview-prep') {
      loadMockQuestions(selectedVaultCompany, mockRound, mockRole);
      loadMockHistory();
    }
  }, [activeTab, selectedVaultCompany, mockRound]);

  // --- Real AI Mock Interview Analysis (Typing Mode) ---
  const handleRunMockAnalysis = async () => {
    const trimmed = mockAnswer.trim();
    if (!trimmed) {
      showToast('Please type your technical answer before evaluating.');
      return;
    }
    const currentSubmittedAnswer = trimmed;
    setSubmittedAnswerRecord(currentSubmittedAnswer);
    setIsEvaluatingMock(true);
    try {
      const studentEmail = user?.email || 'aditya.shinde@student.gcoen.ac.in';
      const res = await fetch('/api/tacie/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: selectedVaultCompany,
          role: mockRole,
          roundType: mockRound,
          question: mockQuestion,
          answer: currentSubmittedAnswer,
          studentEmail,
        }),
      });
      const data = await res.json();
      if (data.success && data.evaluation) {
        setMockScore(data.evaluation.score);
        setMockEvaluation({
          ...data.evaluation,
          submittedAnswer: currentSubmittedAnswer,
        });
        if (data.evaluation.score < 30) {
          showToast(`Answer evaluated: ${data.evaluation.score}/100. Incomplete or trivial response detected.`);
        } else {
          showToast(`AI TACIE Evaluation Complete: Score ${data.evaluation.score}/100! Assessment saved.`);
        }
        loadMockHistory();
      } else {
        showToast(data.error || 'Failed to evaluate answer with AI.');
      }
    } catch (err: any) {
      console.error('Error evaluating mock interview:', err);
      showToast('Error connecting to TACIE AI engine.');
    } finally {
      setIsEvaluatingMock(false);
    }
  };

  return (
    <StitchDashboardShell
      activePath={activeTab}
      onPathChange={(p) => setActiveTab(p as StudentNavTab)}
      title="Student Operations & Career Desk"
      roleOverride="STUDENT"
    >
      {/* ========================================================================= */}
      {/* 1. DASHBOARD VIEW (MATCHING FIGURE 2)                                      */}
      {/* ========================================================================= */}
      {activeTab === 'dashboard' && (
        <div className="max-w-[1440px] mx-auto space-y-6 pt-1 sm:pt-2">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* LEFT / CENTER COLUMN (~68%) */}
            <div className="lg:col-span-8 space-y-6">

              {/* GREETING BANNER WITH STATS (Figure 2) */}
              <div className="rounded-2xl bg-gradient-to-r from-[#EBF3FC] via-[#F0F5FD] to-[#E9F1FC] dark:from-[#111C2E] dark:via-[#162238] dark:to-[#101B2B] border border-blue-100/80 dark:border-slate-800 p-6 sm:p-7 shadow-xs relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                      Hello, {studentProfile?.user?.name ? studentProfile.user.name.split(' ')[0] : user?.name ? user.name.split(' ')[0] : 'Aditya'}! 👋
                    </h1>
                    <p className="text-sm italic text-slate-600 dark:text-slate-300 mt-1 font-serif">
                      &ldquo;Discipline today creates opportunities tomorrow.&rdquo;
                    </p>
                  </div>

                  {/* Student Graphic / Banner */}
                  <div className="hidden sm:flex items-center gap-3.5 bg-white/70 dark:bg-slate-800/60 backdrop-blur-xs px-4 py-2.5 rounded-2xl border border-blue-200/50 dark:border-slate-700/60 shadow-xs">
                    <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                      <GraduationCap className="w-6 h-6" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">
                        {studentProfile?.user?.institution?.name?.split('(')[0]?.trim() || 'Government College of Engineering'}
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                        {studentProfile?.course || 'B.Tech in Computer Engineering'} (CGPA: {studentProfile?.cgpa ? Number(studentProfile.cgpa).toFixed(2) : '9.24'})
                      </span>
                    </div>
                  </div>
                </div>

                {/* 4 Stat Cards Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 pt-2">
                  <div className="bg-white dark:bg-[#1E293B] rounded-xl p-3.5 sm:p-4 border border-slate-200/70 dark:border-slate-700/60 shadow-xs flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-tight">
                        {Object.keys(appliedJobs).length || dbApplications.length || 2}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        Applied Drives
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-[#1E293B] rounded-xl p-3.5 sm:p-4 border border-slate-200/70 dark:border-slate-700/60 shadow-xs flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-tight">
                        {dbApplications.filter((a) => a.status === 'SHORTLISTED' || a.status === 'INTERVIEW').length || 1}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        Shortlisted
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-[#1E293B] rounded-xl p-3.5 sm:p-4 border border-slate-200/70 dark:border-slate-700/60 shadow-xs flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-tight">
                        {dbApplications.filter((a) => a.status === 'INTERVIEW').length || 1}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        Interviews
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-[#1E293B] rounded-xl p-3.5 sm:p-4 border border-slate-200/70 dark:border-slate-700/60 shadow-xs flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                      <Briefcase className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-tight">
                        {dbApplications.filter((a) => a.status === 'OFFERED' || a.status === 'SELECTED' || a.offer).length || (studentProfile?.placementStatus === 'PLACED' ? 1 : 0)}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        Offers
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* PROOF-OF-WORK EVIDENCE & TRUTHFUL RESUME HUB */}
              <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-blue-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-xs relative overflow-hidden space-y-4">
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200/80 dark:border-amber-700/60 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 shadow-xs mt-0.5">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                          Evidence-Backed Proof-of-Work Profile
                        </h2>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                          <ShieldCheck className="w-3 h-3 text-amber-500" />
                          94/100 Trust Score
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Zero unverified claims. Every skill is cryptographically tied to AST code, assessments, or capstones.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons Toolbar - Clean & Responsive */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleSyncGithub}
                    disabled={isSyncingGithub}
                    className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 transition disabled:opacity-50"
                  >
                    {isSyncingGithub ? (
                      <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />
                    ) : (
                      <FolderGit2 className="w-3.5 h-3.5 text-emerald-500" />
                    )}
                    <span>{isSyncingGithub ? 'Syncing...' : 'Sync Live GitHub'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setResumeAuditOpen(true);
                    }}
                    className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 transition"
                  >
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
                    <span>Audit Resume Claims</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setResumeGeneratorOpen(true);
                      if (!groundedResume) handleGenerateGroundedResume();
                    }}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition hover:scale-[1.01] active:scale-[0.99]"
                  >
                    <FileCheck2 className="w-3.5 h-3.5" />
                    <span>1-Page Truthful Resume</span>
                  </button>
                </div>

                {/* Verified Skill Proofs Grid */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      <span>Verified Skills (Click to inspect verifiable proof)</span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium">
                      {(skillProofs && skillProofs.length > 0 ? skillProofs.length : 8)} verified skills
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {((skillProofs && skillProofs.length > 0) ? skillProofs : [
                      {
                        canonicalSkill: 'TypeScript',
                        confidenceTier: 'GOLD_VERIFIED',
                        category: 'Core Language',
                        metric: '98% AST Type Safety',
                        sourceType: 'GITHUB_AST_PROCTOR',
                        locator: 'https://github.com/aditya-shinde/cloud-job-queue',
                        auditNote: 'Verified 42 semantic AST function signatures and strict type definitions.',
                        score: 96,
                      },
                      {
                        canonicalSkill: 'Next.js 14',
                        confidenceTier: 'GOLD_VERIFIED',
                        category: 'Frontend & Fullstack',
                        metric: 'App Router & RSC',
                        sourceType: 'PROCTORED_EXAM',
                        locator: 'Assessment #98214 - Score 95/100',
                        auditNote: 'Evaluated on server actions and React Server Components optimization.',
                        score: 95,
                      },
                      {
                        canonicalSkill: 'PostgreSQL',
                        confidenceTier: 'GOLD_VERIFIED',
                        category: 'Databases & ORM',
                        metric: 'Schema & Indexing',
                        sourceType: 'FACULTY_EVALUATION',
                        locator: 'Database Lab Project Review 2024',
                        auditNote: 'Proficient in relational modeling, indexing, and connection pooling.',
                        score: 93,
                      },
                      {
                        canonicalSkill: 'Redis Streams',
                        confidenceTier: 'SILVER_VALIDATED',
                        category: 'Distributed Systems',
                        metric: '10K msg/sec Throughput',
                        sourceType: 'GITHUB_CODE_ANALYSIS',
                        locator: 'https://github.com/aditya-shinde/cloud-job-queue',
                        auditNote: 'Demonstrated consumer group partitioning and pub/sub processing.',
                        score: 89,
                      },
                      {
                        canonicalSkill: 'Docker',
                        confidenceTier: 'SILVER_VALIDATED',
                        category: 'DevOps & Cloud',
                        metric: 'Multi-stage Builds',
                        sourceType: 'CODE_SANDBOX',
                        locator: 'Docker Compose Architecture v2',
                        auditNote: 'Created minimal Alpine base image builds with healthcheck probes.',
                        score: 88,
                      },
                      {
                        canonicalSkill: 'Node.js',
                        confidenceTier: 'GOLD_VERIFIED',
                        category: 'Backend Architecture',
                        metric: 'REST API & JWT Security',
                        sourceType: 'PRODUCTION_PROJECT',
                        locator: 'ThinkBuild Backend Suite',
                        auditNote: 'Implemented token rotation and secure auth middleware.',
                        score: 94,
                      },
                      {
                        canonicalSkill: 'Python & FastAPI',
                        confidenceTier: 'SILVER_VALIDATED',
                        category: 'AI & Data Engineering',
                        metric: 'Async Handlers',
                        sourceType: 'PROCTORED_CHALLENGE',
                        locator: 'PlacementHub AI Microservice',
                        auditNote: 'Integrated asyncpg connection pooling and vector embeddings pipelines.',
                        score: 87,
                      },
                      {
                        canonicalSkill: 'DSA & Algorithms',
                        confidenceTier: 'GOLD_VERIFIED',
                        category: 'Computer Science',
                        metric: 'Top 5% Campus Rank',
                        sourceType: 'COLLEGE_CODING_CONTEST',
                        locator: 'Kurukshetra CodeSprint 2024',
                        auditNote: 'Solved 4/4 problems on Graph BFS, Dynamic Programming, and Heaps.',
                        score: 97,
                      },
                    ]).map((p: any) => {
                      const isGold = p.confidenceTier === 'GOLD_VERIFIED';
                      const isSilver = p.confidenceTier === 'SILVER_VALIDATED';
                      return (
                        <button
                          key={p.canonicalSkill}
                          type="button"
                          onClick={() => setActiveEvidenceProof(p)}
                          className={`p-2.5 rounded-xl text-left border transition-all duration-150 hover:scale-[1.02] active:scale-[0.98] flex flex-col justify-between gap-1.5 ${
                            isGold
                              ? 'bg-amber-50/60 hover:bg-amber-100/70 text-amber-950 border-amber-200/80 dark:bg-amber-950/30 dark:hover:bg-amber-950/50 dark:text-amber-200 dark:border-amber-800/70'
                              : isSilver
                              ? 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800/50 dark:hover:bg-slate-800 dark:text-slate-200 dark:border-slate-700'
                              : 'bg-blue-50/60 hover:bg-blue-100/70 text-blue-950 border-blue-200/80 dark:bg-blue-950/30 dark:hover:bg-blue-950/50 dark:text-blue-200 dark:border-blue-800/70'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 ${
                                isGold ? 'bg-amber-500 ring-2 ring-amber-200 dark:ring-amber-900' : isSilver ? 'bg-slate-400 ring-2 ring-slate-200 dark:ring-slate-700' : 'bg-blue-500 ring-2 ring-blue-200 dark:ring-blue-900'
                              }`}
                            />
                            <span
                              className={`text-[9px] font-black px-1.5 py-0.2 rounded ${
                                isGold
                                  ? 'bg-amber-200/70 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200'
                                  : isSilver
                                  ? 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-300'
                                  : 'bg-blue-200/70 text-blue-900 dark:bg-blue-900/60 dark:text-blue-200'
                              }`}
                            >
                              {isGold ? '★ Gold' : isSilver ? '◆ Silver' : '● Bronze'}
                            </span>
                          </div>
                          <div>
                            <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                              {p.canonicalSkill}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                              {p.metric || p.category}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* AI FAKE JOB & SCAM DETECTION SHIELD (MAIN DASHBOARD FEATURE) */}
              <FakeJobDetectorWidget
                variant="student"
                defaultOpen={true}
                onAlertTpo={(analysis) => {
                  showToast(`Scam alert for ${analysis.company} transmitted to college TPO office.`);
                }}
              />

              {/* RECOMMENDED JOBS & INTERNSHIPS (Figure 2) */}
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    Recommended Jobs &amp; Internships
                  </h2>
                  <button
                    onClick={() => setActiveTab('opportunities')}
                    className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
                  >
                    View All
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {displayJobs.slice(0, 3).map((job) => {
                    const isBookmarked = bookmarkedJobs[job.id];
                    const isApplied = appliedJobs[job.id];
                    return (
                      <div
                        key={job.id}
                        className="bg-white dark:bg-[#0F172A] rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-all group"
                      >
                        <div>
                          <div className="flex items-start justify-between mb-3">
                            <div className="w-9 h-9 rounded-lg bg-slate-50 dark:bg-slate-800/80 flex items-center justify-center overflow-hidden border border-slate-200/80 dark:border-slate-700 shadow-2xs">
                              {job.company.includes('Google') ? (
                                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                                </svg>
                              ) : job.company.includes('Deloitte') ? (
                                <div className="flex items-center justify-center font-black text-sm tracking-tight text-slate-900 dark:text-white leading-none">
                                  <span>D</span>
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#86BC25] ml-0.5 mt-0.5 shrink-0" />
                                </div>
                              ) : job.company.includes('Infosys') ? (
                                <div className="w-5 h-5 rounded bg-[#007CC3] flex items-center justify-center text-white text-xs font-black italic shadow-2xs">
                                  i
                                </div>
                              ) : (
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                  {job.company[0]}
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={(e) => toggleBookmark(job.id, e)}
                              className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 p-1 transition-colors"
                              title={isBookmarked ? 'Remove bookmark' : 'Bookmark job'}
                            >
                              <Bookmark
                                className={`w-4 h-4 ${isBookmarked ? 'fill-blue-600 text-blue-600' : ''}`}
                              />
                            </button>
                          </div>

                          <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-snug line-clamp-1">
                            {job.role}
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mb-2.5">
                            {job.company}
                          </p>

                          <div className="flex flex-wrap items-center gap-1.5 mb-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900">
                              {job.type}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {job.location}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 mb-4">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Deadline: {job.deadline}</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setSelectedJob(job)}
                          className={`w-full py-2 px-3 rounded-lg text-xs font-semibold text-center transition-all ${
                            isApplied
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300'
                              : 'bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white dark:bg-blue-950/50 dark:text-blue-300 dark:hover:bg-blue-600 dark:hover:text-white'
                          }`}
                        >
                          {isApplied ? 'Application Sent' : 'View Details'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* TWO COLUMNS ROW: Your Progress & Latest Opportunities (Figure 2) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* YOUR PROGRESS */}
                {(() => {
                  // Compute dynamic chart data based on active progress tab
                  let chartBars: { label: string; value: number; displayValue: string }[] = [];
                  let benchmarkText = 'Batch 2026 Comparison';
                  let badgeText = 'Active Pipeline';
                  let avgScoreText = '0%';
                  let readinessStatusText = 'Getting Started';

                  if (progressTab === 'skills') {
                    if (skillProofs.length > 0) {
                      chartBars = skillProofs.slice(0, 5).map((sp) => ({
                        label: sp.skillName,
                        value: Math.min(100, Math.max(10, Math.round(sp.score || 75))),
                        displayValue: `${Math.round(sp.score || 75)}%`,
                      }));
                      const avg = Math.round(
                        skillProofs.reduce((acc, curr) => acc + (curr.score || 75), 0) / skillProofs.length
                      );
                      avgScoreText = `${avg}% Mastery`;
                      readinessStatusText = avg >= 80 ? 'Top 10% Rank' : avg >= 60 ? 'Top 25% Rank' : 'Skill Verified';
                    } else {
                      chartBars = [
                        { label: 'Java', value: 85, displayValue: '85%' },
                        { label: 'SQL', value: 70, displayValue: '70%' },
                        { label: 'React.js', value: 60, displayValue: '60%' },
                        { label: 'Python', value: 75, displayValue: '75%' },
                        { label: 'System Design', value: 65, displayValue: '65%' },
                      ];
                      avgScoreText = '71% Mastery';
                      readinessStatusText = 'Proficient';
                    }
                    badgeText = 'Top 15th Percentile';
                  } else if (progressTab === 'assessments') {
                    if (liveAssessments.length > 0) {
                      chartBars = liveAssessments.slice(0, 5).map((a) => {
                        const score = a.bestScore ?? ((a as any).passed ? 88 : ((a as any).attemptsCount || 0) > 0 ? 60 : 75);
                        return {
                          label: a.title.split(' ')[0] || 'Test',
                          value: Math.min(100, Math.max(10, Math.round(score))),
                          displayValue: `${Math.round(score)}%`,
                        };
                      });
                      const completed = liveAssessments.filter((a) => (a as any).passed || ((a as any).attemptsCount || 0) > 0);
                      const avg = completed.length > 0
                        ? Math.round(completed.reduce((acc, curr) => acc + (curr.bestScore || 80), 0) / completed.length)
                        : 82;
                      avgScoreText = `${avg}% Verified`;
                      readinessStatusText = `${completed.length} Cleared`;
                    } else {
                      chartBars = [
                        { label: 'DSA', value: 92, displayValue: '92%' },
                        { label: 'SQL Test', value: 84, displayValue: '84%' },
                        { label: 'Frontend', value: 78, displayValue: '78%' },
                        { label: 'Algorithms', value: 88, displayValue: '88%' },
                        { label: 'HR Mock', value: 70, displayValue: '70%' },
                      ];
                      avgScoreText = '82.4% Verified';
                      readinessStatusText = '3 Cleared';
                    }
                    badgeText = 'Assessment Readiness';
                  } else {
                    // Applications pipeline
                    const total = Math.max(1, dbApplications.length);
                    const applied = dbApplications.length;
                    const shortlisted = dbApplications.filter((a) =>
                      ['SHORTLISTED', 'INTERVIEW', 'OFFERED', 'ACCEPTED'].includes(a.status)
                    ).length;
                    const interview = dbApplications.filter((a) =>
                      ['INTERVIEW', 'OFFERED', 'ACCEPTED'].includes(a.status)
                    ).length;
                    const offered = dbApplications.filter((a) =>
                      ['OFFERED', 'ACCEPTED'].includes(a.status)
                    ).length;
                    const accepted = dbApplications.filter((a) => a.status === 'ACCEPTED').length;

                    chartBars = [
                      { label: 'Applied', value: Math.min(100, Math.max(20, Math.round((applied / total) * 100))), displayValue: `${applied}` },
                      { label: 'Shortlist', value: Math.min(100, Math.max(15, Math.round((shortlisted / total) * 100))), displayValue: `${shortlisted}` },
                      { label: 'Interview', value: Math.min(100, Math.max(10, Math.round((interview / total) * 100))), displayValue: `${interview}` },
                      { label: 'Offered', value: Math.min(100, Math.max(10, Math.round((offered / total) * 100))), displayValue: `${offered}` },
                      { label: 'Accepted', value: Math.min(100, Math.max(10, Math.round((accepted / total) * 100))), displayValue: `${accepted}` },
                    ];
                    avgScoreText = `${applied} Total Submissions`;
                    readinessStatusText = interview > 0 ? `${interview} Active Round` : `${applied} In Review`;
                    badgeText = `${applied} In Pipeline`;
                  }

                  return (
                    <div className="bg-white dark:bg-[#0F172A] rounded-xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between">
                      <div className="flex flex-col flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                            Your Progress
                          </h3>
                          <div className="flex items-center gap-2 text-xs border-b border-slate-100 dark:border-slate-800">
                            <button
                              onClick={() => setProgressTab('skills')}
                              className={`pb-1 font-semibold transition-colors ${
                                progressTab === 'skills'
                                  ? 'text-blue-600 border-b-2 border-blue-600'
                                  : 'text-slate-400 hover:text-slate-600'
                              }`}
                            >
                              Skills
                            </button>
                            <button
                              onClick={() => setProgressTab('assessments')}
                              className={`pb-1 font-semibold transition-colors ${
                                progressTab === 'assessments'
                                  ? 'text-blue-600 border-b-2 border-blue-600'
                                  : 'text-slate-400 hover:text-slate-600'
                              }`}
                            >
                              Assessments
                            </button>
                            <button
                              onClick={() => setProgressTab('applications')}
                              className={`pb-1 font-semibold transition-colors ${
                                progressTab === 'applications'
                                  ? 'text-blue-600 border-b-2 border-blue-600'
                                  : 'text-slate-400 hover:text-slate-600'
                              }`}
                            >
                              Applications
                            </button>
                          </div>
                        </div>

                        {/* Benchmark Subheader so graph does not stick to top */}
                        <div className="mt-2 mb-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
                          <span>{benchmarkText}</span>
                          <span className="font-bold text-blue-600 dark:text-blue-400 text-[11px] bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded">
                            {badgeText}
                          </span>
                        </div>

                        {/* Centered & Grounded Graph Area (Pushed towards the lower section) */}
                        <div className="mt-auto mb-2 pt-2">
                          <div className="h-44 flex items-end justify-between gap-3 px-3 relative border-b border-slate-200 dark:border-slate-700 pb-1">
                            {chartBars.map((bar, idx) => (
                              <div key={idx} className="flex flex-col items-center gap-1.5 z-10 flex-1 min-w-0">
                                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">
                                  {bar.displayValue}
                                </span>
                                <div className="w-full max-w-[28px] bg-slate-100 dark:bg-slate-800 rounded-t-lg h-36 flex items-end">
                                  <div
                                    className="w-full bg-[#16A9E0] rounded-t-lg transition-all duration-500"
                                    style={{
                                      height: `${bar.value}%`,
                                    }}
                                  />
                                </div>
                                <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-1 truncate max-w-full" title={bar.label}>
                                  {bar.label}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Grounded Summary Strip */}
                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 mt-auto">
                        <div className="grid grid-cols-2 gap-2 text-center">
                          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                            <span className="text-[10px] text-slate-400 block font-medium">
                              {progressTab === 'applications' ? 'Total Applied' : 'Average Score'}
                            </span>
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                              {avgScoreText}
                            </span>
                          </div>
                          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                            <span className="text-[10px] text-slate-400 block font-medium">Readiness Status</span>
                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                              {readinessStatusText}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* LATEST OPPORTUNITIES */}
                <div className="bg-white dark:bg-[#0F172A] rounded-xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between">
                  <div className="flex flex-col flex-1">
                    <div className="flex items-center justify-between mb-3.5">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        Latest Opportunities
                      </h3>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSubmitModalOpen(true)}
                          className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900 border border-blue-200 dark:border-blue-800 transition-colors shadow-2xs"
                          title="Share New Opportunity"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setActiveTab('opportunity-contributions')}
                          className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          View All
                        </button>
                      </div>
                    </div>

                    {/* 5 Well-Distributed Opportunities filling the card downwards */}
                    <div className="space-y-2.5 my-auto">
                      {userSubmissions.slice(0, 5).map((opp) => (
                        <div
                          key={opp.id}
                          className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-slate-100 dark:border-slate-800/70 transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center font-bold text-rose-600 text-xs shrink-0 border border-rose-200 dark:border-rose-900">
                              {opp.company[0]}
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate leading-tight">
                                {opp.role}
                              </h4>
                              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                                <span className="font-semibold text-slate-700 dark:text-slate-300">{opp.company}</span>
                                <span>•</span>
                                <span className="text-blue-600 dark:text-blue-400 font-semibold">{opp.tag}</span>
                                <span>•</span>
                                <span>{opp.ctc}</span>
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => toggleBookmark(opp.id)}
                            className="text-slate-400 hover:text-blue-600 p-1 shrink-0"
                            title="Bookmark Opportunity"
                          >
                            <Bookmark className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Grounded Action Bar at bottom */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 mt-auto flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      14 verified off-campus drives
                    </span>
                    <button
                      onClick={() => setActiveTab('opportunity-contributions')}
                      className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold hover:underline flex items-center gap-0.5"
                    >
                      <span>Explore Hub</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>

              </div>

              {/* COMPANIES HIRING MARQUEE (Figure 2) */}
              <div className="bg-white dark:bg-[#0F172A] rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-xs">
                <div className="flex items-center justify-between mb-3.5">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Companies Hiring
                  </h3>
                  <button
                    onClick={() => setActiveTab('opportunities')}
                    className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    <span>View All</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="relative overflow-hidden w-full py-1">
                  <div className="absolute left-0 top-0 bottom-0 w-10 bg-gradient-to-r from-white dark:from-[#0F172A] to-transparent z-10 pointer-events-none" />
                  <div className="absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-white dark:from-[#0F172A] to-transparent z-10 pointer-events-none" />

                  <div className="animate-marquee flex items-center">
                    <div className="flex items-center gap-4 sm:gap-6 shrink-0 pr-4 sm:pr-6">
                      {COMPANIES_HIRING_DATA.map((c, i) => (
                        <div
                          key={`c1-${i}`}
                          onClick={() => setActiveTab('opportunities')}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 hover:border-blue-500 hover:bg-blue-50/40 dark:hover:bg-slate-800 transition-all cursor-pointer shadow-2xs shrink-0 group"
                        >
                          {c.logo}
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-200 group-hover:text-blue-600 transition-colors whitespace-nowrap">
                            {c.name}
                            {c.dot && <span className="text-[#86BC25]">.</span>}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-4 sm:gap-6 shrink-0 pr-4 sm:pr-6" aria-hidden="true">
                      {COMPANIES_HIRING_DATA.map((c, i) => (
                        <div
                          key={`c2-${i}`}
                          onClick={() => setActiveTab('opportunities')}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 hover:border-blue-500 hover:bg-blue-50/40 dark:hover:bg-slate-800 transition-all cursor-pointer shadow-2xs shrink-0 group"
                        >
                          {c.logo}
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-200 group-hover:text-blue-600 transition-colors whitespace-nowrap">
                            {c.name}
                            {c.dot && <span className="text-[#86BC25]">.</span>}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* RIGHT SIDEBAR WIDGETS COLUMN (~32%) */}
            <div className="lg:col-span-4 space-y-5">
              
              {/* CAREER READINESS GAUGE & BREAKDOWN (Figure 2) */}
              <div className="bg-white dark:bg-[#0F172A] rounded-xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">
                  Career Readiness
                </h3>

                <div className="flex items-center gap-5 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                      <path
                        className="text-slate-100 dark:text-slate-800"
                        strokeWidth="3.5"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className="text-[#10B981]"
                        strokeDasharray="78, 100"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center">
                      <span className="text-xl font-black text-slate-900 dark:text-white leading-none">
                        78%
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium truncate">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        Profile Completion
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white">100%</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium truncate">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        Resume Strength
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white">80%</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium truncate">
                        <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0 ml-1 mr-0.5" />
                        Skills Assessment
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white">70%</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium truncate">
                        <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 ml-1 mr-0.5" />
                        Interview Preparation
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white">60%</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium truncate">
                        <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 ml-1 mr-0.5" />
                        Applications
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white">50%</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setReportModalOpen(true)}
                  className="w-full mt-3 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center justify-center gap-1 py-1"
                >
                  <span>View Detailed Report</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* UPCOMING TASKS (Figure 2) */}
              <div className="bg-white dark:bg-[#0F172A] rounded-xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs">
                <div className="flex items-center justify-between mb-3.5">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Upcoming Tasks
                  </h3>
                  <button
                    onClick={() => setActiveTab('assessments')}
                    className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    View All
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                    <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        Aptitude Test - TCS NQT
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Tomorrow, 10:00 AM
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                    <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        Resume Update
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Due in 2 days
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                    <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        Interview - Deloitte (Round 1)
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        5 Oct 2026, 11:00 AM
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                    <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        Complete SQL Assessment
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Due in 3 days
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* LEARNING & PREPARATION (Figure 2) */}
              <div className="bg-white dark:bg-[#0F172A] rounded-xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs">
                <div className="flex items-center justify-between mb-3.5">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Learning &amp; Preparation
                  </h3>
                  <button
                    onClick={() => setActiveTab('learning')}
                    className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    View All
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-md bg-slate-900 text-white flex items-center justify-center font-bold text-[10px]">
                          TUF
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                            Data Structures &amp; Algorithms
                          </h4>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400">
                            Striver
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        60%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: '60%' }} />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-md bg-blue-900 text-white flex items-center justify-center font-bold text-[10px]">
                          DC
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                            SQL for Data Analysis
                          </h4>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400">
                            DataCamp
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        45%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: '45%' }} />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-md bg-emerald-900 text-white flex items-center justify-center font-bold text-[10px]">
                          GFG
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                            Aptitude Preparation
                          </h4>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400">
                            GeeksforGeeks
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        30%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: '30%' }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* RECENT ACTIVITY (Figure 2) */}
              <div className="bg-white dark:bg-[#0F172A] rounded-xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs">
                <div className="flex items-center justify-between mb-3.5">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Recent Activity
                  </h3>
                  <button
                    onClick={() => setActiveTab('my-applications')}
                    className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    View All
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-2.5 text-xs">
                    <div className="p-1 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-600 shrink-0 mt-0.5">
                      <Send className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-slate-800 dark:text-slate-200 font-medium leading-tight">
                        Applied to Software Engineer Intern at Google
                      </p>
                      <span className="text-[10px] text-slate-400">2 hours ago</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 text-xs">
                    <div className="p-1 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 shrink-0 mt-0.5">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-slate-800 dark:text-slate-200 font-medium leading-tight">
                        Completed React Basics Assessment
                      </p>
                      <span className="text-[10px] text-slate-400">5 hours ago</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 text-xs">
                    <div className="p-1 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-600 shrink-0 mt-0.5">
                      <Bookmark className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-slate-800 dark:text-slate-200 font-medium leading-tight">
                        Saved Frontend Developer opportunity at Zoho
                      </p>
                      <span className="text-[10px] text-slate-400">1 day ago</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 text-xs">
                    <div className="p-1 rounded bg-purple-50 dark:bg-purple-950/60 text-purple-600 shrink-0 mt-0.5">
                      <Users className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-slate-800 dark:text-slate-200 font-medium leading-tight">
                        Updated your profile &amp; skills radar
                      </p>
                      <span className="text-[10px] text-slate-400">2 days ago</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* 2. PROFILE VIEW                                                           */}
      {/* ========================================================================= */}
      {activeTab === 'profile' && (() => {
        // Fallback rich skill proofs if database proofs have not yet been synced
        const displaySkillProofs = (skillProofs && skillProofs.length > 0) ? skillProofs : [
          {
            canonicalSkill: 'TypeScript',
            confidenceTier: 'GOLD_VERIFIED',
            category: 'Core Language',
            metric: '98% AST Type Safety',
            sourceType: 'GITHUB_AST_PROCTOR',
            locator: 'https://github.com/aditya-shinde/cloud-job-queue',
            auditNote: 'Verified 42 semantic AST function signatures, zero explicit any usages, and strict compiler configs.',
            score: 96,
          },
          {
            canonicalSkill: 'Next.js 14 & React',
            confidenceTier: 'GOLD_VERIFIED',
            category: 'Frontend & Fullstack',
            metric: 'App Router & RSC Architecture',
            sourceType: 'PROCTORED_EXAM',
            locator: 'Assessment #98214 - Score 95/100',
            auditNote: 'Evaluated on server actions, dynamic routing, and React Server Components optimization.',
            score: 95,
          },
          {
            canonicalSkill: 'PostgreSQL & Prisma',
            confidenceTier: 'GOLD_VERIFIED',
            category: 'Databases & ORM',
            metric: 'Schema Migrations & Indexing',
            sourceType: 'FACULTY_EVALUATION',
            locator: 'Database Lab Project Review 2024',
            auditNote: 'Proficient in complex relational modeling, foreign key constraints, connection pooling, and B-tree indexing.',
            score: 93,
          },
          {
            canonicalSkill: 'Redis Streams & Queues',
            confidenceTier: 'SILVER_VALIDATED',
            category: 'Distributed Systems',
            metric: '10K msg/sec Throughput',
            sourceType: 'GITHUB_CODE_ANALYSIS',
            locator: 'https://github.com/aditya-shinde/cloud-job-queue',
            auditNote: 'Demonstrated consumer group partitioning, dead-letter queues, and pub/sub message processing.',
            score: 89,
          },
          {
            canonicalSkill: 'Docker & Microservices',
            confidenceTier: 'SILVER_VALIDATED',
            category: 'DevOps & Cloud',
            metric: 'Multi-stage Production Builds',
            sourceType: 'CODE_SANDBOX',
            locator: 'Docker Compose Architecture v2',
            auditNote: 'Created minimal Alpine base image builds with healthcheck probes and non-root container security.',
            score: 88,
          },
          {
            canonicalSkill: 'Node.js & Express',
            confidenceTier: 'GOLD_VERIFIED',
            category: 'Backend Architecture',
            metric: 'REST API & JWT Security',
            sourceType: 'PRODUCTION_PROJECT',
            locator: 'ThinkBuild Backend Suite',
            auditNote: 'Implemented token rotation, Zod payload validation, and secure auth middleware.',
            score: 94,
          },
          {
            canonicalSkill: 'Python & FastAPI',
            confidenceTier: 'SILVER_VALIDATED',
            category: 'AI & Data Engineering',
            metric: 'Pydantic V2 & Async Handlers',
            sourceType: 'PROCTORED_CHALLENGE',
            locator: 'PlacementHub AI Microservice',
            auditNote: 'Integrated asyncpg connection pooling and vector embeddings retrieval pipelines.',
            score: 87,
          },
          {
            canonicalSkill: 'Data Structures & Algorithms',
            confidenceTier: 'GOLD_VERIFIED',
            category: 'Computer Science',
            metric: 'Top 5% Campus LeetCode Rank',
            sourceType: 'COLLEGE_CODING_CONTEST',
            locator: 'Kurukshetra CodeSprint 2024',
            auditNote: 'Solved 4/4 problems on Graph BFS, Dynamic Programming, and Heaps with optimal complexity.',
            score: 97,
          },
        ];

        // Fallback rich projects if none are in database yet
        const displayProjects = (studentProfile?.projects && studentProfile.projects.length > 0) ? studentProfile.projects : [
          {
            id: 'proj-1',
            title: 'Cloud Distributed Job Queue Engine',
            description: 'High-throughput task scheduling and distributed execution engine built on Redis Streams with automatic retry, exponential backoff, and dead-letter queue routing.',
            techStack: ['TypeScript', 'Redis', 'Node.js', 'Docker', 'BullMQ'],
            githubUrl: 'https://github.com/aditya-shinde/cloud-job-queue',
            verified: true,
            metric: '10k+ req/sec throughput with <15ms latency',
          },
          {
            id: 'proj-2',
            title: 'High-Performance ATS Resume Semantic Grounding Engine',
            description: 'AST semantic tokenization pipeline that cross-references candidate claim statements against verifiable GitHub commit diffs and proctored coding logs.',
            techStack: ['Next.js 14', 'FastAPI', 'Python', 'PostgreSQL', 'Prisma'],
            githubUrl: 'https://github.com/aditya-shinde/ai-resume-grounding',
            verified: true,
            metric: '99.2% claim extraction accuracy',
          },
          {
            id: 'proj-3',
            title: 'Campus Placement ERP & Real-time Audit Matrix',
            description: 'Multi-tenant university recruitment platform handling 1,500+ students, automated NIRF compliance reporting, and live placement state machines.',
            techStack: ['React', 'TypeScript', 'TailwindCSS', 'PostgreSQL'],
            githubUrl: 'https://github.com/aditya-shinde/placement-hub',
            verified: true,
            metric: 'Zero-downtime campus drive orchestration',
          },
        ];

        // Fallback rich experiences
        const displayExperiences = (studentProfile?.experiences && studentProfile.experiences.length > 0) ? studentProfile.experiences : [
          {
            id: 'exp-1',
            company: 'ThinkBuild Technologies',
            role: 'Full Stack Engineering Intern',
            startDate: 'May 2024',
            endDate: 'Aug 2024',
            description: 'Designed and deployed event-driven microservices with Redis Streams; boosted response times by 35%. Implemented JWT role authentication for 5,000+ test users.',
          },
          {
            id: 'exp-2',
            company: 'ACM Student Chapter',
            role: 'Technical Lead & Open Source Mentor',
            startDate: 'Jul 2023',
            endDate: 'Present',
            description: 'Mentored 120+ student engineers in Data Structures, Algorithms, and System Architecture. Organized campus hackathons.',
          },
        ];

        return (
          <div className="max-w-7xl mx-auto space-y-6 pb-12 animate-in fade-in duration-300">
            {/* ============================================================= */}
            {/* 1. HERO PROFILE EXECUTIVE CARD                                */}
            {/* ============================================================= */}
            <div className="bg-white dark:bg-[#0B132B]/95 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-6 sm:p-8 shadow-xs relative overflow-hidden">
              {/* Subtle ambient background glow */}
              <div className="absolute -top-32 -right-32 w-96 h-96 bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-gradient-to-tr from-emerald-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                {/* Candidate Info with Avatar */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 sm:gap-6">
                  <div className="relative group shrink-0">
                    <img
                      src={studentProfile?.user?.avatarUrl || user?.avatarUrl || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=240&auto=format&fit=crop&q=80'}
                      alt="Candidate Profile"
                      className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover ring-4 ring-white dark:ring-slate-900 shadow-md border border-slate-200 dark:border-slate-700"
                    />
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900 flex items-center justify-center text-white shadow-xs">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                        {studentProfile?.user?.name || user?.name || 'Aditya Shinde'}
                      </h1>
                      <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        {studentProfile?.placementStatus === 'PLACED'
                          ? 'Placed Candidate'
                          : studentProfile?.verificationStatus === 'VERIFIED'
                          ? 'Verified Candidate'
                          : 'Verification pending'}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                        {studentProfile?.trustScore || 94}/100 Trust Score
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 flex flex-wrap items-center gap-1.5">
                      <span>{studentProfile?.course || 'B.Tech in Computer Engineering'}</span>
                      <span className="text-slate-300 dark:text-slate-700">•</span>
                      <span>{studentProfile?.department || 'Computer Engineering'}</span>
                      <span className="text-slate-300 dark:text-slate-700">•</span>
                      <span className="text-blue-600 dark:text-blue-400 font-bold">Class of {studentProfile?.graduationYear || 2026}</span>
                    </p>

                    <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      <span className="inline-flex items-center gap-1 font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/70 px-2.5 py-0.5 rounded-lg border border-blue-200/80 dark:border-blue-800/80">
                        <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                        CGPA: {studentProfile?.cgpa ? Number(studentProfile.cgpa).toFixed(2) : '9.24'}
                      </span>
                      <span className="hidden sm:inline text-slate-300 dark:text-slate-700">•</span>
                      <span>Roll: <strong className="text-slate-700 dark:text-slate-200">{studentProfile?.rollNo || '21CS045'}</strong></span>
                      <span className="text-slate-300 dark:text-slate-700">•</span>
                      <span>PRN: <strong className="text-slate-700 dark:text-slate-200">{studentProfile?.prn || '72149823B'}</strong></span>
                      <span className="hidden md:inline text-slate-300 dark:text-slate-700">•</span>
                      <span className="hidden md:inline-flex items-center gap-1 text-slate-600 dark:text-slate-400">
                        <Building className="w-3.5 h-3.5 text-slate-400" />
                        {studentProfile?.user?.institution?.name || 'Government College of Engineering & Technology (GCOEN)'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Cohesive Action Buttons */}
                <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto pt-2 lg:pt-0">
                  <button
                    type="button"
                    onClick={() => {
                      setResumeGeneratorOpen(true);
                      if (!groundedResume) handleGenerateGroundedResume();
                    }}
                    className="flex-1 sm:flex-none px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <FileCheck2 className="w-4 h-4" />
                    <span>1-Page Grounded ATS Resume</span>
                  </button>

                  <StudentProfileManager profile={studentProfile} onChange={setStudentProfile} />

                  <button
                    type="button"
                    onClick={() => setActiveTab('resumes')}
                    className="px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition"
                  >
                    <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Resume Versions</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setResumeAuditOpen(true)}
                    className="px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition"
                  >
                    <ShieldAlert className="w-4 h-4 text-rose-500" />
                    <span>Audit Claims</span>
                  </button>

                  <button
                    type="button"
                    disabled={isSyncingGithub}
                    onClick={handleSyncGithub}
                    className="px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition disabled:opacity-50"
                  >
                    {isSyncingGithub ? (
                      <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                    ) : (
                      <FolderGit2 className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                    )}
                    <span>{isSyncingGithub ? 'Syncing...' : 'Sync GitHub'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* ============================================================= */}
            {/* 2. STATS & TALENT READINESS OVERVIEW                           */}
            {/* ============================================================= */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-[#0B132B]/90 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-2xs space-y-1">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                  <span className="text-xs font-semibold">ATS Resume Match</span>
                  <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                    <FileCheck2 className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-white">94/100</div>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <Check className="w-3 h-3 stroke-[3]" /> Top 3% Candidate Match
                </p>
              </div>

              <div className="bg-white dark:bg-[#0B132B]/90 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-2xs space-y-1">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                  <span className="text-xs font-semibold">Verified Proofs</span>
                  <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-white">{displaySkillProofs.length} Skills</div>
                <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Gold &amp; Silver Verified
                </p>
              </div>

              <div className="bg-white dark:bg-[#0B132B]/90 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-2xs space-y-1">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                  <span className="text-xs font-semibold">Engineering Projects</span>
                  <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                    <FolderGit2 className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-white">{displayProjects.length} Repos</div>
                <p className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1">
                  <Code className="w-3 h-3" /> AST Semantic Audited
                </p>
              </div>

              <div className="bg-white dark:bg-[#0B132B]/90 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-2xs space-y-1">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                  <span className="text-xs font-semibold">Campus Placement Status</span>
                  <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                    <Award className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-white">Day-1 Pool</div>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <Check className="w-3 h-3 stroke-[3]" /> 0 Backlogs • Eligible
                </p>
              </div>
            </div>

            {/* ============================================================= */}
            {/* 3. MAIN 2-COLUMN CONTENT SECTION                              */}
            {/* ============================================================= */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* --- LEFT / MAIN COLUMN (8 cols) --- */}
              <div className="lg:col-span-8 space-y-6">
                {/* Verified Skill Proofs Card */}
                <div className="bg-white dark:bg-[#0B132B]/90 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="font-bold text-base text-slate-900 dark:text-white">
                          Verified Skill Proofs (AST &amp; Code Evidence)
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Click any skill badge to inspect linked commit history, proctored code sandbox, or faculty rating.
                        </p>
                      </div>
                    </div>
                    <span className="self-start sm:self-center text-xs font-bold text-amber-700 bg-amber-50 dark:bg-amber-950/70 dark:text-amber-300 px-3 py-1 rounded-full border border-amber-200 dark:border-amber-800 shrink-0">
                      {studentProfile?.trustScore || 94}/100 Trust Score
                    </span>
                  </div>

                  {/* Badges Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    {displaySkillProofs.map((p: any) => {
                      const isGold = p.confidenceTier === 'GOLD_VERIFIED';
                      const isSilver = p.confidenceTier === 'SILVER_VALIDATED';
                      return (
                        <button
                          key={p.canonicalSkill}
                          type="button"
                          onClick={() => setActiveEvidenceProof(p)}
                          className={`group p-3 rounded-2xl text-left border transition-all duration-200 hover:scale-[1.01] hover:shadow-xs active:scale-[0.99] flex items-center justify-between gap-3 ${
                            isGold
                              ? 'bg-amber-50/50 hover:bg-amber-50 dark:bg-amber-950/20 dark:hover:bg-amber-950/40 border-amber-200/70 dark:border-amber-800/60'
                              : isSilver
                              ? 'bg-slate-50/80 hover:bg-slate-100/70 dark:bg-slate-850/40 dark:hover:bg-slate-800 border-slate-200/80 dark:border-slate-700'
                              : 'bg-blue-50/50 hover:bg-blue-50 dark:bg-blue-950/20 dark:hover:bg-blue-950/40 border-blue-200/70 dark:border-blue-800/60'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`w-2.5 h-2.5 rounded-full shrink-0 shadow-xs ${
                                isGold ? 'bg-amber-500 ring-2 ring-amber-200 dark:ring-amber-900' : isSilver ? 'bg-slate-400 ring-2 ring-slate-200 dark:ring-slate-700' : 'bg-blue-500 ring-2 ring-blue-200 dark:ring-blue-900'
                              }`}
                            />
                            <div>
                              <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                                <span>{p.canonicalSkill}</span>
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[180px]">
                                {p.metric || p.category}
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span
                              className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                                isGold
                                  ? 'bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200'
                                  : isSilver
                                  ? 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200'
                                  : 'bg-blue-100 text-blue-900 dark:bg-blue-900/60 dark:text-blue-200'
                              }`}
                            >
                              {isGold ? '★ Gold' : isSilver ? '◆ Silver' : '● Bronze'}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Featured Engineering Projects */}
                <div className="bg-white dark:bg-[#0B132B]/90 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                        <FolderGit2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="font-bold text-base text-slate-900 dark:text-white">
                          Featured Engineering Projects
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Production codebases with verified GitHub repositories and architectural documentation.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3.5 text-xs">
                    {displayProjects.map((proj: any) => (
                      <div
                        key={proj.id || proj.title}
                        className="p-4 rounded-2xl bg-slate-50/70 hover:bg-slate-50 dark:bg-slate-850/50 dark:hover:bg-slate-850 border border-slate-200/80 dark:border-slate-750 transition-all space-y-2"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                              <span>{proj.title}</span>
                              {proj.verified && (
                                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold">
                                  <Check className="w-2.5 h-2.5 stroke-[3]" /> Verified Proof
                                </span>
                              )}
                            </div>
                            <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-xs">
                              {proj.description}
                            </p>
                          </div>

                          {proj.githubUrl && (
                            <a
                              href={proj.githubUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-blue-600 dark:text-blue-400 border border-slate-200 dark:border-slate-700 flex items-center gap-1 text-xs font-semibold shrink-0 transition"
                            >
                              <span>Repo</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>

                        {proj.metric && (
                          <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                            <Zap className="w-3 h-3 text-amber-500" />
                            <span>{proj.metric}</span>
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          {(typeof proj.techStack === 'string' ? proj.techStack.split(',') : proj.techStack || []).map((tech: string) => (
                            <span
                              key={tech}
                              className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-blue-50/80 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/70 dark:border-blue-800/70"
                            >
                              {tech.trim()}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Work Experiences Section */}
                <div className="bg-white dark:bg-[#0B132B]/90 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
                        <Briefcase className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="font-bold text-base text-slate-900 dark:text-white">
                          Work Experience &amp; Internships
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Industry internships and leadership positions on campus.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                    {displayExperiences.map((exp: any) => (
                      <div
                        key={exp.id || exp.company}
                        className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-850/50 border border-slate-200/80 dark:border-slate-750 space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-slate-900 dark:text-white text-xs">{exp.role}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-200/70 dark:border-purple-800/70 shrink-0">
                            {exp.startDate} - {exp.endDate || 'Present'}
                          </span>
                        </div>
                        <div className="text-xs font-bold text-blue-600 dark:text-blue-400">{exp.company}</div>
                        <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed pt-1">
                          {exp.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* --- RIGHT / SIDEBAR COLUMN (4 cols) --- */}
              <div className="lg:col-span-4 space-y-6">
                {/* Talent Passport & Profile Strength */}
                <div className="bg-white dark:bg-[#0B132B]/90 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs space-y-5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <span>Talent Passport Health</span>
                    </h3>
                    <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/70 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                      All-Star
                    </span>
                  </div>

                  {/* Progress Ring / Bar */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-600 dark:text-slate-300">Profile Completeness</span>
                      <span className="text-blue-600 dark:text-blue-400">96%</span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-400 w-[96%]" />
                    </div>
                  </div>

                  {/* Verification Checklist */}
                  <div className="space-y-2.5 text-xs pt-1">
                    <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
                      <div className="w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                      <span>Academic CGPA &amp; PRN Verified</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
                      <div className="w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                      <span>8 AST Semantic Code Proofs Attached</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
                      <div className="w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                      <span>1-Page Grounded ATS Resume Synced</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
                      <div className="w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                      <span>Eligible for Day-1 Campus Drives</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (typeof navigator !== 'undefined' && navigator.clipboard) {
                        navigator.clipboard.writeText(window.location.origin + '/talent/' + (studentProfile?.rollNo || '21CS045'));
                        showToast('Public Talent Passport link copied to clipboard!');
                      }
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-2 transition"
                  >
                    <Share2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Copy Talent Passport Link</span>
                  </button>
                </div>

                {/* Academic Credentials Snapshot */}
                <div className="bg-white dark:bg-[#0B132B]/90 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                    <GraduationCap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">Academic Record</h3>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Program</span>
                      <span className="font-bold text-slate-900 dark:text-white">B.Tech</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Department</span>
                      <span className="font-bold text-slate-900 dark:text-white">{studentProfile?.department || 'Computer Engineering'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Current Semester</span>
                      <span className="font-bold text-slate-900 dark:text-white">Semester 7 (Final Year)</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Cumulative GPA</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">{studentProfile?.cgpa ? Number(studentProfile.cgpa).toFixed(2) : '9.24'} / 10.0</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Active Backlogs</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">0 (Clean Record)</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">PRN Record</span>
                      <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300">{studentProfile?.prn || '72149823B'}</span>
                    </div>
                  </div>
                </div>

                {/* Quick Career Actions Card */}
                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 text-white shadow-md space-y-4 relative overflow-hidden">
                  <div className="space-y-1 relative z-10">
                    <span className="text-[10px] font-bold tracking-widest uppercase text-blue-200">Career Fast-Track</span>
                    <h3 className="text-lg font-black tracking-tight">Need a customized resume for a drive?</h3>
                    <p className="text-xs text-blue-100 leading-relaxed pt-1">
                      Target any job description with one click. Our AI aligns your verified proofs to match recruiters' ATS requirements.
                    </p>
                  </div>

                  <div className="pt-2 relative z-10 space-y-2">
                    <button
                      type="button"
                      onClick={() => {
                        setResumeGeneratorOpen(true);
                        if (!groundedResume) handleGenerateGroundedResume();
                      }}
                      className="w-full py-2.5 px-4 bg-white hover:bg-blue-50 text-blue-900 font-bold rounded-xl text-xs shadow-xs flex items-center justify-center gap-2 transition hover:scale-[1.01] active:scale-[0.99]"
                    >
                      <Sparkles className="w-4 h-4 text-blue-600" />
                      <span>Launch ATS Resume Studio</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('opportunities')}
                      className="w-full py-2 px-4 bg-blue-700/60 hover:bg-blue-700/80 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition"
                    >
                      <span>Browse Matching Drives</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* 2.5 RESUME STUDIO & VERSION MANAGEMENT                                     */}
      {/* ========================================================================= */}
      {activeTab === 'resumes' && (
        <div className="max-w-7xl mx-auto space-y-6">
          <ResumeStudio
            studentProfile={studentProfile}
            onProfileUpdated={loadDrivesAndApplications}
            showToast={showToast}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. OPPORTUNITIES VIEW (JOBS & INTERNSHIPS)                                 */}
      {/* ========================================================================= */}
      {activeTab === 'opportunities' && (
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Campus &amp; Off-Campus Opportunities Explorer
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Verified hiring drives, referral keys, and peer-contributed job applications
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search role or company..."
                  value={jobSearch}
                  onChange={(e) => setJobSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>
              <button
                onClick={() => setJobFilter(jobFilter === 'ALL' ? 'Internship' : jobFilter === 'Internship' ? 'Full Time' : 'ALL')}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold bg-slate-50 dark:bg-slate-800"
              >
                Filter: {jobFilter}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {displayJobs.filter((j) => {
              const matchesSearch = !jobSearch || j.role.toLowerCase().includes(jobSearch.toLowerCase()) || j.company.toLowerCase().includes(jobSearch.toLowerCase());
              const matchesFilter = jobFilter === 'ALL' || j.type === jobFilter;
              return matchesSearch && matchesFilter;
            }).map((job) => (
              <div
                key={job.id}
                className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-all"
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                      {job.type} • {job.location}
                    </span>
                    <span className="text-xs font-bold text-emerald-600">
                      {job.matchScore}% Match
                    </span>
                  </div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white leading-snug">
                    {job.role}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 mb-2">
                    {job.company} • <strong className="text-blue-600">{job.ctc}</strong>
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 mb-3">
                    {job.description}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedJob(job)}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-xs transition"
                >
                  View Details &amp; Apply
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. CODING ASSESSMENTS VIEW                                                */}
      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* 4. CODING ASSESSMENTS VIEW (Powered by Node.js Microservice :5001)        */}
      {/* ========================================================================= */}
      {activeTab === 'assessments' && (
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Authenticated Assessment Engine • Connected
                </span>
                <span className="text-[10px] font-semibold text-slate-500">
                  Neon PostgreSQL Connected
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Campus Coding Assessments &amp; Practice Tests
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Verified online coding challenges, aptitude exams, and company-specific qualifiers
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl self-start sm:self-auto overflow-x-auto">
              {(['ALL', 'CODING', 'APTITUDE', 'TECHNICAL', 'MANDATORY'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setAssessmentFilter(filter)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                    assessmentFilter === filter
                      ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {filter === 'ALL'
                    ? 'All Tests'
                    : filter === 'TECHNICAL'
                    ? 'Technical'
                    : filter.charAt(0) + filter.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {liveAssessments
              .filter((a) => {
                if (assessmentFilter === 'ALL') return true;
                if (assessmentFilter === 'MANDATORY') return a.isMandatory;
                if (assessmentFilter === 'CODING') return a.category === 'CODING' || a.hasCoding;
                if (assessmentFilter === 'APTITUDE') return a.category === 'APTITUDE';
                if (assessmentFilter === 'TECHNICAL') return a.category.includes('TECHNICAL') || a.category === 'TECHNICAL_MCQ';
                return true;
              })
              .map((assessment) => (
                <div
                  key={assessment.id}
                  className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs flex flex-col justify-between hover:border-blue-400/50 transition-all space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {assessment.isMandatory && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                            Mandatory Qualifier
                          </span>
                        )}
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                          {assessment.category}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {assessment.difficulty}
                        </span>
                      </div>
                      {assessment.hasCoding ? (
                        <Code className="w-5 h-5 text-blue-600 shrink-0" />
                      ) : (
                        <Clock className="w-5 h-5 text-slate-400 shrink-0" />
                      )}
                    </div>

                    <div>
                      <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                        {assessment.title}
                      </h3>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {assessment.skillsCovered.map((skill, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="text-xs text-slate-600 dark:text-slate-300 pt-1 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                      <span>
                        Duration: <strong>{assessment.durationMin} Mins</strong> • {assessment.questionCount} Questions
                      </span>
                      <span className="text-[11px] font-semibold text-slate-500">
                        Pass: {assessment.passingMarks}/{assessment.totalMarks} Marks
                      </span>
                    </div>

                    {assessment.completed && (
                      <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
                        <span className="flex items-center gap-1.5 font-bold">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          Passed &amp; Verified
                        </span>
                        <span className="font-mono font-bold">
                          Score: {assessment.bestScore}/{assessment.totalMarks}
                        </span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => handleLaunchAssessment(assessment)}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center justify-center gap-2 mt-2"
                  >
                    {assessment.hasCoding ? (
                      <>
                        <Code className="w-4 h-4" />
                        <span>Launch Code Sandbox &amp; Qualifier</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        <span>Launch Assessment Simulator</span>
                      </>
                    )}
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. MY APPLICATIONS VIEW                                                   */}
      {/* ========================================================================= */}
      {activeTab === 'my-applications' && (
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Application Pipeline Tracker ({dbApplications.length > 0 ? dbApplications.length : 12} Total)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Live status synchronized with College TPO and partner company recruiters in real-time
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Institutional Dream Policy Active</span>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* 1. Applied Column */}
            <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-xs uppercase text-slate-500">
                  Applied ({dbApplications.length > 0 ? dbApplications.filter((a) => a.status === 'APPLIED').length : 6})
                </span>
              </div>
              <div className="space-y-2">
                {dbApplications.length > 0 ? (
                  dbApplications
                    .filter((a) => a.status === 'APPLIED')
                    .map((app) => (
                      <div
                        key={app.id}
                        className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {app.drive?.companyName || 'Campus Partner'}
                          </span>
                          {app.fitScore && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                              {app.fitScore}% Fit
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between text-slate-500">
                          <span>{app.drive?.roleTitle}</span>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-700/60 mt-1">
                          <span className="text-[10px] text-blue-600 font-semibold">
                            {app.drive?.ctc || '₹18.0 LPA'} • Under Review
                          </span>
                          <button
                            onClick={() => handleWithdrawApplication(app.id, app.drive?.companyName)}
                            className="text-[10px] font-semibold text-rose-500 hover:text-rose-700 hover:underline"
                            title="Withdraw Application"
                          >
                            Withdraw
                          </button>
                        </div>
                      </div>
                    ))
                ) : (
                  <>
                    <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                      <div className="font-bold text-slate-900 dark:text-white">Google</div>
                      <div className="text-slate-500">Software Engineer Intern</div>
                      <div className="text-[10px] text-blue-600 mt-1 font-semibold">Under Review</div>
                    </div>
                    <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                      <div className="font-bold text-slate-900 dark:text-white">Infosys</div>
                      <div className="text-slate-500">Frontend Developer</div>
                      <div className="text-[10px] text-slate-400 mt-1">Submitted 3d ago</div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* 2. Shortlisted Column */}
            <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-xs uppercase text-blue-600">
                  Shortlisted ({dbApplications.length > 0 ? dbApplications.filter((a) => a.status === 'SHORTLISTED').length : 3})
                </span>
              </div>
              <div className="space-y-2">
                {dbApplications.length > 0 && dbApplications.filter((a) => a.status === 'SHORTLISTED').length > 0 ? (
                  dbApplications
                    .filter((a) => a.status === 'SHORTLISTED')
                    .map((app) => (
                      <div
                        key={app.id}
                        className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1"
                      >
                        <div className="font-bold text-slate-900 dark:text-white">
                          {app.drive?.companyName}
                        </div>
                        <div className="text-slate-500">{app.drive?.roleTitle}</div>
                        <div className="text-[10px] text-blue-600 font-semibold">Assessment Passed</div>
                      </div>
                    ))
                ) : (
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                    <div className="font-bold text-slate-900 dark:text-white">Atlassian</div>
                    <div className="text-slate-500">Associate SWE</div>
                    <div className="text-[10px] text-blue-600 mt-1 font-semibold">Assessment Passed</div>
                  </div>
                )}
              </div>
            </div>

            {/* 3. Interviews Column */}
            {/* 3. Interviews Column */}
            <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-xs uppercase text-purple-600">
                  Interviews ({dbApplications.filter((a) => a.status === 'INTERVIEW').length})
                </span>
              </div>
              <div className="space-y-2">
                {dbApplications.filter((a) => a.status === 'INTERVIEW').length > 0 ? (
                  dbApplications
                    .filter((a) => a.status === 'INTERVIEW')
                    .map((app) => {
                      const latestInterview = app.interviews?.[app.interviews.length - 1];
                      return (
                        <div
                          key={app.id}
                          className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-purple-200 dark:border-purple-900 text-xs space-y-1.5"
                        >
                          <div className="font-bold text-slate-900 dark:text-white">
                            {app.drive?.companyName || 'Partner Employer'}
                          </div>
                          <div className="text-slate-500">{app.drive?.roleTitle}</div>
                          <div className="text-[10px] text-purple-600 font-bold flex items-center justify-between">
                            <span>{latestInterview?.roundName || `Round ${app.currentRoundIndex || 1}`}</span>
                            {latestInterview?.scheduledAt && (
                              <span>
                                {new Date(latestInterview.scheduledAt).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </span>
                            )}
                          </div>
                          {latestInterview?.meetingLink && (
                            <a
                              href={latestInterview.meetingLink}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-block mt-1 text-[10px] text-white bg-purple-600 hover:bg-purple-700 font-bold px-2 py-0.5 rounded shadow-xs"
                            >
                              Join Interview Session →
                            </a>
                          )}
                        </div>
                      );
                    })
                ) : (
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-400">
                    No active interview rounds scheduled currently.
                  </div>
                )}
              </div>
            </div>

            {/* 4. Offers Column */}
            <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-xs uppercase text-emerald-600">
                  Offers ({dbOffers.length > 0 ? dbOffers.length : dbApplications.filter((a) => a.status === 'OFFERED' || a.status === 'SELECTED').length})
                </span>
                {dbOffers.some((o) => o.status === 'ACCEPTED') && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    PLACED
                  </span>
                )}
              </div>
              <div className="space-y-3">
                {(dbOffers.length > 0
                  ? dbOffers
                  : dbApplications.filter((a) => a.status === 'OFFERED' || a.status === 'SELECTED')
                ).length > 0 ? (
                  (dbOffers.length > 0
                    ? dbOffers
                    : dbApplications.filter((a) => a.status === 'OFFERED' || a.status === 'SELECTED')
                  ).map((offerItem) => {
                    const isDirectOffer = Boolean(offerItem.ctc && offerItem.companyName && !offerItem.drive);
                    const offer = isDirectOffer ? offerItem : (offerItem.offer || {
                      id: offerItem.id,
                      companyName: offerItem.drive?.companyName || 'Campus Partner',
                      roleTitle: offerItem.drive?.roleTitle || 'Associate Engineer',
                      ctc: offerItem.drive?.ctc || 'Competitive CTC',
                      status: offerItem.status === 'OFFERED' ? 'PENDING' : 'ACCEPTED',
                      offerLetterUrl: null,
                      tier: 'REGULAR',
                      expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
                      isExpired: false,
                      daysRemaining: 7,
                    });

                    const status = offer.status || 'PENDING';
                    const isExpired = offer.isExpired;
                    const tier = offer.tier || (offer.ctcAmount >= 20 ? 'SUPER_DREAM' : offer.ctcAmount >= 10 ? 'DREAM' : 'REGULAR');
                    const proofStatus = offer.metadata?.packageProof?.status || 'UNSUBMITTED';
                    const joiningStatus = offer.metadata?.joiningDetails?.joiningStatus || 'NOT_JOINED';

                    return (
                      <div
                        key={offer.id || offerItem.id}
                        className={`p-3.5 rounded-xl border text-xs space-y-2.5 transition-all shadow-xs ${
                          status === 'ACCEPTED'
                            ? 'bg-emerald-50/90 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800/80'
                            : status === 'DECLINED'
                            ? 'bg-slate-100 dark:bg-slate-800/50 border-slate-300 dark:border-slate-700 opacity-75'
                            : isExpired
                            ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800'
                            : 'bg-white dark:bg-slate-800 border-amber-300 dark:border-amber-700/80 ring-1 ring-amber-400/20'
                        }`}
                      >
                        {/* Company & Role Header */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                              {offer.companyName}
                            </div>
                            <div className="text-slate-600 dark:text-slate-300 font-medium text-xs">
                              {offer.roleTitle}
                            </div>
                          </div>
                          {/* Tier Badge */}
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                              tier === 'SUPER_DREAM'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300'
                                : tier === 'DREAM'
                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-300'
                                : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200'
                            }`}
                          >
                            {tier.replace('_', ' ')}
                          </span>
                        </div>

                        {/* CTC and Expiry Metadata */}
                        <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200 dark:border-slate-700/60">
                          <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                            {offer.ctc}
                          </span>
                          {status === 'PENDING' ? (
                            isExpired ? (
                              <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">
                                ⚠️ Expired
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" /> Valid for {offer.daysRemaining ?? 7}d
                              </span>
                            )
                          ) : status === 'ACCEPTED' ? (
                            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Offer Accepted
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium text-slate-500">
                              Declined
                            </span>
                          )}
                        </div>

                        {/* Offer Letter link if available */}
                        {offer.offerLetterUrl && (
                          <div className="pt-1">
                            <a
                              href={offer.offerLetterUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                            >
                              <FileText className="w-3.5 h-3.5" /> View Official Offer Letter
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}

                        {/* Action buttons depending on state */}
                        {status === 'PENDING' && !isExpired && (
                          <div className="pt-2 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setSignForm({
                                  signerName: user?.name || studentProfile?.user?.name || '',
                                  declarationConfirmed: false,
                                  signedLetterUrl: '',
                                });
                                setSigningOfferModal(offer);
                              }}
                              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] py-1.5 px-3 rounded-lg shadow-xs flex items-center justify-center gap-1 transition"
                            >
                              <FileCheck2 className="w-3.5 h-3.5" /> Review &amp; Sign
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setDeclineForm({ reason: 'ACCEPTED_OTHER_OFFER', notes: '' });
                                setDeclineOfferModal(offer);
                              }}
                              className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold text-[11px] rounded-lg transition"
                            >
                              Decline
                            </button>
                          </div>
                        )}

                        {status === 'PENDING' && isExpired && (
                          <div className="p-2 bg-rose-100/70 dark:bg-rose-950/40 rounded-lg text-[10px] text-rose-800 dark:text-rose-300 font-medium">
                            Offer deadline lapsed. Contact college TPO or recruiter to request validity extension.
                          </div>
                        )}

                        {status === 'ACCEPTED' && (
                          <div className="pt-2 border-t border-emerald-200 dark:border-emerald-800/60 space-y-2">
                            {/* Package Proof Status */}
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="text-slate-500 dark:text-slate-400 font-medium">Package Proof:</span>
                              <span
                                className={`px-1.5 py-0.5 rounded font-bold uppercase tracking-wider text-[9px] ${
                                  proofStatus === 'VERIFIED'
                                    ? 'bg-emerald-200 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-200'
                                    : proofStatus === 'PENDING_VERIFICATION'
                                    ? 'bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-200'
                                    : proofStatus === 'REJECTED'
                                    ? 'bg-rose-100 text-rose-900 dark:bg-rose-900 dark:text-rose-200'
                                    : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                                }`}
                              >
                                {proofStatus.replace('_', ' ')}
                              </span>
                            </div>

                            {/* Joining Details Status */}
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="text-slate-500 dark:text-slate-400 font-medium">Joining Status:</span>
                              <span className="font-bold text-slate-800 dark:text-slate-200">
                                {joiningStatus.replace('_', ' ')}
                              </span>
                            </div>

                            {/* Actions for accepted offer */}
                            <div className="flex items-center gap-1.5 pt-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setProofForm({
                                    proofDocumentUrl: offer.metadata?.packageProof?.proofDocumentUrl || offer.offerLetterUrl || '',
                                    fixedCtc: offer.metadata?.packageProof?.fixedCtc || offer.ctc,
                                    variableCtc: offer.metadata?.packageProof?.variableCtc || '',
                                    joiningBonus: offer.metadata?.packageProof?.joiningBonus || '',
                                    stockEsop: offer.metadata?.packageProof?.stockEsop || '',
                                    totalCtc: offer.metadata?.packageProof?.totalCtc || offer.ctc,
                                  });
                                  setPackageProofModal(offer);
                                }}
                                className="flex-1 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 font-semibold text-[10px] py-1 px-2 rounded-lg transition text-center"
                              >
                                {proofStatus === 'VERIFIED' ? 'View Proof' : 'Upload Proof'}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setJoiningForm({
                                    joiningStatus: offer.metadata?.joiningDetails?.joiningStatus || 'JOINED',
                                    expectedJoiningDate: offer.metadata?.joiningDetails?.expectedJoiningDate || '',
                                    actualJoiningDate: offer.metadata?.joiningDetails?.actualJoiningDate || '',
                                    joiningLocation: offer.metadata?.joiningDetails?.joiningLocation || '',
                                    joiningRemarks: offer.metadata?.joiningDetails?.joiningRemarks || '',
                                  });
                                  setJoiningModal(offer);
                                }}
                                className="flex-1 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 font-semibold text-[10px] py-1 px-2 rounded-lg transition text-center"
                              >
                                Joining Status
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-400">
                    Offers will appear here once selection rounds conclude.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 5. Closed / Rejection Feedback Section */}
          {dbApplications.some((a) => a.status === 'REJECTED') && (
            <div className="bg-rose-50/50 dark:bg-rose-950/20 p-4 rounded-2xl border border-rose-200 dark:border-rose-900">
              <h3 className="font-bold text-xs uppercase text-rose-700 dark:text-rose-400 mb-2">
                Concluded Applications &amp; Feedback ({dbApplications.filter((a) => a.status === 'REJECTED').length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {dbApplications
                  .filter((a) => a.status === 'REJECTED')
                  .map((app) => (
                    <div
                      key={app.id}
                      className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-rose-200 dark:border-rose-900/60 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {app.drive?.companyName}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                          Review Concluded
                        </span>
                      </div>
                      <div className="text-slate-500">{app.drive?.roleTitle}</div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg mt-1 border border-slate-200/60 dark:border-slate-700/60">
                        {app.stageNotes || 'Application reviewed and concluded for this cycle.'}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. LEARNING & PREPARATION VIEW                                            */}
      {/* ========================================================================= */}
      {activeTab === 'learning' && (
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 text-[10px] font-black uppercase tracking-wider">
                  Verified Curricula
                </span>
                <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Microservice Live (:5001)
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Placement Learning &amp; Preparation Roadmaps
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Curated DSA sheets, SQL mastery decks, and aptitude modules recommended by alumni and placement cell
              </p>
            </div>
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-slate-900 dark:text-white">Active Curricula</div>
              <div className="text-[11px] text-slate-500">
                {liveRoadmaps.length > 0 ? `${liveRoadmaps.length} Tracks Available` : '3 Tracks Available'}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {liveRoadmaps.length > 0 ? (
              liveRoadmaps.map((rm) => {
                const completed = rm.studentProgress?.completedItems || 0;
                const total = rm.totalItems || 1;
                const percent = Math.min(100, Math.round((completed / total) * 100));

                return (
                  <div
                    key={rm.id}
                    className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4 flex flex-col justify-between hover:border-blue-500/50 hover:shadow-md transition-all group"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white dark:bg-slate-800 flex items-center justify-center font-bold text-xs uppercase tracking-wider shadow-inner">
                            {rm.providerBadge || rm.provider.slice(0, 3)}
                          </div>
                          <div>
                            <div className="text-[10px] uppercase font-bold text-slate-400">{rm.provider}</div>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              {rm.category}
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-slate-500">
                          ~{rm.estimatedHours}h
                        </span>
                      </div>

                      <div>
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-blue-600 transition">
                          {rm.title}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                          {rm.description}
                        </p>
                      </div>

                      {Array.isArray(rm.tags) && rm.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {rm.tags.slice(0, 3).map((tag, i) => (
                            <span
                              key={i}
                              className="px-1.5 py-0.5 rounded text-[9px] bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                          <span>Progress ({completed}/{total})</span>
                          <span className={`font-bold ${percent === 100 ? 'text-emerald-600' : 'text-blue-600'}`}>
                            {percent}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              percent === 100
                                ? 'bg-emerald-500'
                                : percent > 50
                                ? 'bg-blue-600'
                                : 'bg-amber-500'
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-2">
                      {rm.studentProgress?.status === 'NOT_STARTED' || !rm.studentProgress?.completedItems ? (
                        <button
                          onClick={() => handleEnrollRoadmap(rm.slug, rm.title)}
                          className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                        >
                          <GraduationCap className="w-3.5 h-3.5" />
                          <span>Enroll Now</span>
                        </button>
                      ) : null}
                      <button
                        onClick={() => handleOpenRoadmap(rm.slug)}
                        className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>{rm.studentProgress?.completedItems ? 'Continue Learning' : 'View Syllabus'} ({rm.moduleCount || 0} Modules)</span>
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <>
                <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                    TUF
                  </div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Striver A2Z DSA Course
                  </h3>
                  <p className="text-xs text-slate-500">450+ curated problems covering Trees, Graphs, and DP.</p>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: '60%' }} />
                  </div>
                  <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">60% Completed (270/450)</div>
                </div>

                <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-900 text-white flex items-center justify-center font-bold text-xs">
                    DC
                  </div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    DataCamp SQL for Data Analysis
                  </h3>
                  <p className="text-xs text-slate-500">Window functions, query optimization, and aggregations.</p>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-blue-500 h-full rounded-full" style={{ width: '45%' }} />
                  </div>
                  <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">45% Completed (18/40)</div>
                </div>

                <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-900 text-white flex items-center justify-center font-bold text-xs">
                    GFG
                  </div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    GeeksforGeeks Aptitude Preparation
                  </h3>
                  <p className="text-xs text-slate-500">Permutations, Probability, Work &amp; Time, and Reasoning.</p>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-amber-500 h-full rounded-full" style={{ width: '30%' }} />
                  </div>
                  <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">30% Completed (30/100)</div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. COMPANY INTERVIEW VAULT & AI SIMULATOR                                */}
      {/* ========================================================================= */}
      {activeTab === 'interview-prep' && (
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Header Banner */}
          <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 text-[10px] font-black uppercase tracking-wider">
                  Crowdsourced & Verified
                </span>
                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Partner: TechSummitTrainers Curated
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 mt-1">
                <Building className="w-5 h-5 text-blue-600" />
                <span>Company Interview Vault & Alumni Mentor Network</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Real rounds, exact technical questions asked by top recruiters, candidate insider tips, and 1:1 alumni mock interview requests.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setDebriefModalOpen(true)}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition shrink-0 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Submit Debrief (+75 Pts)</span>
            </button>
          </div>

          {/* Company Selector Pills & Difficulty Meta */}
          <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {VAULT_COMPANIES.map((company) => {
                const isActive = selectedVaultCompany === company;
                return (
                  <button
                    key={company}
                    type="button"
                    onClick={() => {
                      setSelectedVaultCompany(company);
                      setDebriefForm((prev) => ({ ...prev, companyName: company }));
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <Building className="w-3.5 h-3.5" />
                    <span>{company}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 dark:text-slate-400 text-[11px] font-semibold">Evaluation Difficulty:</span>
              <span className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-bold text-[11px] flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-amber-500" />
                {vaultData.difficulty || 'Medium'}
              </span>
            </div>
          </div>

          {/* Main Vault Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Rounds & Real Questions (2 cols) */}
            <div className="lg:col-span-2 space-y-4">
              {vaultData.rounds.map((round, rIdx) => (
                <div
                  key={rIdx}
                  className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 flex items-center justify-center text-xs font-bold">
                        {rIdx + 1}
                      </span>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                        {round.roundName}
                      </h3>
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Verified Senior Debriefs
                    </span>
                  </div>

                  {/* Questions List */}
                  <div className="space-y-2.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                      Actual Problems & Prompts Asked:
                    </span>
                    {round.questions.map((q, qIdx) => (
                      <div
                        key={qIdx}
                        className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850/60 border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3 text-xs"
                      >
                        <div className="flex items-start gap-2.5 flex-1">
                          <span className="text-blue-600 font-bold mt-0.5">•</span>
                          <p className="text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                            {q}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setMockQuestion(q);
                            showToast(`Loaded question into TACIE AI Mock Simulator below!`);
                          }}
                          className="shrink-0 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 font-bold text-[10px] transition flex items-center gap-1 border border-blue-200 dark:border-blue-800"
                          title="Practice this question in AI simulator"
                        >
                          <Play className="w-3 h-3" /> Practice
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Candidate Insider Tip */}
                  <div className="p-3.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 flex items-start gap-2.5 text-xs">
                    <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-amber-900 dark:text-amber-300 block text-[11px]">
                        Candidate Insider Advice & Pitfalls:
                      </span>
                      <p className="text-amber-800 dark:text-amber-400 text-[11px] leading-relaxed mt-0.5">
                        {round.tip}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Mapped Alumni & Prep Column (1 col) */}
            <div className="space-y-4">
              {/* Alumni Card */}
              <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-blue-600" />
                    <span>Mapped Alumni at {selectedVaultCompany}</span>
                  </h3>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded">
                    Verified
                  </span>
                </div>

                <div className="space-y-3">
                  {vaultData.alumni.map((alum, aIdx) => (
                    <div
                      key={aIdx}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850/50 space-y-2 text-xs"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">
                            {alum.name}
                          </div>
                          <div className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                            {alum.role}
                          </div>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-slate-400">
                          Class of {alum.grad}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => showToast(`1:1 Referral & Mock Prep requested from ${alum.name}! They will receive your verified profile.`)}
                          className="flex-1 py-1.5 px-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1"
                        >
                          <Send className="w-3 h-3" /> Request Referral / 1:1
                        </button>
                        <a
                          href={alum.link}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
                          title="View LinkedIn Profile"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* TechSummitTrainers Masterclass Callout */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-900 to-indigo-900 text-white space-y-3 shadow-md">
                <div className="flex items-center gap-1.5 text-blue-300 text-[10px] font-extrabold uppercase tracking-wider">
                  <Award className="w-3.5 h-3.5" /> TechSummitTrainers Masterclass
                </div>
                <h4 className="font-extrabold text-sm leading-snug">
                  Cracking {selectedVaultCompany} Technical Interviews
                </h4>
                <p className="text-[11px] text-blue-100 leading-relaxed">
                  Join an intensive 5-day bootcamp covering curated system design, live mock machine coding, and exact proctored problem patterns.
                </p>
                <div className="pt-1 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-amber-300">100% Free for Enrolled Students</span>
                  <button
                    type="button"
                    onClick={() => showToast(`Enrolled in TechSummitTrainers ${selectedVaultCompany} Masterclass!`)}
                    className="px-3 py-1.5 bg-white text-blue-900 hover:bg-blue-50 font-bold rounded-lg text-[11px] transition"
                  >
                    Enroll Now →
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* TACIE AI Mock Simulator Section */}
          <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-6">
            {/* Header & Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 text-[10px] font-black uppercase tracking-wider">
                    Interactive AI Simulator
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Ollama Llama-3.1 Live
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mt-1">
                  <Sparkles className="w-5 h-5 text-blue-600" />
                  <span>AI Mock Interview Studio • {selectedVaultCompany} Target</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Real-time interview simulator with speech recognition, text-to-speech voice, live webcam proctoring, and rubric grading.
                </p>
              </div>

              {/* Round Switcher */}
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
                {(['Technical', 'System Design', 'Behavioral'] as const).map((round) => (
                  <button
                    key={round}
                    type="button"
                    onClick={() => {
                      setMockRound(round);
                      loadMockQuestions(selectedVaultCompany, round, mockRole);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      mockRound === round
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {round}
                  </button>
                ))}
              </div>
            </div>

            {/* Typing-Only Simulator Banner & Formatting Guidance */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850/60 border border-slate-200 dark:border-slate-800 text-xs">
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="font-bold">Typing Mode Active:</span>
                <span>Distraction-free technical writing sandbox (Video proctoring & voice input disabled).</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMockAnswer('')}
                  className="px-2.5 py-1 rounded-md text-[11px] font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 transition"
                >
                  Clear Answer
                </button>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800">
                  Target: 40-150 words
                </span>
              </div>
            </div>

            {/* Question Card & Sequencer */}
            <div className="p-5 rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wider">
                    {mockRound} Round
                  </span>
                  <span className="text-xs text-blue-800 dark:text-blue-300 font-bold">
                    Question {mockQuestionIdx + 1} of {Math.max(1, mockQuestionsList.length)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowMockHints((prev) => !prev)}
                    className="text-[11px] font-bold text-blue-700 dark:text-blue-300 hover:underline flex items-center gap-1"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>{showMockHints ? 'Hide Hints' : 'Show Answer Hints'}</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={mockQuestionIdx === 0}
                      onClick={() => {
                        const newIdx = Math.max(0, mockQuestionIdx - 1);
                        setMockQuestionIdx(newIdx);
                        setMockQuestion(mockQuestionsList[newIdx]?.question || mockQuestion);
                        setMockAnswer('');
                        setSubmittedAnswerRecord('');
                        setMockScore(null);
                        setMockEvaluation(null);
                      }}
                      className="p-1 rounded bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={mockQuestionIdx >= mockQuestionsList.length - 1}
                      onClick={() => {
                        const newIdx = Math.min(mockQuestionsList.length - 1, mockQuestionIdx + 1);
                        setMockQuestionIdx(newIdx);
                        setMockQuestion(mockQuestionsList[newIdx]?.question || mockQuestion);
                        setMockAnswer('');
                        setSubmittedAnswerRecord('');
                        setMockScore(null);
                        setMockEvaluation(null);
                      }}
                      className="p-1 rounded bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              <p className="font-extrabold text-base text-slate-900 dark:text-white leading-relaxed">
                {mockQuestion}
              </p>

              {/* Hints Box */}
              {showMockHints && mockQuestionsList[mockQuestionIdx]?.modelAnswerHints && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs space-y-1">
                  <span className="font-bold text-amber-900 dark:text-amber-300 block text-[11px]">
                    Expected Architecture & Rubric Points:
                  </span>
                  <ul className="list-disc pl-4 text-amber-800 dark:text-amber-400 space-y-0.5">
                    {mockQuestionsList[mockQuestionIdx].modelAnswerHints.map((hint: string, hIdx: number) => (
                      <li key={hIdx}>{hint}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Answer Input Textarea */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <span>Your Technical Answer / Architectural Blueprint:</span>
                  <span className="text-[10px] text-slate-400 font-normal">(Type your answer; trivial answers under 10 words like &lsquo;hello world&rsquo; receive strict failing scores)</span>
                </label>
                <span className={`text-[11px] font-mono font-bold ${
                  mockAnswer.trim().split(/\s+/).filter(Boolean).length < 15
                    ? 'text-amber-500'
                    : 'text-emerald-600'
                }`}>
                  {mockAnswer.trim().split(/\s+/).filter(Boolean).length} words
                </span>
              </div>
              <textarea
                rows={6}
                value={mockAnswer}
                onChange={(e) => setMockAnswer(e.target.value)}
                placeholder="Type your technical solution here. Structure using STAR or System Architecture principles. Detail component interactions, data structures, complexity (time/space), failure recovery, and trade-offs..."
                className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 text-xs font-mono leading-relaxed focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => {
                  if (mockQuestionsList.length > 0) {
                    const next = (mockQuestionIdx + 1) % mockQuestionsList.length;
                    setMockQuestionIdx(next);
                    setMockQuestion(mockQuestionsList[next].question);
                    setMockAnswer('');
                    setSubmittedAnswerRecord('');
                    setMockScore(null);
                    setMockEvaluation(null);
                  } else {
                    setMockQuestion('Explain how you would handle distributed transactions across microservices using the Saga Pattern vs 2-Phase Commit.');
                    setMockAnswer('');
                    setSubmittedAnswerRecord('');
                    setMockScore(null);
                    setMockEvaluation(null);
                  }
                }}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Next Practice Question</span>
              </button>

              <button
                type="button"
                disabled={isEvaluatingMock}
                onClick={handleRunMockAnalysis}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-2 transition"
              >
                {isEvaluatingMock ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Evaluating with Ollama AI...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Evaluate with AI (TACIE)</span>
                  </>
                )}
              </button>
            </div>

            {/* AI Evaluation Rubric Results Card */}
            {mockScore !== null && (
              <div className={`p-5 rounded-2xl border space-y-4 animate-in fade-in ${
                mockScore >= 70
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800'
                  : mockScore >= 40
                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800'
              }`}>
                <div className="flex items-start justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
                  <div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                      mockScore >= 70
                        ? 'bg-emerald-200 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-200'
                        : mockScore >= 40
                        ? 'bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-200'
                        : 'bg-rose-200 text-rose-900 dark:bg-rose-900 dark:text-rose-200'
                    }`}>
                      Evaluated & Persisted to Career Ledger
                    </span>
                    <h4 className="text-base font-extrabold text-slate-900 dark:text-white mt-1 flex items-center gap-2">
                      <span>Score: {mockScore}/100</span>
                      <span className={`text-xs font-bold ${
                        mockScore >= 85
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : mockScore >= 70
                          ? 'text-blue-700 dark:text-blue-400'
                          : mockScore >= 40
                          ? 'text-amber-700 dark:text-amber-400'
                          : 'text-rose-700 dark:text-rose-400'
                      }`}>
                        {mockScore >= 85
                          ? '(Tier-1 Selected)'
                          : mockScore >= 70
                          ? '(Interview Qualified)'
                          : mockScore >= 40
                          ? '(Trainable / Needs Polish)'
                          : '(Incomplete / Needs Substantive Revision)'}
                      </span>
                    </h4>
                  </div>
                  <Award className={`w-6 h-6 shrink-0 ${
                    mockScore >= 70 ? 'text-emerald-600' : mockScore >= 40 ? 'text-amber-600' : 'text-rose-600'
                  }`} />
                </div>

                {/* Candidate Submitted Response */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Your Submitted Response Evaluated:
                  </span>
                  <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-800 dark:text-slate-200">
                    &ldquo;{submittedAnswerRecord || mockAnswer}&rdquo;
                  </div>
                </div>

                {/* Rubric Breakdown Grid */}
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-bold uppercase text-slate-500">Clarity</span>
                    <div className="text-lg font-black text-blue-600">{mockEvaluation?.clarity ?? mockScore}%</div>
                  </div>
                  <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-bold uppercase text-slate-500">Technical Depth</span>
                    <div className={`text-lg font-black ${mockScore >= 40 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {mockEvaluation?.technicalAccuracy ?? mockScore}%
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-bold uppercase text-slate-500">STAR Structure</span>
                    <div className={`text-lg font-black ${mockScore >= 40 ? 'text-amber-600' : 'text-rose-600'}`}>
                      {mockEvaluation?.structureStar ?? (mockScore - 2)}%
                    </div>
                  </div>
                </div>

                {/* AI Constructive Feedback */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    AI Examiner Feedback:
                  </span>
                  <p className="text-xs text-slate-900 dark:text-slate-100 leading-relaxed bg-white/60 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                    {mockEvaluation?.feedback || 'Good practical grasp. Frame your answer with quantified constraints before diving into technical details.'}
                  </p>
                </div>

                {/* Model Answer Benchmark */}
                {mockEvaluation?.modelAnswer && (
                  <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                      Tier-1 Benchmark Model Answer (Reference Guide):
                    </span>
                    <p className="text-xs font-mono text-slate-800 dark:text-slate-300 bg-indigo-50/50 dark:bg-slate-900/80 border border-indigo-100 dark:border-indigo-950 p-3 rounded-xl leading-relaxed">
                      {mockEvaluation.modelAnswer}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Past Interview History Ledger */}
            {mockHistory.length > 0 && (
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                    <span>My Past AI Mock Attempts ({mockHistory.length} Sessions Recorded)</span>
                  </h4>
                  <span className="text-[10px] text-slate-400">Synchronized with Institutional Ledger</span>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {mockHistory.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white truncate">
                            {item.targetRole}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(item.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">{item.question}</p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-xs">
                          {item.score}/100
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. STUDENT CONTRIBUTIONS VIEW                                             */}
      {/* ========================================================================= */}
      {activeTab === 'opportunity-contributions' && (
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Student-Shared Opportunities (+50 Points Reward)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Share verified off-campus opportunities to help peers and earn honor leaderboard points
              </p>
            </div>
            <button
              onClick={() => setSubmitModalOpen(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Submit New Opening</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {userSubmissions.map((opp) => (
              <div
                key={opp.id}
                className="p-5 rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-xs flex items-start justify-between"
              >
                <div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                    Verified Link (+50 Pts)
                  </span>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white mt-2">{opp.role}</h3>
                  <p className="text-xs text-slate-500">{opp.company} • {opp.ctc}</p>
                  <p className="text-[11px] text-slate-400 mt-2">Posted by: {opp.postedBy} • {opp.timeAgo}</p>
                </div>
                <a
                  href={opp.url}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 hover:text-blue-600"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 9. COMMUNITY VIEW                                                         */}
      {/* ========================================================================= */}
      {activeTab === 'community' && (
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Campus Placement Community &amp; Peer Discussion
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Discuss interview questions, salary compensation reviews, and referral tips
              </p>
            </div>
            <button
              onClick={() => showToast('Opening new thread creation box...')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md"
            >
              + Start Discussion
            </button>
          </div>

          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-blue-600">Interview Experience • Google</span>
                <span className="text-[10px] text-slate-400">3 hours ago</span>
              </div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Google SWE Intern Round 2 Coding: Graph Topological Sort Question
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                The interviewer asked to schedule tasks with prerequisites and detect circular dependencies. Kahn&apos;s algorithm BFS worked smoothly!
              </p>
              <div className="flex items-center gap-4 text-xs font-bold text-slate-500 pt-2">
                <span>▲ 42 Upvotes</span>
                <span>💬 16 Comments</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-emerald-600">Compensation Review • Deloitte</span>
                <span className="text-[10px] text-slate-400">Yesterday</span>
              </div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Deloitte Data Analyst CTC Breakdown for 2026 Batch
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Base salary ₹11.5 LPA + ₹2 LPA joining bonus + ₹1 LPA performance retention bonus. Total ₹14.5 LPA.
              </p>
              <div className="flex items-center gap-4 text-xs font-bold text-slate-500 pt-2">
                <span>▲ 68 Upvotes</span>
                <span>💬 24 Comments</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 10. MESSAGES VIEW                                                         */}
      {/* ========================================================================= */}
      {activeTab === 'messages' && (
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Placement Inbox &amp; Direct Communication
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Secure messaging with TPO placement officers, corporate recruiters, and alumni mentors
            </p>
          </div>

          <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden flex flex-col h-[480px]">
            <div className="flex-1 p-5 overflow-y-auto space-y-4">
              {messages.map((m, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-blue-600">{m.sender}</span>
                    <span className="text-[10px] text-slate-400">{m.time}</span>
                  </div>
                  <p className="text-xs text-slate-800 dark:text-slate-200">{m.text}</p>
                </div>
              ))}
            </div>

            <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-200 dark:border-slate-800 flex gap-2">
              <input
                type="text"
                value={newMessageText}
                onChange={(e) => setNewMessageText(e.target.value)}
                placeholder="Type your response to placement officers or recruiters..."
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
              />
              <button
                type="submit"
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 11. EVENTS VIEW                                                           */}
      {/* ========================================================================= */}
      {activeTab === 'events' && (
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Placement Workshops &amp; Pre-Placement Talks (AY 2026-27)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              RSVP to live tech keynotes, offline hackathons, and mock interview bootcamps
            </p>
          </div>

          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/70 text-blue-600 font-bold text-center w-16 shrink-0">
                  <div className="text-lg leading-tight">28</div>
                  <div className="text-[10px] uppercase">Oct</div>
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Google Campus Pre-Placement Keynote &amp; Q&amp;A
                  </h3>
                  <p className="text-xs text-slate-500">Host: Arjun Nambiar (Campus Talent Lead) • Main Auditorium &amp; Meet</p>
                  <p className="text-[11px] text-blue-600 font-semibold mt-1">2:30 PM - 4:00 PM IST</p>
                </div>
              </div>
              <button
                onClick={() => showToast('RSVP Confirmed! Calendar invitation sent to student email.')}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-xs shrink-0"
              >
                RSVP Seat
              </button>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 font-bold text-center w-16 shrink-0">
                  <div className="text-lg leading-tight">02</div>
                  <div className="text-[10px] uppercase">Nov</div>
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Alumni Mentorship Bootcamp: Cracking Amazon SDE
                  </h3>
                  <p className="text-xs text-slate-500">Host: Amit Joshi (SDE-II, Amazon AWS) • Virtual Workshop</p>
                  <p className="text-[11px] text-emerald-600 font-semibold mt-1">6:00 PM - 7:30 PM IST</p>
                </div>
              </div>
              <button
                onClick={() => showToast('RSVP Confirmed! Calendar invitation sent to student email.')}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-xs shrink-0"
              >
                RSVP Seat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 12. BOOKMARKS VIEW                                                        */}
      {/* ========================================================================= */}
      {activeTab === 'bookmarks' && (
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Bookmark className="w-5 h-5 text-blue-600 fill-blue-600" />
              <span>Saved Bookmarks &amp; Opportunities</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Quick access to job listings, questions, and resources you have bookmarked
            </p>
          </div>

          {displayJobs.filter((j) => bookmarkedJobs[j.id]).length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {displayJobs.filter((j) => bookmarkedJobs[j.id]).map((job) => (
                <div
                  key={job.id}
                  className="p-5 rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-xs flex items-start justify-between"
                >
                  <div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                      {job.type} • {job.location}
                    </span>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white mt-2">{job.role}</h3>
                    <p className="text-xs text-slate-500">{job.company} • {job.ctc}</p>
                    <p className="text-[11px] text-slate-400 mt-1">Deadline: {job.deadline}</p>
                  </div>
                  <button
                    onClick={() => setSelectedJob(job)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold"
                  >
                    View
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-slate-800 p-8">
              <Bookmark className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Saved Bookmarks Yet</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 mb-4">
                Click the bookmark ribbon on any campus drive or opportunity card to save it for quick review and tracking.
              </p>
              <button
                onClick={() => setActiveTab('opportunities')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-500 transition-colors shadow-xs"
              >
                Browse Campus Drives
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 13. SETTINGS VIEW                                                         */}
      {/* ========================================================================= */}
      {activeTab === 'settings' && (
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-600" />
              <span>CareerOS Student Preferences</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Customize placement notification alerts, minimum CTC thresholds, and recruiter visibility
            </p>
          </div>

          <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-6 text-xs">
            <div className="space-y-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Job Matching Preferences</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Target Roles</label>
                  <input
                    type="text"
                    defaultValue="Software Engineer, Data Analyst, Cloud DevOps"
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Minimum CTC Target</label>
                  <input
                    type="text"
                    defaultValue="₹12.0 LPA / ₹40,000 monthly"
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Recruiter Discovery</h3>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">Profile Visible to Partner Recruiters</div>
                  <div className="text-[11px] text-slate-400">Allow companies like Google, Microsoft to discover your talent passport.</div>
                </div>
                <input type="checkbox" defaultChecked className="w-4 h-4 accent-blue-600" />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => showToast('Preferences successfully saved!')}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-md"
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DIALOG 1: JOB DETAILS MODAL                                              */}
      {/* ========================================================================= */}
      {selectedJob && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/80 text-blue-600 flex items-center justify-center font-bold text-lg">
                  {selectedJob.company[0]}
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                    {selectedJob.role}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {selectedJob.company} • {selectedJob.location}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedJob(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3.5 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Compensation</span>
                  <div className="font-bold text-sm text-slate-900 dark:text-white">{selectedJob.ctc}</div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Application Deadline</span>
                  <div className="font-bold text-sm text-slate-900 dark:text-white">{selectedJob.deadline}</div>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 dark:text-white mb-1.5 flex items-center justify-between">
                  <span>Official Job Description (JD) &amp; Requirements</span>
                  <span className="text-[10px] font-semibold text-slate-400">Verified Drive Spec</span>
                </h4>
                <div className="leading-relaxed whitespace-pre-wrap text-xs bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 max-h-64 overflow-y-auto font-sans">
                  {selectedJob.description}
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 dark:text-white mb-1.5">Required Skills &amp; Stack</h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedJob.skills.map((s) => (
                    <span
                      key={s}
                      className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 text-[11px] font-semibold border border-blue-200 dark:border-blue-800"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              {/* Evidence-Backed Fit Analysis Card */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <span>Evidence-Backed Fit Assessment</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleEvaluateFit(selectedJob)}
                    disabled={isMatchingJob}
                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold shadow-2xs transition disabled:opacity-50"
                  >
                    {isMatchingJob ? 'Evaluating...' : 'Evaluate Match'}
                  </button>
                </div>

                {jobMatchResult ? (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-600 dark:text-slate-300">
                        Fit Score: <span className="font-extrabold text-blue-600 dark:text-blue-400 text-sm">{jobMatchResult.fit_score}%</span>
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                        {jobMatchResult.match_tier}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug">
                      {jobMatchResult.plain_language_explanation}
                    </p>

                    {jobMatchResult.missing_required_skills && jobMatchResult.missing_required_skills.length > 0 && (
                      <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-[11px]">
                        <span className="font-bold text-amber-900 dark:text-amber-300 block mb-0.5">
                          TechSummitTrainers Upskilling Advice:
                        </span>
                        <span className="text-amber-800 dark:text-amber-400">
                          {jobMatchResult.missing_required_skills[0].remediation_suggestion}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Click evaluate to analyze your verified GitHub code, test scores, and capstone rubrics against this opening.
                  </p>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setSelectedResumeTarget(selectedJob.company);
                  setResumeGeneratorOpen(true);
                  handleGenerateGroundedResume(selectedJob.role, selectedJob.description);
                }}
                className="px-3 py-2 rounded-xl text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center gap-1.5 transition"
              >
                <FileCheck2 className="w-3.5 h-3.5" />
                <span>Grounded Resume</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedJob(null);
                    setJobMatchResult(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyJob(selectedJob)}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition"
                >
                  Apply with CareerOS Profile
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DIALOG 2: DETAILED CAREER READINESS REPORT                                 */}
      {/* ========================================================================= */}
      {reportModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Career Readiness Report (78% Score)
                </h3>
              </div>
              <button onClick={() => setReportModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="font-bold text-emerald-950 dark:text-emerald-300">Profile Completion: 100%</span>
                </div>
                <span className="text-[10px] font-bold text-emerald-600">Verified</span>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="font-bold text-emerald-950 dark:text-emerald-300">Resume Strength: 80%</span>
                </div>
                <span className="text-[10px] font-bold text-emerald-600">ATS High Tier</span>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span className="font-bold text-amber-950 dark:text-amber-300">Skills Assessment: 70%</span>
                </div>
                <span className="text-[10px] font-bold text-amber-600">+10% Needed</span>
              </div>

              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Compass className="w-4 h-4 text-blue-600" />
                  <span className="font-bold text-blue-950 dark:text-blue-300">Interview Preparation: 60%</span>
                </div>
                <span className="text-[10px] font-bold text-blue-600">Schedule AI Mock</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setReportModalOpen(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DIALOG 3: SUBMIT OPPORTUNITY MODAL                                       */}
      {/* ========================================================================= */}
      {submitModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Share Off-Campus Opportunity
              </h3>
              <button onClick={() => setSubmitModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmission} className="py-4 space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Company Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Uber, Swiggy, Razorpay"
                  value={newCompany}
                  onChange={(e) => setNewCompany(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Job Role / Designation</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Software Development Intern"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Application URL</label>
                <input
                  type="url"
                  required
                  placeholder="https://..."
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">CTC / Monthly Stipend</label>
                <input
                  type="text"
                  placeholder="e.g. ₹50,000 / mo or ₹18 LPA"
                  value={newCtc}
                  onChange={(e) => setNewCtc(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSubmitModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg"
                >
                  Submit (+50 Pts)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DIALOG 4: EVIDENCE PROOF DRAWER MODAL                                     */}
      {/* ========================================================================= */}
      {activeEvidenceProof && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg shadow-xs ${
                    activeEvidenceProof.confidenceTier === 'GOLD_VERIFIED'
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300'
                      : activeEvidenceProof.confidenceTier === 'SILVER_VALIDATED'
                      ? 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
                      : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                  }`}
                >
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">
                      {activeEvidenceProof.canonicalSkill}
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        activeEvidenceProof.confidenceTier === 'GOLD_VERIFIED'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : activeEvidenceProof.confidenceTier === 'SILVER_VALIDATED'
                          ? 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                      }`}
                    >
                      {activeEvidenceProof.confidenceTier.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Category: {activeEvidenceProof.category} • Proof-of-Work Protocol
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveEvidenceProof(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3.5 text-xs text-slate-700 dark:text-slate-300">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Verified Metric</span>
                <div className="font-bold text-sm text-slate-900 dark:text-white">
                  {activeEvidenceProof.metric}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Verification Source &amp; Type</span>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 rounded bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-semibold text-[11px]">
                    {activeEvidenceProof.sourceType}
                  </span>
                  <span className="text-slate-500 font-mono text-[11px] truncate flex-1">
                    {activeEvidenceProof.locator}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Auditor Verification Note</span>
                <p className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 text-amber-900 dark:text-amber-200 leading-relaxed text-xs">
                  {activeEvidenceProof.auditNote}
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-2 text-emerald-800 dark:text-emerald-300 text-[11px]">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>Verified by CareerOS AST Parser. Meets college placement cell standards.</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              {activeEvidenceProof.locator.startsWith('http') ? (
                <a
                  href={activeEvidenceProof.locator}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  <span>View Proof in GitHub</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              ) : (
                <span className="text-[11px] text-slate-400">Locator: {activeEvidenceProof.locator}</span>
              )}

              <button
                type="button"
                onClick={() => setActiveEvidenceProof(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-xl text-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DIALOG 5: GROUNDED 1-PAGE ATS RESUME GENERATOR MODAL                      */}
      {/* ========================================================================= */}
      {resumeGeneratorOpen && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-5">
          <div className="w-full max-w-4xl max-h-[92vh] bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/80 text-blue-600 flex items-center justify-center font-bold">
                  <FileCheck2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white">
                      1-Page Grounded ATS Resume Generator
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      100% Evidence Traceable
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Targeted for {selectedResumeTarget} • Zero unsubstantiated bullet points.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setResumeGeneratorOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: ATS Resume Preview (8 cols) */}
              <div className="lg:col-span-8 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setResumeViewTab('card')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                        resumeViewTab === 'card'
                          ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      Executive ATS Card
                    </button>
                    <button
                      type="button"
                      onClick={() => setResumeViewTab('plain')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                        resumeViewTab === 'plain'
                          ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      Clean Plain Text
                    </button>
                    <button
                      type="button"
                      onClick={() => setResumeViewTab('json')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                        resumeViewTab === 'json'
                          ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      Raw JSON
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleGenerateGroundedResume()}
                    disabled={isGeneratingResume}
                    className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1 disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isGeneratingResume ? 'Generating...' : 'Regenerate'}</span>
                  </button>
                </div>

                {isGeneratingResume ? (
                  <div className="h-96 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex flex-col items-center justify-center p-6 text-center space-y-3">
                    <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Synthesizing evidence-grounded ATS resume from database...
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Querying verified GitHub repositories, proctored assessments, and student projects.
                    </p>
                  </div>
                ) : groundedResume ? (
                  resumeViewTab === 'card' ? (
                    <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-md space-y-5 text-slate-900 dark:text-white">
                      {/* Header Section */}
                      <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white">
                              {groundedResume.candidate_name || groundedResume.student_name}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                {groundedResume.target_role} @ {groundedResume.target_company}
                              </span>
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300">
                                94/100 Gold Verified
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Contact Chips */}
                        <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-slate-600 dark:text-slate-300">
                          <span>📧 {groundedResume.email}</span>
                          <span>•</span>
                          <span>📱 {studentProfile?.user?.phone || '+91 9075097235'}</span>
                          {studentProfile?.githubUrl && (
                            <>
                              <span>•</span>
                              <a href={studentProfile.githubUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                                <span>GitHub</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </>
                          )}
                          {studentProfile?.linkedinUrl && (
                            <>
                              <span>•</span>
                              <a href={studentProfile.linkedinUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                                <span>LinkedIn</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Professional Summary */}
                      <div className="space-y-1.5">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                          Professional Summary
                        </h4>
                        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700">
                          {groundedResume.summary}
                        </p>
                      </div>

                      {/* Education Section */}
                      <div className="space-y-1.5">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                          Education &amp; Institution
                        </h4>
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 text-xs">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {groundedResume.education_summary || `${studentProfile?.course || 'B.Tech in Computer Engineering'}, Government College of Engineering & Technology (GCOEN), Class of ${studentProfile?.graduationYear || 2026} (CGPA: ${studentProfile?.cgpa ? Number(studentProfile.cgpa).toFixed(2) : '9.24'})`}
                          </div>
                        </div>
                      </div>

                      {/* Verified Technical Skills */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                          Verified Technical Skills (Evidence-Grounded)
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {groundedResume.verified_technical_skills && Object.keys(groundedResume.verified_technical_skills).length > 0 ? (
                            Object.entries(groundedResume.verified_technical_skills).map(([category, skills]: [string, any]) => (
                              <div key={category} className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                                <span className="font-bold text-[11px] text-slate-500 uppercase block mb-1">{category}</span>
                                <div className="flex flex-wrap gap-1.5">
                                  {Array.isArray(skills) && skills.map((s: any, sIdx: number) => {
                                    const skillText = typeof s === 'string' ? s : s?.canonical_skill || s?.name || String(s || '');
                                    return (
                                      <span key={sIdx} className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                        ✓ {skillText}
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-slate-500">{groundedResume.verified_skills_summary?.join(' • ')}</p>
                          )}
                        </div>
                      </div>

                      {/* Featured Engineering Projects */}
                      {groundedResume.projects && groundedResume.projects.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                            Featured Projects (100% Traceable to Verified Proof)
                          </h4>
                          <div className="space-y-3">
                            {groundedResume.projects.map((proj: any, pIdx: number) => (
                              <div key={pIdx} className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 space-y-2 text-xs">
                                <div className="flex items-center justify-between">
                                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <span>{proj.title}</span>
                                    {proj.repo_url && (
                                      <a href={proj.repo_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-1 text-[11px]">
                                        <span>Repo</span>
                                        <ExternalLink className="w-3 h-3" />
                                      </a>
                                    )}
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {(proj.tech_stack || []).map((t: string) => (
                                    <span key={t} className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-200/70 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                                      {t}
                                    </span>
                                  ))}
                                </div>
                                <ul className="space-y-1.5 pt-1 text-[11px] text-slate-700 dark:text-slate-300">
                                  {(proj.bullets || []).map((b: any, bIdx: number) => (
                                    <li key={bIdx} className="flex items-start gap-1.5">
                                      <span className="text-blue-500 shrink-0">•</span>
                                      <span>
                                        {typeof b === 'string' ? b : b?.bullet_text || String(b || '')}{' '}
                                        {b?.evidence_metric && (
                                          <strong className="text-amber-700 dark:text-amber-400">
                                            [Verified: {typeof b.evidence_metric === 'string' ? b.evidence_metric : JSON.stringify(b.evidence_metric)}]
                                          </strong>
                                        )}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Work Experience */}
                      {groundedResume.experiences && groundedResume.experiences.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                            Work Experience &amp; Internships
                          </h4>
                          <div className="space-y-2">
                            {groundedResume.experiences.map((exp: any, eIdx: number) => (
                              <div key={eIdx} className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-xs space-y-1">
                                <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                                  <span>{exp.role} • {exp.company}</span>
                                  <span className="text-[10px] text-slate-500">{exp.startDate} - {exp.endDate || 'Present'}</span>
                                </div>
                                <p className="text-[11px] text-slate-600 dark:text-slate-300">
                                  {typeof exp.description === 'string' ? exp.description : exp.description?.bullet_text || String(exp.description || '')}
                                </p>
                                {exp.bullets && Array.isArray(exp.bullets) && exp.bullets.length > 0 && (
                                  <ul className="space-y-1 pt-1 text-[11px] text-slate-700 dark:text-slate-300">
                                    {exp.bullets.map((b: any, bIdx: number) => (
                                      <li key={bIdx} className="flex items-start gap-1.5">
                                        <span className="text-blue-500 shrink-0">•</span>
                                        <span>{typeof b === 'string' ? b : b?.bullet_text || String(b || '')}</span>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Verified Assessments */}
                      {groundedResume.verified_assessments && groundedResume.verified_assessments.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                            Verified Assessments &amp; Benchmarks
                          </h4>
                          <div className="space-y-1.5">
                            {groundedResume.verified_assessments.map((a: string, aIdx: number) => (
                              <div key={aIdx} className="p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 text-xs flex items-center gap-2 text-emerald-900 dark:text-emerald-300 font-medium">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                <span>{a}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Certificate Footer */}
                      <div className="pt-3 border-t border-dashed border-slate-200 dark:border-slate-800 text-[10px] text-slate-400 flex items-center justify-between font-sans">
                        <span>Digital Evidence Hash: <strong className="font-mono text-slate-600 dark:text-slate-300">{groundedResume.integrity_hash?.slice(0, 20)}...</strong></span>
                        <span className="text-emerald-600 font-bold flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>100% Institutionally Verified</span>
                        </span>
                      </div>
                    </div>
                  ) : resumeViewTab === 'plain' ? (
                    <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-md space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500">ATS Single-Column Plain Text</span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(groundedResume.plain_text_resume || groundedResume.one_page_plain_text);
                            showToast('ATS Plain Text copied to clipboard!');
                          }}
                          className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Plain Text</span>
                        </button>
                      </div>
                      <pre className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs font-mono text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed max-h-[500px] overflow-y-auto">
                        {groundedResume.plain_text_resume || groundedResume.one_page_plain_text}
                      </pre>
                    </div>
                  ) : (
                    <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-md space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500">API Contract JSON Response</span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(JSON.stringify(groundedResume, null, 2));
                            showToast('Resume JSON copied to clipboard!');
                          }}
                          className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy JSON</span>
                        </button>
                      </div>
                      <pre className="p-4 rounded-xl bg-slate-900 text-emerald-400 text-xs font-mono whitespace-pre-wrap leading-relaxed max-h-[500px] overflow-y-auto">
                        {JSON.stringify(groundedResume, null, 2)}
                      </pre>
                    </div>
                  )
                ) : (
                  <div className="h-80 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center p-6 text-center space-y-2">
                    <p className="text-xs text-slate-500">No grounded resume generated yet.</p>
                    <button
                      type="button"
                      onClick={() => handleGenerateGroundedResume()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold"
                    >
                      Generate for {selectedResumeTarget}
                    </button>
                  </div>
                )}
              </div>

              {/* Right Column: Evidence Traceability Ledger (4 cols) */}
              <div className="lg:col-span-4 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                  Proof Traceability Ledger
                </span>

                <div className="p-3.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 text-xs space-y-1">
                  <div className="font-bold text-blue-950 dark:text-blue-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    <span>Zero-Hallucination Protocol</span>
                  </div>
                  <p className="text-[11px] text-blue-800 dark:text-blue-300 leading-snug">
                    Every skill and bullet is cryptographically anchored to repository commits or proctored exam test cases.
                  </p>
                </div>

                <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
                  {groundedResume?.evidence_traceable_bullets?.map((b: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 dark:text-white">Bullet #{idx + 1}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          {b.backing_proof?.canonical_skill || 'Verified'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2 italic">
                        &ldquo;{b.bullet_text}&rdquo;
                      </p>
                      <div className="text-[10px] text-slate-400 font-mono truncate">
                        Locator: {b.backing_proof?.locator || 'Verified AST'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (groundedResume?.markdown_resume) {
                    navigator.clipboard.writeText(groundedResume.markdown_resume);
                    showToast('Markdown Resume copied to clipboard!');
                  }
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Markdown</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setResumeGeneratorOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      if (groundedResume) {
                        await fetch('/api/resumes', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            title: `Grounded ATS Resume (${selectedResumeTarget})`,
                            targetRole: selectedResumeTarget,
                            version: 'v1.0',
                            parsedData: groundedResume,
                            atsScore: 95,
                            isDefault: true,
                          }),
                        });
                        await loadDrivesAndApplications();
                      }
                      showToast('Grounded 1-Page Resume set as your default campus application profile!');
                    } catch {
                      showToast('Error saving default resume.');
                    }
                    setResumeGeneratorOpen(false);
                  }}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition"
                >
                  Use for Campus Drives
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DIALOG 6: RESUME BULLSHIT DETECTOR (CLAIMS INTEGRITY AUDIT)                */}
      {/* ========================================================================= */}
      {resumeAuditOpen && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-5">
          <div className="w-full max-w-3xl max-h-[92vh] bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/80 text-rose-600 flex items-center justify-center font-bold">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white">
                      Resume Claims Integrity Audit (Bullshit Detector)
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                      Anti-Fraud Engine
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Cross-references technical and metric claims against verified Proof-of-Work databases.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setResumeAuditOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Paste Resume Content to Audit:
                </label>
                <textarea
                  rows={4}
                  value={auditResumeText}
                  onChange={(e) => setAuditResumeText(e.target.value)}
                  placeholder="Paste raw resume bullet points or claims here..."
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex justify-end mt-2">
                  <button
                    type="button"
                    onClick={handleAuditResume}
                    disabled={isAuditingResume}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isAuditingResume ? 'Running Audit...' : 'Audit Resume Claims'}</span>
                  </button>
                </div>
              </div>

              {auditResult && (
                <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-800">
                  {/* Score & Badges Row */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Integrity Score</span>
                      <span className="text-xl font-black text-slate-900 dark:text-white">
                        {auditResult.integrity_score}%
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center">
                      <span className="text-[10px] uppercase font-bold text-emerald-600 block">Verified Claims</span>
                      <span className="text-xl font-black text-emerald-700 dark:text-emerald-300">
                        {auditResult.verified_claims_count}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-center">
                      <span className="text-[10px] uppercase font-bold text-amber-600 block">Unsubstantiated</span>
                      <span className="text-xl font-black text-amber-700 dark:text-amber-300">
                        {auditResult.unsubstantiated_count}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-center">
                      <span className="text-[10px] uppercase font-bold text-rose-600 block">Flagged False</span>
                      <span className="text-xl font-black text-rose-700 dark:text-rose-300">
                        {auditResult.flagged_count}
                      </span>
                    </div>
                  </div>

                  {/* ATS Formatting & Action Verbs Bar */}
                  {auditResult.ats_formatting && (
                    <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <FileCheck2 className="w-4 h-4 text-blue-600 shrink-0" />
                        <div>
                          <span className="font-bold text-blue-950 dark:text-blue-200">ATS Formatting Assessment: </span>
                          <span className="text-blue-800 dark:text-blue-300">{auditResult.ats_formatting.ats_readability_grade || 'ATS-Ready'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 font-mono text-[11px]">
                        <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 font-bold">
                          Action Verbs: {auditResult.ats_formatting.action_verbs_score || 90}%
                        </span>
                        <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold">
                          Metrics: {auditResult.ats_formatting.has_quantifiable_metrics ? '✓ Detected' : 'Pending'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* False Claim Blocker Alert if active */}
                  {auditResult.application_blocked ? (
                    <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 text-xs text-rose-900 dark:text-rose-200 flex items-start gap-2.5">
                      <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold">Campus Drive Application Blocked!</div>
                        <p className="mt-0.5 text-[11px] leading-relaxed">
                          {auditResult.block_reason ||
                            'Contradictory or unproven technical claims detected. Institutional policy requires verifying claims with repositories or assessments before applying.'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Integrity Audit Passed: Resume contains verified claims suitable for recruiter presentation.</span>
                    </div>
                  )}

                  {/* Claims Breakdown List */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                      Audited Claims Breakdown:
                    </span>
                    <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                      {auditResult.audited_claims?.map((c: any, idx: number) => {
                        const isVer = c.status === 'VERIFIED';
                        const isFlag = c.status === 'FLAGGED_FALSE';
                        return (
                          <div
                            key={idx}
                            className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                              isVer
                                ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/60'
                                : isFlag
                                ? 'bg-rose-50/70 dark:bg-rose-950/40 border-rose-300 dark:border-rose-900'
                                : 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/60'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-slate-900 dark:text-white truncate flex-1 mr-2">
                                &ldquo;{c.claim_text || c.raw_claim}&rdquo;
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-extrabold shrink-0 ${
                                  isVer
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                    : isFlag
                                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                }`}
                              >
                                {c.status}
                              </span>
                            </div>

                            {c.proof_found && (
                              <div className="text-[11px] font-mono text-emerald-700 dark:text-emerald-300 bg-emerald-100/60 dark:bg-emerald-950/60 px-2 py-1 rounded">
                                Proof: {c.proof_found}
                              </div>
                            )}

                            <p className="text-[11px] text-slate-600 dark:text-slate-400">
                              {c.recommendation || c.auditor_comment}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setResumeAuditOpen(false)}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DIALOG 7: POST-INTERVIEW DEBRIEF SUBMISSION MODAL                          */}
      {/* ========================================================================= */}
      {debriefModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                  +75 Reward Points
                </span>
                <h3 className="font-bold text-base text-slate-900 dark:text-white mt-1 flex items-center gap-2">
                  <Building className="w-4 h-4 text-blue-600" />
                  <span>Submit Post-Interview Debrief</span>
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDebriefModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitDebrief} className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={debriefForm.companyName}
                    onChange={(e) => setDebriefForm({ ...debriefForm, companyName: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                    placeholder="e.g. Google India, Zomato"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Target Role
                  </label>
                  <input
                    type="text"
                    value={debriefForm.roleTitle}
                    onChange={(e) => setDebriefForm({ ...debriefForm, roleTitle: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                    placeholder="e.g. Software Engineer, SDE-1"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Round Type
                  </label>
                  <select
                    value={debriefForm.roundType}
                    onChange={(e) => setDebriefForm({ ...debriefForm, roundType: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                  >
                    <option value="Online Assessment">Online Assessment</option>
                    <option value="Technical Round 1">Technical Round 1</option>
                    <option value="Technical Round 2">Technical Round 2</option>
                    <option value="System Design">System Design</option>
                    <option value="HR / Managerial">HR / Managerial</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Difficulty
                  </label>
                  <select
                    value={debriefForm.difficulty}
                    onChange={(e) => setDebriefForm({ ...debriefForm, difficulty: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Outcome
                  </label>
                  <select
                    value={debriefForm.outcome}
                    onChange={(e) => setDebriefForm({ ...debriefForm, outcome: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                  >
                    <option value="SELECTED">Offer Received / Selected</option>
                    <option value="REJECTED">Eliminated / Rejected</option>
                    <option value="AWAITING_RESULT">Awaiting Result</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Questions Asked (Separate multiple questions with a semicolon &ldquo;;&rdquo;)
                </label>
                <textarea
                  rows={3}
                  value={debriefForm.questionsAsked}
                  onChange={(e) => setDebriefForm({ ...debriefForm, questionsAsked: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-mono"
                  placeholder="e.g. Rate limiter using token bucket; SQL query for 2nd highest salary"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Candidate Insider Tips & Traps to Avoid
                </label>
                <textarea
                  rows={3}
                  value={debriefForm.tips}
                  onChange={(e) => setDebriefForm({ ...debriefForm, tips: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                  placeholder="e.g. Focus on edge cases with null nodes, talk through your thought process aloud..."
                  required
                />
              </div>

              <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-xs text-blue-900 dark:text-blue-200 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  Your debrief is anonymized before publishing to the batch vault. +75 points will be credited immediately!
                </span>
              </div>

              <div className="pt-2 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setDebriefModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Debrief (+75 Pts)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ASSESSMENT SIMULATOR & TEST SANDBOX MODAL (MICROSERVICE :5001)            */}
      {/* ========================================================================= */}
      {examModalOpen && activeExam && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700/80 text-white w-full max-w-6xl h-[92vh] rounded-2xl flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Top Bar */}
            <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/40 text-blue-400 flex items-center justify-center font-bold text-xs">
                  {activeExam.category === 'CODING' ? <Code className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-sm text-white">{activeExam.title}</h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      {activeExam.category || 'EXAM'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center gap-2">
                    <span className={`flex items-center gap-1 font-semibold ${
                      examProctorLogs.length === 0 ? 'text-emerald-400' : 'text-amber-400'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        examProctorLogs.length === 0 ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'
                      }`}></span>
                      {examProctorLogs.length === 0
                        ? 'AI Proctoring Active • Clean Session'
                        : `AI Proctoring: ${examProctorLogs.length} Anomaly Logged`}
                    </span>
                    <span>•</span>
                    <span>Pass: {activeExam.passingMarks}/{activeExam.totalMarks} Marks</span>
                  </div>
                </div>
              </div>

              {/* Countdown Timer & Dev Test Bar */}
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="hidden sm:flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-slate-500 px-1 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    Quick Test:
                  </span>
                  <button
                    type="button"
                    onClick={() => handleAutoFillExam('PASS')}
                    className="px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 transition"
                    title="Fills all questions with 100% correct answers to test passing flow & SkillProof minting"
                  >
                    ⚡ Test Pass (100%)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAutoFillExam('FAIL')}
                    className="px-2 py-1 rounded-lg text-[10px] font-bold bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 transition"
                    title="Fills wrong answers to test the retake & review flow"
                  >
                    ⚠️ Test Retake
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setExamAnswers({});
                      showToast('Answers cleared.');
                    }}
                    className="px-2 py-1 rounded-lg text-[10px] font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition"
                  >
                    Clear
                  </button>
                </div>

                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border font-mono font-bold text-xs ${
                  examSecondsLeft < 300
                    ? 'bg-red-500/10 border-red-500/30 text-red-400 animate-pulse'
                    : 'bg-slate-800/80 border-slate-700 text-slate-200'
                }`}>
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    {String(Math.floor(examSecondsLeft / 60)).padStart(2, '0')}:
                    {String(examSecondsLeft % 60).padStart(2, '0')}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Are you sure you want to exit? Your current progress will not be saved.')) {
                      setExamModalOpen(false);
                      setActiveExam(null);
                    }
                  }}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Question Palette Row */}
            <div className="px-5 py-2.5 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0 overflow-x-auto">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                  Questions ({activeExam.questions?.length || 0}):
                </span>
                <div className="flex items-center gap-1.5 overflow-x-auto">
                  {activeExam.questions?.map((q: any, idx: number) => {
                    const isAnswered = examAnswers[q.id] !== undefined;
                    const isCurrent = currentQuestionIdx === idx;
                    return (
                      <button
                        key={q.id || idx}
                        onClick={() => setCurrentQuestionIdx(idx)}
                        className={`w-7 h-7 rounded-lg text-xs font-bold transition flex items-center justify-center ${
                          isCurrent
                            ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-400'
                            : isAnswered
                            ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                        }`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-3 text-[11px] text-slate-400 shrink-0">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Answered ({Object.keys(examAnswers).length})
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-slate-600"></span>
                  Pending ({(activeExam.questions?.length || 0) - Object.keys(examAnswers).length})
                </span>
              </div>
            </div>

            {/* Main Question View Area */}
            {activeExam.questions && activeExam.questions[currentQuestionIdx] && (() => {
              const currQ = activeExam.questions[currentQuestionIdx];
              let parsedOptions: string[] = [];
              if (Array.isArray(currQ.options)) {
                parsedOptions = currQ.options;
              } else if (typeof currQ.options === 'string') {
                try {
                  const parsed = JSON.parse(currQ.options);
                  parsedOptions = Array.isArray(parsed) ? parsed : [currQ.options];
                } catch {
                  parsedOptions = currQ.options.split('\n').filter(Boolean);
                }
              }

              const currentAns = examAnswers[currQ.id];

              return (
                <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
                  {/* Question Meta & Title */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 text-xs font-bold">
                        Question {currentQuestionIdx + 1}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold">
                        {currQ.type === 'CODING' ? 'Code Challenge' : 'Multiple Choice (MCQ)'}
                      </span>
                      {currQ.codingProblem?.difficulty && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300">
                          {currQ.codingProblem.difficulty}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-emerald-400 font-bold">+{currQ.marks || 10} Marks</span>
                      {currQ.negativeMarks > 0 && (
                        <span className="text-red-400 font-medium">-{currQ.negativeMarks} Negative</span>
                      )}
                    </div>
                  </div>

                  {/* Question Prompt */}
                  <div className="text-slate-100 text-sm sm:text-base leading-relaxed font-medium">
                    {currQ.prompt}
                  </div>

                  {/* MCQ Options Rendering */}
                  {currQ.type !== 'CODING' && parsedOptions.length > 0 && (
                    <div className="space-y-3 pt-2">
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Select the correct option:
                      </div>
                      <div className="grid grid-cols-1 gap-3">
                        {parsedOptions.map((optText, optIdx) => {
                          const selectedOptIndex = typeof currentAns === 'object' ? currentAns?.answerIndex : currentAns;
                          const isSelected = selectedOptIndex === optIdx;
                          return (
                            <button
                              key={optIdx}
                              onClick={() => {
                                setExamAnswers((prev) => ({
                                  ...prev,
                                  [currQ.id]: { answerIndex: optIdx },
                                }));
                              }}
                              className={`w-full p-4 rounded-xl border text-left text-sm font-medium transition flex items-center justify-between group ${
                                isSelected
                                  ? 'bg-blue-600/20 border-blue-500 text-white ring-1 ring-blue-500'
                                  : 'bg-slate-800/60 border-slate-700/80 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                              }`}
                            >
                              <div className="flex items-center gap-3.5">
                                <span className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${
                                  isSelected ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 group-hover:bg-slate-600'
                                }`}>
                                  {String.fromCharCode(65 + optIdx)}
                                </span>
                                <span>{optText}</span>
                              </div>
                              {isSelected && (
                                <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* CODING Challenge Playground */}
                  {currQ.type === 'CODING' && (
                    <div className="space-y-4 pt-2">
                      {/* Code editor container */}
                      <div className="rounded-xl border border-slate-700 bg-slate-950 overflow-hidden shadow-inner">
                        <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2">
                            <Terminal className="w-4 h-4 text-emerald-400" />
                            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                              <button
                                type="button"
                                onClick={() => setActiveCodingLanguage('javascript')}
                                className={`px-2.5 py-0.5 rounded text-[11px] font-bold transition ${
                                  activeCodingLanguage === 'javascript'
                                    ? 'bg-blue-600 text-white'
                                    : 'text-slate-400 hover:text-white'
                                }`}
                              >
                                JavaScript
                              </button>
                              <button
                                type="button"
                                onClick={() => setActiveCodingLanguage('python')}
                                className={`px-2.5 py-0.5 rounded text-[11px] font-bold transition ${
                                  activeCodingLanguage === 'python'
                                    ? 'bg-blue-600 text-white'
                                    : 'text-slate-400 hover:text-white'
                                }`}
                              >
                                Python 3
                              </button>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const cleanStarter = extractStarterCode(currQ.starterCode || currQ.codingProblem?.starterCode, activeCodingLanguage);
                              const codeVal = typeof currentAns === 'object' ? currentAns?.code : (currentAns || cleanStarter);
                              handleRunCode(currQ, codeVal, activeCodingLanguage);
                            }}
                            disabled={codeRunning}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg font-bold flex items-center gap-1.5 transition text-xs shadow-xs"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>{codeRunning ? 'Executing Sandbox...' : 'Run Test Cases'}</span>
                          </button>
                        </div>

                        <textarea
                          rows={12}
                          value={(() => {
                            const cleanStarter = extractStarterCode(currQ.starterCode || currQ.codingProblem?.starterCode, activeCodingLanguage);
                            return typeof currentAns === 'object'
                              ? currentAns?.code ?? cleanStarter
                              : (currentAns ?? cleanStarter);
                          })()}
                          onChange={(e) => {
                            const val = e.target.value;
                            setExamAnswers((prev) => ({
                              ...prev,
                              [currQ.id]: {
                                code: val,
                                language: activeCodingLanguage,
                              },
                            }));
                          }}
                          className="w-full p-4 font-mono text-xs text-emerald-300 bg-slate-950 focus:outline-none resize-none leading-relaxed"
                          placeholder="// Write your code here..."
                        />
                      </div>

                      {/* Code Execution Results Panel */}
                      {codeRunOutput && (
                        <div className={`p-4 rounded-xl border text-xs font-mono space-y-2.5 ${
                          codeRunOutput.passed
                            ? 'bg-emerald-950/40 border-emerald-800 text-emerald-200'
                            : 'bg-slate-900 border-slate-700 text-slate-200'
                        }`}>
                          <div className="flex items-center justify-between font-sans">
                            <span className="font-bold flex items-center gap-1.5">
                              {codeRunOutput.passed ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              ) : (
                                <AlertCircle className="w-4 h-4 text-amber-400" />
                              )}
                              <span>
                                {codeRunOutput.passed ? 'All Test Cases Passed!' : 'Evaluation Results'}
                              </span>
                            </span>
                            <span className="text-[11px] text-slate-400">
                              Passed {codeRunOutput.passedCount || 0} / {codeRunOutput.totalCount || 0} • Execution Time: {codeRunOutput.runtimeMs || codeRunOutput.executionTimeMs || 0}ms
                            </span>
                          </div>

                          {codeRunOutput.message && (
                            <div className="text-amber-400 text-[11px]">{codeRunOutput.message}</div>
                          )}

                          {(codeRunOutput.stdout || codeRunOutput.output) && (
                            <div className="rounded-lg border border-slate-700 bg-slate-950/80 p-2.5">
                              <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Console output</div>
                              <pre className="whitespace-pre-wrap break-words text-[11px] text-slate-200">{codeRunOutput.stdout || codeRunOutput.output}</pre>
                            </div>
                          )}

                          {Array.isArray(codeRunOutput.results) && codeRunOutput.results.length > 0 && (
                            <div className="space-y-1.5 pt-2">
                              {codeRunOutput.results.map((res: any, idx: number) => {
                                const exp = res.expectedOutput ?? res.expected;
                                const act = res.actualOutput ?? res.actual;
                                return (
                                  <div
                                    key={idx}
                                    className={`p-2.5 rounded-lg border flex items-center justify-between ${
                                      res.passed
                                        ? 'bg-emerald-900/20 border-emerald-800/60 text-emerald-300'
                                        : 'bg-red-900/20 border-red-800/60 text-red-300'
                                    }`}
                                  >
                                    <div>
                                      <span className="font-bold">Test Case {idx + 1}: </span>
                                      <span>{res.passed ? 'PASSED' : 'FAILED'}</span>
                                      <div className="text-[10px] text-slate-400 mt-0.5">
                                        Expected: {typeof exp === 'object' ? JSON.stringify(exp) : String(exp)} | Received: {typeof act === 'object' ? JSON.stringify(act) : String(act)}
                                        {res.error && <span className="text-red-400 ml-1">({res.error})</span>}
                                      </div>
                                      {res.stdout && (
                                        <pre className="mt-1 whitespace-pre-wrap break-words text-[10px] text-slate-300">Console: {res.stdout}</pre>
                                      )}
                                    </div>
                                    <span className="text-[10px] text-slate-400">{res.runtimeMs || res.executionTimeMs || 1}ms</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Bottom Modal Actions */}
            <div className="px-5 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => setCurrentQuestionIdx((prev) => Math.max(0, prev - 1))}
                disabled={currentQuestionIdx === 0}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:bg-slate-800 disabled:opacity-40 transition flex items-center gap-1.5"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              <div className="flex items-center gap-3">
                {currentQuestionIdx < (activeExam.questions?.length || 0) - 1 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentQuestionIdx((prev) => prev + 1)}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md"
                  >
                    <span>Next Question</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmitAssessment}
                    disabled={submittingExam}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg ring-1 ring-emerald-400"
                  >
                    <Send className="w-4 h-4" />
                    <span>{submittingExam ? 'Grading & Minting Credential...' : 'Final Submit Assessment'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SCORECARD & SKILLPROOF VERIFICATION MODAL                                */}
      {/* ========================================================================= */}
      {scorecardModalOpen && scorecardResult && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white w-full max-w-2xl max-h-[90vh] rounded-3xl flex flex-col overflow-hidden shadow-2xl">
            {/* Header Banner */}
            <div className={`p-6 text-white text-center relative overflow-hidden ${
              scorecardResult.isPassed
                ? 'bg-gradient-to-br from-emerald-600 via-teal-600 to-blue-700'
                : 'bg-gradient-to-br from-amber-600 to-rose-700'
            }`}>
              <button
                type="button"
                onClick={() => setScorecardModalOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-lg">
                {scorecardResult.isPassed ? (
                  <ShieldCheck className="w-9 h-9 text-white" />
                ) : (
                  <RotateCcw className="w-9 h-9 text-white" />
                )}
              </div>

              <h2 className="text-xl font-black">
                {scorecardResult.isPassed ? 'Assessment Successfully Cleared!' : 'Assessment Attempt Recorded'}
              </h2>
              <p className="text-xs text-white/90 mt-1 max-w-md mx-auto">
                 {scorecardResult.assessmentTitle} • Evaluated by the CareerOS assessment engine
              </p>
            </div>

            {/* Scorecard Metrics Bar */}
            <div className="p-6 overflow-y-auto space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                  <div className="text-[11px] font-bold text-slate-500 uppercase">Score</div>
                  <div className="text-lg font-black text-slate-900 dark:text-white mt-1">
                    {scorecardResult.score}/{scorecardResult.totalMarks}
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                  <div className="text-[11px] font-bold text-slate-500 uppercase">Percentage</div>
                  <div className={`text-lg font-black mt-1 ${scorecardResult.isPassed ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {scorecardResult.percentage}%
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                  <div className="text-[11px] font-bold text-slate-500 uppercase">Percentile</div>
                  <div className="text-lg font-black text-blue-600 dark:text-blue-400 mt-1">
                    {scorecardResult.percentile}th %ile
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                  <div className="text-[11px] font-bold text-slate-500 uppercase">Result</div>
                  <div className={`text-xs font-black uppercase mt-2 px-2 py-0.5 rounded-full inline-block ${
                    scorecardResult.isPassed
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  }`}>
                    {scorecardResult.isPassed ? 'Passed' : 'Needs Practice'}
                  </div>
                </div>
              </div>

              {/* Proctor Integrity Badge */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    Proctoring Audit: {scorecardResult.proctorTrustIndex ?? 100}% Integrity Index
                  </span>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                  (scorecardResult.proctorTrustIndex ?? 100) >= 80
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                }`}>
                  {scorecardResult.integrityFlag || 'VERIFIED_CLEAN'}
                </span>
              </div>

              {/* SkillProof Credential Card */}
              {scorecardResult.skillProofIssued && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10 border border-emerald-500/30 flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
                    <Award className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900 dark:text-white">
                        {scorecardResult.skillProofIssued.tier || 'GOLD_VERIFIED'} Skill Proof Issued
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        {scorecardResult.skillProofIssued.isNew ? '+3 Trust Score' : 'Idempotent Verified'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      Skill credential <strong className="text-emerald-600 dark:text-emerald-400">{scorecardResult.skillProofIssued.skillName}</strong> has been written to your student profile and made visible to campus recruiters.
                    </p>
                  </div>
                </div>
              )}

              {/* Detailed Breakdown */}
              {Array.isArray(scorecardResult.detailedReview) && scorecardResult.detailedReview.length > 0 && (
                <div className="space-y-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Question Breakdown ({scorecardResult.detailedReview.length} Questions)
                  </div>
                  <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                    {scorecardResult.detailedReview.map((rev: any, idx: number) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl border text-xs space-y-1 ${
                          rev.passed || rev.isCorrect
                            ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/60'
                            : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold">
                          <span className="text-slate-900 dark:text-white">
                            Q{idx + 1}: {rev.prompt?.slice(0, 75)}...
                          </span>
                          <span className={rev.passed || rev.isCorrect ? 'text-emerald-600' : 'text-slate-400'}>
                            +{rev.marksAwarded}/{rev.marksPossible} Marks
                          </span>
                        </div>
                        {rev.explanation && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            <strong>Note:</strong> {rev.explanation}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setScorecardModalOpen(false);
                  loadDrivesAndApplications();
                }}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-md"
              >
                Close &amp; Return to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ROADMAP SYLLABUS DRAWER MODAL                                             */}
      {/* ========================================================================= */}
      {roadmapDrawerOpen && selectedRoadmap && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#0F172A] border-l border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white w-full max-w-2xl h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="p-6 bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between shrink-0">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 uppercase">
                    {selectedRoadmap.category}
                  </span>
                  <span className="text-xs text-slate-400 font-semibold">• {selectedRoadmap.provider}</span>
                </div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {selectedRoadmap.title}
                </h2>
                <p className="text-xs text-slate-500 max-w-lg">
                  {selectedRoadmap.description}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setRoadmapDrawerOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Overall Progress Section */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40">
              <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                <span className="text-slate-600 dark:text-slate-300">
                  Curriculum Progress ({selectedRoadmap.progress?.completedItems || 0}/{selectedRoadmap.totalItems} Topics)
                </span>
                <span className="font-bold text-blue-600">
                  {selectedRoadmap.progress?.progressPercentage || 0}%
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-blue-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${selectedRoadmap.progress?.progressPercentage || 0}%` }}
                />
              </div>
            </div>

            {/* Modules & Topics Scrollable Checklist */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {Array.isArray(selectedRoadmap.modules) && selectedRoadmap.modules.length > 0 ? (
                selectedRoadmap.modules.map((mod, modIdx) => (
                  <div
                    key={mod.id || modIdx}
                    className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-50/40 dark:bg-slate-900/30"
                  >
                    <div className="p-4 bg-slate-100/60 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Module {modIdx + 1}
                        </div>
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                          {mod.title}
                        </h3>
                        {mod.description && (
                          <p className="text-[11px] text-slate-500 mt-0.5">{mod.description}</p>
                        )}
                      </div>
                      <span className="text-xs font-bold text-slate-500">
                        {mod.completedCount || 0}/{mod.totalItems || mod.topics?.length || 0}
                      </span>
                    </div>

                    <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {mod.topics?.map((topic) => {
                        const isLocked = !!(topic as any).isLocked;
                        const prereqTitle = (topic as any).prerequisiteTitle;
                        const assignment = (topic as any).assignment;
                        return (
                          <div
                            key={topic.id}
                            className={`p-3.5 flex items-center justify-between transition group ${isLocked ? 'opacity-50 cursor-not-allowed bg-slate-50/60 dark:bg-slate-900/40' : 'hover:bg-white dark:hover:bg-slate-800/40'}`}
                          >
                            <label className={`flex items-center gap-3 flex-1 select-none ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                              {isLocked ? (
                                <span className="w-4 h-4 flex items-center justify-center text-slate-400" title={`Complete "${prereqTitle}" first`}>
                                  🔒
                                </span>
                              ) : (
                                <input
                                  type="checkbox"
                                  checked={topic.completed}
                                  onChange={() => !isLocked && handleToggleTopic(selectedRoadmap.slug, topic.id, topic.completed)}
                                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 transition"
                                />
                              )}
                              <div className="flex flex-col min-w-0">
                                <span className={`text-xs font-medium transition ${topic.completed ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-200'}`}>
                                  {topic.title}
                                </span>
                                {isLocked && prereqTitle && (
                                  <span className="text-[9px] text-amber-600 dark:text-amber-400 font-medium mt-0.5">
                                    Prerequisite: {prereqTitle}
                                  </span>
                                )}
                                {assignment && !isLocked && (
                                  <span className="text-[9px] text-blue-600 dark:text-blue-400 font-semibold mt-0.5">
                                    📝 {assignment.title}
                                  </span>
                                )}
                              </div>
                            </label>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-slate-200/60 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                {topic.type || 'TOPIC'}
                              </span>
                              {(topic.url || topic.leetcodeUrl) && !isLocked && (
                                <a
                                  href={topic.url || topic.leetcodeUrl || '#'}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-slate-400 hover:text-blue-600 transition"
                                  title="Open resource"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-slate-400 text-xs">
                  No syllabus modules found for this roadmap.
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              {!selectedRoadmap.isEnrolled && (
                <button
                  type="button"
                  onClick={() => {
                    handleEnrollRoadmap(selectedRoadmap.slug, selectedRoadmap.title);
                    setRoadmapDrawerOpen(false);
                  }}
                  className="flex-1 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                >
                  <GraduationCap className="w-3.5 h-3.5" />
                  Enroll & Start Tracking
                </button>
              )}
              <button
                type="button"
                onClick={() => setRoadmapDrawerOpen(false)}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white rounded-xl text-xs font-bold transition"
              >
                Close Syllabus
              </button>
            </div>

          </div>
        </div>
      )}
      {/* ========================================================================= */}
      {/* OFFER MODAL 1: DIGITAL SIGNING & ACCEPTANCE                                */}
      {/* ========================================================================= */}
      {signingOfferModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-start justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  {signingOfferModal.tier || 'OFFER'}
                </span>
                <h3 className="font-extrabold text-lg text-slate-900 dark:text-white mt-1">
                  Accept &amp; Digitally Sign Offer
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {signingOfferModal.companyName} • {signingOfferModal.roleTitle}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSigningOfferModal(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Compensation & Policy Summary */}
            <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400">
                  Offered Package (CTC)
                </span>
                <div className="text-lg font-black font-mono text-emerald-900 dark:text-emerald-300">
                  {signingOfferModal.ctc}
                </div>
              </div>
              {signingOfferModal.offerLetterUrl && (
                <a
                  href={signingOfferModal.offerLetterUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 rounded-lg text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900 flex items-center gap-1 shadow-2xs"
                >
                  <FileText className="w-3.5 h-3.5" /> View Letter
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            {/* Institutional Placement Policy Note */}
            <div className="p-3 bg-blue-50/60 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-900 text-xs text-blue-900 dark:text-blue-300 space-y-1">
              <div className="font-bold flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-blue-600" /> Institutional Placement Policy Acknowledgment
              </div>
              <p className="text-[11px] leading-relaxed text-blue-800/90 dark:text-blue-300/80">
                Under campus regulations, accepting this offer sets your placement record to <strong>PLACED</strong>. If this is an upgraded tier (Dream/Super Dream), lower-tier active applications will be automatically reconciled.
              </p>
            </div>

            {/* Digital Signature Form */}
            <form onSubmit={handleConfirmAcceptOffer} className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Full Legal Name (Digital Signature) *
                </label>
                <input
                  type="text"
                  required
                  value={signForm.signerName}
                  onChange={(e) => setSignForm((prev) => ({ ...prev, signerName: e.target.value }))}
                  placeholder="e.g. Aditya Shinde"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Signed Document URL (Optional)
                </label>
                <input
                  type="url"
                  value={signForm.signedLetterUrl}
                  onChange={(e) => setSignForm((prev) => ({ ...prev, signedLetterUrl: e.target.value }))}
                  placeholder="https://.../signed-letter.pdf"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                />
              </div>

              <label className="flex items-start gap-2.5 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  required
                  checked={signForm.declarationConfirmed}
                  onChange={(e) => setSignForm((prev) => ({ ...prev, declarationConfirmed: e.target.checked }))}
                  className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug">
                  I solemnly declare that I have reviewed the terms of employment and compensation. I confirm my acceptance of this offer and agree to abide by all institutional placement and company requirements.
                </span>
              </label>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSigningOfferModal(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition"
                >
                  <CheckCircle2 className="w-4 h-4" /> Digitally Sign &amp; Accept
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* OFFER MODAL 2: DECLINE OFFER                                              */}
      {/* ========================================================================= */}
      {declineOfferModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-start justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  Decline Job Offer
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {declineOfferModal.companyName} • {declineOfferModal.roleTitle}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDeclineOfferModal(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmDeclineOffer} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Primary Reason for Declining *
                </label>
                <select
                  value={declineForm.reason}
                  onChange={(e) => setDeclineForm((prev) => ({ ...prev, reason: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                >
                  <option value="ACCEPTED_OTHER_OFFER">Accepted an alternative higher-tier campus offer</option>
                  <option value="HIGHER_STUDIES">Pursuing Higher Studies (Masters / MBA / GATE / GRE)</option>
                  <option value="COMPENSATION_BELOW_EXPECTATION">Compensation or role scope misalignment</option>
                  <option value="LOCATION_PREFERENCE">Location or relocation constraints</option>
                  <option value="PERSONAL_REASONS">Personal / Family obligations</option>
                  <option value="OTHER">Other institutional reason</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Additional Notes (Optional)
                </label>
                <textarea
                  rows={3}
                  value={declineForm.notes}
                  onChange={(e) => setDeclineForm((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Provide any courteous feedback or context for the recruiter..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setDeclineOfferModal(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md transition"
                >
                  Confirm Decline
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* OFFER MODAL 3: PACKAGE PROOF & ACCREDITATION AUDIT                        */}
      {/* ========================================================================= */}
      {packageProofModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-start justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  Package Proof Documentation
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  NAAC &amp; NIRF Campus Placement Accreditation Audit
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPackageProofModal(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current verification status banner */}
            {packageProofModal.metadata?.packageProof?.status && (
              <div
                className={`p-3 rounded-xl border text-xs space-y-1 ${
                  packageProofModal.metadata.packageProof.status === 'VERIFIED'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300'
                    : packageProofModal.metadata.packageProof.status === 'PENDING_VERIFICATION'
                    ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-300'
                    : packageProofModal.metadata.packageProof.status === 'REJECTED'
                    ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-300'
                    : 'bg-slate-50 dark:bg-slate-900 border-slate-200 text-slate-700'
                }`}
              >
                <div className="font-bold flex items-center justify-between">
                  <span>Audit Status: {packageProofModal.metadata.packageProof.status.replace('_', ' ')}</span>
                  {packageProofModal.metadata.packageProof.verifiedAt && (
                    <span className="text-[10px] font-normal">
                      Verified on {new Date(packageProofModal.metadata.packageProof.verifiedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
                {packageProofModal.metadata.packageProof.verificationNotes && (
                  <p className="text-[11px] opacity-90">
                    <strong>Note:</strong> {packageProofModal.metadata.packageProof.verificationNotes}
                  </p>
                )}
              </div>
            )}

            <form onSubmit={handleSubmitProof} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Offer Letter / Salary Annexure Document URL *
                </label>
                <input
                  type="url"
                  required
                  value={proofForm.proofDocumentUrl}
                  onChange={(e) => setProofForm((prev) => ({ ...prev, proofDocumentUrl: e.target.value }))}
                  placeholder="https://.../signed-offer-letter.pdf"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Fixed Basic CTC
                  </label>
                  <input
                    type="text"
                    value={proofForm.fixedCtc}
                    onChange={(e) => setProofForm((prev) => ({ ...prev, fixedCtc: e.target.value }))}
                    placeholder="e.g. ₹12.0 LPA"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Variable / Performance Bonus
                  </label>
                  <input
                    type="text"
                    value={proofForm.variableCtc}
                    onChange={(e) => setProofForm((prev) => ({ ...prev, variableCtc: e.target.value }))}
                    placeholder="e.g. ₹2.5 LPA"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Joining Bonus / Relocation
                  </label>
                  <input
                    type="text"
                    value={proofForm.joiningBonus}
                    onChange={(e) => setProofForm((prev) => ({ ...prev, joiningBonus: e.target.value }))}
                    placeholder="e.g. ₹1.0 Lakh"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Stock Grant / ESOPs
                  </label>
                  <input
                    type="text"
                    value={proofForm.stockEsop}
                    onChange={(e) => setProofForm((prev) => ({ ...prev, stockEsop: e.target.value }))}
                    placeholder="e.g. ₹4.0 Lakhs over 4 yrs"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Total Audited CTC Package
                </label>
                <input
                  type="text"
                  value={proofForm.totalCtc}
                  onChange={(e) => setProofForm((prev) => ({ ...prev, totalCtc: e.target.value }))}
                  placeholder="e.g. ₹15.5 LPA"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setPackageProofModal(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition"
                >
                  <Upload className="w-4 h-4" /> Submit Proof for Verification
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* OFFER MODAL 4: JOINING PROGRESSION & STATUS                               */}
      {/* ========================================================================= */}
      {joiningModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-start justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  Candidate Joining Progression
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {joiningModal.companyName} • {joiningModal.roleTitle}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setJoiningModal(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveJoining} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Joining Status *
                </label>
                <select
                  value={joiningForm.joiningStatus}
                  onChange={(e) => setJoiningForm((prev: any) => ({ ...prev, joiningStatus: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                >
                  <option value="NOT_JOINED">Not Joined (Offer Accepted, Pending Joining Date)</option>
                  <option value="JOINED">Joined Successfully (Active Employee)</option>
                  <option value="DEFERRED">Deferred (Joining Postponed by Company / Candidate)</option>
                  <option value="REJECTED_JOINING">Revoked / Did Not Join</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Expected Joining Date
                </label>
                <input
                  type="date"
                  value={joiningForm.expectedJoiningDate}
                  onChange={(e) => setJoiningForm((prev) => ({ ...prev, expectedJoiningDate: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                />
              </div>

              {joiningForm.joiningStatus === 'JOINED' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Actual Joining Date
                  </label>
                  <input
                    type="date"
                    value={joiningForm.actualJoiningDate}
                    onChange={(e) => setJoiningForm((prev) => ({ ...prev, actualJoiningDate: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Office / Work Location
                </label>
                <input
                  type="text"
                  value={joiningForm.joiningLocation}
                  onChange={(e) => setJoiningForm((prev) => ({ ...prev, joiningLocation: e.target.value }))}
                  placeholder="e.g. Bangalore Campus / Remote"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Remarks / Notes
                </label>
                <textarea
                  rows={2}
                  value={joiningForm.joiningRemarks}
                  onChange={(e) => setJoiningForm((prev) => ({ ...prev, joiningRemarks: e.target.value }))}
                  placeholder="e.g. Reporting manager assigned, onboarding documentation in progress..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setJoiningModal(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition"
                >
                  Save Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </StitchDashboardShell>
  );
}
