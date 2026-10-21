'use client';

import React, { useState } from 'react';
import StitchDashboardShell from '@/components/layout/StitchDashboardShell';
import { useRole } from '@/context/RoleContext';
import {
  UserCheck,
  Calendar,
  Share2,
  Briefcase,
  Plus,
  CheckCircle2,
  Clock,
  Sparkles,
  MessageSquare,
  Award,
  ExternalLink,
  Users,
  Send,
  Building2,
  X,
  FileText,
  Bookmark,
} from 'lucide-react';

export default function AlumniDashboard() {
  const { user, showToast } = useRole();
  const [activeTab, setActiveTab] = useState<'mentorship' | 'referrals' | 'network' | 'stories'>('mentorship');

  // Mentorship Slots State
  const [slots, setSlots] = useState([
    {
      id: 'slot-1',
      topic: 'Crack Amazon & FAANG SDE Technical Coding Rounds',
      date: 'Tomorrow',
      timeSlot: '7:30 PM - 8:15 PM IST',
      duration: '45 mins',
      isBooked: false,
      bookedBy: null,
    },
    {
      id: 'slot-2',
      topic: 'System Design Basics & Low-Level Schema Design',
      date: 'This Saturday',
      timeSlot: '11:00 AM - 11:45 AM IST',
      duration: '45 mins',
      isBooked: true,
      bookedBy: 'Priya Kulkarni (IT, 8.78 CGPA)',
    },
    {
      id: 'slot-3',
      topic: 'Resume Review & STAR Behavioral Method for Juniors',
      date: 'Next Monday',
      timeSlot: '6:00 PM - 6:45 PM IST',
      duration: '45 mins',
      isBooked: false,
      bookedBy: null,
    },
  ]);

  // Internal Company Referrals State
  const [referrals, setReferrals] = useState([
    {
      id: 'ref-1',
      company: 'Amazon Web Services (AWS)',
      role: 'Software Development Engineer 1 (Cloud Infra)',
      location: 'Bangalore / Hyderabad',
      experience: '2026 Batch Graduates',
      compensation: '₹28.5 - ₹34.0 LPA',
      routedStatus: 'PUBLISHED_TO_ELIGIBLE',
      applicantsCount: 14,
    },
    {
      id: 'ref-2',
      company: 'Amazon Fulfillment Technologies',
      role: 'Summer Intern - SDE (6 Months)',
      location: 'Bangalore',
      experience: 'Pre-final Year (2027 Batch)',
      compensation: '₹1.1L / month stipend',
      routedStatus: 'ROUTING_TO_TPO',
      applicantsCount: 6,
    },
  ]);

  // Alumni Directory
  const [alumniNetwork] = useState([
    {
      name: 'Sneha Deshmukh',
      role: 'Data Scientist',
      company: 'Microsoft',
      batch: 'Class of 2021',
      location: 'Hyderabad',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    },
    {
      name: 'Rohan Mehra',
      role: 'Staff Platform Engineer',
      company: 'Uber',
      batch: 'Class of 2019',
      location: 'Bangalore',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    },
    {
      name: 'Pooja Nair',
      role: 'Product Manager',
      company: 'Razorpay',
      batch: 'Class of 2020',
      location: 'Mumbai',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
    },
  ]);

  // Modals
  const [showSlotModal, setShowSlotModal] = useState(false);
  const [showReferralModal, setShowReferralModal] = useState(false);

  // Forms
  const [slotTopic, setSlotTopic] = useState('');
  const [slotDate, setSlotDate] = useState('Tomorrow');
  const [slotTime, setSlotTime] = useState('6:00 PM - 6:45 PM IST');

  const [refCompany, setRefCompany] = useState('Amazon Web Services');
  const [refRole, setRefRole] = useState('Frontend Engineer - Design Systems');
  const [refCompensation, setRefCompensation] = useState('₹24.0 LPA');
  const [refSkills, setRefSkills] = useState('React, TypeScript, CSS Systems');

  const handleCreateSlot = (e: React.FormEvent) => {
    e.preventDefault();
    setSlots([
      {
        id: `slot-${Date.now()}`,
        topic: slotTopic,
        date: slotDate,
        timeSlot: slotTime,
        duration: '45 mins',
        isBooked: false,
        bookedBy: null,
      },
      ...slots,
    ]);
    setShowSlotModal(false);
    setSlotTopic('');
    showToast('New mentorship slot published for juniors!');
  };

  const handleCreateReferral = (e: React.FormEvent) => {
    e.preventDefault();
    const newRef = {
      id: `ref-${Date.now()}`,
      company: refCompany,
      role: refRole,
      location: 'Bangalore / Hybrid',
      experience: '2026 Batch',
      compensation: refCompensation,
      routedStatus: 'ROUTING_TO_TPO',
      applicantsCount: 0,
    };
    setReferrals([newRef, ...referrals]);
    setShowReferralModal(false);
    showToast(`Internal referral opportunity for "${refRole}" routed to TPO desk!`);
  };

  return (
    <StitchDashboardShell
      roleOverride="ALUMNI"
      activePath={activeTab}
      onPathChange={(p) => setActiveTab(p as any)}
      title="Alumni Mentorship & Referral Network"
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowReferralModal(true)}
            className="stitch-btn-primary flex items-center gap-2 text-xs py-2 px-3.5"
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Share Company Referral</span>
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Alumni Profile Sub-Banner */}
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
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                    <Award className="w-3 h-3 text-amber-600" /> Star Alumni Mentor • 28 Mentees Guided
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  SDE-2 at <strong className="text-slate-700 dark:text-slate-300">Amazon Web Services (AWS)</strong> • Class of 2022 • Alma Mater: GCOEN
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSlotModal(true)}
                className="stitch-btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Open 1:1 Slot</span>
              </button>
            </div>
          </div>
        </div>

        {/* 4 Clean Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-[#E3E8EE] dark:border-slate-800 rounded-xl p-4 shadow-sm">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Students Mentored
            </span>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              28 <span className="text-xs font-normal text-slate-500">Juniors</span>
            </div>
            <p className="text-[11px] text-amber-600 font-medium mt-1">4.9 / 5.0 Feedback Rating</p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-[#E3E8EE] dark:border-slate-800 rounded-xl p-4 shadow-sm">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Mock Sessions
            </span>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              16 <span className="text-xs font-normal text-slate-500">Conducted</span>
            </div>
            <p className="text-[11px] text-primary font-medium mt-1">Technical Coding & System Design</p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-[#E3E8EE] dark:border-slate-800 rounded-xl p-4 shadow-sm">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Referrals Shared
            </span>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              {referrals.length} <span className="text-xs font-normal text-slate-500">Openings</span>
            </div>
            <p className="text-[11px] text-emerald-600 font-medium mt-1">Routed to GCOEN Students</p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-[#E3E8EE] dark:border-slate-800 rounded-xl p-4 shadow-sm">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Hires from Referral
            </span>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              5 <span className="text-xs font-normal text-slate-500">Placed</span>
            </div>
            <p className="text-[11px] text-primary font-medium mt-1">At Amazon, Uber & Microsoft</p>
          </div>
        </div>

        {/* Tab Sub-Nav */}
        <div className="flex border-b border-[#E3E8EE] dark:border-slate-800 gap-6">
          <button
            onClick={() => setActiveTab('mentorship')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'mentorship'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>1:1 Mock Interview Slots</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              {slots.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('referrals')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'referrals'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>Internal Company Referrals</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              {referrals.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('network')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'network'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Alumni Directory</span>
          </button>
        </div>

        {/* TAB 1: 1:1 Mentorship Slots */}
        {activeTab === 'mentorship' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Upcoming 1:1 Guidance & Mock Sessions
                </h2>
                <p className="text-xs text-slate-500">
                  Juniors can book these slots directly from their CareerOS dashboard.
                </p>
              </div>
              <button
                onClick={() => setShowSlotModal(true)}
                className="stitch-btn-primary text-xs py-2 px-3 flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Publish New Slot</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {slots.map((s) => (
                <div
                  key={s.id}
                  className="bg-white dark:bg-slate-900 border border-[#E3E8EE] dark:border-slate-800 rounded-xl p-5 shadow-sm flex flex-col justify-between space-y-3"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="font-semibold text-primary">{s.date}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          s.isBooked
                            ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200'
                            : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200'
                        }`}
                      >
                        {s.isBooked ? 'Booked' : 'Open for Booking'}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                      {s.topic}
                    </h3>

                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-2">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{s.timeSlot}</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#E3E8EE] dark:border-slate-800 text-xs">
                    {s.isBooked ? (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 text-[11px]">Mentee: {s.bookedBy}</span>
                        <button
                          onClick={() => showToast('Launching mock interview Google Meet room...')}
                          className="stitch-btn-primary text-[11px] py-1 px-2.5"
                        >
                          Join Meet
                        </button>
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-400 italic">
                        Awaiting student booking
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: Internal Referrals */}
        {activeTab === 'referrals' && (
          <div className="space-y-4">
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-xs space-y-1">
              <span className="font-bold text-primary flex items-center gap-1">
                <Sparkles className="w-4 h-4" /> CareerOS Institutional Referral Routing
              </span>
              <p className="text-slate-600 dark:text-slate-300">
                When you share an internal referral opening here, it is directly routed to your alma mater&apos;s TPO desk. The TPO screens eligible batchmates and forwards matched resumes directly to your corporate inbox for referral submission.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {referrals.map((ref) => (
                <div
                  key={ref.id}
                  className="bg-white dark:bg-slate-900 border border-[#E3E8EE] dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        {ref.company}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                        {ref.role}
                      </h3>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200">
                      {ref.compensation}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span>{ref.location}</span>
                    <span>•</span>
                    <span>{ref.experience}</span>
                  </div>

                  <div className="pt-3 border-t border-[#E3E8EE] dark:border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-primary font-semibold">
                      {ref.applicantsCount} Verified Student Applicants
                    </span>
                    <button
                      onClick={() => showToast(`Reviewing applicant resumes for ${ref.role}...`)}
                      className="stitch-btn-secondary text-[11px] py-1 px-3"
                    >
                      Review Resumes
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: Alumni Directory */}
        {activeTab === 'network' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {alumniNetwork.map((alumnus) => (
              <div
                key={alumnus.name}
                className="bg-white dark:bg-slate-900 border border-[#E3E8EE] dark:border-slate-800 rounded-xl p-5 shadow-sm flex items-center gap-3.5"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={alumnus.avatar}
                  alt={alumnus.name}
                  className="w-12 h-12 rounded-xl object-cover border border-[#E3E8EE] dark:border-slate-700 shrink-0"
                />
                <div className="flex-1 min-w-0 text-xs">
                  <h4 className="font-bold text-slate-900 dark:text-white truncate">{alumnus.name}</h4>
                  <p className="text-slate-600 dark:text-slate-300 font-medium">
                    {alumnus.role} @ <strong className="text-primary">{alumnus.company}</strong>
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {alumnus.batch} • {alumnus.location}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL: Publish Mentorship Slot */}
      {showSlotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-[#E3E8EE] dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E3E8EE] dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Open 1:1 Mentorship Slot
              </h3>
              <button
                onClick={() => setShowSlotModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSlot} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Session Topic / Focus
                </label>
                <input
                  type="text"
                  value={slotTopic}
                  onChange={(e) => setSlotTopic(e.target.value)}
                  placeholder="e.g. System Design Mock & Cloud Architecture"
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
                    type="text"
                    value={slotDate}
                    onChange={(e) => setSlotDate(e.target.value)}
                    placeholder="e.g. This Saturday"
                    className="stitch-input text-xs py-2 w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Time Window
                  </label>
                  <input
                    type="text"
                    value={slotTime}
                    onChange={(e) => setSlotTime(e.target.value)}
                    placeholder="e.g. 7:00 PM - 7:45 PM"
                    className="stitch-input text-xs py-2 w-full"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E3E8EE] dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowSlotModal(false)}
                  className="stitch-btn-secondary text-xs py-2 px-3"
                >
                  Cancel
                </button>
                <button type="submit" className="stitch-btn-primary text-xs py-2 px-4">
                  Publish Slot to Students
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Post Referral Opportunity */}
      {showReferralModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-[#E3E8EE] dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E3E8EE] dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Route Internal Company Referral
              </h3>
              <button
                onClick={() => setShowReferralModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateReferral} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Company Name
                </label>
                <input
                  type="text"
                  value={refCompany}
                  onChange={(e) => setRefCompany(e.target.value)}
                  className="stitch-input text-xs py-2 w-full"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Role Title
                </label>
                <input
                  type="text"
                  value={refRole}
                  onChange={(e) => setRefRole(e.target.value)}
                  className="stitch-input text-xs py-2 w-full"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Offered CTC
                  </label>
                  <input
                    type="text"
                    value={refCompensation}
                    onChange={(e) => setRefCompensation(e.target.value)}
                    className="stitch-input text-xs py-2 w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Required Skills
                  </label>
                  <input
                    type="text"
                    value={refSkills}
                    onChange={(e) => setRefSkills(e.target.value)}
                    className="stitch-input text-xs py-2 w-full"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E3E8EE] dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowReferralModal(false)}
                  className="stitch-btn-secondary text-xs py-2 px-3"
                >
                  Cancel
                </button>
                <button type="submit" className="stitch-btn-primary text-xs py-2 px-4">
                  Route to TPO Desk
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </StitchDashboardShell>
  );
}
