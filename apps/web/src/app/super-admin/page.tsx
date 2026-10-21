'use client';

import React, { useState } from 'react';
import StitchDashboardShell from '@/components/layout/StitchDashboardShell';
import { useRole } from '@/context/RoleContext';
import {
  Layers,
  Building,
  TrendingUp,
  Cpu,
  Globe,
  Database,
  Cloud,
  ShieldAlert,
  Sparkles,
  Plus,
  CheckCircle2,
  ExternalLink,
  Shield,
  Activity,
  CreditCard,
  SlidersHorizontal,
  X,
  Radio,
} from 'lucide-react';

export default function SuperAdminDashboard() {
  const { user, showToast } = useRole();
  const [activeTab, setActiveTab] = useState<'tenants' | 'off-campus' | 'subscriptions' | 'system'>('tenants');

  // Multi-tenant Institutions State
  const [tenants, setTenants] = useState([
    {
      id: 'inst-1',
      name: 'Government College of Engineering, Nashik (GCOEN)',
      slug: 'gcoen',
      tier: 'ENTERPRISE',
      students: 640,
      annualContract: '₹2,50,000/yr',
      status: 'ACTIVE',
      joined: 'Aug 2025',
    },
    {
      id: 'inst-2',
      name: 'Pune Institute of Computer Technology (PICT)',
      slug: 'pict',
      tier: 'ENTERPRISE',
      students: 920,
      annualContract: '₹3,50,000/yr',
      status: 'ACTIVE',
      joined: 'Jan 2026',
    },
    {
      id: 'inst-3',
      name: 'Vishwakarma Institute of Technology (VIT Pune)',
      slug: 'vit',
      tier: 'GROWTH',
      students: 650,
      annualContract: '₹1,80,000/yr',
      status: 'ACTIVE',
      joined: 'Mar 2026',
    },
    {
      id: 'inst-4',
      name: 'Veermata Jijabai Technological Institute (VJTI Mumbai)',
      slug: 'vjti',
      tier: 'ENTERPRISE',
      students: 1100,
      annualContract: '₹4,00,000/yr',
      status: 'PENDING_APPROVAL',
      joined: 'Sep 2026',
    },
  ]);

  // Crack Off-Campus B2C Feed Opportunities
  const [offCampusJobs, setOffCampusJobs] = useState([
    {
      id: 'oc-1',
      company: 'Tata Elxsi',
      role: 'Embedded Software Engineer',
      ctc: '₹7.5 LPA',
      batch: '2026',
      source: 'Crack Off-Campus Live Feed',
      status: 'VERIFIED',
    },
    {
      id: 'oc-2',
      company: 'PhonePe',
      role: 'Software Engineer - Platform Infra',
      ctc: '₹22.0 LPA',
      batch: '2026',
      source: 'Crack Off-Campus Live Feed',
      status: 'VERIFIED',
    },
    {
      id: 'oc-3',
      company: 'Swiggy',
      role: 'Associate Frontend Developer',
      ctc: '₹14.0 LPA',
      batch: '2025/2026',
      source: 'Crack Off-Campus Live Feed',
      status: 'VERIFIED',
    },
  ]);

  // Modal
  const [showTenantModal, setShowTenantModal] = useState(false);
  const [tenantName, setTenantName] = useState('');
  const [tenantTier, setTenantTier] = useState('GROWTH');
  const [tenantStudents, setTenantStudents] = useState('500');

  const handleAddTenant = (e: React.FormEvent) => {
    e.preventDefault();
    const newTenant = {
      id: `inst-${Date.now()}`,
      name: tenantName,
      slug: tenantName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      tier: tenantTier,
      students: parseInt(tenantStudents) || 500,
      annualContract: tenantTier === 'ENTERPRISE' ? '₹3,00,000/yr' : '₹1,50,000/yr',
      status: 'ACTIVE',
      joined: 'Today',
    };
    setTenants([...tenants, newTenant]);
    setShowTenantModal(false);
    setTenantName('');
    showToast(`Institution "${tenantName}" onboarded to CareerOS SaaS cluster!`);
  };

  return (
    <StitchDashboardShell
      roleOverride="SUPER_ADMIN"
      activePath={activeTab}
      onPathChange={(p) => setActiveTab(p as any)}
      title="PlacementHub • Super Administrator"
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTenantModal(true)}
            className="stitch-btn-primary flex items-center gap-1.5 text-xs py-2 px-3.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Onboard College Tenant</span>
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Platform Banner */}
        <div className="bg-white dark:bg-slate-900 border border-[#E3E8EE] dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-xl text-white shadow-md shrink-0">
                PH
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                    PlacementHub Multi-Tenant Control Hub
                  </h1>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                    <Shield className="w-3 h-3 text-indigo-600" /> Platform Super Admin (Root)
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Global cluster orchestration, college SaaS licensing, & dual-engine (B2B CareerOS + B2C Crack Off-Campus).
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                ALL SYSTEMS OPERATIONAL
              </span>
            </div>
          </div>
        </div>

        {/* 4 Clean Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-[#E3E8EE] dark:border-slate-800 rounded-xl p-4 shadow-sm">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              College Tenants
            </span>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {tenants.length} <span className="text-xs font-normal text-slate-500">Institutions</span>
            </div>
            <p className="text-[11px] text-primary font-medium mt-1">Across 3 States in India</p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-[#E3E8EE] dark:border-slate-800 rounded-xl p-4 shadow-sm">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Enrolled Students
            </span>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              3,310 <span className="text-xs font-normal text-slate-500">Active</span>
            </div>
            <p className="text-[11px] text-emerald-600 font-medium mt-1">Talent Passports Generated</p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-[#E3E8EE] dark:border-slate-800 rounded-xl p-4 shadow-sm">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Annual Recurring ARR
            </span>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              ₹11.8 <span className="text-xs font-normal text-slate-500">Lakhs</span>
            </div>
            <p className="text-[11px] text-emerald-600 font-medium mt-1">+85% Growth Rate</p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-[#E3E8EE] dark:border-slate-800 rounded-xl p-4 shadow-sm">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Off-Campus Feeds
            </span>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
              1,420 <span className="text-xs font-normal text-slate-500">Live</span>
            </div>
            <p className="text-[11px] text-purple-600 font-medium mt-1">Crack Off-Campus Engine</p>
          </div>
        </div>

        {/* Tab Sub-Nav */}
        <div className="flex border-b border-[#E3E8EE] dark:border-slate-800 gap-6">
          <button
            onClick={() => setActiveTab('tenants')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'tenants'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Building className="w-4 h-4" />
            <span>Institutional Tenants</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              {tenants.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('off-campus')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'off-campus'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>Crack Off-Campus B2C Engine</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              {offCampusJobs.length} Live
            </span>
          </button>

          <button
            onClick={() => setActiveTab('subscriptions')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'subscriptions'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>SaaS Billing & Licensing</span>
          </button>

          <button
            onClick={() => setActiveTab('system')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'system'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>Cluster Health & Audit Logs</span>
          </button>
        </div>

        {/* TAB 1: Institutional Tenants */}
        {activeTab === 'tenants' && (
          <div className="bg-white dark:bg-slate-900 border border-[#E3E8EE] dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-[#E3E8EE] dark:border-slate-700 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-3.5">Institution Name</th>
                    <th className="p-3.5">Subscription Tier</th>
                    <th className="p-3.5">Student Pool</th>
                    <th className="p-3.5">Contract Value</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Super Admin Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E3E8EE] dark:divide-slate-800">
                  {tenants.map((inst) => (
                    <tr key={inst.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5">
                        <span className="font-bold text-slate-900 dark:text-white block">{inst.name}</span>
                        <span className="text-[11px] text-slate-400 font-mono">slug: /{inst.slug}</span>
                      </td>
                      <td className="p-3.5">
                        <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {inst.tier}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono text-slate-700 dark:text-slate-300">{inst.students} Students</td>
                      <td className="p-3.5 font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                        {inst.annualContract}
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                            inst.status === 'ACTIVE'
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                          }`}
                        >
                          {inst.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => showToast(`Opening tenant management workspace for ${inst.name}...`)}
                          className="px-2.5 py-1 rounded text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                        >
                          Manage Tenant
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: Crack Off-Campus B2C Engine */}
        {activeTab === 'off-campus' && (
          <div className="space-y-4">
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-xs space-y-1">
              <span className="font-bold text-primary flex items-center gap-1">
                <Globe className="w-4 h-4" /> Two-Sided Platform Architecture
              </span>
              <p className="text-slate-600 dark:text-slate-300">
                <strong>Crack Off-Campus (B2C)</strong> feeds public off-campus openings directly into student discovery consoles. When college TPOs verify student-submitted links, they are promoted into this syndicated network.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {offCampusJobs.map((job) => (
                <div
                  key={job.id}
                  className="bg-white dark:bg-slate-900 border border-[#E3E8EE] dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-3"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-slate-400">{job.source}</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{job.ctc}</span>
                  </div>

                  <div>
                    <span className="font-semibold text-slate-500 text-xs">{job.company}</span>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{job.role}</h3>
                  </div>

                  <div className="pt-3 border-t border-[#E3E8EE] dark:border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-[11px] font-mono text-slate-500">Batch {job.batch}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      ✓ Syndicated
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: Subscriptions */}
        {activeTab === 'subscriptions' && (
          <div className="bg-white dark:bg-slate-900 border border-[#E3E8EE] dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white pb-3 border-b border-[#E3E8EE] dark:border-slate-800">
              SaaS Billing & License Tiers
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-xl border border-[#E3E8EE] dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2">
                <span className="font-bold text-slate-900 dark:text-white">Growth Plan</span>
                <div className="text-xl font-bold text-primary">₹1,50,000 / year</div>
                <p className="text-slate-500">Up to 750 students, Core TPO desk, Off-campus submission engine.</p>
              </div>

              <div className="p-4 rounded-xl border border-primary dark:border-primary/60 bg-primary/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white">Enterprise Plan</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary text-white">Popular</span>
                </div>
                <div className="text-xl font-bold text-primary">₹3,50,000 / year</div>
                <p className="text-slate-500">Unlimited students, NIRF/NAAC one-click audit, AI Mock prep, Alumni bridge.</p>
              </div>

              <div className="p-4 rounded-xl border border-[#E3E8EE] dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2">
                <span className="font-bold text-slate-900 dark:text-white">Custom University Cluster</span>
                <div className="text-xl font-bold text-slate-800 dark:text-slate-200">Custom Quote</div>
                <p className="text-slate-500">Multi-campus state university deployment with ERP database sync.</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Cluster Health & Audit Logs */}
        {activeTab === 'system' && (
          <div className="bg-white dark:bg-slate-900 border border-[#E3E8EE] dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white pb-3 border-b border-[#E3E8EE] dark:border-slate-800">
              Platform Telemetry & Audit Trail
            </h3>
            <div className="space-y-2 text-xs font-mono">
              <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800/60 border border-[#E3E8EE] dark:border-slate-700 flex justify-between">
                <span className="text-slate-700 dark:text-slate-300">[2026-09-26 07:12:04] TPO Desk Approved Google SDE Campus Drive (198 Applicants)</span>
                <span className="text-emerald-600 font-bold">200 OK</span>
              </div>
              <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800/60 border border-[#E3E8EE] dark:border-slate-700 flex justify-between">
                <span className="text-slate-700 dark:text-slate-300">[2026-09-26 07:05:12] Student Aditya Shinde submitted Off-Campus link for Atlassian (+50 Pts)</span>
                <span className="text-emerald-600 font-bold">200 OK</span>
              </div>
              <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800/60 border border-[#E3E8EE] dark:border-slate-700 flex justify-between">
                <span className="text-slate-700 dark:text-slate-300">[2026-09-26 06:48:29] SHA-256 Talent Passport cryptographic seal minted for Batch 2026</span>
                <span className="text-emerald-600 font-bold">SUCCESS</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL: Onboard Tenant */}
      {showTenantModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-[#E3E8EE] dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E3E8EE] dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Onboard College / University Tenant
              </h3>
              <button
                onClick={() => setShowTenantModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddTenant} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Institution Name
                </label>
                <input
                  type="text"
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                  placeholder="e.g. Sardar Patel Institute of Technology (SPIT)"
                  className="stitch-input text-xs py-2 w-full"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Subscription Tier
                </label>
                <select
                  value={tenantTier}
                  onChange={(e) => setTenantTier(e.target.value)}
                  className="stitch-input text-xs py-2 w-full"
                >
                  <option value="GROWTH">Growth Tier (₹1,50,000/yr)</option>
                  <option value="ENTERPRISE">Enterprise Tier (₹3,50,000/yr)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Initial Enrolled Student Seats
                </label>
                <input
                  type="number"
                  value={tenantStudents}
                  onChange={(e) => setTenantStudents(e.target.value)}
                  className="stitch-input text-xs py-2 w-full"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E3E8EE] dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowTenantModal(false)}
                  className="stitch-btn-secondary text-xs py-2 px-3"
                >
                  Cancel
                </button>
                <button type="submit" className="stitch-btn-primary text-xs py-2 px-4">
                  Provision Tenant Instance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </StitchDashboardShell>
  );
}
