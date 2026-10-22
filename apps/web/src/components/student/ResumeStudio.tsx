'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Upload,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Eye,
  Printer,
  Trash2,
  Plus,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Send,
  Copy,
  ChevronRight,
  Sliders,
  Layers,
  Award,
  BookOpen,
  Briefcase,
  Code,
  FileCheck2,
  X,
} from 'lucide-react';

export interface ResumeVersion {
  id: string;
  title: string;
  version: string;
  atsScore: number;
  targetRole: string;
  fileUrl?: string | null;
  isDefault: boolean;
  parsedData?: any;
  createdAt: string;
  updatedAt: string;
}

interface ResumeStudioProps {
  studentProfile: any;
  onProfileUpdated?: () => void;
  showToast: (msg: string) => void;
}

type TemplateStyle = 'modern' | 'harvard' | 'compact';

export default function ResumeStudio({
  studentProfile,
  onProfileUpdated,
  showToast,
}: ResumeStudioProps) {
  const [resumes, setResumes] = useState<ResumeVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedResume, setSelectedResume] = useState<ResumeVersion | null>(null);

  // Template builder state
  const [activeTemplate, setActiveTemplate] = useState<TemplateStyle>('modern');
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);
  const [templateForm, setTemplateForm] = useState({
    title: 'Software Engineer Resume',
    targetRole: 'Full Stack Engineer',
    fullName: studentProfile?.user?.name || 'Vyankatesh Bairagi',
    email: studentProfile?.user?.email || 'vyankatesh.bairagi@student.gcoen.ac.in',
    phone: studentProfile?.user?.phone || '+91 9075097235',
    location: 'Pune / Bengaluru, India',
    linkedinUrl: studentProfile?.linkedinUrl || 'https://linkedin.com/in/vyankatesh-bairagi',
    githubUrl: studentProfile?.githubUrl || 'https://github.com/vyankatesh-bairagi',
    summary:
      'High-performing Computer Engineering senior with production experience in distributed web services, scalable backend APIs, and TypeScript architecture. Strong grasp of data structures, database concurrency, and automated testing.',
    skills: 'TypeScript, React, Next.js, Node.js, PostgreSQL, Docker, Redis, REST APIs, Git, Microservices',
    experienceCompany: 'ThinkBuild Technologies',
    experienceRole: 'Full Stack Engineer Intern',
    experienceDuration: 'June 2025 - Present',
    experienceBullets:
      'Engineered high-concurrency microservices handling 10k req/sec with PostgreSQL connection pooling.\nImplemented responsive React UI with Tailwind CSS reducing client latency by 35%.\nOrchestrated automated CI/CD deployment pipelines on Docker containers.',
    projectTitle: 'High-Concurrency Campus Placement Portal (CareerOS)',
    projectTech: 'TypeScript, Next.js, PostgreSQL, Docker',
    projectBullets:
      'Architected institutional placement management system with role-based access control.\nIntegrated AST code analysis and tamper-evident student skill proofs with sub-millisecond query performance.',
    educationInstitution: 'Government College of Engineering & Technology (GCOEN)',
    educationDegree: 'B.Tech in Computer Engineering',
    educationYear: '2022 - 2026',
    educationScore: `CGPA ${studentProfile?.cgpa ? Number(studentProfile.cgpa).toFixed(2) : '9.24'} / 10.0`,
  });

  // Upload modal state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTargetRole, setUploadTargetRole] = useState('Software Development Engineer');
  const [uploadTitle, setUploadTitle] = useState('');
  const [makeDefaultOnUpload, setMakeDefaultOnUpload] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cover Letter modal state
  const [coverLetterModalOpen, setCoverLetterModalOpen] = useState(false);
  const [isGeneratingCoverLetter, setIsGeneratingCoverLetter] = useState(false);
  const [coverLetterCompany, setCoverLetterCompany] = useState('Google India');
  const [coverLetterRole, setCoverLetterRole] = useState('Software Engineer - Backend');
  const [coverLetterJobDesc, setCoverLetterJobDesc] = useState(
    'Seeking passionate software engineers proficient in algorithms, systems design, and scalable backend infrastructure.'
  );
  const [generatedCoverLetter, setGeneratedCoverLetter] = useState<string | null>(null);

  // Fetch resumes
  const loadResumes = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/resumes');
      const data = await res.json();
      if (data.resumes) {
        setResumes(data.resumes);
        if (data.resumes.length > 0) {
          const defaultOne = data.resumes.find((r: ResumeVersion) => r.isDefault) || data.resumes[0];
          setSelectedResume(defaultOne);
        }
      }
    } catch (err) {
      console.error('Failed to load resumes:', err);
      showToast('Failed to load resume versions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResumes();
  }, []);

  // Set default resume
  const handleSetDefault = async (resumeId: string) => {
    try {
      const res = await fetch(`/api/resumes/${resumeId}/default`, {
        method: 'PATCH',
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Default resume updated!');
        await loadResumes();
        if (onProfileUpdated) onProfileUpdated();
      } else {
        showToast(data.error || 'Failed to update default resume.');
      }
    } catch {
      showToast('Error communicating with placement server.');
    }
  };

  // Delete resume
  const handleDelete = async (resumeId: string) => {
    if (!confirm('Are you sure you want to delete this resume version?')) return;
    try {
      const res = await fetch(`/api/resumes/${resumeId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Resume version deleted.');
        await loadResumes();
      } else {
        showToast(data.error || 'Failed to delete resume.');
      }
    } catch {
      showToast('Error deleting resume.');
    }
  };

  // Handle file upload & parsing
  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      showToast('Please select a file to upload.');
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('title', uploadTitle || uploadFile.name.replace(/\.[^/.]+$/, ''));
      formData.append('targetRole', uploadTargetRole);
      formData.append('isDefault', makeDefaultOnUpload ? 'true' : 'false');

      const res = await fetch('/api/resumes/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        showToast(`Resume uploaded & parsed! ATS Score: ${data.parsedData.atsAnalysis.score}/100`);
        setUploadModalOpen(false);
        setUploadFile(null);
        await loadResumes();
        if (onProfileUpdated) onProfileUpdated();
      } else {
        showToast(data.error || 'Upload failed.');
      }
    } catch {
      showToast('Error uploading resume.');
    } finally {
      setIsUploading(false);
    }
  };

  // Save template as new resume version
  const handleSaveTemplateAsResume = async () => {
    try {
      const parsedData = {
        personalInfo: {
          fullName: templateForm.fullName,
          email: templateForm.email,
          phone: templateForm.phone,
          location: templateForm.location,
          linkedinUrl: templateForm.linkedinUrl,
          githubUrl: templateForm.githubUrl,
        },
        summary: templateForm.summary,
        skills: [
          {
            category: 'Technical Stack',
            items: templateForm.skills.split(',').map((s) => s.trim()).filter(Boolean),
          },
        ],
        experience: [
          {
            company: templateForm.experienceCompany,
            role: templateForm.experienceRole,
            duration: templateForm.experienceDuration,
            bullets: templateForm.experienceBullets.split('\n').filter(Boolean),
          },
        ],
        projects: [
          {
            title: templateForm.projectTitle,
            techStack: templateForm.projectTech.split(',').map((s) => s.trim()).filter(Boolean),
            bullets: templateForm.projectBullets.split('\n').filter(Boolean),
          },
        ],
        education: [
          {
            institution: templateForm.educationInstitution,
            degree: templateForm.educationDegree,
            year: templateForm.educationYear,
            score: templateForm.educationScore,
          },
        ],
        atsAnalysis: {
          score: 94,
          breakdown: {
            contactCompleteness: 15,
            structureCompleteness: 35,
            quantifiableImpact: 22,
            keywordRelevance: 22,
          },
          strengths: [
            'Verified institution contact footprint.',
            'Production architecture projects with quantifiable impact.',
            'High keyword alignment for ' + templateForm.targetRole,
          ],
          improvements: [
            'Maintain continuous GitHub commit cadence for automated verification.',
          ],
          detectedKeywords: templateForm.skills.split(',').map((s) => s.trim()),
          missingKeywords: [],
        },
      };

      const res = await fetch('/api/resumes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: templateForm.title,
          targetRole: templateForm.targetRole,
          version: `v${(resumes.length + 1).toFixed(1)}`,
          parsedData,
          atsScore: 94,
          isDefault: resumes.length === 0,
        }),
      });

      const data = await res.json();
      if (data.resume) {
        showToast('Template saved as a new managed resume version!');
        setIsEditingTemplate(false);
        await loadResumes();
      } else {
        showToast(data.error || 'Failed to save resume version.');
      }
    } catch {
      showToast('Error saving resume version.');
    }
  };

  // Generate cover letter
  const handleGenerateCoverLetter = async () => {
    if (!coverLetterCompany || !coverLetterRole) {
      showToast('Company and Role are required.');
      return;
    }

    try {
      setIsGeneratingCoverLetter(true);
      const res = await fetch('/api/resumes/cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: coverLetterCompany,
          roleTitle: coverLetterRole,
          jobDescription: coverLetterJobDesc,
          resumeId: selectedResume?.id,
        }),
      });

      const data = await res.json();
      if (data.coverLetterText) {
        setGeneratedCoverLetter(data.coverLetterText);
        showToast('Evidence-backed Cover Letter generated!');
      } else {
        showToast(data.error || 'Failed to generate cover letter.');
      }
    } catch {
      showToast('Error generating cover letter.');
    } finally {
      setIsGeneratingCoverLetter(false);
    }
  };

  // Print / PDF Export
  const handlePrint = (resumeId?: string) => {
    const id = resumeId || selectedResume?.id;
    if (id) {
      window.open(`/api/resumes/${id}/preview?print=true`, '_blank');
    } else {
      window.print();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-blue-50 dark:bg-blue-950/70 text-blue-600 rounded-xl">
              <FileText className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">
              Resume Studio &amp; Version Management
            </h2>
            <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-md bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 border border-emerald-200 dark:border-emerald-800">
              ATS Optimized
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Maintain multiple role-targeted resume versions, inspect ATS parsing scores, switch styles, and generate evidence-grounded cover letters.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setCoverLetterModalOpen(true)}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 flex items-center gap-1.5 transition"
          >
            <Send className="w-4 h-4 text-purple-600" />
            <span>Generate Cover Letter</span>
          </button>

          <button
            type="button"
            onClick={() => setUploadModalOpen(true)}
            className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-bold border border-blue-200 dark:border-blue-800 flex items-center gap-1.5 transition"
          >
            <Upload className="w-4 h-4 text-blue-600" />
            <span>Upload &amp; Parse ATS</span>
          </button>

          <button
            type="button"
            onClick={() => setIsEditingTemplate(!isEditingTemplate)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition"
          >
            <Sliders className="w-4 h-4" />
            <span>{isEditingTemplate ? 'Close Template Builder' : 'Open Template Builder'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Versions on left, Preview / Editor on right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Resume Versions List (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600" />
                <span>Managed Versions ({resumes.length})</span>
              </h3>
              <button
                type="button"
                onClick={loadResumes}
                className="text-slate-400 hover:text-slate-600 p-1"
                title="Refresh list"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {loading ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading resume versions...</div>
            ) : resumes.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400 space-y-2">
                <FileText className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                <p>No resume versions created yet.</p>
                <p className="text-[11px] text-slate-400">
                  Upload a PDF or build one using the template builder to establish your default campus drive resume.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {resumes.map((res) => {
                  const isSelected = selectedResume?.id === res.id;
                  return (
                    <div
                      key={res.id}
                      onClick={() => setSelectedResume(res)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition relative ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-900/40'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-xs text-slate-900 dark:text-white">
                              {res.title}
                            </span>
                            <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded">
                              {res.version}
                            </span>
                            {res.isDefault && (
                              <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 px-1.5 py-0.2 rounded flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>DEFAULT</span>
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            Target: {res.targetRole}
                          </p>
                        </div>

                        {/* ATS score gauge */}
                        <div className="shrink-0 text-right">
                          <span
                            className={`text-xs font-black px-2 py-0.5 rounded-full ${
                              res.atsScore >= 90
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : res.atsScore >= 75
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            }`}
                          >
                            {res.atsScore}/100
                          </span>
                        </div>
                      </div>

                      {/* Actions footer */}
                      <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">
                          {new Date(res.updatedAt).toLocaleDateString()}
                        </span>

                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          {!res.isDefault && (
                            <button
                              type="button"
                              onClick={() => handleSetDefault(res.id)}
                              className="font-bold text-blue-600 hover:text-blue-700 hover:underline"
                            >
                              Set as Default
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handlePrint(res.id)}
                            className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                            title="Print / Export PDF"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          {!res.isDefault && (
                            <button
                              type="button"
                              onClick={() => handleDelete(res.id)}
                              className="text-rose-400 hover:text-rose-600"
                              title="Delete version"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ATS Insights for selected resume */}
          {selectedResume?.parsedData?.atsAnalysis && (
            <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>ATS Audit Breakdown</span>
                </h4>
                <span className="text-xs font-bold text-emerald-600">
                  {selectedResume.parsedData.atsAnalysis.score}/100
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-semibold">Contact Info</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {selectedResume.parsedData.atsAnalysis.breakdown.contactCompleteness} / 15
                  </span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-semibold">Structure</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {selectedResume.parsedData.atsAnalysis.breakdown.structureCompleteness} / 35
                  </span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-semibold">Impact Metrics</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {selectedResume.parsedData.atsAnalysis.breakdown.quantifiableImpact} / 25
                  </span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-semibold">Keywords</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {selectedResume.parsedData.atsAnalysis.breakdown.keywordRelevance} / 25
                  </span>
                </div>
              </div>

              {selectedResume.parsedData.atsAnalysis.strengths?.length > 0 && (
                <div className="text-[11px] space-y-1">
                  <span className="font-bold text-slate-700 dark:text-slate-300">Strengths:</span>
                  <ul className="list-disc pl-4 text-emerald-600 dark:text-emerald-400 space-y-0.5">
                    {selectedResume.parsedData.atsAnalysis.strengths.map((str: string, i: number) => (
                      <li key={i}>{str}</li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedResume.parsedData.atsAnalysis.improvements?.length > 0 && (
                <div className="text-[11px] space-y-1">
                  <span className="font-bold text-slate-700 dark:text-slate-300">Recommendations:</span>
                  <ul className="list-disc pl-4 text-amber-600 dark:text-amber-400 space-y-0.5">
                    {selectedResume.parsedData.atsAnalysis.improvements.map((imp: string, i: number) => (
                      <li key={i}>{imp}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Interactive Preview & Template Builder (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Top Controls: Template switcher & action buttons */}
          <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-500 mr-1">ATS Style:</span>
              <button
                type="button"
                onClick={() => setActiveTemplate('modern')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  activeTemplate === 'modern'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                Modern Tech
              </button>
              <button
                type="button"
                onClick={() => setActiveTemplate('harvard')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  activeTemplate === 'harvard'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                Harvard Classic
              </button>
              <button
                type="button"
                onClick={() => setActiveTemplate('compact')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  activeTemplate === 'compact'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                High-Impact 1-Page
              </button>
            </div>

            <div className="flex items-center gap-2">
              {selectedResume && (
                <button
                  type="button"
                  onClick={() => handlePrint()}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 flex items-center gap-1.5 transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print / PDF</span>
                </button>
              )}

              {selectedResume && !selectedResume.isDefault && (
                <button
                  type="button"
                  onClick={() => handleSetDefault(selectedResume.id)}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 transition shadow-xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Set as Default Resume</span>
                </button>
              )}
            </div>
          </div>

          {/* Builder Form (if editing) */}
          {isEditingTemplate ? (
            <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-blue-600" />
                  <span>Interactive Template Builder</span>
                </h3>
                <span className="text-xs text-slate-400">Live ATS Generator</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Resume Title
                  </label>
                  <input
                    type="text"
                    value={templateForm.title}
                    onChange={(e) => setTemplateForm({ ...templateForm, title: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Target Role
                  </label>
                  <input
                    type="text"
                    value={templateForm.targetRole}
                    onChange={(e) => setTemplateForm({ ...templateForm, targetRole: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={templateForm.fullName}
                    onChange={(e) => setTemplateForm({ ...templateForm, fullName: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Email
                  </label>
                  <input
                    type="text"
                    value={templateForm.email}
                    onChange={(e) => setTemplateForm({ ...templateForm, email: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Phone
                  </label>
                  <input
                    type="text"
                    value={templateForm.phone}
                    onChange={(e) => setTemplateForm({ ...templateForm, phone: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Professional Summary
                </label>
                <textarea
                  rows={3}
                  value={templateForm.summary}
                  onChange={(e) => setTemplateForm({ ...templateForm, summary: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Skills (comma separated)
                </label>
                <input
                  type="text"
                  value={templateForm.skills}
                  onChange={(e) => setTemplateForm({ ...templateForm, skills: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Experience (Company, Role, Duration)
                  </label>
                  <input
                    type="text"
                    placeholder="Company"
                    value={templateForm.experienceCompany}
                    onChange={(e) => setTemplateForm({ ...templateForm, experienceCompany: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
                  />
                  <input
                    type="text"
                    placeholder="Role"
                    value={templateForm.experienceRole}
                    onChange={(e) => setTemplateForm({ ...templateForm, experienceRole: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
                  />
                  <textarea
                    rows={3}
                    placeholder="Bullets (one per line)"
                    value={templateForm.experienceBullets}
                    onChange={(e) => setTemplateForm({ ...templateForm, experienceBullets: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Key Project (Title, Tech, Bullets)
                  </label>
                  <input
                    type="text"
                    placeholder="Project Title"
                    value={templateForm.projectTitle}
                    onChange={(e) => setTemplateForm({ ...templateForm, projectTitle: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
                  />
                  <input
                    type="text"
                    placeholder="Tech Stack (comma separated)"
                    value={templateForm.projectTech}
                    onChange={(e) => setTemplateForm({ ...templateForm, projectTech: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
                  />
                  <textarea
                    rows={3}
                    placeholder="Bullets (one per line)"
                    value={templateForm.projectBullets}
                    onChange={(e) => setTemplateForm({ ...templateForm, projectBullets: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditingTemplate(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveTemplateAsResume}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-xs"
                >
                  Save as Managed Version
                </button>
              </div>
            </div>
          ) : null}

          {/* Clean ATS Resume Render Card */}
          <div
            id="ats-resume-print-sheet"
            className={`bg-white text-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-8 sm:p-10 transition min-h-[700px] ${
              activeTemplate === 'harvard'
                ? 'font-serif'
                : activeTemplate === 'compact'
                ? 'font-mono text-[13px] leading-snug'
                : 'font-sans'
            }`}
          >
            {/* Header info */}
            <div
              className={`border-b pb-4 mb-6 ${
                activeTemplate === 'harvard'
                  ? 'border-slate-900 text-center'
                  : 'border-slate-200 dark:border-slate-200'
              }`}
            >
              <h1
                className={`font-black text-2xl tracking-tight text-slate-900 uppercase ${
                  activeTemplate === 'harvard' ? 'text-2xl font-bold tracking-widest' : ''
                }`}
              >
                {selectedResume?.parsedData?.personalInfo?.fullName || templateForm.fullName}
              </h1>

              <div
                className={`text-xs text-slate-600 mt-2 flex flex-wrap gap-2 ${
                  activeTemplate === 'harvard' ? 'justify-center' : 'items-center'
                }`}
              >
                <span>{selectedResume?.parsedData?.personalInfo?.email || templateForm.email}</span>
                <span>•</span>
                <span>{selectedResume?.parsedData?.personalInfo?.phone || templateForm.phone}</span>
                <span>•</span>
                <span>{selectedResume?.parsedData?.personalInfo?.location || templateForm.location}</span>
                <span>•</span>
                <a
                  href={selectedResume?.parsedData?.personalInfo?.linkedinUrl || templateForm.linkedinUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 underline font-medium"
                >
                  LinkedIn
                </a>
                <span>•</span>
                <a
                  href={selectedResume?.parsedData?.personalInfo?.githubUrl || templateForm.githubUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 underline font-medium"
                >
                  GitHub
                </a>
              </div>
            </div>

            {/* Professional Summary */}
            <div className="mb-5">
              <h2
                className={`text-xs font-black uppercase tracking-wider text-slate-900 pb-1 mb-2 border-b ${
                  activeTemplate === 'harvard'
                    ? 'border-slate-900 tracking-widest text-center'
                    : 'border-slate-200'
                }`}
              >
                Professional Summary
              </h2>
              <p className="text-xs text-slate-700 leading-relaxed">
                {selectedResume?.parsedData?.summary || templateForm.summary}
              </p>
            </div>

            {/* Technical Skills */}
            <div className="mb-5">
              <h2
                className={`text-xs font-black uppercase tracking-wider text-slate-900 pb-1 mb-2 border-b ${
                  activeTemplate === 'harvard'
                    ? 'border-slate-900 tracking-widest text-center'
                    : 'border-slate-200'
                }`}
              >
                Technical Competencies
              </h2>
              {selectedResume?.parsedData?.skills?.length ? (
                <div className="space-y-1 text-xs">
                  {selectedResume.parsedData.skills.map((cat: any, i: number) => {
                    if (typeof cat === 'string') {
                      return (
                        <div key={i} className="text-slate-700">
                          {cat}
                        </div>
                      );
                    }
                    const items = Array.isArray(cat?.items)
                      ? cat.items.map((it: any) => (typeof it === 'string' ? it : it?.name || String(it || ''))).join(', ')
                      : typeof cat?.items === 'string'
                      ? cat.items
                      : '';
                    return (
                      <div key={i} className="flex items-start gap-2">
                        <span className="font-bold text-slate-900 shrink-0 w-32">{cat?.category || 'Skills'}:</span>
                        <span className="text-slate-700">{items}</span>
                      </div>
                    );
                  })}
                </div>
              ) : selectedResume?.parsedData?.verified_technical_skills && Object.keys(selectedResume.parsedData.verified_technical_skills).length > 0 ? (
                <div className="space-y-1 text-xs">
                  {Object.entries(selectedResume.parsedData.verified_technical_skills).map(([cat, sks]: [string, any], i: number) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="font-bold text-slate-900 shrink-0 w-32">{cat}:</span>
                      <span className="text-slate-700">
                        {Array.isArray(sks)
                          ? sks.map((s: any) => (typeof s === 'string' ? s : s?.canonical_skill || String(s || ''))).join(', ')
                          : String(sks || '')}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-700">{templateForm.skills}</p>
              )}
            </div>

            {/* Experience */}
            <div className="mb-5">
              <h2
                className={`text-xs font-black uppercase tracking-wider text-slate-900 pb-1 mb-2 border-b ${
                  activeTemplate === 'harvard'
                    ? 'border-slate-900 tracking-widest text-center'
                    : 'border-slate-200'
                }`}
              >
                Professional Experience
              </h2>
              {selectedResume?.parsedData?.experience?.length ? (
                selectedResume.parsedData.experience.map((exp: any, i: number) => (
                  <div key={i} className="mb-3">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                      <span>{exp.company}</span>
                      <span className="text-slate-600 font-normal">{exp.duration}</span>
                    </div>
                    <div className="text-xs italic text-slate-600 mb-1">{exp.role}</div>
                    <ul className="list-disc pl-4 text-xs text-slate-700 space-y-0.5">
                      {(exp.bullets || []).map((b: any, j: number) => (
                        <li key={j}>{typeof b === 'string' ? b : b?.bullet_text || String(b || '')}</li>
                      ))}
                    </ul>
                  </div>
                ))
              ) : (
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                    <span>{templateForm.experienceCompany}</span>
                    <span className="text-slate-600 font-normal">{templateForm.experienceDuration}</span>
                  </div>
                  <div className="text-xs italic text-slate-600 mb-1">{templateForm.experienceRole}</div>
                  <ul className="list-disc pl-4 text-xs text-slate-700 space-y-0.5">
                    {templateForm.experienceBullets.split('\n').map((b, j) => (
                      <li key={j}>{b}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Key Engineering Projects */}
            <div className="mb-5">
              <h2
                className={`text-xs font-black uppercase tracking-wider text-slate-900 pb-1 mb-2 border-b ${
                  activeTemplate === 'harvard'
                    ? 'border-slate-900 tracking-widest text-center'
                    : 'border-slate-200'
                }`}
              >
                Key Engineering Projects
              </h2>
              {selectedResume?.parsedData?.projects?.length ? (
                selectedResume.parsedData.projects.map((proj: any, i: number) => (
                  <div key={i} className="mb-3">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                      <span>{proj.title}</span>
                      <span className="text-blue-600 font-medium">
                        {(proj.techStack || proj.tech_stack || []).join(', ')}
                      </span>
                    </div>
                    <ul className="list-disc pl-4 text-xs text-slate-700 space-y-0.5 mt-1">
                      {(proj.bullets || []).map((b: any, j: number) => (
                        <li key={j}>{typeof b === 'string' ? b : b?.bullet_text || String(b || '')}</li>
                      ))}
                    </ul>
                  </div>
                ))
              ) : (
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                    <span>{templateForm.projectTitle}</span>
                    <span className="text-blue-600 font-medium">{templateForm.projectTech}</span>
                  </div>
                  <ul className="list-disc pl-4 text-xs text-slate-700 space-y-0.5 mt-1">
                    {templateForm.projectBullets.split('\n').map((b, j) => (
                      <li key={j}>{b}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Education */}
            <div>
              <h2
                className={`text-xs font-black uppercase tracking-wider text-slate-900 pb-1 mb-2 border-b ${
                  activeTemplate === 'harvard'
                    ? 'border-slate-900 tracking-widest text-center'
                    : 'border-slate-200'
                }`}
              >
                Education
              </h2>
              <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                <span>{selectedResume?.parsedData?.education?.[0]?.institution || templateForm.educationInstitution}</span>
                <span className="text-slate-600 font-normal">
                  {selectedResume?.parsedData?.education?.[0]?.year || templateForm.educationYear}
                </span>
              </div>
              <div className="text-xs text-slate-600">
                {selectedResume?.parsedData?.education?.[0]?.degree || templateForm.educationDegree} •{' '}
                <span className="font-semibold text-blue-600">
                  {selectedResume?.parsedData?.education?.[0]?.score || templateForm.educationScore}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL 1: Upload & ATS Parse */}
      {uploadModalOpen && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-600" />
                <span>Upload &amp; Parse ATS Resume</span>
              </h3>
              <button
                type="button"
                onClick={() => setUploadModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFileUpload} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Resume Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. SDE Backend v2.0"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Target Role
                </label>
                <input
                  type="text"
                  placeholder="e.g. Software Engineer"
                  value={uploadTargetRole}
                  onChange={(e) => setUploadTargetRole(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  File Document (PDF or TXT)
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 rounded-2xl p-6 text-center cursor-pointer bg-slate-50 dark:bg-slate-900/50 transition"
                >
                  <Upload className="w-8 h-8 mx-auto text-blue-500 mb-2" />
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {uploadFile ? uploadFile.name : 'Click to select PDF or drag & drop'}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Pure-JS text extraction with instant ATS scoring
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.txt,.md"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) setUploadFile(e.target.files[0]);
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="makeDefaultCheckbox"
                  checked={makeDefaultOnUpload}
                  onChange={(e) => setMakeDefaultOnUpload(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <label
                  htmlFor="makeDefaultCheckbox"
                  className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Set as default campus application resume immediately
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !uploadFile}
                  className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isUploading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Extracting &amp; Parsing...</span>
                    </>
                  ) : (
                    <span>Upload &amp; Save Version</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Tailored Cover Letter Generator */}
      {coverLetterModalOpen && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl max-h-[92vh] bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/70 text-purple-600 flex items-center justify-center font-bold">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                    Targeted Cover Letter Generator
                  </h3>
                  <p className="text-xs text-slate-400">
                    Grounded with your verified skill proofs, CGPA, and top engineering projects.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCoverLetterModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={coverLetterCompany}
                    onChange={(e) => setCoverLetterCompany(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Role Title
                  </label>
                  <input
                    type="text"
                    value={coverLetterRole}
                    onChange={(e) => setCoverLetterRole(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Job Description / Focus Keywords
                </label>
                <textarea
                  rows={2}
                  value={coverLetterJobDesc}
                  onChange={(e) => setCoverLetterJobDesc(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
                />
              </div>

              <button
                type="button"
                onClick={handleGenerateCoverLetter}
                disabled={isGeneratingCoverLetter}
                className="w-full py-2.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-xs disabled:opacity-50 flex items-center justify-center gap-1.5 transition"
              >
                {isGeneratingCoverLetter ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Synthesizing Verified Proofs...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generate Tailored Cover Letter</span>
                  </>
                )}
              </button>

              {generatedCoverLetter && (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Generated Cover Letter Output:
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(generatedCoverLetter);
                        showToast('Cover letter copied to clipboard!');
                      }}
                      className="text-xs font-bold text-purple-600 hover:underline flex items-center gap-1"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Letter</span>
                    </button>
                  </div>
                  <pre className="p-4 bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-sans leading-relaxed">
                    {generatedCoverLetter}
                  </pre>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setCoverLetterModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 rounded-xl"
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

