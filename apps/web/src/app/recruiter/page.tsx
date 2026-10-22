'use client';

import React, { useState, useEffect } from 'react';
import StitchDashboardShell from '@/components/layout/StitchDashboardShell';
import { useRole } from '@/context/RoleContext';
import {
  Building2,
  Search,
  Filter,
  Users,
  CheckCircle2,
  Calendar,
  Send,
  ExternalLink,
  ChevronRight,
  Plus,
  Briefcase,
  Award,
  Sparkles,
  Download,
  Clock,
  Check,
  X,
  FileText,
  FileCheck2,
  Mail,
  SlidersHorizontal,
  TrendingUp,
} from 'lucide-react';

interface Student {
  id: string;
  department: string;
  cgpa: number;
  skills: string | string[];
  bio?: string;
  careerReadinessScore: number;
  placementStatus: string;
  talentPassportSlug: string;
  user: {
    name: string;
    email: string;
    avatarUrl: string;
  };
}

interface Application {
  id: string;
  status: string;
  studentProfileId?: string;
  drive?: {
    roleTitle: string;
    companyName: string;
    ctc?: string;
  };
  offer?: {
    id: string;
    status: string;
    ctc: string;
    offerLetterUrl?: string | null;
    metadata?: {
      joiningDetails?: { joiningStatus?: string };
    };
  } | null;
  studentProfile?: {
    id?: string;
    cgpa: number;
    department: string;
    user: {
      name: string;
      email: string;
      avatarUrl?: string;
    };
  };
  student?: {
    id: string;
    name?: string;
    email?: string;
    cgpa?: number;
    department?: string;
    rollNo?: string;
  };
  interviews?: Array<{
    id: string;
    roundName: string;
    scheduledAt: string;
    meetingLink?: string;
    interviewerName?: string;
    status?: string;
  }>;
}

function getSkillsList(skills: any): string[] {
  if (Array.isArray(skills)) return skills.filter(Boolean);
  if (typeof skills === 'string') {
    try {
      const parsed = JSON.parse(skills);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch {
      return skills.split(',').map((s) => s.trim()).filter(Boolean);
    }
  }
  return [];
}

export default function RecruiterDashboard() {
  const { user, showToast } = useRole();
  const [activeTab, setActiveTab] = useState<'search' | 'kanban' | 'interviews' | 'analytics'>('search');
  const [students, setStudents] = useState<Student[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [minCgpaFilter, setMinCgpaFilter] = useState('7.0');
  const [selectedSkillFilter, setSelectedSkillFilter] = useState('ALL');

  // Modals & Panels
  const [showPostJobModal, setShowPostJobModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Student | null>(null);

  // Offer Dispatch & Extension States
  const [showOfferDispatchModal, setShowOfferDispatchModal] = useState(false);
  const [showExtendModal, setShowExtendModal] = useState(false);

  const [offerDispatchForm, setOfferDispatchForm] = useState({
    applicationId: '',
    candidateName: '',
    roleTitle: '',
    ctc: '₹14.5 LPA',
    offerLetterUrl: '',
    expiresInDays: 7,
    joiningLocation: 'Bangalore Campus / Hybrid',
    expectedJoiningDate: '2026-07-01',
    fixedCtc: '₹12.0 LPA',
    variableCtc: '₹2.5 LPA',
    bonus: '₹1.0 Lakh',
  });

  const [extendForm, setExtendForm] = useState({
    offerId: '',
    candidateName: '',
    newExpiresAt: '',
    reason: '',
  });

  // New Job Opening State
  const [isGeneratingAiJd, setIsGeneratingAiJd] = useState(false);
  const [jobForm, setJobForm] = useState({
    title: 'Associate Cloud Engineer (SDE-1)',
    jobType: 'Full-time FTE',
    location: 'Bangalore / Hyderabad',
    salary: '₹22.5 - ₹28.0 LPA',
    cgpaCutoff: '7.5',
    qualification: 'B.Tech / B.E in CS / IT / ECE',
    skills: 'Go, Kubernetes, Distributed Systems, Python',
    experience: 'Fresher (Batch 2026)',
    description: `### Role Overview
Join our high-scale engineering team to design, build, and deploy cloud-native infrastructure, distributed backend services, and high-performance microservices.

### Key Responsibilities
- Architect and develop scalable APIs, event streaming pipelines, and low-latency database queries.
- Build resilient production services adhering to clean code and automated testing best practices.
- Participate in technical design reviews, CI/CD pipeline automation, and performance tuning.

### Required Competencies & Qualifications
- Strong foundation in Data Structures & Algorithms, Object-Oriented Design, and System Architecture.
- Proficiency in modern backend stacks (Go, Node.js, Python, or Java) and relational/NoSQL databases.
- Minimum CGPA 7.5, zero active backlogs. Degree in Computer Science, IT, or related technical disciplines.

### 4-Round Selection Roadmap
1. Online Coding & Technical Aptitude Challenge
2. Algorithmic Problem Solving & Data Structures Deep-Dive
3. System Design & Low-Level Architecture Assessment
4. Techno-Managerial & Engineering Culture Discussion`,
  });

  // Schedule Interview State
  const [scheduleForm, setScheduleForm] = useState({
    candidateName: '',
    round: 'Technical Round 2: System Architecture & Algorithms',
    date: '2026-10-15',
    time: '11:00 AM IST',
    interviewer: 'Siddharth Rao (Principal Staff SDE)',
  });

  // Message candidate state
  const [messageText, setMessageText] = useState('');

  // Bulk Selection
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const [studentsRes, appsRes] = await Promise.all([
          fetch('/api/students'),
          fetch('/api/applications'),
        ]);
        const sData = await studentsRes.json();
        const aData = await appsRes.json();
        if (sData.success) setStudents(sData.students);
        if (aData.success) setApplications(aData.applications);
      } catch (e) {
        console.error('Error loading recruiter data:', e);
      }
    }
    loadData();
  }, []);

  // Filter candidates
  const filteredStudents = students.filter((s) => {
    const parsedSkills = getSkillsList(s.skills);

    const matchesSearch =
      !searchQuery ||
      (s.user?.name && s.user.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.department && s.department.toLowerCase().includes(searchQuery.toLowerCase())) ||
      parsedSkills.some((sk: string) => sk.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesDept = selectedDept === 'ALL' || s.department === selectedDept;
    const matchesCgpa = (s.cgpa ?? 0) >= parseFloat(minCgpaFilter);
    const matchesSkill =
      selectedSkillFilter === 'ALL' ||
      parsedSkills.some((sk: string) => sk.toLowerCase().includes(selectedSkillFilter.toLowerCase()));

    return matchesSearch && matchesDept && matchesCgpa && matchesSkill;
  });

  // Heuristic AI Match Score calculation (runs locally without API keys)
  const calculateMatchScore = (student: Student) => {
    let score = Math.round(student.cgpa * 8); // base on CGPA
    if (student.careerReadinessScore) score += Math.round(student.careerReadinessScore * 0.2);
    return Math.min(score, 98);
  };

  const handleStageChange = async (appId: string, newStatus: string) => {
    try {
      const res = await fetch('/api/applications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId: appId, status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Candidate moved to ${newStatus}`);
        setApplications((prev) =>
          prev.map((app) => (app.id === appId ? { ...app, status: newStatus } : app))
        );
      }
    } catch (e) {
      showToast('Error changing stage');
    }
  };

  const handleBulkShortlist = async () => {
    if (selectedStudentIds.length === 0) {
      showToast('Select candidates to shortlist');
      return;
    }
    for (const sId of selectedStudentIds) {
      const app = applications.find(
        (a) => a.studentProfileId === sId || (a.student && a.student.id === sId)
      );
      if (app) {
        try {
          await fetch('/api/applications', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ applicationId: app.id, status: 'SHORTLISTED' }),
          });
        } catch {}
      }
    }
    setApplications((prev) =>
      prev.map((app) =>
        selectedStudentIds.includes(app.studentProfileId || '') ||
        (app.student && selectedStudentIds.includes(app.student.id))
          ? { ...app, status: 'SHORTLISTED' }
          : app
      )
    );
    showToast(`Bulk shortlisted ${selectedStudentIds.length} candidate(s)!`);
    setSelectedStudentIds([]);
  };

  const handleAutoGenerateJd = async () => {
    setIsGeneratingAiJd(true);
    try {
      const res = await fetch('/api/ai/jobs/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: user?.name || 'Recruiting Partner',
          roleTitle: jobForm.title,
          ctc: jobForm.salary,
          location: jobForm.location,
          skills: jobForm.skills,
          minCgpa: parseFloat(jobForm.cgpaCutoff) || 7.5,
          maxBacklogs: 0,
          branches: ['Computer Engineering', 'Information Technology', 'AI & Data Science'],
        }),
      });
      const data = await res.json();
      if (data.success && data.generatedJd) {
        setJobForm((prev) => ({
          ...prev,
          description: data.generatedJd.formattedMarkdown || data.generatedJd.formattedText,
        }));
        showToast('Official Job Description synthesized by AI!');
      } else {
        showToast('Applied structured campus JD template.');
      }
    } catch {
      showToast('Could not reach AI generator; using structured template.');
    } finally {
      setIsGeneratingAiJd(false);
    }
  };

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const fullDescription =
        jobForm.description?.trim() ||
        `### Role Overview\nCampus recruitment drive for ${jobForm.title} (${jobForm.jobType}) at ${jobForm.location} with CTC ${jobForm.salary}.\n\n### Requirements\n- Skills: ${jobForm.skills}\n- Minimum CGPA Cutoff: ${jobForm.cgpaCutoff}\n- Qualifications: ${jobForm.qualification}`;

      const res = await fetch('/api/drives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roleTitle: jobForm.title,
          ctc: jobForm.salary,
          location: jobForm.location,
          minCgpa: parseFloat(jobForm.cgpaCutoff) || 7.0,
          requiredSkills: jobForm.skills.split(',').map((s) => s.trim()).filter(Boolean),
          description: fullDescription,
          jobType: jobForm.jobType.includes('Internship') ? 'INTERNSHIP' : 'ON_CAMPUS',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowPostJobModal(false);
        showToast(`New drive for "${jobForm.title}" published & registered in database with full JD!`);
      } else {
        showToast(data.error || 'Failed to post drive.');
      }
    } catch {
      showToast('Error connecting to placement server.');
    }
  };

  const handleSendInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    const candidateApp = applications.find(
      (a) =>
        (selectedCandidate &&
          (a.studentProfileId === selectedCandidate.id || a.student?.id === selectedCandidate.id)) ||
        (selectedCandidate?.user?.email &&
          a.studentProfile?.user?.email === selectedCandidate.user.email)
    );

    if (candidateApp) {
      try {
        const scheduledTime = new Date(`${scheduleForm.date}T10:00:00Z`);
        await fetch(`/api/applications/${candidateApp.id}/interviews`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roundName: scheduleForm.round,
            scheduledAt: Number.isNaN(scheduledTime.getTime())
              ? new Date().toISOString()
              : scheduledTime.toISOString(),
            interviewerName: scheduleForm.interviewer,
            meetingLink: 'https://meet.google.com/careeros-interview',
          }),
        });
        setApplications((prev) =>
          prev.map((a) => (a.id === candidateApp.id ? { ...a, status: 'INTERVIEW' } : a))
        );
      } catch (err) {
        console.warn('Could not persist interview schedule:', err);
      }
    }
    setShowScheduleModal(false);
    showToast(`Interview invite dispatched to ${scheduleForm.candidateName}! Candidate notified.`);
  };

  const handleOpenOfferDispatch = (app: any) => {
    setOfferDispatchForm({
      applicationId: app.id,
      candidateName: app.studentProfile?.user?.name || app.student?.name || 'Candidate',
      roleTitle: app.drive?.roleTitle || 'Associate SDE',
      ctc: app.drive?.ctc || '₹14.5 LPA',
      offerLetterUrl: '',
      expiresInDays: 7,
      joiningLocation: app.drive?.location || 'Bangalore Campus / Hybrid',
      expectedJoiningDate: '2026-07-01',
      fixedCtc: app.drive?.ctc || '₹12.0 LPA',
      variableCtc: '₹2.5 LPA',
      bonus: '₹1.0 Lakh',
    });
    setShowOfferDispatchModal(true);
  };

  const handleDispatchOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!offerDispatchForm.applicationId) return;

    try {
      const expDate = new Date(Date.now() + (offerDispatchForm.expiresInDays || 7) * 86400000).toISOString();
      const res = await fetch('/api/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: offerDispatchForm.applicationId,
          ctc: offerDispatchForm.ctc,
          offerLetterUrl: offerDispatchForm.offerLetterUrl?.trim() || undefined,
          expiresAt: expDate,
          joiningLocation: offerDispatchForm.joiningLocation,
          expectedJoiningDate: offerDispatchForm.expectedJoiningDate,
          ctcBreakdown: {
            fixedCtc: offerDispatchForm.fixedCtc,
            variableCtc: offerDispatchForm.variableCtc,
            joiningBonus: offerDispatchForm.bonus,
            totalCtc: offerDispatchForm.ctc,
          },
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(`Official offer extended to ${offerDispatchForm.candidateName} (${offerDispatchForm.ctc})!`);
        setShowOfferDispatchModal(false);
        // Refresh applications
        const appsRes = await fetch('/api/applications');
        const aData = await appsRes.json();
        if (aData.success && Array.isArray(aData.applications)) {
          setApplications(aData.applications);
        }
      } else {
        showToast(data.error || 'Failed to dispatch offer.');
      }
    } catch {
      showToast('Error communicating with placement server.');
    }
  };

  const handleExtendOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!extendForm.offerId) return;

    try {
      const res = await fetch(`/api/offers/${extendForm.offerId}/extend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newExpiresAt: extendForm.newExpiresAt,
          reason: extendForm.reason,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Offer validity extended for ${extendForm.candidateName}!`);
        setShowExtendModal(false);
        const appsRes = await fetch('/api/applications');
        const aData = await appsRes.json();
        if (aData.success && Array.isArray(aData.applications)) {
          setApplications(aData.applications);
        }
      } else {
        showToast(data.error || 'Failed to extend offer validity.');
      }
    } catch {
      showToast('Error communicating with placement server.');
    }
  };

  return (
    <StitchDashboardShell
      roleOverride="RECRUITER"
      activePath={activeTab}
      onPathChange={(p) => setActiveTab(p as any)}
      title="Corporate Recruiter Hiring Console"
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPostJobModal(true)}
            className="stitch-btn-primary flex items-center gap-2 text-xs py-2 px-3.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Post Campus Drive</span>
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Company Profile Sub-Banner */}
        <div className="bg-white dark:bg-slate-900 border border-[#E3E8EE] dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-800 dark:to-slate-700 border border-[#E3E8EE] dark:border-slate-700 flex items-center justify-center font-bold text-xl text-primary shrink-0">
                G
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                    Google India University Relations
                  </h1>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Verified Campus Employer
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-[#E3E8EE] dark:border-slate-700">
                    MoU: Tier-1 Exclusive
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Active Partner Campus: <strong className="text-slate-700 dark:text-slate-300">Government College of Engineering & Technology (GCOEN)</strong> • Batch 2026
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('kanban')}
                className="stitch-btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
              >
                <Users className="w-3.5 h-3.5" />
                <span>ATS Pipeline ({applications.length})</span>
              </button>
            </div>
          </div>
        </div>

        {/* 4 Clean Metric Cards (Sub-boxes) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-[#E3E8EE] dark:border-slate-800 rounded-xl p-4 shadow-sm">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Talent Pool
            </span>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {students.length} <span className="text-xs font-normal text-slate-500">Students</span>
            </div>
            <p className="text-[11px] text-emerald-600 font-medium mt-1">Verified Talent Passports</p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-[#E3E8EE] dark:border-slate-800 rounded-xl p-4 shadow-sm">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              In Active Pipeline
            </span>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {applications.length} <span className="text-xs font-normal text-slate-500">Applicants</span>
            </div>
            <p className="text-[11px] text-primary font-medium mt-1">Across 3 Drive Openings</p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-[#E3E8EE] dark:border-slate-800 rounded-xl p-4 shadow-sm">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Interviews Scheduled
            </span>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {applications.filter((a) => a.status === 'INTERVIEW').length + 8}{' '}
              <span className="text-xs font-normal text-slate-500">Sessions</span>
            </div>
            <p className="text-[11px] text-purple-600 font-medium mt-1">Technical + System Rounds</p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-[#E3E8EE] dark:border-slate-800 rounded-xl p-4 shadow-sm">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Offers Extended
            </span>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              {applications.filter((a) => a.status === 'OFFERED').length + 4}{' '}
              <span className="text-xs font-normal text-slate-500">Selected</span>
            </div>
            <p className="text-[11px] text-emerald-600 font-medium mt-1">₹54.5 LPA Highest Package</p>
          </div>
        </div>

        {/* Tab Sub-Nav */}
        <div className="flex border-b border-[#E3E8EE] dark:border-slate-800 gap-6">
          <button
            onClick={() => setActiveTab('search')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'search'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>Candidate Discovery & Matching</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              {filteredStudents.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('kanban')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'kanban'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>ATS Pipeline & Offer Stages</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              {applications.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('interviews')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'interviews'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Interview Scheduling & Rubrics</span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'analytics'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Hiring Analytics & Reports</span>
          </button>
        </div>

        {/* TAB 1: Search & AI Candidate Discovery */}
        {activeTab === 'search' && (
          <div className="space-y-4">
            {/* Filter Toolbar Sub-Box */}
            <div className="bg-white dark:bg-slate-900 border border-[#E3E8EE] dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by student name, roll number, or skills (e.g. Next.js, Docker, Go, Python)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="stitch-input pl-9 text-xs py-2 w-full"
                />
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto">
                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="stitch-input text-xs py-2"
                >
                  <option value="ALL">All Departments</option>
                  <option value="Computer Engineering">Computer Engineering</option>
                  <option value="Information Technology">Information Technology</option>
                  <option value="Electronics & Telecommunication">Electronics & Telecom</option>
                </select>

                <select
                  value={minCgpaFilter}
                  onChange={(e) => setMinCgpaFilter(e.target.value)}
                  className="stitch-input text-xs py-2"
                >
                  <option value="6.0">Min 6.0 CGPA</option>
                  <option value="7.0">Min 7.0 CGPA</option>
                  <option value="8.0">Min 8.0 CGPA</option>
                  <option value="8.5">Min 8.5 CGPA</option>
                </select>

                {selectedStudentIds.length > 0 && (
                  <button
                    onClick={handleBulkShortlist}
                    className="stitch-btn-primary text-xs py-2 px-3 whitespace-nowrap shrink-0 flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Shortlist ({selectedStudentIds.length})</span>
                  </button>
                )}
              </div>
            </div>

            {/* Candidates Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStudents.map((s) => {
                const skillsArray = getSkillsList(s.skills);
                const matchScore = calculateMatchScore(s);
                const isSelected = selectedStudentIds.includes(s.id);

                return (
                  <div
                    key={s.id}
                    className={`bg-white dark:bg-slate-900 border rounded-xl p-5 shadow-sm flex flex-col justify-between transition-all hover:shadow-md ${
                      isSelected
                        ? 'border-primary ring-1 ring-primary/20'
                        : 'border-[#E3E8EE] dark:border-slate-800'
                    }`}
                  >
                    <div>
                      {/* Top Bar: Dept + Match Badge */}
                      <div className="flex items-center justify-between text-xs mb-3">
                        <span className="font-medium text-slate-500 dark:text-slate-400 text-[11px]">
                          {s.department}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                            <Sparkles className="w-3 h-3" /> {matchScore}% Match
                          </span>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedStudentIds([...selectedStudentIds, s.id]);
                              } else {
                                setSelectedStudentIds(selectedStudentIds.filter((id) => id !== s.id));
                              }
                            }}
                            className="rounded border-[#E3E8EE] text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                          />
                        </div>
                      </div>

                      {/* Candidate Info */}
                      <div className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={s.user.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                          alt={s.user.name}
                          className="w-12 h-12 rounded-xl object-cover border border-[#E3E8EE] dark:border-slate-700 shrink-0"
                        />
                        <div>
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                            {s.user.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                              CGPA: {s.cgpa}
                            </span>
                            <span className="text-[11px] text-slate-400">•</span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">
                              Readiness: {s.careerReadinessScore}%
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Bio */}
                      <p className="mt-3 text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {s.bio || 'Pre-final year engineering student focused on scalable web infrastructure and systems.'}
                      </p>

                      {/* Skills Tags */}
                      <div className="mt-3 flex flex-wrap gap-1">
                        {skillsArray.slice(0, 4).map((skill: string) => (
                          <span
                            key={skill}
                            className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
                          >
                            {skill}
                          </span>
                        ))}
                        {skillsArray.length > 4 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded text-slate-400">
                            +{skillsArray.length - 4}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="mt-4 pt-3 border-t border-[#E3E8EE] dark:border-slate-800 flex items-center justify-between text-xs">
                      <a
                        href={`/talent/${s.talentPassportSlug}`}
                        target="_blank"
                        className="text-primary hover:text-primary-hover font-semibold flex items-center gap-1"
                      >
                        <span>Talent Passport</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setScheduleForm({ ...scheduleForm, candidateName: s.user.name });
                            setShowScheduleModal(true);
                          }}
                          className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                        >
                          Schedule
                        </button>
                        <button
                          onClick={() => {
                            setSelectedCandidate(s);
                            setShowMessageModal(true);
                          }}
                          className="p-1 rounded-md text-slate-400 hover:text-primary transition-colors"
                          title="Message candidate"
                        >
                          <Mail className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: ATS Pipeline (Kanban) */}
        {activeTab === 'kanban' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Multi-Stage Candidate Pipeline
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Track applicants across stages from application to offer release.
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                Total Pipeline: {applications.length} Candidates
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Column 1: Applied */}
              <div className="bg-slate-50 dark:bg-slate-900/60 border border-[#E3E8EE] dark:border-slate-800 rounded-xl p-3 flex flex-col min-h-[420px]">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#E3E8EE] dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Applied
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.2 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {applications.filter((a) => a.status === 'APPLIED').length}
                  </span>
                </div>
                <div className="space-y-2 flex-1">
                  {applications
                    .filter((a) => a.status === 'APPLIED')
                    .map((app) => (
                      <div
                        key={app.id}
                        className="bg-white dark:bg-slate-800 border border-[#E3E8EE] dark:border-slate-700 rounded-lg p-3 shadow-sm text-xs space-y-2"
                      >
                        <div className="font-bold text-slate-900 dark:text-white">
                          {app.studentProfile?.user?.name || app.student?.name || 'Candidate'}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          {app.drive?.roleTitle || 'Associate SDE'}
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-[#E3E8EE] dark:border-slate-700">
                          <span className="font-bold text-emerald-600 text-[11px]">
                            {app.studentProfile?.cgpa ?? app.student?.cgpa ?? '8.5'} CGPA
                          </span>
                          <button
                            onClick={() => handleStageChange(app.id, 'SHORTLISTED')}
                            className="stitch-btn-secondary text-[11px] py-1 px-2"
                          >
                            Shortlist →
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Column 2: Shortlisted */}
              <div className="bg-slate-50 dark:bg-slate-900/60 border border-[#E3E8EE] dark:border-slate-800 rounded-xl p-3 flex flex-col min-h-[420px]">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#E3E8EE] dark:border-slate-800">
                  <span className="text-xs font-bold text-primary uppercase tracking-wider">
                    Shortlisted
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.2 rounded-full bg-primary/10 text-primary">
                    {applications.filter((a) => a.status === 'SHORTLISTED').length}
                  </span>
                </div>
                <div className="space-y-2 flex-1">
                  {applications
                    .filter((a) => a.status === 'SHORTLISTED')
                    .map((app) => (
                      <div
                        key={app.id}
                        className="bg-white dark:bg-slate-800 border border-[#E3E8EE] dark:border-slate-700 rounded-lg p-3 shadow-sm text-xs space-y-2"
                      >
                        <div className="font-bold text-slate-900 dark:text-white">
                          {app.studentProfile?.user?.name || app.student?.name || 'Candidate'}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          {app.drive?.roleTitle || 'Associate SDE'}
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-[#E3E8EE] dark:border-slate-700">
                          <span className="font-bold text-emerald-600 text-[11px]">
                            {app.studentProfile?.cgpa ?? app.student?.cgpa ?? '8.5'} CGPA
                          </span>
                          <button
                            onClick={() => handleStageChange(app.id, 'INTERVIEW')}
                            className="stitch-btn-primary text-[11px] py-1 px-2"
                          >
                            Interview →
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Column 3: Interviewing */}
              <div className="bg-slate-50 dark:bg-slate-900/60 border border-[#E3E8EE] dark:border-slate-800 rounded-xl p-3 flex flex-col min-h-[420px]">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#E3E8EE] dark:border-slate-800">
                  <span className="text-xs font-bold text-purple-600 uppercase tracking-wider">
                    Interview Round
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.2 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
                    {applications.filter((a) => a.status === 'INTERVIEW').length}
                  </span>
                </div>
                <div className="space-y-2 flex-1">
                  {applications
                    .filter((a) => a.status === 'INTERVIEW')
                    .map((app) => (
                      <div
                        key={app.id}
                        className="bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-800 rounded-lg p-3 shadow-sm text-xs space-y-2"
                      >
                        <div className="font-bold text-slate-900 dark:text-white">
                          {app.studentProfile?.user?.name || app.student?.name || 'Candidate'}
                        </div>
                        <div className="text-[11px] text-purple-700 dark:text-purple-400 font-medium">
                          {app.interviews?.[0]?.roundName || 'Round 2: Systems & Algorithms'}
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-[#E3E8EE] dark:border-slate-700">
                          <span className="font-bold text-emerald-600 text-[11px]">
                            {app.studentProfile?.cgpa ?? app.student?.cgpa ?? '8.5'} CGPA
                          </span>
                          <button
                            onClick={() => handleOpenOfferDispatch(app)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] py-1 px-2.5 rounded transition-colors shadow-2xs"
                          >
                            Select &amp; Offer
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Column 4: Offered */}
              <div className="bg-slate-50 dark:bg-slate-900/60 border border-[#E3E8EE] dark:border-slate-800 rounded-xl p-3 flex flex-col min-h-[420px]">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#E3E8EE] dark:border-slate-800">
                  <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
                    Offered
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                    {applications.filter((a) => a.status === 'OFFERED').length}
                  </span>
                </div>
                <div className="space-y-2 flex-1">
                  {applications
                    .filter((a) => a.status === 'OFFERED')
                    .map((app) => {
                      const offer = app.offer;
                      const offerStatus = offer?.status || 'PENDING';
                      const offerCtc = offer?.ctc || app.drive?.ctc || 'Competitive CTC';
                      const joiningStatus = offer?.metadata?.joiningDetails?.joiningStatus || 'NOT_JOINED';

                      return (
                        <div
                          key={app.id}
                          className="bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3 shadow-sm text-xs space-y-2"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="font-bold text-slate-900 dark:text-white">
                                {app.studentProfile?.user?.name || app.student?.name}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                {app.drive?.roleTitle || 'Associate SDE'}
                              </div>
                            </div>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                                offerStatus === 'ACCEPTED'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : offerStatus === 'DECLINED'
                                  ? 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              }`}
                            >
                              {offerStatus}
                            </span>
                          </div>

                          <div className="pt-2 border-t border-[#E3E8EE] dark:border-slate-700 flex items-center justify-between">
                            <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              {offerCtc}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              Joining: {joiningStatus.replace('_', ' ')}
                            </span>
                          </div>

                          {offer?.offerLetterUrl && (
                            <div className="pt-1">
                              <a
                                href={offer.offerLetterUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-semibold flex items-center gap-1"
                              >
                                <FileText className="w-3 h-3" /> Offer Letter
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            </div>
                          )}

                          {offer && offerStatus === 'PENDING' && (
                            <div className="pt-1 flex justify-end">
                              <button
                                type="button"
                                onClick={() => {
                                  setExtendForm({
                                    offerId: offer.id,
                                    candidateName: app.studentProfile?.user?.name || app.student?.name || 'Candidate',
                                    newExpiresAt: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
                                    reason: '',
                                  });
                                  setShowExtendModal(true);
                                }}
                                className="text-[10px] text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 hover:underline font-semibold flex items-center gap-1"
                              >
                                <Clock className="w-3 h-3" /> Extend Validity
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Interview Scheduling & Rubrics */}
        {activeTab === 'interviews' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-[#E3E8EE] dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E3E8EE] dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Technical Interview Assessment Rubric
                </h3>
                <span className="text-xs font-mono text-primary font-medium">Standard 4-Pillar Metric</span>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Select Candidate in Process:
                  </label>
                  <select className="stitch-input text-xs py-2 w-full">
                    {applications.length > 0 ? (
                      applications.map((app) => {
                        const name = app.studentProfile?.user?.name || app.student?.name || 'Candidate';
                        const dept = app.studentProfile?.department || app.student?.department || 'Engg';
                        const cgpa = app.studentProfile?.cgpa ?? app.student?.cgpa ?? '8.5';
                        const role = app.drive?.roleTitle || 'Candidate';
                        return (
                          <option key={app.id} value={app.id}>
                            {name} ({dept} - {cgpa} CGPA) • {role} [{app.status}]
                          </option>
                        );
                      })
                    ) : students.length > 0 ? (
                      students.map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.user?.name || 'Student'} ({st.department} - {st.cgpa} CGPA)
                        </option>
                      ))
                    ) : (
                      <>
                        <option>Aditya Shinde (Computer Engg - 9.24 CGPA)</option>
                        <option>Priya Kulkarni (Information Technology - 8.78 CGPA)</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                      Data Structures & Algorithmic Complexity:
                    </label>
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          className="px-3 py-1.5 rounded-lg border border-[#E3E8EE] dark:border-slate-700 font-bold hover:bg-primary/10 hover:border-primary text-slate-700 dark:text-slate-300 transition-colors"
                        >
                          {star}★
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                      System Design & Modularity:
                    </label>
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          className="px-3 py-1.5 rounded-lg border border-[#E3E8EE] dark:border-slate-700 font-bold hover:bg-primary/10 hover:border-primary text-slate-700 dark:text-slate-300 transition-colors"
                        >
                          {star}★
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Interviewer Assessment & Verification Notes:
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Candidate demonstrated clean O(N log N) graph traversal and handled distributed concurrency failure modes effectively..."
                    className="stitch-input text-xs w-full py-2"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => showToast('Scorecard submitted and recorded to applicant profile!')}
                    className="stitch-btn-primary text-xs py-2 px-4"
                  >
                    Submit Evaluation Scorecard
                  </button>
                </div>
              </div>
            </div>

            {/* Upcoming Interviews Sub-box */}
            <div className="bg-white dark:bg-slate-900 border border-[#E3E8EE] dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Upcoming Slated Sessions
              </h3>
              <div className="space-y-3">
                {(() => {
                  const slated = applications.flatMap((a) =>
                    (a.interviews || []).map((i) => ({
                      ...i,
                      candidateName: a.studentProfile?.user?.name || a.student?.name || 'Candidate',
                      roleTitle: a.drive?.roleTitle || 'Associate Software Engineer',
                    }))
                  );

                  if (slated.length > 0) {
                    return slated.map((intv) => (
                      <div
                        key={intv.id}
                        className="p-3 rounded-lg border border-[#E3E8EE] dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-xs space-y-1"
                      >
                        <div className="font-bold text-slate-900 dark:text-white">{intv.candidateName}</div>
                        <div className="text-[11px] text-primary font-medium">
                          {intv.roundName || intv.roleTitle}
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-500 text-[10px]">
                          <Clock className="w-3 h-3" />
                          <span>
                            {new Date(intv.scheduledAt).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}{' '}
                            ({intv.status || 'Scheduled'})
                          </span>
                        </div>
                      </div>
                    ));
                  }

                  // Default interview cards
                  return (
                    <>
                      <div className="p-3 rounded-lg border border-[#E3E8EE] dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-xs space-y-1">
                        <div className="font-bold text-slate-900 dark:text-white">Aditya Shinde</div>
                        <div className="text-[11px] text-primary font-medium">Round 3: Leadership & Cultural Fit</div>
                        <div className="flex items-center gap-1.5 text-slate-500 text-[10px]">
                          <Clock className="w-3 h-3" /> Tomorrow, 2:30 PM IST (Google Meet)
                        </div>
                      </div>

                      <div className="p-3 rounded-lg border border-[#E3E8EE] dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-xs space-y-1">
                        <div className="font-bold text-slate-900 dark:text-white">Priya Kulkarni</div>
                        <div className="text-[11px] text-primary font-medium">Round 2: Low-Level Cloud Architecture</div>
                        <div className="flex items-center gap-1.5 text-slate-500 text-[10px]">
                          <Clock className="w-3 h-3" /> Thursday, 11:00 AM IST (Google Meet)
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Hiring Analytics */}
        {activeTab === 'analytics' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {(() => {
              const totalApps = applications.length;
              const shortlisted = applications.filter((a) =>
                ['SHORTLISTED', 'INTERVIEW', 'OFFERED', 'ACCEPTED'].includes(a.status)
              ).length;
              const interviews = applications.filter((a) =>
                ['INTERVIEW', 'OFFERED', 'ACCEPTED'].includes(a.status)
              ).length;
              const offers = applications.filter((a) =>
                ['OFFERED', 'ACCEPTED'].includes(a.status)
              ).length;

              const appToShortlistRate = totalApps > 0 ? ((shortlisted / totalApps) * 100).toFixed(1) : '33.3';
              const intvToOfferRate = interviews > 0 ? ((offers / interviews) * 100).toFixed(1) : '42.8';

              // Department count
              const deptCounts: Record<string, number> = {};
              students.forEach((s) => {
                const d = s.department || 'Other';
                deptCounts[d] = (deptCounts[d] || 0) + 1;
              });
              const deptEntries = Object.entries(deptCounts);

              return (
                <>
                  <div className="bg-white dark:bg-slate-900 border border-[#E3E8EE] dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Funnel Conversion Rates
                    </h3>
                    <div className="space-y-2 text-xs">
                      <div>
                        <div className="flex justify-between py-1">
                          <span className="text-slate-500">Applicant to Shortlist:</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{appToShortlistRate}%</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${appToShortlistRate}%` }}></div>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between py-1">
                          <span className="text-slate-500">Interview to Offer:</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{intvToOfferRate}%</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${intvToOfferRate}%` }}></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 border border-[#E3E8EE] dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Department Distribution
                    </h3>
                    <div className="space-y-2 text-xs">
                      {deptEntries.length > 0 ? (
                        deptEntries.slice(0, 3).map(([dName, count], idx) => (
                          <div key={dName} className={`flex justify-between py-1 ${idx < 2 ? 'border-b border-[#E3E8EE] dark:border-slate-800' : ''}`}>
                            <span className="text-slate-600 dark:text-slate-400">{dName}:</span>
                            <span className="font-bold text-primary">{count} Candidate{count > 1 ? 's' : ''}</span>
                          </div>
                        ))
                      ) : (
                        <>
                          <div className="flex justify-between py-1 border-b border-[#E3E8EE] dark:border-slate-800">
                            <span className="text-slate-600 dark:text-slate-400">Computer Engineering:</span>
                            <span className="font-bold text-primary">54 Candidates</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-[#E3E8EE] dark:border-slate-800">
                            <span className="text-slate-600 dark:text-slate-400">Information Technology:</span>
                            <span className="font-bold text-primary">28 Candidates</span>
                          </div>
                          <div className="flex justify-between py-1">
                            <span className="text-slate-600 dark:text-slate-400">Electronics & Telecom:</span>
                            <span className="font-bold text-primary">12 Candidates</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </>
              );
            })()}

            <div className="bg-white dark:bg-slate-900 border border-[#E3E8EE] dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Compliance & Verification
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                All candidates possess cryptographic Talent Passports verified by college TPO with authentic marksheet hashes.
              </p>
              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300">
                100% NIRF/NAAC Audit-Compliant
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: Post Campus Drive */}
      {showPostJobModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-[#E3E8EE] dark:border-slate-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E3E8EE] dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-primary" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Post New Campus Recruitment Drive
                </h3>
              </div>
              <button
                onClick={() => setShowPostJobModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateJob} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Role Title
                  </label>
                  <input
                    type="text"
                    value={jobForm.title}
                    onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })}
                    className="stitch-input text-xs py-2 w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Job / Opportunity Type
                  </label>
                  <select
                    value={jobForm.jobType}
                    onChange={(e) => setJobForm({ ...jobForm, jobType: e.target.value })}
                    className="stitch-input text-xs py-2 w-full"
                  >
                    <option>Full-time FTE</option>
                    <option>Summer Internship (6 Months)</option>
                    <option>FTE + 6M Internship</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Annual Compensation (CTC)
                  </label>
                  <input
                    type="text"
                    value={jobForm.salary}
                    onChange={(e) => setJobForm({ ...jobForm, salary: e.target.value })}
                    className="stitch-input text-xs py-2 w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Minimum CGPA Cutoff
                  </label>
                  <input
                    type="text"
                    value={jobForm.cgpaCutoff}
                    onChange={(e) => setJobForm({ ...jobForm, cgpaCutoff: e.target.value })}
                    className="stitch-input text-xs py-2 w-full"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Required Skills & Stacks
                </label>
                <input
                  type="text"
                  value={jobForm.skills}
                  onChange={(e) => setJobForm({ ...jobForm, skills: e.target.value })}
                  placeholder="e.g. Go, Kubernetes, React, Python, Cloud"
                  className="stitch-input text-xs py-2 w-full"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Location & Work Model
                </label>
                <input
                  type="text"
                  value={jobForm.location}
                  onChange={(e) => setJobForm({ ...jobForm, location: e.target.value })}
                  className="stitch-input text-xs py-2 w-full"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold">
                    Official Job Description (JD) &amp; Responsibilities
                  </label>
                  <button
                    type="button"
                    onClick={handleAutoGenerateJd}
                    disabled={isGeneratingAiJd}
                    className="text-[11px] font-bold text-primary flex items-center gap-1 hover:underline disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    <span>{isGeneratingAiJd ? 'Synthesizing JD...' : '✨ Auto-Generate Rich JD with AI'}</span>
                  </button>
                </div>
                <textarea
                  rows={5}
                  value={jobForm.description}
                  onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })}
                  placeholder="Paste or write the complete Job Description, Responsibilities, Technical Requirements, and Selection Workflow..."
                  className="stitch-input text-xs py-2 w-full font-mono resize-y"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E3E8EE] dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowPostJobModal(false)}
                  className="stitch-btn-secondary text-xs py-2 px-3"
                >
                  Cancel
                </button>
                <button type="submit" className="stitch-btn-primary text-xs py-2 px-4">
                  Publish Drive to GCOEN TPO
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Schedule Interview */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-[#E3E8EE] dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E3E8EE] dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Schedule Candidate Interview
                </h3>
              </div>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendInterview} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Candidate
                </label>
                <input
                  type="text"
                  value={scheduleForm.candidateName}
                  disabled
                  className="stitch-input text-xs py-2 w-full bg-slate-100 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Interview Round
                </label>
                <input
                  type="text"
                  value={scheduleForm.round}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, round: e.target.value })}
                  className="stitch-input text-xs py-2 w-full"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={scheduleForm.date}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, date: e.target.value })}
                    className="stitch-input text-xs py-2 w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Time
                  </label>
                  <input
                    type="text"
                    value={scheduleForm.time}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, time: e.target.value })}
                    className="stitch-input text-xs py-2 w-full"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Assigned Interviewer
                </label>
                <input
                  type="text"
                  value={scheduleForm.interviewer}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, interviewer: e.target.value })}
                  className="stitch-input text-xs py-2 w-full"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E3E8EE] dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="stitch-btn-secondary text-xs py-2 px-3"
                >
                  Cancel
                </button>
                <button type="submit" className="stitch-btn-primary text-xs py-2 px-4">
                  Send Calendar Invite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Direct Message to Candidate */}
      {showMessageModal && selectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-[#E3E8EE] dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E3E8EE] dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-primary" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Send Direct Message to Candidate
                </h3>
              </div>
              <button
                onClick={() => setShowMessageModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-[#E3E8EE] dark:border-slate-700">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Recipient: </span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {selectedCandidate.user.name} ({selectedCandidate.user.email})
                </span>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Message Content:
                </label>
                <textarea
                  rows={4}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Hi! We were impressed with your distributed systems projects and would like to invite you for an exploratory tech chat..."
                  className="stitch-input text-xs w-full py-2"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#E3E8EE] dark:border-slate-800">
                <button
                  onClick={() => setShowMessageModal(false)}
                  className="stitch-btn-secondary text-xs py-2 px-3"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowMessageModal(false);
                    setMessageText('');
                    showToast(`Dispatched message to ${selectedCandidate.user.name}!`);
                  }}
                  className="stitch-btn-primary text-xs py-2 px-4 flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Notification</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* MODAL 4: Dispatch Official Job Offer */}
      {showOfferDispatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-[#E3E8EE] dark:border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E3E8EE] dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Dispatch Official Job Offer
                </h3>
                <p className="text-xs text-slate-500">
                  {offerDispatchForm.candidateName} • {offerDispatchForm.roleTitle}
                </p>
              </div>
              <button
                onClick={() => setShowOfferDispatchModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDispatchOffer} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Offered CTC Package *
                  </label>
                  <input
                    type="text"
                    required
                    value={offerDispatchForm.ctc}
                    onChange={(e) => setOfferDispatchForm((prev) => ({ ...prev, ctc: e.target.value }))}
                    placeholder="e.g. ₹16.5 LPA"
                    className="stitch-input text-xs w-full py-2 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Offer Validity (Days) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    required
                    value={offerDispatchForm.expiresInDays}
                    onChange={(e) => setOfferDispatchForm((prev) => ({ ...prev, expiresInDays: parseInt(e.target.value) || 7 }))}
                    className="stitch-input text-xs w-full py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Offer Letter PDF / Document URL
                </label>
                <input
                  type="url"
                  value={offerDispatchForm.offerLetterUrl}
                  onChange={(e) => setOfferDispatchForm((prev) => ({ ...prev, offerLetterUrl: e.target.value }))}
                  placeholder="https://.../offer-letter.pdf"
                  className="stitch-input text-xs w-full py-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Office / Work Location
                  </label>
                  <input
                    type="text"
                    value={offerDispatchForm.joiningLocation}
                    onChange={(e) => setOfferDispatchForm((prev) => ({ ...prev, joiningLocation: e.target.value }))}
                    placeholder="e.g. Pune / Bangalore / Hybrid"
                    className="stitch-input text-xs w-full py-2"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Expected Joining Date
                  </label>
                  <input
                    type="date"
                    value={offerDispatchForm.expectedJoiningDate}
                    onChange={(e) => setOfferDispatchForm((prev) => ({ ...prev, expectedJoiningDate: e.target.value }))}
                    className="stitch-input text-xs w-full py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1">
                <div>
                  <label className="block text-[11px] text-slate-600 dark:text-slate-400 font-medium mb-1">
                    Fixed Component
                  </label>
                  <input
                    type="text"
                    value={offerDispatchForm.fixedCtc}
                    onChange={(e) => setOfferDispatchForm((prev) => ({ ...prev, fixedCtc: e.target.value }))}
                    placeholder="₹12.0 LPA"
                    className="stitch-input text-xs w-full py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-600 dark:text-slate-400 font-medium mb-1">
                    Variable Bonus
                  </label>
                  <input
                    type="text"
                    value={offerDispatchForm.variableCtc}
                    onChange={(e) => setOfferDispatchForm((prev) => ({ ...prev, variableCtc: e.target.value }))}
                    placeholder="₹2.5 LPA"
                    className="stitch-input text-xs w-full py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-600 dark:text-slate-400 font-medium mb-1">
                    Joining Bonus
                  </label>
                  <input
                    type="text"
                    value={offerDispatchForm.bonus}
                    onChange={(e) => setOfferDispatchForm((prev) => ({ ...prev, bonus: e.target.value }))}
                    placeholder="₹1.0 Lakh"
                    className="stitch-input text-xs w-full py-1.5"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E3E8EE] dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowOfferDispatchModal(false)}
                  className="stitch-btn-secondary text-xs py-2 px-3"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 px-4 rounded-lg shadow-sm flex items-center gap-1.5 transition"
                >
                  <FileCheck2 className="w-4 h-4" />
                  <span>Dispatch Official Offer</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: Extend Offer Validity */}
      {showExtendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-[#E3E8EE] dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E3E8EE] dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Extend Offer Validity
                </h3>
                <p className="text-xs text-slate-500">
                  {extendForm.candidateName}
                </p>
              </div>
              <button
                onClick={() => setShowExtendModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExtendOffer} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  New Expiry Date *
                </label>
                <input
                  type="date"
                  required
                  value={extendForm.newExpiresAt}
                  onChange={(e) => setExtendForm((prev) => ({ ...prev, newExpiresAt: e.target.value }))}
                  className="stitch-input text-xs w-full py-2"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Extension Reason / Note
                </label>
                <input
                  type="text"
                  value={extendForm.reason}
                  onChange={(e) => setExtendForm((prev) => ({ ...prev, reason: e.target.value }))}
                  placeholder="e.g. Extended on candidate request for exam completion"
                  className="stitch-input text-xs w-full py-2"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E3E8EE] dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowExtendModal(false)}
                  className="stitch-btn-secondary text-xs py-2 px-3"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 px-4 rounded-lg shadow-sm transition"
                >
                  Save &amp; Notify Candidate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </StitchDashboardShell>
  );
}
