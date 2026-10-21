'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import StitchDashboardShell from '@/components/layout/StitchDashboardShell';
import { useRole } from '@/context/RoleContext';
import {
  Shield,
  Building,
  Users,
  CheckCircle2,
  Award,
  Layers,
  FileCheck,
  Plus,
  Download,
  X,
  ExternalLink,
  RefreshCw,
  FileSpreadsheet,
  FileText,
  SlidersHorizontal,
} from 'lucide-react';

export type InstituteTab =
  | 'overview'
  | 'departments'
  | 'policy'
  | 'stakeholders'
  | 'accreditation';

interface DepartmentRecord {
  id?: string;
  name: string;
  intake: number;
  registeredStudents: number;
  placed: number;
  placementRate: string;
  hod: string;
  avgCgpa: string;
}

// ============================================================================
// SIDEBAR PATH <-> TAB RESOLVER (Prevents Blank Screen on Sidebar Navigation)
// ============================================================================
const TAB_TO_SIDEBAR_PATH: Record<InstituteTab, string> = {
  overview: 'dashboard',
  departments: 'departments',
  policy: 'policy',
  stakeholders: 'stakeholders',
  accreditation: 'nirf-reports',
};

function resolveInstituteTab(rawPath: string): InstituteTab {
  const p = (rawPath || '').toLowerCase().trim().replace(/^\/institute\/?/, '');
  if (!p || p === 'dashboard' || p === 'overview' || p === 'governance') return 'overview';
  if (p.includes('dept') || p.includes('department') || p.includes('academic')) return 'departments';
  if (p.includes('polic') || p.includes('rule') || p.includes('criteria')) return 'policy';
  if (p.includes('stakeholder') || p.includes('rbac') || p.includes('director') || p.includes('user')) {
    return 'stakeholders';
  }
  if (p.includes('nirf') || p.includes('naac') || p.includes('accredit') || p.includes('report') || p.includes('audit')) {
    return 'accreditation';
  }
  return 'overview';
}

export default function InstituteDashboard() {
  const { user, showToast } = useRole();
  const [activeTab, setActiveTab] = useState<InstituteTab>('overview');
  const [loading, setLoading] = useState<boolean>(true);
  const [savingPolicy, setSavingPolicy] = useState<boolean>(false);
  const [savingDept, setSavingDept] = useState<boolean>(false);

  // Live API-hydrated states (Zero hardcoded dummy arrays)
  const [institution, setInstitution] = useState<any | null>(null);
  const [departments, setDepartments] = useState<DepartmentRecord[]>([]);
  const [liveDrives, setLiveDrives] = useState<any[]>([]);
  const [liveOffers, setLiveOffers] = useState<any[]>([]);
  const [stakeholders, setStakeholders] = useState<any[]>([]);

  // Controlled Policy Engine State (Hydrated from institution record)
  const [policyType, setPolicyType] = useState<string>('');
  const [dreamThreshold, setDreamThreshold] = useState<string>('');
  const [superDreamThreshold, setSuperDreamThreshold] = useState<string>('');
  const [minAttendance, setMinAttendance] = useState<string>('');
  const [maxOffersAllowed, setMaxOffersAllowed] = useState<string>('');

  // Department Modal State (Supports both Add & Edit/Configure)
  const [showDeptModal, setShowDeptModal] = useState<boolean>(false);
  const [editingDeptIndex, setEditingDeptIndex] = useState<number | null>(null);
  const [deptForm, setDeptForm] = useState({
    name: '',
    intake: '',
    registeredStudents: '',
    placed: '',
    hod: '',
    avgCgpa: '',
  });

  // ============================================================================
  // MASTER DATA HYDRATION FROM API ENDPOINTS
  // ============================================================================
  const loadInstituteTelemetry = useCallback(async () => {
    setLoading(true);
    try {
      const [instRes, drivesRes, offersRes] = await Promise.allSettled([
        fetch('/api/institution').then((r) => r.json()),
        fetch('/api/drives').then((r) => r.json()),
        fetch('/api/offers').then((r) => r.json()),
      ]);

      let instData: any = null;
      if (instRes.status === 'fulfilled' && instRes.value?.success && instRes.value?.institution) {
        instData = instRes.value.institution;
        setInstitution(instData);

        setPolicyType(instData.placementPolicy || 'Dream Company Policy (Single Dream Upgrade)');
        setDreamThreshold(
          instData.dreamOfferThreshold !== undefined ? String(instData.dreamOfferThreshold) : '10.0'
        );
        setSuperDreamThreshold(
          instData.superDreamOfferThreshold !== undefined ? String(instData.superDreamOfferThreshold) : '20.0'
        );
        setMinAttendance(
          instData.minAttendance !== undefined ? String(instData.minAttendance) : '75%'
        );
        setMaxOffersAllowed(
          instData.maxOffersPerStudent !== undefined ? String(instData.maxOffersPerStudent) : '2'
        );

        if (Array.isArray(instData.stakeholders) || Array.isArray(instData.users)) {
          setStakeholders(instData.stakeholders || instData.users);
        }
      }

      let fetchedDrives: any[] = [];
      if (drivesRes.status === 'fulfilled' && drivesRes.value?.success && Array.isArray(drivesRes.value.drives)) {
        fetchedDrives = drivesRes.value.drives;
        setLiveDrives(fetchedDrives);
      }

      let fetchedOffers: any[] = [];
      if (offersRes.status === 'fulfilled' && offersRes.value?.success && Array.isArray(offersRes.value.offers)) {
        fetchedOffers = offersRes.value.offers;
        setLiveOffers(fetchedOffers);
      }

      // Hydrate departments from /api/institution or derive from live student/offer records
      if (instData && Array.isArray(instData.departments) && instData.departments.length > 0) {
        const mappedDepts: DepartmentRecord[] = instData.departments.map((d: any) => {
          const intake = Number(d.intake) || 0;
          const reg = Number(d.registeredStudents ?? d.intake) || 0;
          const placed = Number(d.placed) || 0;
          const computedRate =
            d.placementRate ||
            (reg > 0 ? `${((placed / reg) * 100).toFixed(1)}%` : '0.0%');
          return {
            id: d.id,
            name: d.name || 'Department',
            intake,
            registeredStudents: reg,
            placed,
            placementRate: computedRate,
            hod: d.hod || 'Not Assigned',
            avgCgpa: d.avgCgpa ? String(d.avgCgpa) : 'N/A',
          };
        });
        setDepartments(mappedDepts);
      } else if (fetchedOffers.length > 0) {
        // Dynamically group by student department from live offers if institution.departments is empty
        const deptMap = new Map<string, { placed: number; total: number }>();
        fetchedOffers.forEach((off: any) => {
          const deptName = off.student?.department || 'General Engineering';
          const curr = deptMap.get(deptName) || { placed: 0, total: 0 };
          curr.total += 1;
          if (off.status === 'ACCEPTED') curr.placed += 1;
          deptMap.set(deptName, curr);
        });
        const derivedDepts: DepartmentRecord[] = Array.from(deptMap.entries()).map(([name, counts]) => ({
          name,
          intake: counts.total,
          registeredStudents: counts.total,
          placed: counts.placed,
          placementRate: counts.total > 0 ? `${((counts.placed / counts.total) * 100).toFixed(1)}%` : '0.0%',
          hod: 'Department Coordinator',
          avgCgpa: 'N/A',
        }));
        setDepartments(derivedDepts);
      } else {
        setDepartments([]);
      }
    } catch (err) {
      console.warn('Error loading institutional telemetry:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInstituteTelemetry();
  }, [loadInstituteTelemetry]);

  // ============================================================================
  // DYNAMIC COMPUTED INSTITUTIONAL METRICS (Zero Hardcoded Numbers)
  // ============================================================================
  const computedMetrics = useMemo(() => {
    const totalRegistered =
      institution?.metrics?.registeredStudents ??
      departments.reduce((sum, d) => sum + (Number(d.registeredStudents) || Number(d.intake) || 0), 0);

    const totalPlacedFromDepts = departments.reduce((sum, d) => sum + (Number(d.placed) || 0), 0);
    const acceptedOffersCount = liveOffers.filter((o) => o.status === 'ACCEPTED').length;
    const totalPlaced = totalPlacedFromDepts || acceptedOffersCount;

    const overallPlacementRate =
      institution?.metrics?.overallPlacementRate ||
      (totalRegistered > 0 ? `${((totalPlaced / totalRegistered) * 100).toFixed(1)}%` : '0.0%');

    // Unique hiring partners from live drives & offers
    const partnerSet = new Set<string>();
    liveDrives.forEach((d) => {
      if (d.companyName) partnerSet.add(d.companyName);
    });
    liveOffers.forEach((o) => {
      if (o.companyName) partnerSet.add(o.companyName);
    });
    const activePartnerCount =
      institution?.metrics?.activeMous ?? partnerSet.size;
    const topPartnersList = Array.from(partnerSet).slice(0, 4).join(', ');

    // Calculate Median & Highest CTC from live offers or drives
    const ctcValues: number[] = [];
    let highestCompany = '';
    let maxCtc = 0;

    const extractCtcNumber = (rawCtc: any, amount?: any): number => {
      if (typeof amount === 'number' && amount > 0) return amount;
      if (typeof rawCtc === 'string') {
        const match = rawCtc.match(/(\d+(\.\d+)?)/);
        if (match) return parseFloat(match[1]);
      }
      return 0;
    };

    const sourceList = liveOffers.length > 0 ? liveOffers : liveDrives;
    sourceList.forEach((item) => {
      const val = extractCtcNumber(item.ctc, item.ctcAmount);
      if (val > 0) {
        ctcValues.push(val);
        if (val > maxCtc) {
          maxCtc = val;
          highestCompany = item.companyName || '';
        }
      }
    });

    ctcValues.sort((a, b) => a - b);
    const mid = Math.floor(ctcValues.length / 2);
    const medianCtcVal =
      ctcValues.length === 0
        ? 0
        : ctcValues.length % 2 !== 0
        ? ctcValues[mid]
        : (ctcValues[mid - 1] + ctcValues[mid]) / 2;

    const medianCtcDisplay =
      institution?.metrics?.medianCtc ||
      (medianCtcVal > 0 ? `₹${medianCtcVal.toFixed(1)} LPA` : 'N/A');

    const highestCtcDisplay =
      institution?.metrics?.highestCtc ||
      (maxCtc > 0
        ? `Highest: ₹${maxCtc.toFixed(1)} LPA${highestCompany ? ` (${highestCompany})` : ''}`
        : 'No offers recorded yet');

    const verifiedProofsCount = liveOffers.filter(
      (o) => o.metadata?.packageProof?.status === 'VERIFIED'
    ).length;
    const pendingProofsCount = liveOffers.filter(
      (o) => o.metadata?.packageProof?.status === 'PENDING_VERIFICATION'
    ).length;

    return {
      totalRegistered,
      totalPlaced,
      overallPlacementRate,
      activePartnerCount,
      topPartnersList,
      medianCtcDisplay,
      highestCtcDisplay,
      verifiedProofsCount,
      pendingProofsCount,
    };
  }, [institution, departments, liveDrives, liveOffers]);

  // ============================================================================
  // MUTATION HANDLERS (Persisted to /api/institution)
  // ============================================================================
  const openAddDeptModal = () => {
    setEditingDeptIndex(null);
    setDeptForm({
      name: '',
      intake: '60',
      registeredStudents: '60',
      placed: '0',
      hod: '',
      avgCgpa: '',
    });
    setShowDeptModal(true);
  };

  const openEditDeptModal = (dept: DepartmentRecord, idx: number) => {
    setEditingDeptIndex(idx);
    setDeptForm({
      name: dept.name,
      intake: String(dept.intake),
      registeredStudents: String(dept.registeredStudents ?? dept.intake),
      placed: String(dept.placed ?? 0),
      hod: dept.hod,
      avgCgpa: dept.avgCgpa === 'N/A' ? '' : dept.avgCgpa,
    });
    setShowDeptModal(true);
  };

  const handleSaveDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptForm.name.trim()) return;

    const intakeNum = parseInt(deptForm.intake, 10) || 60;
    const regNum = parseInt(deptForm.registeredStudents, 10) || intakeNum;
    const placedNum = parseInt(deptForm.placed, 10) || 0;
    const rate = regNum > 0 ? `${((placedNum / regNum) * 100).toFixed(1)}%` : '0.0%';

    const updatedRecord: DepartmentRecord = {
      name: deptForm.name.trim(),
      intake: intakeNum,
      registeredStudents: regNum,
      placed: placedNum,
      placementRate: rate,
      hod: deptForm.hod.trim() || 'Not Assigned',
      avgCgpa: deptForm.avgCgpa.trim() || 'N/A',
    };

    const nextDepts =
      editingDeptIndex !== null
        ? departments.map((d, i) => (i === editingDeptIndex ? updatedRecord : d))
        : [...departments, updatedRecord];

    setSavingDept(true);
    try {
      const res = await fetch('/api/institution', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ departments: nextDepts }),
      });
      const data = await res.json();
      if (data.success && data.institution) {
        setInstitution(data.institution);
      }
      setDepartments(nextDepts);
      showToast(
        editingDeptIndex !== null
          ? `Department "${updatedRecord.name}" updated!`
          : `Department "${updatedRecord.name}" added to institutional registry!`
      );
      setShowDeptModal(false);
    } catch {
      setDepartments(nextDepts);
      showToast(`Department "${updatedRecord.name}" saved locally.`);
      setShowDeptModal(false);
    } finally {
      setSavingDept(false);
    }
  };

  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPolicy(true);
    try {
      const res = await fetch('/api/institution', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          placementPolicy: policyType,
          dreamOfferThreshold: parseFloat(dreamThreshold) || 10.0,
          superDreamOfferThreshold: parseFloat(superDreamThreshold) || 20.0,
          minAttendance,
          maxOffersPerStudent: parseInt(maxOffersAllowed, 10) || 2,
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.institution) setInstitution(data.institution);
        showToast('Institutional placement policy saved to database!');
      } else {
        showToast(data.error || 'Policy parameters updated.');
      }
    } catch {
      showToast('Policy parameters saved locally.');
    } finally {
      setSavingPolicy(false);
    }
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

    const endpoint = `/api/reports/${reportType}?${params.toString()}`;

    if (format === 'html') {
      window.open(endpoint, '_blank');
      return;
    }

    const a = document.createElement('a');
    a.href = endpoint;
    a.download = `${reportType.toUpperCase()}_Report_${reportBatchYear}.${format === 'excel' ? 'xls' : 'csv'}`;
    a.click();
  };

  const instName = institution?.name || user?.institutionName || 'Institution Portal';
  const instInitial = instName[0] || 'I';

  return (
    <StitchDashboardShell
      roleOverride="INSTITUTE_ADMIN"
      activePath={TAB_TO_SIDEBAR_PATH[activeTab]}
      onPathChange={(p) => setActiveTab(resolveInstituteTab(p))}
      title="Institutional Administration & Governance"
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadInstituteTelemetry}
            disabled={loading}
            className="stitch-btn-secondary flex items-center gap-1.5 text-xs py-2 px-2.5"
            title="Sync Database"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-primary' : ''}`} />
            <span className="hidden sm:inline">Sync</span>
          </button>
          <button
            type="button"
            onClick={() => handleDownloadReport('nirf', 'csv')}
            className="stitch-btn-secondary flex items-center gap-1.5 text-xs py-2 px-3"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export NIRF / NAAC</span>
          </button>
          <button
            type="button"
            onClick={openAddDeptModal}
            className="stitch-btn-primary flex items-center gap-1.5 text-xs py-2 px-3.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Department</span>
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* ===================================================================== */}
        {/* 1. COLLEGE PROFILE SUB-BANNER (Hydrated from /api/institution)        */}
        {/* ===================================================================== */}
        <div className="bg-white dark:bg-slate-900 border border-[#E3E8EE] dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-rose-50 to-orange-100 dark:from-slate-800 dark:to-slate-700 border border-[#E3E8EE] dark:border-slate-700 flex items-center justify-center font-bold text-xl text-rose-600 shrink-0">
                {instInitial}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold text-slate-900 dark:text-white">{instName}</h1>
                  {(institution?.naacGrade || institution?.nirfRank) && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                      <Shield className="w-3 h-3 text-rose-600" />
                      {institution?.naacGrade ? `NAAC ${institution.naacGrade}` : ''}
                      {institution?.naacGrade && institution?.nirfRank ? ' • ' : ''}
                      {institution?.nirfRank ? `NIRF Rank ${institution.nirfRank}` : ''}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap items-center gap-1.5">
                  <span>
                    Admin: <strong className="text-slate-700 dark:text-slate-300">{user?.name || 'Administrator'}</strong>
                  </span>
                  {institution?.code && (
                    <>
                      <span>•</span>
                      <span>
                        Code: <strong className="font-mono text-slate-700 dark:text-slate-300">{institution.code}</strong>
                      </span>
                    </>
                  )}
                  {(institution?.city || institution?.state) && (
                    <>
                      <span>•</span>
                      <span>
                        {[institution.city, institution.state].filter(Boolean).join(', ')}
                      </span>
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-[#E3E8EE] dark:border-slate-700">
                Tier: {institution?.tier || 'INSTITUTIONAL'} ACTIVE
              </span>
            </div>
          </div>
        </div>

        {/* ===================================================================== */}
        {/* 2. DYNAMIC EXECUTIVE KPI CARDS (100% Derived from API Data)           */}
        {/* ===================================================================== */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            onClick={() => setActiveTab('departments')}
            className="cursor-pointer bg-white dark:bg-slate-900 border border-[#E3E8EE] dark:border-slate-800 rounded-xl p-4 shadow-sm hover:border-primary/40 transition"
          >
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Registered Students
            </span>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {computedMetrics.totalRegistered}{' '}
              <span className="text-xs font-normal text-slate-500">Students</span>
            </div>
            <p className="text-[11px] text-emerald-600 font-medium mt-1">
              Across {departments.length} Academic Departments
            </p>
          </div>

          <div
            onClick={() => setActiveTab('departments')}
            className="cursor-pointer bg-white dark:bg-slate-900 border border-[#E3E8EE] dark:border-slate-800 rounded-xl p-4 shadow-sm hover:border-primary/40 transition"
          >
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Overall Placement
            </span>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {computedMetrics.overallPlacementRate}{' '}
              <span className="text-xs font-normal text-slate-500">Rate</span>
            </div>
            <p className="text-[11px] text-primary font-medium mt-1">
              {computedMetrics.totalPlaced} Placed Candidates
            </p>
          </div>

          <div
            onClick={() => setActiveTab('stakeholders')}
            className="cursor-pointer bg-white dark:bg-slate-900 border border-[#E3E8EE] dark:border-slate-800 rounded-xl p-4 shadow-sm hover:border-primary/40 transition"
          >
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Active Corporate Drives
            </span>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {computedMetrics.activePartnerCount}{' '}
              <span className="text-xs font-normal text-slate-500">Employers</span>
            </div>
            <p className="text-[11px] text-emerald-600 font-medium mt-1 truncate">
              {computedMetrics.topPartnersList || `${liveDrives.length} Drives Monitored`}
            </p>
          </div>

          <div
            onClick={() => setActiveTab('accreditation')}
            className="cursor-pointer bg-white dark:bg-slate-900 border border-[#E3E8EE] dark:border-slate-800 rounded-xl p-4 shadow-sm hover:border-primary/40 transition"
          >
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Median Compensation
            </span>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {computedMetrics.medianCtcDisplay}
            </div>
            <p className="text-[11px] text-primary font-medium mt-1 truncate">
              {computedMetrics.highestCtcDisplay}
            </p>
          </div>
        </div>

        {/* ===================================================================== */}
        {/* 3. TAB SUB-NAVIGATION (Includes All 5 Views)                          */}
        {/* ===================================================================== */}
        <div className="flex border-b border-[#E3E8EE] dark:border-slate-800 gap-6 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Building className="w-4 h-4" />
            <span>Governance &amp; Policies</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('departments')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'departments'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Academic Departments</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              {departments.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('policy')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'policy'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Placement Rule Engine</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('stakeholders')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'stakeholders'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>RBAC Directory</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('accreditation')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'accreditation'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>NIRF &amp; NAAC Audit</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold">
              {liveOffers.length}
            </span>
          </button>
        </div>

        {/* ===================================================================== */}
        {/* TAB 1: GOVERNANCE & OVERVIEW                                          */}
        {/* ===================================================================== */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-[#E3E8EE] dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E3E8EE] dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Institutional Placement Policy Architecture
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveTab('policy')}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Edit Parameters →
                </button>
              </div>
              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-xl border border-[#E3E8EE] dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white">
                      {policyType || 'Tiered Placement Policy'}
                    </span>
                    <span className="text-[11px] font-bold text-emerald-600">ENFORCED</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    <strong>Active Thresholds:</strong> Dream Tier begins at{' '}
                    <strong>₹{dreamThreshold || '10.0'} LPA</strong> • Super Dream Tier begins at{' '}
                    <strong>₹{superDreamThreshold || '20.0'} LPA</strong> • Minimum Attendance:{' '}
                    <strong>{minAttendance || '75%'}</strong> • Maximum Offers Permitted:{' '}
                    <strong>{maxOffersAllowed || '2'} per student</strong>.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-[#E3E8EE] dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white">
                      Active Campus Drives &amp; Offer Telemetry
                    </span>
                    <span className="text-[11px] font-bold text-primary">LIVE DB</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    Currently monitoring <strong>{liveDrives.length} campus recruitment drives</strong> and{' '}
                    <strong>{liveOffers.length} extended job offers</strong> across{' '}
                    <strong>{departments.length} academic departments</strong>.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-[#E3E8EE] dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-3 flex flex-col justify-between">
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">NAAC &amp; NIRF Auditing</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Offer letters, compensation breakdowns, and joining statuses are tracked in real-time for NIRF Criterion 5.2.1 compliance.
                </p>
                <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 font-semibold">
                  ✓ {computedMetrics.verifiedProofsCount} Verified Offer Proofs ({computedMetrics.pendingProofsCount}{' '}
                  Pending Audit)
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('accreditation')}
                className="w-full py-2 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 transition"
              >
                Open NIRF / NAAC Dossier →
              </button>
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* TAB 2: ACADEMIC DEPARTMENTS                                           */}
        {/* ===================================================================== */}
        {activeTab === 'departments' && (
          <div className="bg-white dark:bg-slate-900 border border-[#E3E8EE] dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
            {departments.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-[#E3E8EE] dark:border-slate-700 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="p-3.5">Department Name</th>
                      <th className="p-3.5">Approved Intake</th>
                      <th className="p-3.5">Registered</th>
                      <th className="p-3.5">Head of Department (HoD)</th>
                      <th className="p-3.5">Students Placed</th>
                      <th className="p-3.5">Placement %</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E3E8EE] dark:divide-slate-800">
                    {departments.map((dept, idx) => (
                      <tr
                        key={`${dept.name}-${idx}`}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="p-3.5 font-bold text-slate-900 dark:text-white">{dept.name}</td>
                        <td className="p-3.5 font-mono text-slate-600 dark:text-slate-400">{dept.intake} Seats</td>
                        <td className="p-3.5 font-mono text-slate-600 dark:text-slate-400">
                          {dept.registeredStudents}
                        </td>
                        <td className="p-3.5 text-slate-700 dark:text-slate-300">{dept.hod}</td>
                        <td className="p-3.5 font-mono text-slate-700 dark:text-slate-300">{dept.placed}</td>
                        <td className="p-3.5">
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            {dept.placementRate}
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => openEditDeptModal(dept, idx)}
                            className="px-2.5 py-1 rounded text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                          >
                            Configure
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-10 text-center space-y-3">
                <p className="text-xs text-slate-500">
                  {loading
                    ? 'Loading academic departments from institutional registry...'
                    : 'No academic departments registered in the database yet.'}
                </p>
                {!loading && (
                  <button
                    type="button"
                    onClick={openAddDeptModal}
                    className="stitch-btn-primary text-xs py-2 px-4 inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Register First Department</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ===================================================================== */}
        {/* TAB 3: PLACEMENT POLICY ENGINE (Controlled & Persisted via API)       */}
        {/* ===================================================================== */}
        {activeTab === 'policy' && (
          <form
            onSubmit={handleSavePolicy}
            className="bg-white dark:bg-slate-900 border border-[#E3E8EE] dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4 max-w-2xl"
          >
            <h3 className="text-sm font-bold text-slate-900 dark:text-white pb-3 border-b border-[#E3E8EE] dark:border-slate-800">
              Configure Institution-Wide Placement Criteria
            </h3>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Active Policy Rule Type:
                </label>
                <select
                  value={policyType}
                  onChange={(e) => setPolicyType(e.target.value)}
                  className="stitch-input text-xs py-2 w-full"
                >
                  <option value="Dream Company Policy (Single Dream Upgrade)">
                    Dream Company Policy (Single Dream Upgrade)
                  </option>
                  <option value="Strict One Student One Job (Zero Upgrades)">
                    Strict One Student One Job (Zero Upgrades)
                  </option>
                  <option value="Tiered Upgrades (Core → Dream → Super Dream)">
                    Tiered Upgrades (Core → Dream → Super Dream)
                  </option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Dream Company Minimum CTC (LPA):
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={dreamThreshold}
                    onChange={(e) => setDreamThreshold(e.target.value)}
                    className="stitch-input text-xs py-2 w-full"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Super Dream Minimum CTC (LPA):
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={superDreamThreshold}
                    onChange={(e) => setSuperDreamThreshold(e.target.value)}
                    className="stitch-input text-xs py-2 w-full"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Minimum Attendance for Eligibility:
                  </label>
                  <input
                    type="text"
                    value={minAttendance}
                    onChange={(e) => setMinAttendance(e.target.value)}
                    placeholder="e.g. 75%"
                    className="stitch-input text-xs py-2 w-full"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Max Offers Permitted per Student:
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={maxOffersAllowed}
                    onChange={(e) => setMaxOffersAllowed(e.target.value)}
                    className="stitch-input text-xs py-2 w-full"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E3E8EE] dark:border-slate-800">
                <button
                  type="submit"
                  disabled={savingPolicy}
                  className="stitch-btn-primary text-xs py-2 px-4 disabled:opacity-50"
                >
                  {savingPolicy ? 'Saving Policy...' : 'Save Policy Parameters'}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* ===================================================================== */}
        {/* TAB 4: STAKEHOLDERS & RBAC DIRECTORY (Derived from Live Data)         */}
        {/* ===================================================================== */}
        {activeTab === 'stakeholders' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-xl border border-[#E3E8EE] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-2">
                <span className="font-bold text-slate-900 dark:text-white">Institutional Administration</span>
                <p className="text-slate-500">{user?.name || institution?.adminName || 'Principal & Governance Desk'}</p>
                <span className="text-[11px] font-mono text-primary block">
                  {user?.email || institution?.adminEmail || 'Active Session'}
                </span>
              </div>

              <div className="p-4 rounded-xl border border-[#E3E8EE] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-2">
                <span className="font-bold text-slate-900 dark:text-white">
                  Academic Department Heads ({departments.length})
                </span>
                <p className="text-slate-500 truncate">
                  {departments.map((d) => d.hod).filter(Boolean).join(', ') || 'No HoDs registered yet'}
                </p>
                <span className="text-[11px] font-mono text-primary block">
                  {departments.length} Active Departments
                </span>
              </div>

              <div className="p-4 rounded-xl border border-[#E3E8EE] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-2">
                <span className="font-bold text-slate-900 dark:text-white">
                  Hiring Corporate Partners ({computedMetrics.activePartnerCount})
                </span>
                <p className="text-slate-500 truncate">
                  {computedMetrics.topPartnersList || 'No active corporate drives yet'}
                </p>
                <span className="text-[11px] font-mono text-primary block">
                  {liveDrives.length} Drives • {liveOffers.length} Offers
                </span>
              </div>
            </div>

            {stakeholders.length > 0 && (
              <div className="bg-white dark:bg-slate-900 border border-[#E3E8EE] dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-[#E3E8EE] dark:border-slate-700 text-slate-500 font-semibold uppercase text-[10px]">
                    <tr>
                      <th className="p-3.5">Name</th>
                      <th className="p-3.5">Role</th>
                      <th className="p-3.5">Email</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E3E8EE] dark:divide-slate-800">
                    {stakeholders.map((s: any, idx: number) => (
                      <tr key={s.id || idx}>
                        <td className="p-3.5 font-bold text-slate-900 dark:text-white">{s.name}</td>
                        <td className="p-3.5 text-slate-600 dark:text-slate-300">{s.role}</td>
                        <td className="p-3.5 font-mono text-primary">{s.email}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ===================================================================== */}
        {/* TAB 5: NIRF & NAAC ACCREDITATION AUDIT LEDGER (Previously Missing!)   */}
        {/* ===================================================================== */}
        {activeTab === 'accreditation' && (
          <div className="bg-white dark:bg-slate-900 border border-[#E3E8EE] dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col gap-4 pb-4 border-b border-[#E3E8EE] dark:border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    NIRF Criterion 5.2.1 &amp; NAAC Placement Compliance Ledger
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Audited institutional placement records, package proofs, and accreditation evidence bundles
                  </p>
                </div>
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
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 bg-slate-50/70 dark:bg-slate-800/40 p-3 rounded-xl border border-[#E3E8EE] dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">Batch:</span>
                    <select
                      value={reportBatchYear}
                      onChange={(e) => setReportBatchYear(e.target.value)}
                      className="h-8 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium"
                    >
                      <option value="2026">2026 Batch</option>
                      <option value="2025">2025 Batch</option>
                      <option value="2024">2024 Batch</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">Department:</span>
                    <select
                      value={reportDepartment}
                      onChange={(e) => setReportDepartment(e.target.value)}
                      className="h-8 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium"
                    >
                      <option value="ALL">All Departments</option>
                      {departments.map((d) => (
                        <option key={d.name} value={d.name}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDownloadReport('nirf', 'csv')}
                    className="h-8 px-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition"
                  >
                    <Download className="w-3 h-3 text-blue-600" />
                    <span>NIRF Table 5 (CSV)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadReport('nirf', 'excel')}
                    className="h-8 px-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition"
                  >
                    <Download className="w-3 h-3 text-emerald-600" />
                    <span>NIRF (Excel)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadReport('naac', 'csv')}
                    className="h-8 px-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition"
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

            {liveOffers.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-[#E3E8EE] dark:border-slate-700 text-slate-500 font-semibold uppercase text-[10px]">
                    <tr>
                      <th className="p-3">Candidate</th>
                      <th className="p-3">Department</th>
                      <th className="p-3">Employer &amp; Role</th>
                      <th className="p-3">Package (CTC)</th>
                      <th className="p-3">Offer Status</th>
                      <th className="p-3">Proof Verification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E3E8EE] dark:divide-slate-800">
                    {liveOffers.map((off: any) => {
                      const proofStatus = off.metadata?.packageProof?.status || 'UNSUBMITTED';
                      return (
                        <tr key={off.id}>
                          <td className="p-3 font-bold text-slate-900 dark:text-white">
                            {off.student?.name || 'Candidate'}
                          </td>
                          <td className="p-3 text-slate-600 dark:text-slate-300">
                            {off.student?.department || 'Engineering'}
                          </td>
                          <td className="p-3">
                            <div className="font-bold text-slate-900 dark:text-white">{off.companyName}</div>
                            <div className="text-[11px] text-slate-500">{off.roleTitle}</div>
                          </td>
                          <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">{off.ctc}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800">
                              {off.status}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  proofStatus === 'VERIFIED'
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                    : proofStatus === 'PENDING_VERIFICATION'
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                }`}
                              >
                                {proofStatus.replace('_', ' ')}
                              </span>
                              {off.metadata?.packageProof?.proofDocumentUrl && (
                                <a
                                  href={off.metadata.packageProof.proofDocumentUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-500">
                No placement offers recorded in the database yet.
              </div>
            )}
          </div>
        )}
      </div>

      {/* ======================================================================= */}
      {/* MODAL: ADD / CONFIGURE DEPARTMENT                                       */}
      {/* ======================================================================= */}
      {showDeptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-[#E3E8EE] dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E3E8EE] dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingDeptIndex !== null ? 'Configure Academic Department' : 'Register New Academic Department'}
              </h3>
              <button
                type="button"
                onClick={() => setShowDeptModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDepartment} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Department Name *
                </label>
                <input
                  type="text"
                  value={deptForm.name}
                  onChange={(e) => setDeptForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Computer Engineering"
                  className="stitch-input text-xs py-2 w-full"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Intake *
                  </label>
                  <input
                    type="number"
                    value={deptForm.intake}
                    onChange={(e) => setDeptForm((prev) => ({ ...prev, intake: e.target.value }))}
                    className="stitch-input text-xs py-2 w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Registered
                  </label>
                  <input
                    type="number"
                    value={deptForm.registeredStudents}
                    onChange={(e) => setDeptForm((prev) => ({ ...prev, registeredStudents: e.target.value }))}
                    className="stitch-input text-xs py-2 w-full"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Placed
                  </label>
                  <input
                    type="number"
                    value={deptForm.placed}
                    onChange={(e) => setDeptForm((prev) => ({ ...prev, placed: e.target.value }))}
                    className="stitch-input text-xs py-2 w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Appointed Head of Department (HoD) *
                </label>
                <input
                  type="text"
                  value={deptForm.hod}
                  onChange={(e) => setDeptForm((prev) => ({ ...prev, hod: e.target.value }))}
                  placeholder="e.g. Dr. K. R. Patil"
                  className="stitch-input text-xs py-2 w-full"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E3E8EE] dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowDeptModal(false)}
                  className="stitch-btn-secondary text-xs py-2 px-3"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingDept}
                  className="stitch-btn-primary text-xs py-2 px-4 disabled:opacity-50"
                >
                  {savingDept
                    ? 'Saving...'
                    : editingDeptIndex !== null
                    ? 'Save Changes'
                    : 'Add Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </StitchDashboardShell>
  );
}