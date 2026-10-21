'use client';

import React, { useState } from 'react';
import StitchDashboardShell from '@/components/layout/StitchDashboardShell';
import { useRole } from '@/context/RoleContext';
import {
  Plus,
  CheckCircle2,
  AlertCircle,
  Download,
  X,
  Shield,
  Award,
  ExternalLink,
  Sparkles,
  FileCheck2,
  FileText,
  FileSpreadsheet,
  Copy,
  BookOpen,
  Layers,
  ChevronDown,
  ChevronUp,
  Check,
  Briefcase,
  ShieldAlert,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import CurriculumCreatorStudio from '@/components/curriculum/CurriculumCreatorStudio';
import FakeJobDetectorWidget from '@/components/common/FakeJobDetectorWidget';
import { analyzeJobPostWithHeuristics } from '@/lib/fakeJobDetector';

export type TpoTab =
  | 'overview'
  | 'drives'
  | 'submissions'
  | 'batch-ranker'
  | 'fraud-detector'
  | 'offers'
  | 'reports'
  | 'curriculum';

interface DriveItem {
  id: string;
  company: string;
  role: string;
  category: 'SUPER_DREAM' | 'DREAM' | 'CORE';
  ctc: string;
  cgpaCutoff: number;
  applicants: number;
  status: 'LIVE' | 'SHORTLISTING' | 'PENDING_APPROVAL' | 'COMPLETED' | 'ARCHIVED';
  date: string;
}

interface SubmittedLink {
  id: string;
  studentName: string;
  studentEmail: string;
  company: string;
  role: string;
  url: string;
  ctc: string;
  submittedAt: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rewardPoints: number;
}

// ============================================================================
// FALLBACK SEED DATA (Prevents dashboard from looking empty if DB returns [])
// ============================================================================
const FALLBACK_DRIVES: DriveItem[] = [
  {
    id: 'drv-1',
    company: 'Google India',
    role: 'Software Engineer (University Grad)',
    category: 'SUPER_DREAM',
    ctc: '₹32.5 LPA',
    cgpaCutoff: 8.0,
    applicants: 142,
    status: 'LIVE',
    date: 'Oct 24, 2026',
  },
  {
    id: 'drv-2',
    company: 'Zomato Limited',
    role: 'Associate Product Engineer (SDE-1)',
    category: 'DREAM',
    ctc: '₹18.0 LPA',
    cgpaCutoff: 7.5,
    applicants: 198,
    status: 'SHORTLISTING',
    date: 'Oct 28, 2026',
  },
  {
    id: 'drv-3',
    company: 'NVIDIA Graphics',
    role: 'System Software Engineer',
    category: 'SUPER_DREAM',
    ctc: '₹28.0 LPA',
    cgpaCutoff: 8.0,
    applicants: 89,
    status: 'PENDING_APPROVAL',
    date: 'Nov 04, 2026',
  },
  {
    id: 'drv-4',
    company: 'TCS Digital & Prime',
    role: 'Prime Full Stack Engineer',
    category: 'CORE',
    ctc: '₹9.0 LPA',
    cgpaCutoff: 7.0,
    applicants: 312,
    status: 'LIVE',
    date: 'Nov 10, 2026',
  },
];

const FALLBACK_SUBMISSIONS: SubmittedLink[] = [
  {
    id: 'sub-1',
    studentName: 'Aditya Shinde',
    studentEmail: 'aditya.shinde@student.gcoen.ac.in',
    company: 'Atlassian India',
    role: 'Associate Software Developer (2027 Batch)',
    url: 'https://www.atlassian.com/company/careers/graduates',
    ctc: '₹26.0 LPA',
    submittedAt: 'Oct 15',
    status: 'PENDING',
    rewardPoints: 50,
  },
  {
    id: 'sub-2',
    studentName: 'Priya Kulkarni',
    studentEmail: 'priya.k@student.gcoen.ac.in',
    company: 'Razorpay',
    role: 'Product Engineering Intern + PPO',
    url: 'https://razorpay.com/jobs/',
    ctc: '₹22.0 LPA',
    submittedAt: 'Oct 12',
    status: 'APPROVED',
    rewardPoints: 50,
  },
];

const FALLBACK_OFFERS: any[] = [
  {
    id: 'off-1',
    student: { name: 'Aditya Shinde', rollNo: 'CS26014', department: 'Computer Engg' },
    companyName: 'Google India',
    roleTitle: 'Software Engineer',
    ctc: '₹32.5 LPA',
    tier: 'SUPER_DREAM',
    status: 'ACCEPTED',
    metadata: {
      packageProof: {
        status: 'VERIFIED',
        fixedCtc: '₹22.0 LPA',
        variableCtc: '₹5.5 LPA',
        joiningBonus: '₹5.0 LPA',
        proofDocumentUrl: 'https://careers.google.com',
        verificationNotes: 'Verified against official Google University Talent Offer Letter.',
      },
      joiningDetails: { joiningStatus: 'CONFIRMED_JULY_2027' },
    },
  },
  {
    id: 'off-2',
    student: { name: 'Priya Kulkarni', rollNo: 'CS26042', department: 'Computer Engg' },
    companyName: 'Zomato Limited',
    roleTitle: 'Associate Product Engineer',
    ctc: '₹18.0 LPA',
    tier: 'DREAM',
    status: 'ACCEPTED',
    metadata: {
      packageProof: {
        status: 'PENDING_VERIFICATION',
        fixedCtc: '₹15.0 LPA',
        variableCtc: '₹2.0 LPA',
        joiningBonus: '₹1.0 LPA',
        proofDocumentUrl: 'https://www.zomato.com/careers',
      },
      joiningDetails: { joiningStatus: 'AWAITING_ONBOARDING' },
    },
  },
];

// ============================================================================
// BIDIRECTIONAL SIDEBAR <-> TAB MAPPER (Fixes Sidebar Routing Bug)
// ============================================================================
const TAB_TO_SIDEBAR_PATH: Record<TpoTab, string> = {
  overview: 'dashboard',
  drives: 'drives-queue',
  submissions: 'contributions-review',
  'batch-ranker': 'batch-ranker',
  'fraud-detector': 'fraud-detector',
  offers: 'offers-audit',
  reports: 'nirf-reports',
  curriculum: 'curriculum',
};

function resolveSidebarPathToTab(path: string): TpoTab {
  const normalized = (path || '').toLowerCase().trim();
  if (normalized === 'dashboard' || normalized === 'overview' || normalized === '/tpo') {
    return 'overview';
  }
  if (normalized.includes('drive')) return 'drives';
  if (normalized.includes('fraud') || normalized.includes('fake') || normalized.includes('scam')) {
    return 'fraud-detector';
  }
  if (normalized.includes('contribution') || normalized.includes('submission') || normalized.includes('referral')) {
    return 'submissions';
  }
  if (normalized.includes('rank') || normalized.includes('batch') || normalized.includes('ai')) {
    return 'batch-ranker';
  }
  if (normalized.includes('offer') || normalized.includes('proof') || normalized.includes('audit')) {
    return 'offers';
  }
  if (normalized.includes('nirf') || normalized.includes('naac') || normalized.includes('report')) {
    return 'reports';
  }
  if (normalized.includes('curriculum') || normalized.includes('assessment') || normalized.includes('roadmap') || normalized.includes('learning')) {
    return 'curriculum';
  }
  return 'overview';
}

export default function TpoDashboardPage() {
  const { showToast } = useRole();
  const [activeTab, setActiveTab] = useState<TpoTab>('overview');
  const [drives, setDrives] = useState<DriveItem[]>(FALLBACK_DRIVES);
  const [submittedLinks, setSubmittedLinks] = useState<SubmittedLink[]>(FALLBACK_SUBMISSIONS);
  const [tpoOffers, setTpoOffers] = useState<any[]>(FALLBACK_OFFERS);
  const [selectedOfferForAudit, setSelectedOfferForAudit] = useState<any | null>(null);
  const [auditNotes, setAuditNotes] = useState('');
  const [cohort, setCohort] = useState('AY 2026-27 (Phase 1)');
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);

  const [placementStats, setPlacementStats] = useState<any | null>(null);

  // Hydrate live drives from Neon PostgreSQL (keep fallback if empty)
  const loadLiveDrives = React.useCallback(async () => {
    try {
      const res = await fetch('/api/drives');
      const data = await res.json();
      if (data.success && Array.isArray(data.drives) && data.drives.length > 0) {
        const mapped: DriveItem[] = data.drives.map((d: any) => ({
          id: d.id,
          company: d.companyName,
          role: d.roleTitle,
          category: (d.ctcAmount >= 20 ? 'SUPER_DREAM' : d.ctcAmount >= 10 ? 'DREAM' : 'CORE') as any,
          ctc: d.ctc || (d.ctcAmount ? `₹${d.ctcAmount} LPA` : '₹12.0 LPA'),
          cgpaCutoff: d.minCgpa || 7.0,
          applicants: d.applicantCount ?? (Array.isArray(d.applicants) ? d.applicants.length : Array.isArray(d.applications) ? d.applications.length : 0),
          status: d.status === 'ACTIVE' ? 'LIVE' : (d.status as any),
          date: new Date(d.deadline).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }),
        }));
        setDrives(mapped);
      }
    } catch (err) {
      console.warn('Using fallback drives in TPO console:', err);
    }
  }, []);

  const loadPlacementStats = React.useCallback(async () => {
    try {
      const res = await fetch('/api/reports/placement');
      const data = await res.json();
      if (data.success && data.stats) {
        setPlacementStats(data.stats);
      }
    } catch (err) {
      console.warn('Could not load placement stats:', err);
    }
  }, []);

  const loadSubmissions = React.useCallback(async () => {
    try {
      const res = await fetch('/api/referrals');
      const data = await res.json();
      if (data.success && Array.isArray(data.postings) && data.postings.length > 0) {
        const mapped: SubmittedLink[] = data.postings.map((p: any) => ({
          id: p.id,
          studentName: p.postedBy || 'Student Contributor',
          studentEmail: p.postedByEmail || 'student@gcoen.ac.in',
          company: p.company,
          role: p.role,
          url: p.url,
          ctc: p.ctc,
          submittedAt: new Date(p.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          }),
          status: p.status === 'APPROVED' ? 'APPROVED' : p.status === 'REJECTED' ? 'REJECTED' : 'PENDING',
          rewardPoints: p.rewardPoints || 50,
        }));
        setSubmittedLinks(mapped);
      }
    } catch (err) {
      console.warn('Using fallback submissions in TPO console:', err);
    }
  }, []);

  const loadTpoOffers = React.useCallback(async () => {
    try {
      const res = await fetch('/api/offers');
      const data = await res.json();
      if (data.success && Array.isArray(data.offers) && data.offers.length > 0) {
        setTpoOffers(data.offers);
      }
    } catch (err) {
      console.warn('Using fallback offers in TPO console:', err);
    }
  }, []);

  const handleAuditProof = async (offerId: string, status: 'VERIFIED' | 'REJECTED') => {
    try {
      const res = await fetch(`/api/offers/${offerId}/package-proof`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, verificationNotes: auditNotes }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Package proof marked as ${status} for accreditation audit!`);
        loadTpoOffers();
      } else {
        // Optimistic update for fallback state
        setTpoOffers((prev) =>
          prev.map((o) =>
            o.id === offerId
              ? {
                  ...o,
                  metadata: {
                    ...o.metadata,
                    packageProof: { ...o.metadata?.packageProof, status, verificationNotes: auditNotes },
                  },
                }
              : o
          )
        );
        showToast(`Package proof marked as ${status}!`);
      }
    } catch {
      setTpoOffers((prev) =>
        prev.map((o) =>
          o.id === offerId
            ? {
                ...o,
                metadata: {
                  ...o.metadata,
                  packageProof: { ...o.metadata?.packageProof, status, verificationNotes: auditNotes },
                },
              }
            : o
        )
      );
      showToast(`Package proof updated locally to ${status}.`);
    } finally {
      setSelectedOfferForAudit(null);
      setAuditNotes('');
    }
  };

  React.useEffect(() => {
    loadLiveDrives();
    loadSubmissions();
    loadTpoOffers();
    loadPlacementStats();
  }, [loadLiveDrives, loadSubmissions, loadTpoOffers, loadPlacementStats]);

  // 1-Click JD Generator State
  const [generatedJd, setGeneratedJd] = useState<any | null>({
    companyName: 'Zomato Limited',
    roleTitle: 'Associate Product Engineer',
    ctc: '₹18.0 LPA',
    location: 'Bengaluru / Gurugram / Hybrid',
    overview: 'At Zomato Limited, we are engineering mission-critical digital food delivery and quick-commerce infrastructure handling millions of daily orders. As an Associate Product Engineer, you will architect resilient backend microservices, build real-time dispatch systems, and deliver sub-100ms latency experiences.',
    responsibilities: [
      'Architect, develop, and maintain high-throughput backend services using Node.js and Redis.',
      'Design clean REST and gRPC API contracts for cross-functional consumer and merchant clients.',
      'Collaborate with system architects to design resilient data models using PostgreSQL.',
      'Troubleshoot live production bottlenecks, write unit/integration tests, and ensure 99.99% system availability.',
      'Participate in daily agile sprints and production peer code reviews.',
    ],
    requiredSkills: ['Node.js', 'React', 'PostgreSQL', 'Redis', 'REST APIs'],
    preferredSkills: ['Docker', 'Microservices', 'High Concurrency Architecture', 'Kafka'],
    eligibility: {
      minCgpa: 7.5,
      maxBacklogs: 0,
      eligibleBranches: ['Computer Engineering', 'Information Technology'],
      batch: '2026 Batch',
    },
    selectionRounds: [
      { roundNumber: 1, name: 'Round 1: Proctored Online Assessment', duration: '90 mins', description: 'Two algorithmic coding questions + Core CS fundamentals (OS, Networks, DBMS).' },
      { roundNumber: 2, name: 'Round 2: Technical Problem Solving & DSA', duration: '45 mins', description: 'Live coding and complexity analysis with Senior Engineers.' },
      { roundNumber: 3, name: 'Round 3: System Design & Framework Architecture', duration: '45 mins', description: 'Designing high-throughput API endpoints, caching strategies, and database indexing.' },
      { roundNumber: 4, name: 'Round 4: Culture & Leadership Fit', duration: '30 mins', description: 'Discussion on past engineering projects, problem solving approach, and cultural fit.' },
    ],
    perksAndBenefits: [
      'Competitive ₹18.0 LPA package with annual performance appraisals',
      'Comprehensive Medical & Accidental Insurance coverage for employee and dependents',
      'Generous relocation allowance and hybrid working flexibility',
    ],
    formattedText: `Role: Associate Product Engineer at Zomato (₹18.0 LPA)\nRequired Skills: Node.js, React, PostgreSQL, Redis, REST APIs\nPreferred Skills: Docker, Microservices, High Concurrency Architecture\nMinimum CGPA: 7.5, 0 active backlogs. Branches: Computer Engineering, IT`,
    formattedMarkdown: `# Zomato Limited - Campus Recruitment Drive 2026\n**Role:** Associate Product Engineer\n**Package:** ₹18.0 LPA\n**Location:** Bengaluru / Gurugram / Hybrid\n\n### Role Overview\nAt Zomato Limited, we are engineering mission-critical digital food delivery infrastructure handling millions of daily orders.\n\n### Required Skills\n- Node.js, React, PostgreSQL, Redis, REST APIs\n\n### Selection Process\n1. Online Assessment (90 mins)\n2. Technical Round 1 (45 mins)\n3. System Design (45 mins)\n4. Culture & Leadership (30 mins)`,
  });
  const [isGeneratingJd, setIsGeneratingJd] = useState(false);
  const [quickCompany, setQuickCompany] = useState('Zomato Limited');
  const [quickRole, setQuickRole] = useState('Associate Product Engineer');
  const [quickCtc, setQuickCtc] = useState('₹18.0 LPA');
  const [quickSkills, setQuickSkills] = useState('Node.js, React, PostgreSQL, Redis, REST APIs');
  const [isJdExpanded, setIsJdExpanded] = useState(true);
  const [hasCopiedJd, setHasCopiedJd] = useState(false);

  // Batch Cohort Ranker State
  const [batchJdText, setBatchJdText] = useState(
    `Role: Associate Product Engineer at Zomato (₹18.0 LPA)\nRequired Skills: Node.js, React, PostgreSQL, Redis, REST APIs\nPreferred Skills: Docker, Microservices, High Concurrency Architecture\nMinimum CGPA: 7.5, 0 active backlogs. Branches: Computer Engineering, IT`
  );
  const [onlyEligibleRank, setOnlyEligibleRank] = useState(false);
  const [minRankScore, setMinRankScore] = useState(60);
  const [isRankingCohort, setIsRankingCohort] = useState(false);
  const [batchRankResult, setBatchRankResult] = useState<any>({
    job_title: 'Associate Product Engineer',
    company_name: 'Zomato Limited',
    total_evaluated: 4,
    eligible_count: 3,
    strong_match_count: 2,
    potential_match_count: 1,
    leaderboard: [
      {
        student_id: 'std-1',
        name: 'Aditya Shinde',
        rank: 1,
        fit_score: 94,
        match_tier: 'STRONG_MATCH',
        is_eligible: true,
        matched_required_skills: ['React', 'Node.js', 'PostgreSQL'],
        missing_required_skills: [{ skill_name: 'Redis', remediation_suggestion: 'Build Redis caching layer' }],
        strengths_summary: '48 commits in React, 35 in Node.js, 96/100 SQL assessment score.',
        plain_language_explanation: 'Outstanding evidence-backed match with production repository commits.',
      },
      {
        student_id: 'std-2',
        name: 'Priya Kulkarni',
        rank: 2,
        fit_score: 88,
        match_tier: 'STRONG_MATCH',
        is_eligible: true,
        matched_required_skills: ['Java', 'Python', 'FastAPI'],
        missing_required_skills: [
          { skill_name: 'Node.js', remediation_suggestion: 'Transition backend fundamentals to Node runtime' },
        ],
        strengths_summary: 'Top 5% LeetCode DSA, 92/100 assessment score.',
        plain_language_explanation: 'Strong algorithms and backend engineering depth.',
      },
      {
        student_id: 'std-3',
        name: 'Rahul Deshmukh',
        rank: 3,
        fit_score: 78,
        match_tier: 'POTENTIAL_MATCH',
        is_eligible: true,
        matched_required_skills: ['React', 'Node.js'],
        missing_required_skills: [{ skill_name: 'PostgreSQL', remediation_suggestion: 'Practice schema indexing' }],
        strengths_summary: 'Clean portfolio repository and express REST APIs.',
        plain_language_explanation: 'Trainable fresher with foundational full-stack skills.',
      },
      {
        student_id: 'std-4',
        name: 'Pooja Patil',
        rank: 4,
        fit_score: 58,
        match_tier: 'TRAINABLE',
        is_eligible: false,
        eligibility_reason: 'CGPA 6.82 is below drive cutoff of 7.50.',
        matched_required_skills: ['Python'],
        missing_required_skills: [{ skill_name: 'React', remediation_suggestion: 'Learn modern web component lifecycle' }],
        strengths_summary: 'Embedded systems and IoT specialist.',
        plain_language_explanation: 'Specialized in hardware/IoT rather than product engineering.',
      },
    ],
    cohort_gap_analysis: {
      'Redis Caching': 3,
      'Docker Containerization': 2,
      'Microservices Architecture': 2,
      'PostgreSQL Indexing': 1,
    },
    tpo_summary:
      'Cohort demonstrates high React and Node.js proficiency, with a shared gap in low-latency Redis caching.',
  });

  const handleRunCohortRanking = async () => {
    setIsRankingCohort(true);
    try {
      const res = await fetch('/api/ai/tpo/rank-cohort', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobDescription: batchJdText,
          minFitScore: minRankScore,
          onlyEligible: onlyEligibleRank,
        }),
      });
      const data = await res.json();
      if (data.success && data.ranking) {
        setBatchRankResult(data.ranking);
        showToast('Batch Cohort Ranking complete! Leaderboard updated.');
      } else {
        showToast(data.error || 'Failed to rank candidate batch.');
      }
    } catch {
      showToast('Error connecting to AI batch ranking microservice.');
    } finally {
      setIsRankingCohort(false);
    }
  };

  const handleOneClickGenerateJd = async (publishAsDrive = false) => {
    setIsGeneratingJd(true);
    try {
      const res = await fetch('/api/ai/jobs/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: quickCompany,
          roleTitle: quickRole,
          ctc: quickCtc,
          skills: quickSkills,
          minCgpa: 7.5,
          maxBacklogs: 0,
          branches: ['Computer Engineering', 'Information Technology', 'AI & Data Science'],
          publishToDrives: publishAsDrive,
        }),
      });
      const data = await res.json();
      if (data.success && data.generatedJd) {
        setGeneratedJd(data.generatedJd);
        setBatchJdText(data.generatedJd.formattedText);
        showToast(
          publishAsDrive
            ? '🎉 Official JD Generated & Published as Live Drive! Matching student cohort...'
            : '✨ 1-Click Official JD Generated! Matching student cohort...'
        );

        // Immediately rank cohort against this generated JD
        const rankRes = await fetch('/api/ai/tpo/rank-cohort', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jobDescription: data.generatedJd.formattedText,
            minFitScore: minRankScore,
            onlyEligible: onlyEligibleRank,
          }),
        });
        const rankData = await rankRes.json();
        if (rankData.success && rankData.ranking) {
          setBatchRankResult(rankData.ranking);
          showToast('Cohort Ranked against Generated JD! Leaderboard updated.');
        }
      } else {
        showToast(data.error || 'Failed to generate Job Description.');
      }
    } catch (e) {
      console.error(e);
      showToast('Error connecting to AI JD generator.');
    } finally {
      setIsGeneratingJd(false);
    }
  };

  const handleCopyJd = () => {
    if (!generatedJd) return;
    navigator.clipboard.writeText(generatedJd.formattedMarkdown);
    setHasCopiedJd(true);
    showToast('Copied full formatted Job Description to clipboard!');
    setTimeout(() => setHasCopiedJd(false), 3000);
  };

  const handleDownloadJd = () => {
    if (!generatedJd) return;
    const blob = new Blob([generatedJd.formattedMarkdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${generatedJd.companyName.replace(/\s+/g, '_')}_JD_${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Job Description downloaded as Markdown document.');
  };

  const handleExportBatchCsv = () => {
    if (!batchRankResult || !batchRankResult.leaderboard) {
      showToast('Run ranking first before exporting.');
      return;
    }
    const headers = 'Rank,Candidate Name,Fit Score,Match Tier,Eligible,Matched Skills,Missing Skills\n';
    const rows = batchRankResult.leaderboard
      .map(
        (r: any, idx: number) =>
          `#${idx + 1},"${r.name}",${r.fit_score}%,${r.match_tier},${r.is_eligible},"${
            r.matched_required_skills?.join('; ') || ''
          }","${r.missing_required_skills?.map((m: any) => m.skill_name).join('; ') || ''}"`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Cohort_Shortlist_${Date.now()}.csv`;
    a.click();
    showToast('Ranked Cohort Shortlist exported to CSV!');
  };

  // New drive form
  const [newCompany, setNewCompany] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newCtc, setNewCtc] = useState('₹18.0 LPA');
  const [newCutoff, setNewCutoff] = useState('7.5');
  const [newCategory, setNewCategory] = useState<'SUPER_DREAM' | 'DREAM' | 'CORE'>('DREAM');
  const [newJdText, setNewJdText] = useState('');
  const [newRequiredSkills, setNewRequiredSkills] = useState<string[]>([]);
  const [newPreferredSkills, setNewPreferredSkills] = useState<string[]>([]);
  const [isParsingJd, setIsParsingJd] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<any | null>(null);

  const handleParseJd = async () => {
    if (!newJdText.trim()) {
      showToast('Please paste a job description first.');
      return;
    }
    setIsParsingJd(true);
    setDuplicateWarning(null);
    try {
      const res = await fetch('/api/ai/jobs/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawText: newJdText,
          companyName: newCompany,
          roleTitle: newRole,
          ctc: newCtc,
        }),
      });
      const data = await res.json();
      if (data.success && data.parsedJob) {
        const pj = data.parsedJob;
        if (pj.company_name && pj.company_name !== 'Hiring Partner') setNewCompany(pj.company_name);
        if (pj.role_title) setNewRole(pj.role_title);
        if (pj.ctc_text) setNewCtc(pj.ctc_text);
        if (pj.min_cgpa) setNewCutoff(String(pj.min_cgpa));

        const req = (pj.required_skills || []).map((s: any) => typeof s === 'string' ? s : s.name);
        const pref = (pj.preferred_skills || []).map((s: any) => typeof s === 'string' ? s : s.name);
        setNewRequiredSkills(req);
        setNewPreferredSkills(pref);

        if (data.deduplication?.is_duplicate) {
          setDuplicateWarning(data.deduplication);
          showToast('⚠️ Duplicate opening detected from another source!');
        } else {
          showToast('Job description parsed & skills normalized successfully!');
        }
      } else {
        showToast(data.error || 'Could not parse job description.');
      }
    } catch {
      showToast('Error connecting to job parser service.');
    } finally {
      setIsParsingJd(false);
    }
  };

  const handleApproveDrive = async (driveId: string) => {
    try {
      await fetch('/api/drives', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: driveId, status: 'ACTIVE' }),
      });
    } catch (e) {
      console.warn('Could not persist drive approval:', e);
    }
    setDrives((prev) => prev.map((d) => (d.id === driveId ? { ...d, status: 'LIVE' } : d)));
    showToast('Drive approved and broadcasted to eligible cohort students!');
  };

  const handleArchiveDrive = async (driveId: string) => {
    try {
      await fetch('/api/drives', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: driveId, status: 'ARCHIVED' }),
      });
    } catch {
      // fallback local update
    }
    setDrives((prev) => prev.map((d) => (d.id === driveId ? { ...d, status: 'ARCHIVED' } : d)));
    showToast('Drive archived successfully.');
  };

  const handleApproveSubmission = async (subId: string, pts: number) => {
    try {
      await fetch('/api/referrals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: subId, status: 'APPROVED', rewardPoints: pts }),
      });
    } catch (e) {
      console.warn('Could not persist submission approval:', e);
    }
    setSubmittedLinks((prev) =>
      prev.map((s) => (s.id === subId ? { ...s, status: 'APPROVED', rewardPoints: pts } : s))
    );
    showToast(`Opportunity approved! ${pts} reward points granted to contributor.`);
  };

  const handleRejectSubmission = async (subId: string) => {
    try {
      await fetch('/api/referrals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: subId, status: 'REJECTED' }),
      });
    } catch (e) {
      console.warn('Could not persist rejection:', e);
    }
    setSubmittedLinks((prev) => prev.map((s) => (s.id === subId ? { ...s, status: 'REJECTED' } : s)));
    showToast('Submission marked as duplicate / invalid.');
  };

  const handleCreateDrive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompany || !newRole) return;

    const newLocalDrive: DriveItem = {
      id: `drv-${Date.now()}`,
      company: newCompany,
      role: newRole,
      category: newCategory,
      ctc: newCtc,
      cgpaCutoff: parseFloat(newCutoff) || 7.0,
      applicants: 0,
      status: 'LIVE',
      date: new Date(Date.now() + 7 * 86400000).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
    };

    const effectiveJd =
      newJdText.trim() ||
      `### Role Overview\nOfficial campus placement drive for ${newCompany} recruiting for ${newRole}.\n\n### Package & Compensation\n- Package CTC: ${newCtc}\n- Eligibility Cutoff: ≥ ${newCutoff} CGPA (0 active backlogs)\n\n### Key Responsibilities\n- Design, develop, and deliver high-quality technical solutions.\n- Work in collaborative engineering sprints with cross-functional teams.\n- Ensure code quality, testing rigor, and documentation standards.\n\n### Required Skills\n${newRequiredSkills.length > 0 ? newRequiredSkills.map((s) => `- ${s}`).join('\n') : '- Problem Solving & Data Structures\n- Web Architecture & APIs\n- Database Design & SQL'}\n\n### Campus Selection Process\n1. Online Technical Assessment (MCQs + Coding)\n2. Technical Deep-Dive Interview\n3. Techno-Managerial Round\n4. HR Discussion & Offer Extension`;

    try {
      const res = await fetch('/api/drives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: newCompany,
          roleTitle: newRole,
          ctc: newCtc,
          ctcAmount: parseFloat(newCtc.replace(/[^0-9.]/g, '')) || 12.0,
          minCgpa: parseFloat(newCutoff) || 7.0,
          jobCategory: newCategory === 'CORE' ? 'CORE' : 'TECH',
          location: 'Pune / Bengaluru / Hybrid',
          description: effectiveJd,
          requiredSkills: newRequiredSkills,
          preferredSkills: newPreferredSkills,
        }),
      });
      const data = await res.json();
      if (data.success && data.drive) {
        showToast(`Campus drive for ${newCompany} scheduled & persisted in Neon DB!`);
        loadLiveDrives();
      } else {
        setDrives((prev) => [newLocalDrive, ...prev]);
        showToast('Drive scheduled and added to active queue.');
      }
    } catch {
      setDrives((prev) => [newLocalDrive, ...prev]);
      showToast('Drive added to active queue.');
    }

    setScheduleModalOpen(false);
    setNewCompany('');
    setNewRole('');
    setNewJdText('');
    setNewRequiredSkills([]);
    setNewPreferredSkills([]);
    setDuplicateWarning(null);
  };

  const [reportBatchYear, setReportBatchYear] = useState('2026');
  const [reportDepartment, setReportDepartment] = useState('ALL');

  const handleDownloadReport = (
    reportType: 'nirf' | 'naac' | 'evidence-bundle' | 'audit-trail',
    format: 'csv' | 'excel' | 'html'
  ) => {
    showToast(`Generating ${reportType.toUpperCase()} report in ${format.toUpperCase()} format...`);
    const params = new URLSearchParams();
    if (format) params.set('format', format);
    if (reportBatchYear) params.set('year', reportBatchYear);
    if (reportDepartment && reportDepartment !== 'ALL') params.set('department', reportDepartment);

    let endpoint = `/api/reports/${reportType}?${params.toString()}`;

    if (format === 'html') {
      window.open(endpoint, '_blank');
      return;
    }

    const a = document.createElement('a');
    a.href = endpoint;
    a.download = `${reportType.toUpperCase()}_Report_${reportBatchYear}.${format === 'excel' ? 'xls' : 'csv'}`;
    a.click();
  };

  return (
    <StitchDashboardShell
      activePath={TAB_TO_SIDEBAR_PATH[activeTab]}
      onPathChange={(p) => setActiveTab(resolveSidebarPathToTab(p))}
      title="TPO Placement Operations"
      roleOverride="TPO"
    >
      {/* ========================================================================= */}
      {/* 1. INSTITUTIONAL CONTROL HEADER                                           */}
      {/* ========================================================================= */}
      <div className="bg-surface border border-border-subtle rounded-xl p-4 sm:p-5 shadow-xs mb-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 text-xs font-semibold text-text-muted">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span>Institutional Command Center</span>
              <span>•</span>
              <span className="font-mono text-primary font-bold">TPO-ERP-SEC.2026.01</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight mt-1">
              Placement &amp; Corporate Relations Ops Desk
            </h1>
            <p className="text-xs text-text-secondary mt-0.5 max-w-3xl">
              Real-time telemetry, campus drive governance, student opportunity intake, and accreditation auditing.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <div className="relative">
              <select
                value={cohort}
                onChange={(e) => setCohort(e.target.value)}
                className="h-9 appearance-none bg-surface-container-low hover:bg-surface-container border border-border-subtle text-text-primary text-xs font-semibold py-1.5 pl-3 pr-8 rounded-lg cursor-pointer focus:outline-none"
              >
                <option>AY 2026-27 (Phase 1)</option>
                <option>AY 2025-26 (Audited)</option>
              </select>
              <span className="material-symbols-outlined absolute right-2 top-2.5 text-[15px] text-text-muted pointer-events-none">
                expand_more
              </span>
            </div>

            <button
              type="button"
              onClick={() => handleDownloadReport('nirf', 'csv')}
              className="h-9 px-3 rounded-lg bg-surface border border-border-subtle hover:bg-surface-container-low text-text-primary text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-primary" />
              <span>Export NIRF / NAAC</span>
            </button>

            <button
              type="button"
              onClick={() => setScheduleModalOpen(true)}
              className="h-9 px-3.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Schedule Campus Drive</span>
            </button>
          </div>
        </div>

        {/* View Switcher Tabs (Synchronized 1:1 with Sidebar Paths) */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border-subtle overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
              activeTab === 'overview'
                ? 'bg-primary text-white shadow-xs'
                : 'bg-surface-container-low text-text-secondary hover:text-text-primary'
            }`}
          >
            Dashboard Overview
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('drives')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'drives'
                ? 'bg-primary text-white shadow-xs'
                : 'bg-surface-container-low text-text-secondary hover:text-text-primary'
            }`}
          >
            <span>Placement Drives</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-primary/20 text-current font-bold">
              {drives.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('submissions')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'submissions'
                ? 'bg-primary text-white shadow-xs'
                : 'bg-surface-container-low text-text-secondary hover:text-text-primary'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Student-Submitted Links</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-white font-bold">
              {submittedLinks.filter((s) => s.status === 'PENDING').length} New
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('batch-ranker')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'batch-ranker'
                ? 'bg-primary text-white shadow-xs'
                : 'bg-surface-container-low text-text-secondary hover:text-text-primary'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>1-Click Batch JD Ranker</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500 text-white font-bold">
              AI
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('fraud-detector')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'fraud-detector'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-surface-container-low text-text-secondary hover:text-text-primary'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
            <span>AI Job Scam Shield</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500 text-white font-bold">
              Defense
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('offers')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'offers'
                ? 'bg-primary text-white shadow-xs'
                : 'bg-surface-container-low text-text-secondary hover:text-text-primary'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Offers &amp; Proofs Audit</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500 text-white font-bold">
              {tpoOffers.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('reports')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'reports'
                ? 'bg-primary text-white shadow-xs'
                : 'bg-surface-container-low text-text-secondary hover:text-text-primary'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>NIRF / NAAC Reports</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('curriculum')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'curriculum'
                ? 'bg-primary text-white shadow-xs'
                : 'bg-surface-container-low text-text-secondary hover:text-text-primary'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Assessments &amp; Roadmaps Studio</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-500 text-white font-bold">
              New
            </span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. EXECUTIVE KPI CARDS                                                    */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5 mb-5">
        <div className="p-3.5 rounded-xl bg-surface border border-border-subtle shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-[10px] uppercase font-bold tracking-wider">Placement Rate</span>
            <span className="material-symbols-outlined text-[17px] text-success">verified</span>
          </div>
          <div className="my-2">
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-bold text-text-primary">
                {placementStats ? `${placementStats.summary.placementPercentage}%` : '84.2%'}
              </span>
              <span className="text-[11px] font-bold text-success">+5.8% YoY</span>
            </div>
            <div className="w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden mt-1.5">
              <div
                className="bg-success h-full rounded-full transition-all duration-500"
                style={{ width: `${placementStats ? placementStats.summary.placementPercentage : 84.2}%` }}
              />
            </div>
          </div>
          <span className="text-[10px] text-text-secondary truncate">
            {placementStats
              ? `${placementStats.summary.placedStudents} / ${placementStats.summary.totalStudents} Students Placed`
              : '538 / 640 Students Placed'}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-surface border border-border-subtle shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-[10px] uppercase font-bold tracking-wider">Median CTC</span>
            <span className="material-symbols-outlined text-[17px] text-primary">payments</span>
          </div>
          <div className="my-2">
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-bold text-text-primary">
                {placementStats && placementStats.summary.medianCTC > 0
                  ? `₹${placementStats.summary.medianCTC} LPA`
                  : '₹14.8 LPA'}
              </span>
              <span className="text-[10px] font-semibold text-text-muted">
                Max: {placementStats && placementStats.summary.highestCTC > 0 ? `₹${placementStats.summary.highestCTC}L` : '₹54.5L'}
              </span>
            </div>
            <div className="w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden mt-1.5">
              <div className="bg-primary h-full rounded-full" style={{ width: '70%' }} />
            </div>
          </div>
          <span className="text-[10px] text-text-secondary truncate">
            Top Tier Offers: {placementStats ? `${placementStats.dreamSplit?.superDreamOffers ?? 2} Super Dream` : '18.4%'}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-surface border border-border-subtle shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-[10px] uppercase font-bold tracking-wider">Active Drives</span>
            <span className="material-symbols-outlined text-[17px] text-primary">campaign</span>
          </div>
          <div className="my-2">
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-bold text-text-primary">{drives.length} Active</span>
              <span className="text-[10px] font-bold text-primary px-1.5 py-0.2 rounded bg-primary/10">Live</span>
            </div>
            <div className="w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden mt-1.5">
              <div className="bg-primary h-full rounded-full" style={{ width: '65%' }} />
            </div>
          </div>
          <span className="text-[10px] text-text-secondary truncate">
            {drives.filter((d) => d.category === 'SUPER_DREAM').length} Super Dream • {drives.filter((d) => d.category === 'DREAM').length} Dream
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-surface border border-border-subtle shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-[10px] uppercase font-bold tracking-wider">Hiring Partners</span>
            <span className="material-symbols-outlined text-[17px] text-secondary">apartment</span>
          </div>
          <div className="my-2">
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-bold text-text-primary">
                {placementStats ? `${placementStats.summary.companiesVisited || drives.length} Total` : '128 Total'}
              </span>
              <span className="text-[10px] font-bold text-text-secondary">MoUs: 92</span>
            </div>
            <div className="w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden mt-1.5">
              <div className="bg-secondary h-full rounded-full" style={{ width: '85%' }} />
            </div>
          </div>
          <span className="text-[10px] text-text-secondary truncate">24 Global Fortune 500</span>
        </div>

        <div className="p-3.5 rounded-xl bg-surface border border-border-subtle shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-[10px] uppercase font-bold tracking-wider">Registered Batch</span>
            <span className="material-symbols-outlined text-[17px] text-tertiary">groups</span>
          </div>
          <div className="my-2">
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-bold text-text-primary">
                {placementStats ? `${placementStats.summary.totalStudents} Pool` : '640 Pool'}
              </span>
              <span className="text-[10px] font-bold text-success">Verified</span>
            </div>
            <div className="w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden mt-1.5">
              <div className="bg-tertiary h-full rounded-full" style={{ width: '95%' }} />
            </div>
          </div>
          <span className="text-[10px] text-text-secondary truncate">All Departments Synced</span>
        </div>

        <div className="p-3.5 rounded-xl bg-surface border border-border-subtle shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-[10px] uppercase font-bold tracking-wider">Peer Contributions</span>
            <span className="material-symbols-outlined text-[17px] text-warning">handshake</span>
          </div>
          <div className="my-2">
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-bold text-text-primary">
                {submittedLinks.filter((s) => s.status === 'PENDING').length} Pending
              </span>
              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-1 rounded">
                Review
              </span>
            </div>
            <div className="w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden mt-1.5">
              <div className="bg-warning h-full rounded-full" style={{ width: '45%' }} />
            </div>
          </div>
          <span className="text-[10px] text-text-secondary truncate">Student-Sourced Opps</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. CONDITIONAL TABS                                                       */}
      {/* ========================================================================= */}
      {activeTab === 'fraud-detector' ? (
        <div className="space-y-5 mb-6">
          <FakeJobDetectorWidget
            variant="tpo"
            defaultOpen={true}
            onApproveOpportunity={(analysis) => {
              showToast(`Opportunity for ${analysis.company} approved by TPO.`);
            }}
          />
        </div>
      ) : activeTab === 'batch-ranker' ? (
        <div className="space-y-5 mb-6">
          {/* 1-CLICK AI JD GENERATOR & RECRUITER SPEC BUILDER */}
          <div className="bg-surface border border-border-subtle rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border-subtle">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-xs">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-bold text-text-primary tracking-tight">
                      1-Click AI Job Description Generator &amp; Matcher
                    </h2>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                      Autonomous Campus Recruiter
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Generate an official, structured campus Job Description (JD) and immediately match &amp; rank the verified student cohort.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
                <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  Dream Threshold: ≥ ₹10.0 LPA
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                  Super Dream: ≥ ₹20.0 LPA
                </span>
              </div>
            </div>

            {/* Quick JD Parameters Form */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-text-muted mb-1">
                  Hiring Partner / Company
                </label>
                <input
                  type="text"
                  value={quickCompany}
                  onChange={(e) => setQuickCompany(e.target.value)}
                  placeholder="e.g. Zomato Limited"
                  className="w-full h-9 px-3 rounded-lg border border-border-subtle bg-surface-container-lowest text-xs font-semibold text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-text-muted mb-1">
                  Designation / Role Title
                </label>
                <input
                  type="text"
                  value={quickRole}
                  onChange={(e) => setQuickRole(e.target.value)}
                  placeholder="e.g. Associate Product Engineer"
                  className="w-full h-9 px-3 rounded-lg border border-border-subtle bg-surface-container-lowest text-xs font-semibold text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-text-muted mb-1">
                  Offered Package (CTC)
                </label>
                <input
                  type="text"
                  value={quickCtc}
                  onChange={(e) => setQuickCtc(e.target.value)}
                  placeholder="e.g. ₹18.0 LPA"
                  className="w-full h-9 px-3 rounded-lg border border-border-subtle bg-surface-container-lowest text-xs font-semibold text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-text-muted mb-1">
                  Key Skills &amp; Stack
                </label>
                <input
                  type="text"
                  value={quickSkills}
                  onChange={(e) => setQuickSkills(e.target.value)}
                  placeholder="e.g. Node.js, React, Redis, Postgres"
                  className="w-full h-9 px-3 rounded-lg border border-border-subtle bg-surface-container-lowest text-xs font-semibold text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* Presets and Generator CTA */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-1">
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-text-muted text-[11px] font-semibold">1-Click Presets:</span>
                <button
                  type="button"
                  onClick={() => {
                    setQuickCompany('Zomato Limited');
                    setQuickRole('Associate Product Engineer');
                    setQuickCtc('₹18.0 LPA');
                    setQuickSkills('Node.js, React, PostgreSQL, Redis, REST APIs');
                  }}
                  className="px-2 py-0.5 rounded bg-surface-container-low hover:bg-surface-container border border-border-subtle font-semibold text-[11px]"
                >
                  Zomato (₹18L)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setQuickCompany('Google India');
                    setQuickRole('Software Engineer (L3)');
                    setQuickCtc('₹32.5 LPA');
                    setQuickSkills('Data Structures & Algorithms, System Design, Python, Java, GCP');
                  }}
                  className="px-2 py-0.5 rounded bg-surface-container-low hover:bg-surface-container border border-border-subtle font-semibold text-[11px]"
                >
                  Google (₹32.5L)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setQuickCompany('Amazon Web Services');
                    setQuickRole('SDE-1 Cloud & Distributed Systems');
                    setQuickCtc('₹28.0 LPA');
                    setQuickSkills('Java, Distributed Systems, AWS, DynamoDB, Microservices');
                  }}
                  className="px-2 py-0.5 rounded bg-surface-container-low hover:bg-surface-container border border-border-subtle font-semibold text-[11px]"
                >
                  Amazon (₹28L)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setQuickCompany('TCS Prime');
                    setQuickRole('Digital Software Developer');
                    setQuickCtc('₹9.0 LPA');
                    setQuickSkills('Java, SQL, Data Structures, Web Development, Spring Boot');
                  }}
                  className="px-2 py-0.5 rounded bg-surface-container-low hover:bg-surface-container border border-border-subtle font-semibold text-[11px]"
                >
                  TCS Prime (₹9L)
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOneClickGenerateJd(false)}
                  disabled={isGeneratingJd}
                  className="h-9 px-4 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isGeneratingJd ? 'Synthesizing Official JD...' : '✨ 1-Click Generate JD & Match'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOneClickGenerateJd(true)}
                  disabled={isGeneratingJd}
                  className="h-9 px-3.5 rounded-lg border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50"
                  title="Generate official JD and instantly publish as a live college placement drive"
                >
                  <Briefcase className="w-4 h-4" />
                  <span>Publish as Live Drive</span>
                </button>
              </div>
            </div>

            {/* Manual JD Editor Accordion */}
            <div className="pt-3 border-t border-border-subtle">
              <label className="text-xs font-bold text-text-primary block mb-1.5">
                Target Job Description Text (Editable prompt passed to batch evaluator):
              </label>
              <textarea
                rows={3}
                value={batchJdText}
                onChange={(e) => setBatchJdText(e.target.value)}
                placeholder="Paste incoming recruiter or partner job description..."
                className="w-full p-3 rounded-xl border border-border-subtle bg-surface-container-lowest font-mono text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-4 text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={onlyEligibleRank}
                      onChange={(e) => setOnlyEligibleRank(e.target.checked)}
                      className="w-4 h-4 accent-primary rounded"
                    />
                    <span className="font-semibold text-text-secondary">Only Eligible (Cutoffs &amp; Backlogs)</span>
                  </label>

                  <div className="flex items-center gap-1.5">
                    <span className="text-text-muted">Min Fit Score:</span>
                    <select
                      value={minRankScore}
                      onChange={(e) => setMinRankScore(Number(e.target.value))}
                      className="px-2 py-1 rounded bg-surface-container-low border border-border-subtle font-bold text-text-primary"
                    >
                      <option value={0}>All Scores (0%+)</option>
                      <option value={50}>50%+</option>
                      <option value={70}>70%+ (Strong/Potential)</option>
                      <option value={85}>85%+ (Top Tier Only)</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExportBatchCsv}
                    className="h-8 px-3 rounded-lg border border-border-subtle bg-surface hover:bg-surface-container-low text-text-primary text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5 text-primary" />
                    <span>Export Shortlist (CSV)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleRunCohortRanking}
                    disabled={isRankingCohort}
                    className="h-8 px-3.5 rounded-lg bg-surface-container-high hover:bg-surface-container text-text-primary text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <Shield className="w-3.5 h-3.5 text-primary" />
                    <span>{isRankingCohort ? 'Evaluating...' : 'Re-run Ranking'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* GENERATED OFFICIAL JD DISPLAY CARD */}
          {generatedJd && (
            <div className="bg-surface border-2 border-primary/20 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-border-subtle">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-base shadow-xs">
                    {generatedJd.companyName.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base font-bold text-text-primary">
                        {generatedJd.roleTitle} • {generatedJd.companyName}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        {generatedJd.ctc}
                      </span>
                      {generatedJd.publishedDriveId && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Live Placement Drive
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-text-muted mt-0.5">
                      📍 {generatedJd.location} • Generated via Campus Recruiter AI Engine
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyJd}
                    className="h-8 px-3 rounded-lg border border-border-subtle bg-surface hover:bg-surface-container-low text-xs font-semibold text-text-primary flex items-center gap-1.5 transition shadow-xs"
                  >
                    {hasCopiedJd ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{hasCopiedJd ? 'Copied JD!' : 'Copy JD Markdown'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadJd}
                    className="h-8 px-3 rounded-lg border border-border-subtle bg-surface hover:bg-surface-container-low text-xs font-semibold text-text-primary flex items-center gap-1.5 transition shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5 text-primary" />
                    <span>Download .md</span>
                  </button>

                  {!generatedJd.publishedDriveId && (
                    <button
                      type="button"
                      onClick={() => handleOneClickGenerateJd(true)}
                      className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-xs"
                    >
                      <Briefcase className="w-3.5 h-3.5" />
                      <span>Publish as Campus Drive</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setIsJdExpanded(!isJdExpanded)}
                    className="h-8 px-2.5 rounded-lg border border-border-subtle bg-surface hover:bg-surface-container-low text-xs font-medium text-text-muted flex items-center gap-1"
                  >
                    {isJdExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    <span>{isJdExpanded ? 'Collapse' : 'Expand JD'}</span>
                  </button>
                </div>
              </div>

              {isJdExpanded && (
                <div className="space-y-4 pt-1 text-xs">
                  {/* Overview Statement */}
                  <div className="p-3.5 rounded-xl bg-surface-container-low border border-border-subtle">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block mb-1">
                      Executive Overview &amp; Mission
                    </span>
                    <p className="text-text-primary leading-relaxed">{generatedJd.overview}</p>
                  </div>

                  {/* Responsibilities & Skills Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Responsibilities */}
                    <div className="p-3.5 rounded-xl bg-surface-container-lowest border border-border-subtle space-y-2">
                      <div className="flex items-center gap-1.5 text-text-primary font-bold">
                        <CheckCircle2 className="w-4 h-4 text-primary" />
                        <span>Core Engineering Responsibilities</span>
                      </div>
                      <ul className="space-y-1.5 text-text-secondary pl-1">
                        {generatedJd.responsibilities?.map((resp: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-primary font-bold shrink-0">•</span>
                            <span>{resp}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Competencies */}
                    <div className="p-3.5 rounded-xl bg-surface-container-lowest border border-border-subtle space-y-3">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1.5">
                          Required Technical Competencies
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {generatedJd.requiredSkills?.map((skill: string, idx: number) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-semibold text-[11px]"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1.5">
                          Preferred Competencies &amp; Architecture
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {generatedJd.preferredSkills?.map((skill: string, idx: number) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-semibold text-[11px]"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Eligibility Summary */}
                      <div className="pt-2 border-t border-border-subtle">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">
                          Eligibility Criteria &amp; Cutoffs
                        </div>
                        <div className="text-[11px] text-text-secondary flex flex-wrap gap-x-3 gap-y-1">
                          <span>
                            Min CGPA: <strong className="text-text-primary">{generatedJd.eligibility?.minCgpa || 7.5}</strong>
                          </span>
                          <span>
                            Backlogs:{' '}
                            <strong className="text-text-primary">
                              {generatedJd.eligibility?.maxBacklogs ?? 0} allowed
                            </strong>
                          </span>
                          <span>
                            Branches:{' '}
                            <strong className="text-text-primary">
                              {generatedJd.eligibility?.branches?.join(', ') || 'Computer, IT, AI&DS'}
                            </strong>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 4-Round Selection Roadmap */}
                  {generatedJd.selectionProcess && generatedJd.selectionProcess.length > 0 && (
                    <div className="p-3.5 rounded-xl bg-surface-container-low border border-border-subtle">
                      <div className="flex items-center gap-1.5 text-text-primary font-bold mb-2.5">
                        <Layers className="w-4 h-4 text-primary" />
                        <span>Official 4-Round Selection Evaluation Workflow</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                        {generatedJd.selectionProcess.map((round: any, idx: number) => (
                          <div
                            key={idx}
                            className="p-2.5 rounded-lg bg-surface border border-border-subtle flex flex-col justify-between"
                          >
                            <div>
                              <span className="text-[10px] font-bold uppercase text-primary tracking-wider">
                                Round {round.round || idx + 1}
                              </span>
                              <div className="font-bold text-text-primary text-xs mt-0.5">{round.name}</div>
                              <p className="text-[11px] text-text-muted mt-1 leading-relaxed">{round.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Perks & Benefits */}
                  {generatedJd.perks && generatedJd.perks.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                      <span className="font-bold text-text-muted uppercase text-[10px]">Perks &amp; Highlights:</span>
                      {generatedJd.perks.map((perk: string, idx: number) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded bg-surface-container-high text-text-secondary font-medium"
                        >
                          🎁 {perk}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {batchRankResult && batchRankResult.cohort_gap_analysis && (
            <div className="bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-blue-50/70 dark:from-[#111C2E] dark:via-[#162238] dark:to-[#101B2B] border border-blue-200/80 dark:border-slate-800 rounded-xl p-5 shadow-xs">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-blue-200/60 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                    TST
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Cohort Skill Deficit Intelligence • Sponsored by TechSummitTrainers
                    </h3>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300">
                      Aggregated missing technical competencies across evaluated candidates for this opening.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    showToast('TechSummitTrainers Custom Bootcamp Request Dispatched to Corporate Relations!')
                  }
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs shrink-0 transition"
                >
                  Schedule Targeted Upskilling Bootcamp
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
                {Object.entries(batchRankResult.cohort_gap_analysis).map(([skill, count]: [string, any]) => (
                  <div
                    key={skill}
                    className="p-3 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-blue-100 dark:border-slate-800 text-xs flex items-center justify-between"
                  >
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate pr-2">{skill}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 shrink-0">
                      {count} Students Lack
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {batchRankResult && (
            <div className="bg-surface border border-border-subtle rounded-xl p-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
                <div>
                  <h3 className="text-base font-bold text-text-primary">
                    Ranked Candidate Shortlist ({batchRankResult.leaderboard?.length || 0} Evaluated)
                  </h3>
                  <p className="text-xs text-text-secondary mt-0.5">{batchRankResult.tpo_summary}</p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2 py-1 rounded bg-emerald-50 text-emerald-700 font-bold">
                    {batchRankResult.strong_match_count} Strong Match
                  </span>
                  <span className="px-2 py-1 rounded bg-blue-50 text-blue-700 font-bold">
                    {batchRankResult.potential_match_count} Potential
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto mt-2">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border-subtle text-[11px] font-bold uppercase text-text-muted tracking-wider">
                      <th className="py-2.5 px-3">Rank</th>
                      <th className="py-2.5 px-3">Candidate</th>
                      <th className="py-2.5 px-3">Fit Score</th>
                      <th className="py-2.5 px-3">Match Tier</th>
                      <th className="py-2.5 px-3">Verified Proof Highlights</th>
                      <th className="py-2.5 px-3">Eligibility</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {batchRankResult.leaderboard?.map((cand: any, idx: number) => {
                      const isStrong = cand.match_tier === 'STRONG_MATCH';
                      const isPotential = cand.match_tier === 'POTENTIAL_MATCH';
                      return (
                        <tr key={cand.student_id || idx} className="hover:bg-surface-container-low transition-colors">
                          <td className="py-3 px-3 font-mono font-bold text-sm text-primary">
                            #{cand.rank || idx + 1}
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-bold text-text-primary">{cand.name}</div>
                            <div className="text-[11px] text-text-secondary">
                              {cand.department || 'Computer Engineering'}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-text-primary">{cand.fit_score}%</span>
                              <div className="w-16 bg-surface-container-high h-1.5 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    isStrong ? 'bg-emerald-500' : isPotential ? 'bg-primary' : 'bg-warning'
                                  }`}
                                  style={{ width: `${cand.fit_score}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                                isStrong
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                  : isPotential
                                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                                  : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                              }`}
                            >
                              {cand.match_tier.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <div className="text-[11px] text-text-secondary max-w-xs truncate">
                              {cand.strengths_summary || cand.matched_required_skills?.join(', ')}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            {cand.is_eligible ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Eligible</span>
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600"
                                title={cand.eligibility_reason}
                              >
                                <AlertCircle className="w-3.5 h-3.5" />
                                <span>Disqualified</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : activeTab === 'submissions' ? (
        <div className="bg-surface border border-border-subtle rounded-xl p-5 shadow-xs mb-6">
          <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-warning" />
                <h2 className="text-base font-bold text-text-primary">
                  Student-Submitted Off-Campus Opportunities Queue
                </h2>
              </div>
              <p className="text-xs text-text-secondary mt-0.5">
                Verify student-contributed job links, approve for cohort publishing, and grant honors &amp; reward points.
              </p>
            </div>
            <span className="text-xs font-bold text-text-muted">{submittedLinks.length} Total Submissions</span>
          </div>

          <div className="divide-y divide-border-subtle mt-2">
            {submittedLinks.map((sub) => {
              const quickScan = analyzeJobPostWithHeuristics({
                company: sub.company,
                role: sub.role,
                url: sub.url,
                ctc: sub.ctc,
              });

              return (
              <div key={sub.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-tint-subtle border border-primary/20 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[20px] text-primary">link</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-text-primary">{sub.company}</span>
                      <span className="text-xs font-semibold text-text-secondary">• {sub.role}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          sub.status === 'APPROVED'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                            : sub.status === 'REJECTED'
                            ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                        }`}
                      >
                        {sub.status}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                          quickScan.verdict === 'FRAUD_SCAM_DETECTED'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300'
                            : quickScan.verdict === 'PROCEED_WITH_CAUTION'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300'
                        }`}
                      >
                        {quickScan.verdict === 'FRAUD_SCAM_DETECTED' ? (
                          <ShieldAlert className="w-3 h-3 text-rose-600" />
                        ) : (
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        )}
                        <span>AI Trust: {quickScan.authenticityScore}% ({quickScan.verdict === 'FRAUD_SCAM_DETECTED' ? 'Scam Detected' : quickScan.verdict === 'PROCEED_WITH_CAUTION' ? 'Suspicious' : 'Authentic'})</span>
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-text-secondary">
                      <span>
                        Submitted by: <strong className="text-text-primary">{sub.studentName}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        Compensation: <strong className="text-text-primary">{sub.ctc}</strong>
                      </span>
                      <span>•</span>
                      <span>{sub.submittedAt}</span>
                    </div>

                    <a
                      href={sub.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary font-semibold hover:underline mt-1.5"
                    >
                      <span>Inspect Application Link ({sub.url})</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  {sub.status === 'PENDING' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleRejectSubmission(sub.id)}
                        className="h-8 px-3 rounded-lg border border-border-subtle bg-surface hover:bg-surface-container-low text-text-secondary hover:text-rose-600 text-xs font-semibold transition-colors"
                      >
                        Reject
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApproveSubmission(sub.id, 50)}
                        className="h-8 px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Approve (+50 Pts)</span>
                      </button>
                    </>
                  ) : (
                    <span className="text-xs font-bold text-text-secondary flex items-center gap-1 bg-surface-container-low px-3 py-1.5 rounded-lg border border-border-subtle">
                      <Award className="w-3.5 h-3.5 text-warning" />
                      <span>{sub.rewardPoints} Pts Awarded</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
          </div>
        </div>
      ) : activeTab === 'offers' ? (
        <div className="space-y-5 mb-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="p-4 rounded-xl bg-surface border border-border-subtle shadow-xs">
              <span className="text-[10px] uppercase font-bold text-text-muted">Total Offers Extended</span>
              <div className="text-2xl font-black text-text-primary mt-1">{tpoOffers.length}</div>
              <span className="text-[11px] text-text-secondary">Across monitored drives</span>
            </div>
            <div className="p-4 rounded-xl bg-surface border border-border-subtle shadow-xs">
              <span className="text-[10px] uppercase font-bold text-success">Confirmed Placements</span>
              <div className="text-2xl font-black text-success mt-1">
                {tpoOffers.filter((o) => o.status === 'ACCEPTED').length}
              </div>
              <span className="text-[11px] text-text-secondary">Candidates Placed</span>
            </div>
            <div className="p-4 rounded-xl bg-surface border border-border-subtle shadow-xs">
              <span className="text-[10px] uppercase font-bold text-purple-600 dark:text-purple-400">
                Dream / Super Dream
              </span>
              <div className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">
                {tpoOffers.filter((o) => o.tier === 'SUPER_DREAM' || o.tier === 'DREAM').length}
              </div>
              <span className="text-[11px] text-text-secondary">High Package Offers</span>
            </div>
            <div className="p-4 rounded-xl bg-surface border border-border-subtle shadow-xs">
              <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400">
                Proofs Awaiting Audit
              </span>
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                {tpoOffers.filter((o) => o.metadata?.packageProof?.status === 'PENDING_VERIFICATION').length}
              </div>
              <span className="text-[11px] text-text-secondary">NIRF/NAAC Verification Queue</span>
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-xl bg-surface border border-border-subtle shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border-subtle">
              <div>
                <h2 className="text-base font-bold text-text-primary tracking-tight">
                  Institutional Offers &amp; Package Proof Audit
                </h2>
                <p className="text-xs text-text-secondary mt-0.5">
                  Verify employment packages, CTC breakdowns, and proof documents for NIRF Criterion 5.2.1 and NAAC compliance
                </p>
              </div>
              <span className="text-xs text-text-muted font-medium">{tpoOffers.length} Active Records</span>
            </div>

            <div className="overflow-x-auto mt-2">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border-subtle text-[11px] font-bold uppercase text-text-muted tracking-wider">
                    <th className="py-2.5 px-3">Candidate</th>
                    <th className="py-2.5 px-3">Company &amp; Role</th>
                    <th className="py-2.5 px-3">Package &amp; Tier</th>
                    <th className="py-2.5 px-3">Offer Status</th>
                    <th className="py-2.5 px-3">Package Proof</th>
                    <th className="py-2.5 px-3">Joining Status</th>
                    <th className="py-2.5 px-3 text-right">Accreditation Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {tpoOffers.map((offer) => {
                    const proof = offer.metadata?.packageProof;
                    const proofStatus = proof?.status || 'UNSUBMITTED';
                    const joining = offer.metadata?.joiningDetails?.joiningStatus || 'NOT_JOINED';

                    return (
                      <tr key={offer.id} className="hover:bg-surface-container-low transition-colors">
                        <td className="py-3 px-3">
                          <div className="font-bold text-text-primary">{offer.student?.name || 'Candidate'}</div>
                          <div className="text-[11px] text-text-secondary">
                            {offer.student?.rollNo || 'Roll N/A'} • {offer.student?.department || 'Engg'}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-text-primary">{offer.companyName}</div>
                          <div className="text-[11px] text-text-secondary">{offer.roleTitle}</div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-mono font-bold text-text-primary">{offer.ctc}</div>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase ${
                              offer.tier === 'SUPER_DREAM'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                : offer.tier === 'DREAM'
                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                                : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                            }`}
                          >
                            {offer.tier?.replace('_', ' ') || 'REGULAR'}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              offer.status === 'ACCEPTED'
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                                : offer.status === 'DECLINED'
                                ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                            }`}
                          >
                            {offer.status}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                proofStatus === 'VERIFIED'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : proofStatus === 'PENDING_VERIFICATION'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                  : proofStatus === 'REJECTED'
                                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                              }`}
                            >
                              {proofStatus.replace('_', ' ')}
                            </span>
                            {proof?.proofDocumentUrl && (
                              <a
                                href={proof.proofDocumentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:text-primary-focus"
                                title="Open proof document"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-text-secondary font-medium">{joining.replace(/_/g, ' ')}</td>
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedOfferForAudit(offer);
                              setAuditNotes(proof?.verificationNotes || '');
                            }}
                            className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
                          >
                            {proofStatus === 'VERIFIED' ? 'View Audit' : 'Audit Proof'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeTab === 'reports' ? (
        /* NEW DEDICATED VIEW: NIRF & NAAC Accreditation Reports */
        <div className="bg-surface border border-border-subtle rounded-xl p-5 shadow-xs mb-6 space-y-4">
          <div className="flex flex-col gap-4 pb-4 border-b border-border-subtle">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-text-primary">
                  NIRF Criterion 5.2.1 &amp; NAAC Placement Compliance Dossier
                </h2>
                <p className="text-xs text-text-secondary mt-0.5">
                  Audited institutional placement metrics ready for Ministry of Education (NIRF) and NAAC SSR submission.
                </p>
              </div>

              {/* Printable Official Dossier View */}
              <button
                type="button"
                onClick={() => handleDownloadReport('nirf', 'html')}
                className="h-9 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors self-start sm:self-center"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>🖨️ Print / Official PDF</span>
              </button>
            </div>

            {/* Filter Controls & Multi-Format Exports */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 bg-slate-50/70 dark:bg-slate-800/40 p-3 rounded-xl border border-border-subtle">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-text-muted uppercase">Graduation Year:</span>
                  <select
                    value={reportBatchYear}
                    onChange={(e) => setReportBatchYear(e.target.value)}
                    className="h-8 px-2.5 rounded-lg border border-border-subtle bg-surface text-xs text-text-primary font-medium"
                  >
                    <option value="2026">2026 Batch</option>
                    <option value="2025">2025 Batch</option>
                    <option value="2024">2024 Batch</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-text-muted uppercase">Department:</span>
                  <select
                    value={reportDepartment}
                    onChange={(e) => setReportDepartment(e.target.value)}
                    className="h-8 px-2.5 rounded-lg border border-border-subtle bg-surface text-xs text-text-primary font-medium"
                  >
                    <option value="ALL">All Departments</option>
                    <option value="Computer Engineering">Computer Engineering</option>
                    <option value="Information Technology">Information Technology</option>
                    <option value="Electronics & Telecommunication">ENTC</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadReport('nirf', 'csv')}
                  className="h-8 px-3 rounded-lg bg-surface border border-border-subtle hover:bg-surface-container-high text-xs font-semibold text-text-primary flex items-center gap-1.5 transition"
                >
                  <Download className="w-3 h-3 text-blue-600" />
                  <span>NIRF Table 5 (CSV)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadReport('nirf', 'excel')}
                  className="h-8 px-3 rounded-lg bg-surface border border-border-subtle hover:bg-surface-container-high text-xs font-semibold text-text-primary flex items-center gap-1.5 transition"
                >
                  <Download className="w-3 h-3 text-emerald-600" />
                  <span>NIRF (Excel)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadReport('naac', 'csv')}
                  className="h-8 px-3 rounded-lg bg-surface border border-border-subtle hover:bg-surface-container-high text-xs font-semibold text-text-primary flex items-center gap-1.5 transition"
                >
                  <Download className="w-3 h-3 text-purple-600" />
                  <span>NAAC 5.2.1 (CSV)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadReport('evidence-bundle', 'csv')}
                  className="h-8 px-3 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <Download className="w-3 h-3" />
                  <span>Evidence Bundle</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadReport('audit-trail', 'csv')}
                  className="h-8 px-3 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition"
                >
                  <Download className="w-3 h-3" />
                  <span>Audit Trail</span>
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-surface-container-low border border-border-subtle">
              <div className="text-text-muted font-bold uppercase text-[10px]">NIRF Metric 5.2.1 (Placement %)</div>
              <div className="text-2xl font-black text-success mt-1">84.2% Verified</div>
              <p className="text-text-secondary mt-1">
                538 of 640 graduating students placed with verified corporate offer letters.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-surface-container-low border border-border-subtle">
              <div className="text-text-muted font-bold uppercase text-[10px]">NIRF Median Salary (UG 4-Year)</div>
              <div className="text-2xl font-black text-primary mt-1">₹14,80,000 / Yr</div>
              <p className="text-text-secondary mt-1">
                Calculated across all verified full-time offers (excluding internships without PPO).
              </p>
            </div>
            <div className="p-4 rounded-xl bg-surface-container-low border border-border-subtle">
              <div className="text-text-muted font-bold uppercase text-[10px]">Higher Studies &amp; Entrepreneurship</div>
              <div className="text-2xl font-black text-text-primary mt-1">48 Students (7.5%)</div>
              <p className="text-text-secondary mt-1">
                Admitted to GATE / MS / MBA programs with uploaded admission proof letters.
              </p>
            </div>
          </div>
        </div>
      ) : activeTab === 'curriculum' ? (
        <div className="mb-6">
          <CurriculumCreatorStudio roleTitle="TPO Placement & Academic Cell" />
        </div>
      ) : (
        /* DEFAULT ('overview' and 'drives'): ACTIVE PLACEMENT DRIVES QUEUE TABLE */
        <div className="space-y-5 mb-5">
          {activeTab === 'overview' && (
            <FakeJobDetectorWidget
              variant="tpo"
              defaultOpen={true}
              onApproveOpportunity={(analysis) => {
                showToast(`Opportunity for ${analysis.company} approved by TPO.`);
              }}
            />
          )}

          <div className="p-4 sm:p-5 rounded-xl bg-surface border border-border-subtle shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border-subtle">
            <div>
              <h2 className="text-base font-bold text-text-primary tracking-tight">
                Active Placement Drives Moderation Queue
              </h2>
              <p className="text-xs text-text-secondary mt-0.5">
                Live corporate drives, eligibility cutoffs, and applicant pipeline progression
              </p>
            </div>
            <span className="text-xs text-text-muted font-medium">Total {drives.length} Drives Monitored</span>
          </div>

          <div className="overflow-x-auto mt-2">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border-subtle text-[11px] font-bold uppercase text-text-muted tracking-wider">
                  <th className="py-2.5 px-3">Company &amp; Role</th>
                  <th className="py-2.5 px-3">Tier</th>
                  <th className="py-2.5 px-3">Package</th>
                  <th className="py-2.5 px-3">CGPA Cutoff</th>
                  <th className="py-2.5 px-3">Applicants</th>
                  <th className="py-2.5 px-3">Drive Date</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Moderation Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {drives.map((d) => (
                  <tr key={d.id} className="hover:bg-surface-container-low transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-bold text-text-primary">{d.company}</div>
                      <div className="text-[11px] text-text-secondary">{d.role}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          d.category === 'SUPER_DREAM'
                            ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                            : d.category === 'DREAM'
                            ? 'bg-primary/10 text-primary'
                            : 'bg-surface-container-high text-text-secondary'
                        }`}
                      >
                        {d.category.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-semibold text-text-primary">{d.ctc}</td>
                    <td className="py-3 px-3">
                      <span className="px-1.5 py-0.5 rounded bg-surface-container-low text-text-secondary font-semibold">
                        ≥ {d.cgpaCutoff} CGPA
                      </span>
                    </td>
                    <td className="py-3 px-3 font-bold text-text-primary">{d.applicants} Students</td>
                    <td className="py-3 px-3 text-text-secondary">{d.date}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          d.status === 'LIVE'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                            : d.status === 'SHORTLISTING'
                            ? 'bg-primary/10 text-primary'
                            : d.status === 'PENDING_APPROVAL'
                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                            : 'bg-surface-container-high text-text-muted'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        {d.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {d.status === 'PENDING_APPROVAL' ? (
                          <button
                            type="button"
                            onClick={() => handleApproveDrive(d.id)}
                            className="px-2.5 py-1 rounded bg-emerald-600 text-white text-[11px] font-bold hover:bg-emerald-700 transition-colors shadow-xs"
                          >
                            Approve &amp; Publish
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => showToast(`Opening candidate roster for ${d.company}`)}
                            className="px-2.5 py-1 rounded bg-surface-container-low hover:bg-surface-container border border-border-subtle text-primary text-[11px] font-bold transition-colors"
                          >
                            Pipeline ({d.applicants})
                          </button>
                        )}
                        {d.status !== 'ARCHIVED' && (
                          <button
                            type="button"
                            onClick={() => handleArchiveDrive(d.id)}
                            className="px-2 py-1 rounded hover:bg-amber-50 text-amber-700 dark:hover:bg-amber-950/40 text-[11px] font-semibold border border-amber-200 dark:border-amber-800 transition-colors"
                            title="Archive Drive"
                          >
                            Archive
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. DEPARTMENT BREAKDOWN GRID                                              */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3.5">
        {placementStats && Array.isArray(placementStats.departmentBreakdown) && placementStats.departmentBreakdown.length > 0 ? (
          placementStats.departmentBreakdown.slice(0, 4).map((dept: any, idx: number) => (
            <div key={idx} className="p-3.5 rounded-xl bg-surface border border-border-subtle shadow-xs">
              <div className="flex items-center justify-between text-xs font-bold text-text-primary">
                <span className="truncate max-w-[150px]" title={dept.department}>{dept.department}</span>
                <span className={dept.placementPercentage >= 80 ? 'text-success' : 'text-primary'}>
                  {dept.placementPercentage}% Placed
                </span>
              </div>
              <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden mt-2">
                <div
                  className={`h-full transition-all duration-500 ${dept.placementPercentage >= 80 ? 'bg-success' : 'bg-primary'}`}
                  style={{ width: `${Math.max(5, Math.min(100, dept.placementPercentage))}%` }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-text-secondary">
                <span>{dept.placedStudents} / {dept.totalStudents} Students</span>
                <span className="font-semibold text-text-primary">Avg: ₹{dept.avgCTC || 14.5}L</span>
              </div>
            </div>
          ))
        ) : (
          <>
            <div className="p-3.5 rounded-xl bg-surface border border-border-subtle shadow-xs">
              <div className="flex items-center justify-between text-xs font-bold text-text-primary">
                <span>Computer Engineering</span>
                <span className="text-success">92.4% Placed</span>
              </div>
              <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden mt-2">
                <div className="bg-success h-full" style={{ width: '92.4%' }} />
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-text-secondary">
                <span>184 / 200 Students</span>
                <span className="font-semibold text-text-primary">Avg: ₹16.4L</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-surface border border-border-subtle shadow-xs">
              <div className="flex items-center justify-between text-xs font-bold text-text-primary">
                <span>Information Technology</span>
                <span className="text-success">88.5% Placed</span>
              </div>
              <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden mt-2">
                <div className="bg-success h-full" style={{ width: '88.5%' }} />
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-text-secondary">
                <span>142 / 160 Students</span>
                <span className="font-semibold text-text-primary">Avg: ₹14.8L</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-surface border border-border-subtle shadow-xs">
              <div className="flex items-center justify-between text-xs font-bold text-text-primary">
                <span>AI &amp; Data Science</span>
                <span className="text-primary">85.0% Placed</span>
              </div>
              <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden mt-2">
                <div className="bg-primary h-full" style={{ width: '85%' }} />
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-text-secondary">
                <span>102 / 120 Students</span>
                <span className="font-semibold text-text-primary">Avg: ₹15.2L</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-surface border border-border-subtle shadow-xs">
              <div className="flex items-center justify-between text-xs font-bold text-text-primary">
                <span>Electronics &amp; Telecom</span>
                <span className="text-primary">72.5% Placed</span>
              </div>
              <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden mt-2">
                <div className="bg-primary h-full" style={{ width: '72.5%' }} />
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-text-secondary">
                <span>116 / 160 Students</span>
                <span className="font-semibold text-text-primary">Avg: ₹11.5L</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL: Schedule Campus Drive                                              */}
      {/* ========================================================================= */}
      {scheduleModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-surface border border-border-subtle rounded-xl shadow-2xl p-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-primary">campaign</span>
                <h3 className="font-bold text-base text-text-primary">Schedule Campus Recruitment Drive</h3>
              </div>
              <button
                type="button"
                onClick={() => setScheduleModalOpen(false)}
                className="text-text-muted hover:text-text-primary p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateDrive} className="mt-4 space-y-3.5 text-xs">
              {/* Quick AI JD Parsing & Deduplication */}
              <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-slate-800/60 border border-blue-200/80 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Auto-Fill from Job Description &amp; Deduplicate
                  </span>
                  <button
                    type="button"
                    onClick={handleParseJd}
                    disabled={isParsingJd}
                    className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] flex items-center gap-1 transition disabled:opacity-50"
                  >
                    {isParsingJd ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Analyzing JD...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3" />
                        <span>Parse &amp; Check Duplicates</span>
                      </>
                    )}
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={newJdText}
                  onChange={(e) => setNewJdText(e.target.value)}
                  placeholder="Paste JD text here to auto-extract company, role, package, and normalize required skills ('ReactJS' -> 'React')..."
                  className="w-full p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-text-primary text-[11px] focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              {/* Deduplication Alert Banner */}
              {duplicateWarning?.is_duplicate && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs animate-in fade-in">
                  <div className="flex items-center gap-1.5 font-bold mb-1 text-amber-800 dark:text-amber-300">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Multi-Source Duplicate Opening Detected</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    {duplicateWarning.primary_match?.explanation ||
                      `Matches existing drive '${duplicateWarning.primary_match?.matched_company} - ${duplicateWarning.primary_match?.matched_role}' (${Math.round(
                        (duplicateWarning.primary_match?.similarity_score || 0.85) * 100
                      )}% similarity). Arrived via multiple channels.`}
                  </p>
                </div>
              )}

              <div>
                <label className="block font-bold text-text-primary mb-1">Company / Hiring Partner</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. NVIDIA India, Goldman Sachs"
                  value={newCompany}
                  onChange={(e) => setNewCompany(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg bg-surface-container-low border border-border-subtle text-text-primary focus:bg-surface focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block font-bold text-text-primary mb-1">Role Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Systems Engineer / Quantitative Analyst"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg bg-surface-container-low border border-border-subtle text-text-primary focus:bg-surface focus:outline-none focus:border-primary"
                />
              </div>

              {/* Normalized Skills Badges if present */}
              {(newRequiredSkills.length > 0 || newPreferredSkills.length > 0) && (
                <div className="space-y-1.5 p-2.5 rounded-lg bg-surface-container-low border border-border-subtle">
                  <span className="font-bold text-[11px] text-text-muted block">Normalized Skills Taxonomy:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {newRequiredSkills.map((s) => (
                      <span key={s} className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-bold text-[10px] border border-blue-300/50">
                        {s} (Req)
                      </span>
                    ))}
                    {newPreferredSkills.map((s) => (
                      <span key={s} className="px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-[10px]">
                        {s} (Pref)
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-text-primary mb-1">Package CTC</label>
                  <input
                    type="text"
                    value={newCtc}
                    onChange={(e) => setNewCtc(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg bg-surface-container-low border border-border-subtle text-text-primary focus:bg-surface focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block font-bold text-text-primary mb-1">CGPA Cutoff</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newCutoff}
                    onChange={(e) => setNewCutoff(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg bg-surface-container-low border border-border-subtle text-text-primary focus:bg-surface focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-text-primary mb-1">Tier Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as any)}
                  className="w-full h-9 px-3 rounded-lg bg-surface-container-low border border-border-subtle text-text-primary focus:bg-surface focus:outline-none focus:border-primary cursor-pointer"
                >
                  <option value="SUPER_DREAM">Super Dream (&gt; ₹20 LPA)</option>
                  <option value="DREAM">Dream (₹10 - ₹20 LPA)</option>
                  <option value="CORE">Core (₹5 - ₹10 LPA)</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-text-primary">
                    Official Job Description (JD) &amp; Requirements
                  </label>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!newCompany && !newRole) {
                        showToast('Please enter Company & Role first');
                        return;
                      }
                      try {
                        const res = await fetch('/api/ai/jobs/generate', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            companyName: newCompany || 'Partner Organization',
                            roleTitle: newRole || 'Graduate Engineer Trainee',
                            ctc: newCtc || '₹14.0 LPA',
                            skills: newRequiredSkills.length > 0 ? newRequiredSkills.join(', ') : 'Data Structures, Web Development, SQL',
                            minCgpa: parseFloat(newCutoff) || 7.0,
                          }),
                        });
                        const data = await res.json();
                        if (data.success && data.generatedJd) {
                          setNewJdText(data.generatedJd.formattedMarkdown);
                          showToast('Generated complete official JD with AI!');
                        }
                      } catch {
                        showToast('Failed to auto-generate JD');
                      }
                    }}
                    className="text-[11px] font-bold text-primary flex items-center gap-1 hover:underline"
                  >
                    <Sparkles className="w-3 h-3 text-primary" />
                    <span>Generate Full JD with AI</span>
                  </button>
                </div>
                <textarea
                  rows={4}
                  value={newJdText}
                  onChange={(e) => setNewJdText(e.target.value)}
                  placeholder="Official Job Description (JD), Responsibilities, Requirements, and Rounds to be visible to all candidates..."
                  className="w-full p-2.5 rounded-lg bg-surface-container-low border border-border-subtle text-text-primary text-xs focus:bg-surface focus:outline-none focus:border-primary font-mono resize-y"
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setScheduleModalOpen(false)}
                  className="px-3.5 py-2 rounded-lg bg-surface-container-low hover:bg-surface-container text-text-secondary text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-xs"
                >
                  Publish Campus Drive
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: Audit Proof (NIRF / NAAC Accreditation)                            */}
      {/* ========================================================================= */}
      {selectedOfferForAudit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-border-subtle rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
              <div>
                <h3 className="text-base font-bold text-text-primary">Package Proof Audit (NIRF / NAAC)</h3>
                <p className="text-xs text-text-secondary">
                  {selectedOfferForAudit.student?.name} • {selectedOfferForAudit.companyName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOfferForAudit(null)}
                className="p-1 rounded-lg text-text-muted hover:text-text-primary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-surface-container-low border border-border-subtle space-y-1">
                <div className="flex justify-between">
                  <span className="font-semibold text-text-muted">Total Package (CTC):</span>
                  <span className="font-mono font-bold text-text-primary">{selectedOfferForAudit.ctc}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-text-muted">Policy Tier:</span>
                  <span className="font-bold text-primary">{selectedOfferForAudit.tier}</span>
                </div>
                {selectedOfferForAudit.metadata?.packageProof?.fixedCtc && (
                  <div className="flex justify-between text-[11px]">
                    <span className="text-text-muted">Fixed Basic:</span>
                    <span className="text-text-primary">{selectedOfferForAudit.metadata.packageProof.fixedCtc}</span>
                  </div>
                )}
                {selectedOfferForAudit.metadata?.packageProof?.variableCtc && (
                  <div className="flex justify-between text-[11px]">
                    <span className="text-text-muted">Variable Component:</span>
                    <span className="text-text-primary">{selectedOfferForAudit.metadata.packageProof.variableCtc}</span>
                  </div>
                )}
                {selectedOfferForAudit.metadata?.packageProof?.joiningBonus && (
                  <div className="flex justify-between text-[11px]">
                    <span className="text-text-muted">Joining Bonus:</span>
                    <span className="text-text-primary">{selectedOfferForAudit.metadata.packageProof.joiningBonus}</span>
                  </div>
                )}
              </div>

              {selectedOfferForAudit.metadata?.packageProof?.proofDocumentUrl ? (
                <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                  <span className="font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                    <FileText className="w-4 h-4" /> Proof Document Attached
                  </span>
                  <a
                    href={selectedOfferForAudit.metadata.packageProof.proofDocumentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 rounded bg-white dark:bg-slate-800 text-primary font-bold hover:underline flex items-center gap-1 text-[11px] shadow-2xs"
                  >
                    Open Document <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 text-amber-800 dark:text-amber-300 text-[11px]">
                  No document uploaded by candidate yet. You may enter verification notes below.
                </div>
              )}

              <div>
                <label className="block text-text-primary font-semibold mb-1">Accreditation / Auditor Notes:</label>
                <textarea
                  rows={3}
                  value={auditNotes}
                  onChange={(e) => setAuditNotes(e.target.value)}
                  placeholder="e.g. Verified with HR letter and company email. Eligible for NIRF Criterion 5.2.1."
                  className="w-full p-2.5 rounded-lg border border-border-subtle bg-surface-container-low text-xs text-text-primary focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border-subtle">
                <button
                  type="button"
                  onClick={() => setSelectedOfferForAudit(null)}
                  className="px-3 py-2 rounded-lg bg-surface-container-low text-text-secondary text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleAuditProof(selectedOfferForAudit.id, 'REJECTED')}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg transition"
                >
                  Reject / Request Revision
                </button>
                <button
                  type="button"
                  onClick={() => handleAuditProof(selectedOfferForAudit.id, 'VERIFIED')}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition flex items-center gap-1.5"
                >
                  <FileCheck2 className="w-4 h-4" /> Verify for Accreditation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </StitchDashboardShell>
  );
}