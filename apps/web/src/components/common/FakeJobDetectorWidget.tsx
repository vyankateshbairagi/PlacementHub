'use client';

import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Copy,
  Check,
  FileText,
  Building,
  Briefcase,
  DollarSign,
  Globe,
  Mail,
  Send,
  Lock,
  ArrowRight,
  HelpCircle,
  Flag,
} from 'lucide-react';
import {
  JobFraudAnalysisResult,
  JobPostInput,
  SAMPLE_JOB_SCENARIOS,
  analyzeJobPostWithHeuristics,
} from '@/lib/fakeJobDetector';

interface FakeJobDetectorWidgetProps {
  variant?: 'student' | 'tpo';
  defaultOpen?: boolean;
  onAlertTpo?: (analysis: JobFraudAnalysisResult) => void;
  onApproveOpportunity?: (analysis: JobFraudAnalysisResult) => void;
  className?: string;
}

export default function FakeJobDetectorWidget({
  variant = 'student',
  defaultOpen = true,
  onAlertTpo,
  onApproveOpportunity,
  className = '',
}: FakeJobDetectorWidgetProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [ctc, setCtc] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactChannel, setContactChannel] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [analysis, setAnalysis] = useState<JobFraudAnalysisResult | null>(null);
  const [selectedPresetLabel, setSelectedPresetLabel] = useState<string>('');
  const [copiedWarning, setCopiedWarning] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleSelectPreset = (preset: typeof SAMPLE_JOB_SCENARIOS[0]) => {
    setSelectedPresetLabel(preset.label);
    setCompany(preset.data.company);
    setRole(preset.data.role);
    setDescription(preset.data.description || '');
    setUrl(preset.data.url || '');
    setCtc(preset.data.ctc || '');
    setContactEmail(preset.data.contactEmail || '');
    setContactChannel(preset.data.contactChannel || '');
    handleScanWithData(preset.data);
  };

  const handleScanWithData = async (inputData: JobPostInput) => {
    setIsScanning(true);
    try {
      const res = await fetch('/api/jobs/detect-fake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inputData),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.analysis) {
          setAnalysis(data.analysis);
          return;
        }
      }
      // Client-side fallback if network error
      const fallbackResult = analyzeJobPostWithHeuristics(inputData);
      setAnalysis(fallbackResult);
    } catch {
      const fallbackResult = analyzeJobPostWithHeuristics(inputData);
      setAnalysis(fallbackResult);
    } finally {
      setIsScanning(false);
    }
  };

  const handleManualScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!company.trim() && !description.trim() && !url.trim()) {
      showToast('Please enter a company name, description, or link to evaluate.');
      return;
    }

    handleScanWithData({
      company: company.trim() || 'Company under evaluation',
      role: role.trim() || 'Software Opening',
      description: description.trim(),
      url: url.trim(),
      ctc: ctc.trim(),
      contactEmail: contactEmail.trim(),
      contactChannel: contactChannel.trim(),
      source: variant === 'tpo' ? 'TPO_PORTAL_EVALUATION' : 'STUDENT_PORTAL_EVALUATION',
    });
  };

  const handleCopyWarning = () => {
    if (!analysis) return;
    const warningText = `⚠️ CareerOS AI Recruitment Alert:\nJob: ${analysis.role} at ${analysis.company}\nVerdict: ${analysis.verdictTitle} (Fraud Risk: ${analysis.fraudRiskScore}%)\n${analysis.summary}\nSafety Advice: ${analysis.safetyRecommendations[0] || 'Never pay money for a job.'}`;
    navigator.clipboard.writeText(warningText);
    setCopiedWarning(true);
    showToast('AI Scam advisory copied to clipboard!');
    setTimeout(() => setCopiedWarning(false), 2000);
  };

  const handleReset = () => {
    setCompany('');
    setRole('');
    setDescription('');
    setUrl('');
    setCtc('');
    setContactEmail('');
    setContactChannel('');
    setAnalysis(null);
    setSelectedPresetLabel('');
  };

  // Determine colors based on risk
  const isScam = analysis?.verdict === 'FRAUD_SCAM_DETECTED';
  const isCaution = analysis?.verdict === 'PROCEED_WITH_CAUTION';
  const isSafe = analysis?.verdict === 'VERIFIED_LEGITIMATE';

  return (
    <div
      className={`rounded-2xl border transition-all duration-300 shadow-xs overflow-hidden ${
        isScam
          ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900/60'
          : isCaution
          ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-300 dark:border-amber-900/60'
          : isSafe
          ? 'bg-emerald-50/30 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-900/60'
          : 'bg-white dark:bg-[#0F172A] border-blue-200/90 dark:border-slate-800'
      } ${className}`}
    >
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xl border border-slate-700 animate-in fade-in slide-in-from-bottom-2 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200/70 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border shadow-xs transition-colors ${
              isScam
                ? 'bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-800'
                : isCaution
                ? 'bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-800'
                : isSafe
                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800'
                : 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-blue-400 shadow-blue-500/10'
            }`}
          >
            {isScam ? (
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            ) : isCaution ? (
              <AlertTriangle className="w-6 h-6" />
            ) : isSafe ? (
              <ShieldCheck className="w-6 h-6" />
            ) : (
              <ShieldAlert className="w-6 h-6" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>AI Fake Job Post &amp; Scam Detection Shield</span>
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-300 dark:border-blue-700">
                {variant === 'tpo' ? 'TPO Cohort Defense' : 'Student Protection Engine'}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 border border-purple-300 dark:border-purple-800 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                <span>AI Service Connected</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Protect students &amp; placement cells from registration fee extortion, telegram task scams, and spoofed recruitment drives.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-center shrink-0">
          {analysis && (
            <button
              type="button"
              onClick={handleReset}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label="Toggle widget"
          >
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Widget Body */}
      {isOpen && (
        <div className="p-4 sm:p-6 space-y-5">
          {/* Preset Buttons Bar (Instant 1-Click Verification) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Try Real vs Scam Demo Presets:</span>
              </span>
              <span className="text-[11px] text-slate-400 hidden sm:inline">
                Click any scenario to test the AI evaluation model
              </span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1.5">
              {SAMPLE_JOB_SCENARIOS.map((preset) => {
                const isCurrent = selectedPresetLabel === preset.label;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border flex items-center gap-1.5 shrink-0 ${
                      isCurrent
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : preset.tag === 'SCAM'
                        ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                        : preset.tag === 'SUSPICIOUS'
                        ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                    }`}
                  >
                    <span>
                      {preset.tag === 'SCAM' ? '🚨' : preset.tag === 'SUSPICIOUS' ? '⚠️' : '✅'}
                    </span>
                    <span>{preset.label.split('-')[0].trim()}</span>
                    <span className="text-[10px] uppercase font-bold opacity-75">
                      ({preset.tag})
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interactive Scan Form */}
          <form onSubmit={handleManualScan} className="bg-slate-50/80 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800/80 space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <Building className="w-3.5 h-3.5 text-slate-400" />
                  <span>Company Name</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Amazon, Google, Telegram Channel..."
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                  <span>Role / Designation</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. SDE Intern, Task Reviewer..."
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5 text-slate-400" />
                  <span>Application URL / Domain</span>
                </label>
                <input
                  type="text"
                  placeholder="https://... or domain"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                  <span>Advertised CTC / Stipend</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. ₹24 LPA or ₹5,000/day"
                  value={ctc}
                  onChange={(e) => setCtc(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>Recruiter Email (Detects Impersonation / Free Webmail)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. recruiter@amazon.jobs or hr.hiring@gmail.com"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <Send className="w-3.5 h-3.5 text-slate-400" />
                  <span>Contact Channel</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Official ATS Portal, Telegram, WhatsApp group"
                  value={contactChannel}
                  onChange={(e) => setContactChannel(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="text-xs">
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <span>Job Description, WhatsApp Notice, or Email Content</span>
                </span>
                <span className="text-[11px] text-slate-400 font-normal">
                  Paste full notice to scan for hidden fee/deposit traps
                </span>
              </label>
              <textarea
                rows={2}
                placeholder="Paste the job description, WhatsApp forward, or recruitment email text here..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Lock className="w-3 h-3 text-emerald-500" />
                <span>Zero telemetry storage. Evaluated through local CareerOS AI Engine.</span>
              </span>

              <button
                type="submit"
                disabled={isScanning}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs flex items-center gap-2 transition disabled:opacity-50"
              >
                {isScanning ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Analyzing Job Safety with AI...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-3.5 h-3.5" />
                    <span>Scan Job Authenticity with AI</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Analysis Results View */}
          {analysis && (
            <div className="space-y-4 pt-1 animate-in fade-in slide-in-from-top-2">
              {/* Verdict Banner */}
              <div
                className={`p-4 sm:p-5 rounded-2xl border shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isScam
                    ? 'bg-rose-100/90 dark:bg-rose-950/70 border-rose-300 dark:border-rose-800'
                    : isCaution
                    ? 'bg-amber-100/90 dark:bg-amber-950/70 border-amber-300 dark:border-amber-800'
                    : 'bg-emerald-100/90 dark:bg-emerald-950/70 border-emerald-300 dark:border-emerald-800'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
                      isScam
                        ? 'bg-rose-600 text-white border-rose-700 shadow-rose-600/20 shadow-md'
                        : isCaution
                        ? 'bg-amber-500 text-white border-amber-600 shadow-amber-500/20 shadow-md'
                        : 'bg-emerald-600 text-white border-emerald-700 shadow-emerald-600/20 shadow-md'
                    }`}
                  >
                    {isScam ? (
                      <XCircle className="w-7 h-7" />
                    ) : isCaution ? (
                      <AlertCircle className="w-7 h-7" />
                    ) : (
                      <CheckCircle2 className="w-7 h-7" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider ${
                          isScam
                            ? 'bg-rose-700 text-white'
                            : isCaution
                            ? 'bg-amber-600 text-white'
                            : 'bg-emerald-700 text-white'
                        }`}
                      >
                        {analysis.verdict === 'FRAUD_SCAM_DETECTED'
                          ? 'Definite Scam Detected'
                          : analysis.verdict === 'PROCEED_WITH_CAUTION'
                          ? 'Suspicious Posting'
                          : 'Verified Legitimate'}
                      </span>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {analysis.company} • {analysis.role}
                      </span>
                    </div>
                    <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-1">
                      {analysis.verdictTitle}
                    </h3>
                    <p className="text-xs text-slate-700 dark:text-slate-300 mt-0.5 leading-relaxed">
                      {analysis.summary}
                    </p>
                  </div>
                </div>

                {/* Score Pills & Confidence */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-300/60 dark:border-slate-800">
                  <div className="text-right">
                    <div className="flex items-baseline justify-end gap-1.5">
                      <span
                        className={`text-2xl sm:text-3xl font-black ${
                          isScam
                            ? 'text-rose-700 dark:text-rose-400'
                            : isCaution
                            ? 'text-amber-700 dark:text-amber-400'
                            : 'text-emerald-700 dark:text-emerald-400'
                        }`}
                      >
                        {analysis.authenticityScore}%
                      </span>
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                        Trust Score
                      </span>
                    </div>
                    <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      Fraud Risk: <strong className={isScam ? 'text-rose-600' : 'text-slate-700 dark:text-slate-200'}>{analysis.fraudRiskScore}%</strong> ({analysis.riskLevel} Level)
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleCopyWarning}
                      className="px-2.5 py-1 rounded-lg bg-white/80 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-white transition flex items-center gap-1 shadow-2xs"
                    >
                      {copiedWarning ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedWarning ? 'Copied' : 'Share Alert'}</span>
                    </button>

                    {variant === 'tpo' && onApproveOpportunity && isSafe && (
                      <button
                        type="button"
                        onClick={() => onApproveOpportunity(analysis)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-xs transition"
                      >
                        Approve for Cohort
                      </button>
                    )}

                    {variant === 'student' && isScam && (
                      <button
                        type="button"
                        onClick={() => {
                          showToast('Report submitted to College Placement Officer.');
                          if (onAlertTpo) onAlertTpo(analysis);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 shadow-xs transition flex items-center gap-1"
                      >
                        <Flag className="w-3 h-3" />
                        <span>Report to TPO</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* 4 Multi-Factor Safety Gauges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 shadow-2xs">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Financial Safety
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-base font-black text-slate-900 dark:text-white">
                      {analysis.breakdown.financialSafetyScore}%
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${analysis.breakdown.financialSafetyScore > 70 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                      {analysis.breakdown.financialSafetyScore > 70 ? 'No Fee Traps' : 'Fee Demanded'}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden mt-2">
                    <div
                      className={`h-full rounded-full ${analysis.breakdown.financialSafetyScore > 70 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                      style={{ width: `${analysis.breakdown.financialSafetyScore}%` }}
                    />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 shadow-2xs">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Domain / URL Safety
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-base font-black text-slate-900 dark:text-white">
                      {analysis.breakdown.domainSafetyScore}%
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${analysis.breakdown.domainSafetyScore > 70 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                      {analysis.domainAnalysis.isOfficialDomain ? 'Verified ATS' : analysis.domainAnalysis.isSuspiciousTld ? 'Spoofed TLD' : 'Third-Party'}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden mt-2">
                    <div
                      className={`h-full rounded-full ${analysis.breakdown.domainSafetyScore > 70 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                      style={{ width: `${analysis.breakdown.domainSafetyScore}%` }}
                    />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 shadow-2xs">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Communication Channel
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-base font-black text-slate-900 dark:text-white">
                      {analysis.breakdown.communicationSafetyScore}%
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${analysis.breakdown.communicationSafetyScore > 70 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                      {analysis.breakdown.communicationSafetyScore > 70 ? 'Authentic' : 'Suspicious Channel'}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden mt-2">
                    <div
                      className={`h-full rounded-full ${analysis.breakdown.communicationSafetyScore > 70 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                      style={{ width: `${analysis.breakdown.communicationSafetyScore}%` }}
                    />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 shadow-2xs">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Role &amp; CTC Realism
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-base font-black text-slate-900 dark:text-white">
                      {analysis.breakdown.contentRealismScore}%
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${analysis.breakdown.contentRealismScore > 70 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                      {analysis.breakdown.contentRealismScore > 70 ? 'Realistic' : 'Inflated Claims'}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden mt-2">
                    <div
                      className={`h-full rounded-full ${analysis.breakdown.contentRealismScore > 70 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                      style={{ width: `${analysis.breakdown.contentRealismScore}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Red Flags & Green Flags Columns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Red Flags Section */}
                <div className="p-4 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 space-y-2.5">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700/60">
                    <div className="flex items-center gap-1.5 font-bold text-rose-600 dark:text-rose-400">
                      <ShieldAlert className="w-4 h-4" />
                      <span>Detected Red Flags ({analysis.redFlags.length})</span>
                    </div>
                    {analysis.redFlags.length === 0 && (
                      <span className="text-[11px] text-emerald-600 font-semibold">Zero Fraud Markers</span>
                    )}
                  </div>

                  {analysis.redFlags.length > 0 ? (
                    <div className="space-y-2">
                      {analysis.redFlags.map((rf) => (
                        <div
                          key={rf.id}
                          className="p-2.5 rounded-lg bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/40"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-rose-900 dark:text-rose-200">
                              {rf.title}
                            </span>
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-rose-200 text-rose-900 dark:bg-rose-900 dark:text-rose-100">
                              {rf.severity}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 leading-snug">
                            {rf.description}
                          </p>
                          {rf.evidenceSnippet && (
                            <div className="text-[10px] text-rose-800 dark:text-rose-300 font-mono bg-rose-100/80 dark:bg-rose-950/80 px-2 py-0.5 rounded mt-1.5 inline-block">
                              Match: &ldquo;{rf.evidenceSnippet}&rdquo;
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 text-xs">
                      No deceptive payment requests, suspicious messaging channels, or domain spoofing identified in this opportunity.
                    </div>
                  )}
                </div>

                {/* Green Flags Section */}
                <div className="p-4 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 space-y-2.5">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700/60">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Verified Trust Signals ({analysis.greenFlags.length})</span>
                    </div>
                  </div>

                  {analysis.greenFlags.length > 0 ? (
                    <div className="space-y-2">
                      {analysis.greenFlags.map((gf) => (
                        <div
                          key={gf.id}
                          className="p-2.5 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/40"
                        >
                          <span className="font-bold text-emerald-900 dark:text-emerald-200 block">
                            {gf.title}
                          </span>
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 leading-snug">
                            {gf.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-500 text-xs">
                      Insufficient authentic signals detected. Treat with extra caution.
                    </div>
                  )}
                </div>
              </div>

              {/* Action Directive Strip */}
              <div className="p-3.5 rounded-xl bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {variant === 'tpo' ? 'TPO Protocol Recommendation:' : 'Student Cyber Safety Advisory:'}
                  </span>
                  <span className="text-slate-600 dark:text-slate-300">
                    {variant === 'tpo' ? analysis.actionForTpo : analysis.actionForStudent}
                  </span>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <span className="text-[10px] text-slate-400 font-mono">
                    AI Scan ID: {analysis.id.slice(-8)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

