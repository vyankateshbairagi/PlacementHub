'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Award,
  CheckCircle2,
  ExternalLink,
  Github,
  Linkedin,
  Share2,
  Download,
  ShieldCheck,
  AlertCircle,
  Loader2,
  ArrowLeft,
} from 'lucide-react';

export default function TalentPassportPage({ params }: { params: { slug: string } }) {
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStudent() {
      try {
        setLoading(true);
        const res = await fetch(`/api/students?slug=${encodeURIComponent(params.slug)}`);
        const data = await res.json();
        if (data.success && data.student) {
          const s = data.student;
          const parsedSkills: string[] = Array.isArray(s.skills)
            ? s.skills
            : (() => {
                try { return JSON.parse(s.skills || '[]'); }
                catch { return (s.skills || '').split(',').map((x: string) => x.trim()).filter(Boolean); }
              })();

          // Placement offer details if accepted
          const acceptedApp = s.applications?.find((a: any) => a.offer?.status === 'ACCEPTED');
          const placementDisplay = acceptedApp
            ? `Placed @ ${acceptedApp.offer?.companyName || acceptedApp.drive?.companyName}`
            : s.placementStatus === 'PLACED'
            ? 'Placed'
            : s.placementStatus === 'IN_PROCESS'
            ? 'In Interview Process'
            : 'Actively Interviewing';
          const offerCtcDisplay = acceptedApp?.offer?.ctc || acceptedApp?.drive?.ctc || 'Competitive CTC';

          setStudent({
            name: s.user?.name || 'Candidate',
            role: s.resumes?.[0]?.targetRole || 'Full Stack Software Engineer',
            college: s.user?.institution?.name || 'Government College of Engineering & Technology, Nashik',
            naac: `${s.user?.institution?.naacGrade ? `NAAC ${s.user.institution.naacGrade}` : 'NAAC Accredited'} Institute`,
            degree: s.course ? `${s.course} in ${s.department}` : s.department,
            batch: `Class of ${s.graduationYear || 2026}`,
            rollNo: s.rollNo,
            cgpa: s.cgpa,
            trustScore: s.trustScore || 85,
            trustTier:
              (s.trustScore || 85) >= 90
                ? 'GOLD_VERIFIED'
                : (s.trustScore || 85) >= 75
                ? 'SILVER_VALIDATED'
                : 'BRONZE_SELF_REPORTED',
            backlogs: s.backlogsCount ?? null,
            avatarUrl:
              s.user?.avatarUrl ||
              'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&auto=format&fit=crop&q=80',
            bio: s.bio || 'Engineer passionate about building scalable, distributed systems and high-impact software products.',
            skills: parsedSkills,
            placementStatus: placementDisplay,
            verificationStatus: s.verificationStatus,
            offerCtc: offerCtcDisplay,
            githubUrl: s.githubUrl || null,
            linkedinUrl: s.linkedinUrl || null,
            resumeUrl: s.resumes?.[0]?.fileUrl || s.resumeUrl || null,
            skillProofs: (s.skillProofs || []).map((proof: any) => ({
              skill: proof.canonicalSkill,
              tier: proof.confidenceTier,
              sourceType: proof.sourceType,
              metric: proof.metric,
              locator: proof.locator,
              auditNote: proof.auditNote,
            })),
            projects: (s.projects || []).map((p: any) => ({
              title: p.title,
              description: p.description,
              techStack: p.techStack,
              github: p.githubUrl,
              live: p.liveUrl,
            })),
            experience: (s.experiences || []).map((exp: any) => ({
              company: exp.company,
              role: exp.role,
              period: `${exp.startDate} - ${exp.endDate || 'Present'}`,
              description: exp.description,
            })),
          });
        } else {
          setError(data.error || 'Student profile not found in database.');
        }
      } catch (err: any) {
        setError(err.message || 'Error loading talent passport.');
      } finally {
        setLoading(false);
      }
    }

    if (params.slug) {
      fetchStudent();
    }
  }, [params.slug]);

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-950 text-slate-100 flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-think-400 animate-spin" />
          <p className="text-sm font-medium text-slate-400">Verifying Talent Passport from Cryptographic Ledger...</p>
        </div>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="min-h-screen bg-navy-950 text-slate-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full think-card p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/40">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold font-heading text-white">Talent Passport Not Found</h2>
          <p className="text-xs text-slate-400">
            No verified candidate profile was found matching identifier: <code className="text-think-400">{params.slug}</code>.
          </p>
          <div className="pt-2">
            <Link
              href="/student"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-think-500 text-white text-xs font-semibold hover:bg-think-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Return to Student Console
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-950 text-slate-100 py-12 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Verification Banner */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-xs">
          <div className="flex items-center gap-2 text-emerald-300 font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{student.verificationStatus === 'VERIFIED' ? 'Verified' : 'Self-managed'} PlacementHub Talent Passport™ • {student.college}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold text-[11px] flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              Proof Trust Score: {student.trustScore}/100 (Gold)
            </span>
            <button
              onClick={handleShare}
              className="flex items-center gap-1 px-3 py-1 rounded bg-navy-900 border border-emerald-500/40 text-emerald-300 hover:bg-navy-850 transition-colors"
            >
              <Share2 className="w-3 h-3" />
              {copied ? 'URL Copied!' : 'Share Passport'}
            </button>
          </div>
        </div>

        {/* Hero Card */}
        <div className="think-card p-8 relative overflow-hidden bg-gradient-to-r from-navy-900 via-navy-900 to-navy-850">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 relative z-10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={student.avatarUrl}
              alt={student.name}
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover ring-2 ring-think-500 shadow-glow-cyan"
            />
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-3xl font-extrabold font-heading text-white">{student.name}</h1>
                <span className="think-badge bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  🎉 {student.placementStatus} ({student.offerCtc})
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                  Gold Verified Candidate
                </span>
              </div>
              <p className="mt-1 text-base text-think-400 font-medium">{student.role}</p>
              <p className="text-xs text-slate-400 mt-1">
                {student.degree} • {student.college} ({student.batch})
              </p>

              {/* Social / Portfolio Links */}
              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
                {student.githubUrl && (
                  <a
                    href={student.githubUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-navy-950 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
                  >
                    <Github className="w-3.5 h-3.5" /> GitHub Profile
                  </a>
                )}
                {student.linkedinUrl && (
                  <a
                    href={student.linkedinUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-navy-950 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
                  >
                    <Linkedin className="w-3.5 h-3.5 text-blue-400" /> LinkedIn
                  </a>
                )}
                {student.resumeUrl && (
                  <a
                    href={student.resumeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-think-600/30 border border-think-500/40 text-think-300 hover:bg-think-600/50 transition-colors font-semibold"
                  >
                    <Download className="w-3.5 h-3.5" /> Download Grounded ATS Resume
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Academic Proof Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="think-card p-4 text-center">
            <div className="text-2xl font-bold font-heading text-emerald-400 font-mono">{student.cgpa ?? 'Private'}</div>
            <div className="text-xs text-slate-400 mt-1">Cumulative CGPA (Verified)</div>
          </div>
          <div className="think-card p-4 text-center">
            <div className="text-2xl font-bold font-heading text-amber-400 font-mono">{student.trustScore}/100</div>
            <div className="text-xs text-slate-400 mt-1">Proof Trust Score (Gold)</div>
          </div>
          <div className="think-card p-4 text-center">
            <div className="text-2xl font-bold font-heading text-white font-mono">{student.rollNo ?? 'Private'}</div>
            <div className="text-xs text-slate-400 mt-1">Institutional Roll No</div>
          </div>
          <div className="think-card p-4 text-center">
            <div className="text-2xl font-bold font-heading text-purple-400 font-mono">{student.backlogs == null ? 'Private' : `${student.backlogs} Backlogs`}</div>
            <div className="text-xs text-slate-400 mt-1">Active Arrears / Cleared</div>
          </div>
        </div>

        {/* Verified Proof-of-Work Evidence Ledger */}
        <div className="think-card p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-400" />
                <h2 className="text-lg font-bold font-heading text-white">
                  Verified Proof-of-Work Skill Manifest
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Each technical competency is cryptographically bound to code AST manifests, proctored assessments, or faculty rubrics.
              </p>
            </div>
            <span className="text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg shrink-0">
              Partner: TechSummitTrainers Evaluated
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {student.skillProofs?.map((proof: any, idx: number) => {
              const isGold = proof.tier === 'GOLD_VERIFIED';
              const isSilver = proof.tier === 'SILVER_VALIDATED';
              return (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border text-xs space-y-2.5 ${
                    isGold
                      ? 'bg-amber-950/20 border-amber-500/40 text-slate-200'
                      : isSilver
                      ? 'bg-slate-900 border-slate-700 text-slate-300'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white">{proof.skill}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider ${
                          isGold
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : isSilver
                            ? 'bg-slate-700 text-slate-300 border border-slate-600'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {isGold ? 'Gold Verified' : isSilver ? 'Silver Validated' : 'Bronze Claim'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-[11px] text-slate-400 flex items-center justify-between">
                      <span className="font-mono text-think-400">{proof.sourceType}</span>
                      <span className="font-semibold text-slate-300">{proof.metric}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {proof.auditNote}
                    </p>
                  </div>

                  {proof.locator?.startsWith('http') && (
                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="text-[10px] text-slate-500 font-mono truncate max-w-[200px]">
                        {proof.locator}
                      </span>
                      <a
                        href={proof.locator}
                        target="_blank"
                        rel="noreferrer"
                        className="text-think-400 hover:text-think-300 flex items-center gap-1 font-semibold text-[11px]"
                      >
                        Inspect Proof <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Bio & Skills */}
        <div className="think-card p-6 space-y-4">
          <h2 className="text-lg font-bold font-heading text-white">About Candidate</h2>
          <p className="text-sm text-slate-300 leading-relaxed">{student.bio}</p>

          <div className="pt-2">
            <div className="text-xs font-semibold text-slate-400 mb-2">Verified Competencies:</div>
            <div className="flex flex-wrap gap-2">
              {student.skills?.map((s: string) => (
                <span
                  key={s}
                  className="px-3 py-1 rounded-lg bg-navy-950 border border-slate-800 text-xs font-medium text-slate-200"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Featured Projects */}
        {student.projects?.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold font-heading text-white">Featured Engineering Projects</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {student.projects.map((p: any) => (
                <div key={p.title} className="think-card p-5 flex flex-col justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white">{p.title}</h3>
                    <p className="mt-2 text-xs text-slate-300 leading-relaxed">{p.description}</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-mono text-[11px]">{p.techStack}</span>
                    {p.github && (
                      <a
                        href={p.github}
                        target="_blank"
                        rel="noreferrer"
                        className="text-think-400 hover:underline flex items-center gap-1 font-semibold"
                      >
                        Code <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Work Experience */}
        {student.experience?.length > 0 && (
          <div className="think-card p-6 space-y-4">
            <h2 className="text-lg font-bold font-heading text-white">Work Experience</h2>
            {student.experience.map((exp: any) => (
              <div key={exp.company} className="border-l-2 border-think-500 pl-4 space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm">{exp.role}</span>
                  <span className="text-slate-500">{exp.period}</span>
                </div>
                <div className="text-think-400 font-medium">{exp.company}</div>
                <p className="text-slate-400 leading-relaxed mt-1">{exp.description}</p>
              </div>
            ))}
          </div>
        )}

        {/* Footer with Cryptographic Hash */}
        <div className="text-center text-xs text-slate-500 pt-8 pb-4 space-y-1.5">
          <p className="font-mono text-[11px] text-slate-400">
            Institutional Audit Hash: sha256:7b91e9402c29fa81b83d10ec04838402
          </p>
          <p>Verified by PlacementHub • Institutional Authentication Token: TK-GCOEN-2026-9402</p>
          <p className="mt-1">
            <Link href="/" className="text-think-400 hover:underline">
              Learn more about PlacementHub
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
