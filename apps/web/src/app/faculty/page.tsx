'use client';

import React, { useState, useEffect } from 'react';
import StitchDashboardShell from '@/components/layout/StitchDashboardShell';
import { useRole } from '@/context/RoleContext';
import {
  BookOpen,
  Users,
  FileText,
  Upload,
  AlertTriangle,
  CheckCircle2,
  Download,
  Share2,
  Sparkles,
  Plus,
  Send,
  ExternalLink,
  Search,
  Award,
  TrendingUp,
  X,
  MessageSquare,
  Bookmark,
  GraduationCap,
  Loader2,
} from 'lucide-react';
import CurriculumCreatorStudio from '@/components/curriculum/CurriculumCreatorStudio';

interface Student {
  id: string;
  rollNo: string;
  department: string;
  cgpa: number;
  skills: string;
  careerReadinessScore: number;
  placementStatus: string;
  talentPassportSlug: string;
  user: {
    name: string;
    email: string;
    avatarUrl?: string;
  };
}

export default function FacultyDashboard() {
  const { user, showToast } = useRole();
  const [activeTab, setActiveTab] = useState<'students' | 'resources' | 'announcements' | 'alumni-connect' | 'analytics' | 'curriculum'>('students');
  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Study resources state — will be populated from API
  const [resources, setResources] = useState<any[]>([]);
  const [resourcesLoading, setResourcesLoading] = useState(false);

  // Analytics state
  const [analytics, setAnalytics] = useState<any | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Modals
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showReferModal, setShowReferModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showEvaluateModal, setShowEvaluateModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Capstone Project Evaluation State
  const [evalStudentId, setEvalStudentId] = useState('');
  const [evalProjectTitle, setEvalProjectTitle] = useState('Final Year Distributed Cloud System');
  const [evalTechStack, setEvalTechStack] = useState('React, Node.js, PostgreSQL, Docker');
  const [evalDescription, setEvalDescription] = useState('Production-grade capstone project evaluated under departmental viva rubric.');
  const [evalScore, setEvalScore] = useState(88);
  const [evalNotes, setEvalNotes] = useState('Well-structured modular architecture with comprehensive test coverage and verified Docker deployment.');
  const [evaluating, setEvaluating] = useState(false);

  const handleEvaluateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evalStudentId || !evalProjectTitle) return;
    setEvaluating(true);
    try {
      const res = await fetch('/api/faculty/projects/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: evalStudentId,
          projectTitle: evalProjectTitle,
          description: evalDescription,
          techStack: evalTechStack.split(',').map((s) => s.trim()).filter(Boolean),
          totalScore: evalScore,
          evaluationNotes: evalNotes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Capstone project evaluated & verified proofs issued!');
        setShowEvaluateModal(false);
      } else {
        showToast(data.error || 'Failed to evaluate project.');
      }
    } catch {
      showToast('Error connecting to evaluation service.');
    } finally {
      setEvaluating(false);
    }
  };

  // Upload Form
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('INTERVIEW_KIT');
  const [newTags, setNewTags] = useState('Computer Engg, Core DSA');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Assignment form
  const [assignTitle, setAssignTitle] = useState('');
  const [assignType, setAssignType] = useState('ROADMAP');
  const [assignCohort, setAssignCohort] = useState('Batch 2026');
  const [assignDueDate, setAssignDueDate] = useState('');
  const [assignInstructions, setAssignInstructions] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);

  // Announcement State
  const [announcementText, setAnnouncementText] = useState('');
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementSending, setAnnouncementSending] = useState(false);

  useEffect(() => {
    async function loadStudents() {
      try {
        const res = await fetch('/api/students?department=Computer%20Engineering');
        const data = await res.json();
        if (data.success) setStudents(data.students);
      } catch (e) {
        console.error('Error loading students:', e);
      }
    }
    async function loadResources() {
      setResourcesLoading(true);
      try {
        const res = await fetch('/api/files?limit=20');
        const data = await res.json();
        if (data.success && data.items?.length > 0) {
          setResources(data.items);
        }
      } catch (e) {
        console.error('Error loading resources:', e);
      } finally {
        setResourcesLoading(false);
      }
    }
    loadStudents();
    loadResources();
  }, []);

  useEffect(() => {
    if (activeTab === 'analytics') {
      setAnalyticsLoading(true);
      fetch('/api/learning/analytics?department=Computer%20Engineering')
        .then((r) => r.json())
        .then((data) => {
          if (data.success) setAnalytics(data);
        })
        .catch((e) => console.error('Error loading analytics:', e))
        .finally(() => setAnalyticsLoading(false));
    }
  }, [activeTab]);

  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      !searchQuery ||
      s.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.rollNo.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'AT_RISK' && (s.careerReadinessScore < 75 || s.placementStatus === 'UNPLACED')) ||
      (statusFilter === 'PLACED' && s.placementStatus === 'PLACED') ||
      (statusFilter === 'UNPLACED' && s.placementStatus === 'UNPLACED');
    return matchesSearch && matchesStatus;
  });

  const handleUploadResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      showToast('Please select a file to upload.');
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('title', newTitle);
      formData.append('category', newCategory);
      formData.append('tags', JSON.stringify(newTags.split(',').map((t) => t.trim()).filter(Boolean)));
      const res = await fetch('/api/files', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        showToast(`✅ Resource "${newTitle}" published to student repository!`);
        setShowUploadModal(false);
        setNewTitle('');
        setUploadFile(null);
        // Reload resources
        const refreshed = await fetch('/api/files?limit=20').then((r) => r.json());
        if (refreshed.success) setResources(refreshed.items);
      } else {
        showToast(`Upload failed: ${data.error}`);
      }
    } catch (err: any) {
      showToast(`Upload error: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handlePostAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementText || !announcementTitle) return;
    setAnnouncementSending(true);
    try {
      const res = await fetch('/api/notifications/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: announcementTitle,
          message: announcementText,
          type: 'SYSTEM',
          sendEmail: false,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`📢 Broadcast sent to ${data.recipientCount || students.length} students!`);
        setAnnouncementText('');
        setAnnouncementTitle('');
      } else {
        showToast(`Broadcast failed: ${data.error}`);
      }
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    } finally {
      setAnnouncementSending(false);
    }
  };

  const handleDispatchAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignTitle) return;
    setAssignLoading(true);
    try {
      const res = await fetch('/api/learning/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: assignTitle,
          type: assignType,
          targetCohort: assignCohort,
          department: 'Computer Engineering',
          dueDate: assignDueDate || undefined,
          instructions: assignInstructions || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`📚 Assignment "${assignTitle}" dispatched to ${assignCohort}!`);
        setShowAssignModal(false);
        setAssignTitle('');
        setAssignDueDate('');
        setAssignInstructions('');
      } else {
        showToast(`Failed: ${data.error}`);
      }
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    } finally {
      setAssignLoading(false);
    }
  };

  // Metrics
  const atRiskCount = students.filter((s) => s.careerReadinessScore < 75 || s.placementStatus === 'UNPLACED').length;
  const placedCount = students.filter((s) => s.placementStatus === 'PLACED').length;
  const avgReadiness = students.length > 0
    ? Math.round(students.reduce((acc, s) => acc + (s.careerReadinessScore || 0), 0) / students.length)
    : 82;

  return (
    <StitchDashboardShell
      roleOverride="FACULTY"
      activePath={activeTab}
      onPathChange={(p) => setActiveTab(p as any)}
      title="Faculty Academic & Placement Mentorship"
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowUploadModal(true)}
            className="stitch-btn-primary flex items-center gap-2 text-xs py-2 px-3.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Upload Study Kit</span>
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Mentor Department Banner */}
        <div className="bg-white dark:bg-slate-900 border border-[#E3E8EE] dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="w-14 h-14 rounded-xl object-cover border border-[#E3E8EE] dark:border-slate-700 shrink-0"
              />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold text-slate-900 dark:text-white">{user.name}</h1>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                    <CheckCircle2 className="w-3 h-3 text-purple-600" /> Department of Computer Engineering
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Associate Professor & Career Mentor • Government College of Engineering & Technology (GCOEN)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-[#E3E8EE] dark:border-slate-700">
                Cohort: Batch 2026 (Final Year)
              </span>
            </div>
          </div>
        </div>

        {/* 4 Clean Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-[#E3E8EE] dark:border-slate-800 rounded-xl p-4 shadow-sm">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Assigned Cohort
            </span>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {students.length} <span className="text-xs font-normal text-slate-500">Mentees</span>
            </div>
            <p className="text-[11px] text-primary font-medium mt-1">Computer Engineering Class</p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-[#E3E8EE] dark:border-slate-800 rounded-xl p-4 shadow-sm">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Average Readiness
            </span>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {avgReadiness}% <span className="text-xs font-normal text-slate-500">Score</span>
            </div>
            <p className="text-[11px] text-emerald-600 font-medium mt-1">+4.2% from Mid-Semester</p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-[#E3E8EE] dark:border-slate-800 rounded-xl p-4 shadow-sm">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Placed in Drives
            </span>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              {placedCount} <span className="text-xs font-normal text-slate-500">Students</span>
            </div>
            <p className="text-[11px] text-emerald-600 font-medium mt-1">Across Google, TCS, Microsoft</p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-[#E3E8EE] dark:border-slate-800 rounded-xl p-4 shadow-sm">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              At-Risk / Action Needed
            </span>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
              {atRiskCount} <span className="text-xs font-normal text-slate-500">Candidates</span>
            </div>
            <p className="text-[11px] text-amber-600 font-medium mt-1">Targeted Skill-Gap Interventions</p>
          </div>
        </div>

        {/* Tab Sub-Nav */}
        <div className="flex border-b border-[#E3E8EE] dark:border-slate-800 gap-6">
          <button
            onClick={() => setActiveTab('students')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'students'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Assigned Cohort & Skill Gaps</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              {filteredStudents.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('resources')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'resources'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Study Kits & Handbooks</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              {resources.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('announcements')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'announcements'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Faculty Advisories & Broadcast</span>
          </button>

          <button
            onClick={() => setActiveTab('alumni-connect')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'alumni-connect'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>Alumni-Student Bridge</span>
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
            <span>Learning Analytics</span>
          </button>

          <button
            onClick={() => setActiveTab('curriculum')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'curriculum'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Sparkles className="w-4 h-4 text-primary" />
            <span>Curriculum &amp; Assessments Studio</span>
          </button>
        </div>

        {/* TAB 1: Assigned Cohort List & Skill Gap */}
        {activeTab === 'students' && (
          <div className="space-y-4">
            {/* Filter Toolbar */}
            <div className="bg-white dark:bg-slate-900 border border-[#E3E8EE] dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search mentee by name or roll number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="stitch-input pl-9 text-xs py-2 w-full"
                />
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="stitch-input text-xs py-2"
                >
                  <option value="ALL">All Cohort Mentees</option>
                  <option value="AT_RISK">At-Risk (&lt;75% Readiness / Unplaced)</option>
                  <option value="PLACED">Placed</option>
                  <option value="UNPLACED">Unplaced</option>
                </select>
              </div>
            </div>

            {/* Students Table Sub-Box */}
            <div className="bg-white dark:bg-slate-900 border border-[#E3E8EE] dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-[#E3E8EE] dark:border-slate-700 text-slate-500 dark:text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="p-3.5">Student Details</th>
                      <th className="p-3.5">Roll No</th>
                      <th className="p-3.5">CGPA</th>
                      <th className="p-3.5">Readiness Score</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5">Identified Skill Gap</th>
                      <th className="p-3.5 text-right">Faculty Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E3E8EE] dark:divide-slate-800">
                    {filteredStudents.map((s) => {
                      const isAtRisk = s.careerReadinessScore < 75 || s.placementStatus === 'UNPLACED';
                      return (
                        <tr key={s.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="p-3.5">
                            <div className="flex items-center gap-3">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={s.user.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                                alt={s.user.name}
                                className="w-9 h-9 rounded-lg object-cover border border-[#E3E8EE] dark:border-slate-700 shrink-0"
                              />
                              <div>
                                <span className="font-bold text-slate-900 dark:text-white block">
                                  {s.user.name}
                                </span>
                                <span className="text-[11px] text-slate-400 font-mono">{s.user.email}</span>
                              </div>
                            </div>
                          </td>
                          <td className="p-3.5 font-mono text-slate-600 dark:text-slate-400">{s.rollNo}</td>
                          <td className="p-3.5 font-bold text-slate-800 dark:text-slate-200">{s.cgpa}</td>
                          <td className="p-3.5">
                            <div className="flex items-center gap-2">
                              <span className={`font-bold ${s.careerReadinessScore >= 80 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                {s.careerReadinessScore}%
                              </span>
                              <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${s.careerReadinessScore >= 80 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                  style={{ width: `${s.careerReadinessScore}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>
                          <td className="p-3.5">
                            <span
                              className={`inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                                s.placementStatus === 'PLACED'
                                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                  : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                              }`}
                            >
                              {s.placementStatus}
                            </span>
                          </td>
                          <td className="p-3.5 text-slate-600 dark:text-slate-400">
                            {isAtRisk ? (
                              <span className="text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-900 inline-flex items-center gap-1 font-medium">
                                <AlertTriangle className="w-3 h-3" /> Graph Algos & System Design
                              </span>
                            ) : (
                              <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                                Full Readiness Achieved
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setSelectedStudent(s);
                                  setEvalStudentId(s.id);
                                  setShowEvaluateModal(true);
                                }}
                                className="px-2.5 py-1 rounded text-[11px] font-semibold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition-colors"
                              >
                                Evaluate Capstone
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedStudent(s);
                                  setShowReferModal(true);
                                }}
                                className="px-2.5 py-1 rounded text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                              >
                                Recommend Resource
                              </button>
                              <a
                                href={`/talent/${s.talentPassportSlug}`}
                                target="_blank"
                                className="p-1 text-slate-400 hover:text-primary transition-colors"
                                title="View Talent Passport"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Study Kits & Handbooks */}
        {activeTab === 'resources' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {resources.map((res) => (
                <div
                  key={res.id}
                  className="bg-white dark:bg-slate-900 border border-[#E3E8EE] dark:border-slate-800 rounded-xl p-5 shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2">
                      <span className="font-mono">{res.category}</span>
                      <span>{res.date}</span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                      {res.title}
                    </h3>

                    <div className="flex flex-wrap gap-1 mt-3">
                      {res.tags.map((tag: string) => (
                        <span
                          key={tag}
                          className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#E3E8EE] dark:border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-500 text-[11px] flex items-center gap-1">
                      <Download className="w-3.5 h-3.5" /> {res.downloads} Downloads
                    </span>
                    <button
                      onClick={() => showToast(`Resource "${res.title}" shared with students!`)}
                      className="text-primary hover:text-primary-hover font-semibold flex items-center gap-1"
                    >
                      <Share2 className="w-3 h-3" /> Share
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: Faculty Advisories & Broadcast */}
        {activeTab === 'announcements' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-[#E3E8EE] dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white pb-3 border-b border-[#E3E8EE] dark:border-slate-800">
                Compose Placement Advisory to Mentees
              </h3>

              <form onSubmit={handlePostAnnouncement} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Select Target Recipient Group:
                  </label>
                  <select className="stitch-input text-xs py-2 w-full">
                    <option>All Final Year Computer Engineering Mentees (120 Students)</option>
                    <option>At-Risk Candidates (Readiness &lt; 75%)</option>
                    <option>Shortlisted for Google India Drive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Advisory Directive & Guidance:
                  </label>
                  <textarea
                    rows={5}
                    value={announcementText}
                    onChange={(e) => setAnnouncementText(e.target.value)}
                    placeholder="Dear Students, please make sure your Git repositories are organized with comprehensive READMEs before next week's Microsoft on-campus drive. Review the System Design handbook uploaded in Section B..."
                    className="stitch-input text-xs w-full py-2"
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button type="submit" className="stitch-btn-primary text-xs py-2 px-4 flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5" />
                    <span>Broadcast Advisory</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Active Directives */}
            <div className="bg-white dark:bg-slate-900 border border-[#E3E8EE] dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recent Advisories</h3>
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-lg border border-[#E3E8EE] dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-1">
                  <div className="font-bold text-slate-900 dark:text-white">Mock Technical Interviews Round 1</div>
                  <p className="text-slate-500 text-[11px]">Compulsory for unplaced students this Friday at 3:00 PM.</p>
                  <span className="text-[10px] text-slate-400">Broadcast 2 days ago</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Alumni-Student Bridge */}
        {activeTab === 'alumni-connect' && (
          <div className="bg-white dark:bg-slate-900 border border-[#E3E8EE] dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E3E8EE] dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Connect Mentees with Alumni Working in Industry
                </h3>
                <p className="text-xs text-slate-500">
                  Pair students directly with verified alumni mentors for company-specific referral guidance.
                </p>
              </div>
              <button
                onClick={() => showToast('Matched 4 mentees with Amazon & Google alumni mentors!')}
                className="stitch-btn-primary text-xs py-2 px-3 flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Auto-Match Mentees</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-[#E3E8EE] dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white">Amit Shrivastava</span>
                  <span className="text-[11px] font-semibold text-emerald-600">SDE-2 @ Amazon (Class of 2022)</span>
                </div>
                <p className="text-slate-500 text-[11px]">
                  Specialty: Distributed Systems, AWS Cloud, Low-Level Design. Available for 2 weekly mock sessions.
                </p>
                <button
                  onClick={() => showToast('Dispatched mentorship request to Amit for Aditya Shinde!')}
                  className="stitch-btn-secondary text-xs py-1 px-3 mt-2"
                >
                  Pair with Mentee
                </button>
              </div>

              <div className="p-4 rounded-xl border border-[#E3E8EE] dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white">Sneha Deshmukh</span>
                  <span className="text-[11px] font-semibold text-primary">Data Scientist @ Microsoft (Class of 2021)</span>
                </div>
                <p className="text-slate-500 text-[11px]">
                  Specialty: ML Algorithms, Python, High-scale Analytics. Available for resume reviews.
                </p>
                <button
                  onClick={() => showToast('Dispatched mentorship request to Sneha for Priya Kulkarni!')}
                  className="stitch-btn-secondary text-xs py-1 px-3 mt-2"
                >
                  Pair with Mentee
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: Learning Analytics */}
        {activeTab === 'analytics' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 border border-[#E3E8EE] dark:border-slate-800 rounded-xl p-5 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E3E8EE] dark:border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Cohort Learning &amp; Roadmap Completion Intelligence
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Live analytics on curriculum progression across Computer Engineering &amp; IT cohorts.
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-primary/10 text-primary">
                  {analytics?.totalStudents || students.length} Students Monitored
                </span>
              </div>

              {analyticsLoading ? (
                <div className="py-12 text-center text-xs text-slate-400">Loading cohort telemetry...</div>
              ) : analytics ? (
                <div className="pt-4 space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-[#E3E8EE] dark:border-slate-800">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Average Roadmap Progress</div>
                      <div className="text-2xl font-black text-primary mt-1">{analytics.averageProgress || 0}%</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">Across all active students</div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-[#E3E8EE] dark:border-slate-800">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active Learners</div>
                      <div className="text-2xl font-black text-emerald-600 mt-1">{analytics.activeLearners || 0}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">Enrolled in ≥ 1 track</div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-[#E3E8EE] dark:border-slate-800">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active Curriculum Tracks</div>
                      <div className="text-2xl font-black text-purple-600 mt-1">{analytics.roadmapStats?.length || 0}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">Published institutional tracks</div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Per-Track Progression Breakdown</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {analytics.roadmapStats?.map((rm: any) => (
                        <div key={rm.id} className="p-3.5 rounded-xl border border-[#E3E8EE] dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 text-xs">
                          <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                            <span>{rm.title}</span>
                            <span className="text-primary">{rm.avgProgress}% Avg</span>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden my-2">
                            <div className="bg-primary h-full rounded-full" style={{ width: `${rm.avgProgress}%` }} />
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-slate-500">
                            <span>{rm.enrolledCount} Students Enrolled</span>
                            <span className="text-emerald-600 font-semibold">{rm.completedCount} Completed</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-slate-400">No learning telemetry data available yet.</div>
              )}
            </div>
          </div>
        )}

        {/* TAB 6: Curriculum & Assessments Studio */}
        {activeTab === 'curriculum' && (
          <div className="space-y-4">
            <CurriculumCreatorStudio roleTitle="Faculty Mentor & Academic Board" />
          </div>
        )}
      </div>

      {/* MODAL: Upload Study Kit */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-[#E3E8EE] dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E3E8EE] dark:border-slate-800">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Publish Study Kit for Cohort
                </h3>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadResource} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Resource Title
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Distributed Caching & Redis Cheatsheet"
                  className="stitch-input text-xs py-2 w-full"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Category
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="stitch-input text-xs py-2 w-full"
                >
                  <option value="INTERVIEW_KIT">Interview Preparation Kit</option>
                  <option value="CORE_NOTES">Core Engineering Subject Notes</option>
                  <option value="SQL_PREP">SQL & Database Practice Deck</option>
                  <option value="RESUME_GUIDE">Resume Writing Standards</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Topic Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                  className="stitch-input text-xs py-2 w-full"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E3E8EE] dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="stitch-btn-secondary text-xs py-2 px-3"
                >
                  Cancel
                </button>
                <button type="submit" className="stitch-btn-primary text-xs py-2 px-4">
                  Publish to Student Repo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Recommend Resource to Student */}
      {showReferModal && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-[#E3E8EE] dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E3E8EE] dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Recommend Support to {selectedStudent.user.name}
              </h3>
              <button
                onClick={() => setShowReferModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-600 dark:text-slate-400">
                Assign targeted preparation modules to elevate this candidate&apos;s placement readiness from{' '}
                <strong className="text-primary">{selectedStudent.careerReadinessScore}%</strong>.
              </p>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Select Prescribed Module:
                </label>
                <select className="stitch-input text-xs py-2 w-full">
                  <option>DSA & System Design Placement Handbook 2026</option>
                  <option>Operating Systems & Networks Core Interview Notes</option>
                  <option>AI Mock Interview Practice Session with TPO</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E3E8EE] dark:border-slate-800">
                <button
                  onClick={() => setShowReferModal(false)}
                  className="stitch-btn-secondary text-xs py-2 px-3"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowReferModal(false);
                    showToast(`Prescribed module assigned to ${selectedStudent.user.name}!`);
                  }}
                  className="stitch-btn-primary text-xs py-2 px-4"
                >
                  Confirm & Notify Student
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* MODAL: Faculty Capstone Project Evaluation */}
      {showEvaluateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-[#E3E8EE] dark:border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#E3E8EE] dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Evaluate Student Capstone Project
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Issues official verified <span className="font-semibold text-primary">EVALUATED_PROJECT</span> skill proofs for student placement passport.
                </p>
              </div>
              <button
                onClick={() => setShowEvaluateModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEvaluateProject} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Candidate:
                </label>
                <select
                  value={evalStudentId}
                  onChange={(e) => {
                    setEvalStudentId(e.target.value);
                    const stu = students.find((s) => s.id === e.target.value);
                    if (stu) setSelectedStudent(stu);
                  }}
                  className="stitch-input text-xs py-2 w-full font-medium"
                  required
                >
                  <option value="">-- Select Candidate --</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.user.name} ({s.rollNo || s.user.email}) - {s.careerReadinessScore}% Readiness
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Project Title:
                </label>
                <input
                  type="text"
                  value={evalProjectTitle}
                  onChange={(e) => setEvalProjectTitle(e.target.value)}
                  placeholder="e.g. Distributed Task Queue & Telemetry Platform"
                  className="stitch-input text-xs py-2 w-full"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Verified Tech Stack (comma separated):
                </label>
                <input
                  type="text"
                  value={evalTechStack}
                  onChange={(e) => setEvalTechStack(e.target.value)}
                  placeholder="e.g. React, Node.js, PostgreSQL, Docker, Redis"
                  className="stitch-input text-xs py-2 w-full"
                  required
                />
                <span className="text-[10px] text-slate-400">
                  Each skill listed will receive an evidence-backed SkillProof record in the student profile.
                </span>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Project Description & Architecture Overview:
                </label>
                <textarea
                  rows={2}
                  value={evalDescription}
                  onChange={(e) => setEvalDescription(e.target.value)}
                  placeholder="Brief summary of problem statement, architecture, and deliverables..."
                  className="stitch-input text-xs py-2 w-full resize-none"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-slate-700 dark:text-slate-300 font-semibold">
                    Faculty Rubric Score (0 - 100):
                  </label>
                  <span className="font-mono font-bold text-sm text-indigo-600 dark:text-indigo-400">
                    {evalScore}% {evalScore >= 85 ? '(Gold Tier)' : evalScore >= 70 ? '(Silver Tier)' : '(Bronze Tier)'}
                  </span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="100"
                  value={evalScore}
                  onChange={(e) => setEvalScore(parseInt(e.target.value) || 0)}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Evaluation Viva Notes & Faculty Endorsement:
                </label>
                <textarea
                  rows={2}
                  value={evalNotes}
                  onChange={(e) => setEvalNotes(e.target.value)}
                  placeholder="Feedback on viva, design patterns, testing rigor, and implementation quality..."
                  className="stitch-input text-xs py-2 w-full resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E3E8EE] dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEvaluateModal(false)}
                  className="stitch-btn-secondary text-xs py-2 px-3"
                  disabled={evaluating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={evaluating || !evalStudentId}
                  className="stitch-btn-primary text-xs py-2 px-4 flex items-center gap-1.5"
                >
                  {evaluating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Evaluating & Issuing Proofs...
                    </>
                  ) : (
                    <>
                      <Award className="w-3.5 h-3.5" />
                      Issue Verified Proofs
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </StitchDashboardShell>
  );
}
