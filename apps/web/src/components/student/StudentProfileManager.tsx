'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Eye, GraduationCap, Pencil, Plus, Send, ShieldCheck, Trash2, UserRound, X } from 'lucide-react';

type Tab = 'profile' | 'records' | 'privacy' | 'verification';
type Resource = 'education' | 'projects' | 'experiences';

const privacyLabels: Record<string, string> = {
  isPublic: 'Publish my Talent Passport',
  showEmailPublic: 'Show email publicly',
  showPhonePublic: 'Show phone publicly',
  showAcademicsPublic: 'Show academic details',
  showProjectsPublic: 'Show verified projects',
  showExperiencePublic: 'Show verified experience',
  showResumePublic: 'Show my default resume',
};

export default function StudentProfileManager({ profile, onChange }: { profile: any; onChange: (profile: any) => void }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('profile');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [resource, setResource] = useState<Resource>('education');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [record, setRecord] = useState<Record<string, string>>({});
  const [verification, setVerification] = useState({ targetType: 'PROFILE', targetId: '', evidenceUrl: '', note: '' });
  const [form, setForm] = useState<any>({});
  const [privacy, setPrivacy] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!profile) return;
    setForm({
      name: profile.user?.name || '', phone: profile.user?.phone || '', avatarUrl: profile.user?.avatarUrl || '',
      bio: profile.bio || '', department: profile.department || '', course: profile.course || '', rollNo: profile.rollNo || '',
      prn: profile.prn || '', graduationYear: profile.graduationYear || '', cgpa: profile.cgpa ?? '', backlogsCount: profile.backlogsCount ?? 0,
      linkedinUrl: profile.linkedinUrl || '', githubUrl: profile.githubUrl || '', portfolioUrl: profile.portfolioUrl || '',
      skills: Array.isArray(profile.skills) ? profile.skills.join(', ') : '',
    });
    setPrivacy(Object.fromEntries(Object.keys(privacyLabels).map((key) => [key, Boolean(profile[key])])));
  }, [profile]);

  async function call(url: string, init: RequestInit) {
    setBusy(true); setMessage('');
    try {
      const response = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json', ...(init.headers || {}) } });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Request failed.');
      if (data.profile) onChange(data.profile);
      setMessage('Saved successfully.');
      return data;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Request failed.');
      return null;
    } finally { setBusy(false); }
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    await call('/api/profile/student', { method: 'PATCH', body: JSON.stringify({ ...form, graduationYear: Number(form.graduationYear), cgpa: Number(form.cgpa), backlogsCount: Number(form.backlogsCount), skills: form.skills.split(',').map((s: string) => s.trim()).filter(Boolean) }) });
  }

  async function savePrivacy() {
    const data = await call('/api/profile/student/privacy', { method: 'PATCH', body: JSON.stringify(privacy) });
    if (data) onChange({ ...profile, ...data.privacy });
  }

  function fieldsForResource() {
    if (resource === 'education') return [['institutionName', 'Institution'], ['qualification', 'Qualification'], ['fieldOfStudy', 'Field of study'], ['startYear', 'Start year'], ['endYear', 'End year'], ['score', 'Score / grade']];
    if (resource === 'projects') return [['title', 'Project title'], ['techStack', 'Tech stack'], ['githubUrl', 'GitHub URL'], ['liveUrl', 'Live URL'], ['description', 'Description']];
    return [['company', 'Company'], ['role', 'Role'], ['type', 'Type'], ['startDate', 'Start date'], ['endDate', 'End date'], ['description', 'Description']];
  }

  function records() {
    if (resource === 'education') return profile?.educations || [];
    return profile?.[resource] || [];
  }

  async function saveRecord(event: FormEvent) {
    event.preventDefault();
    const data = await call(`/api/profile/student/${resource}`, { method: editingId ? 'PATCH' : 'POST', body: JSON.stringify({ ...record, ...(editingId ? { id: editingId } : {}) }) });
    if (data) { setRecord({}); setEditingId(null); }
  }

  async function removeRecord(id: string) {
    if (!window.confirm('Delete this profile record?')) return;
    const data = await call(`/api/profile/student/${resource}?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (data && editingId === id) { setRecord({}); setEditingId(null); }
  }

  function editRecord(item: any) {
    setEditingId(item.id);
    setRecord(Object.fromEntries(fieldsForResource().map(([key]) => [key, item[key] == null ? '' : String(item[key])] )));
  }

  async function requestVerification(event: FormEvent) {
    event.preventDefault();
    const data = await call('/api/profile/student/verifications', { method: 'POST', body: JSON.stringify(verification) });
    if (data) setVerification({ targetType: 'PROFILE', targetId: '', evidenceUrl: '', note: '' });
  }

  const inputClass = 'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500';
  const tabs: Array<[Tab, string, any]> = [['profile', 'Profile', UserRound], ['records', 'Education & work', GraduationCap], ['privacy', 'Privacy', Eye], ['verification', 'Verification', ShieldCheck]];

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-2 transition">
        <Pencil className="w-4 h-4" /> Manage profile
      </button>
      {open && (
        <div className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-sm p-3 sm:p-8 overflow-y-auto">
          <div className="max-w-5xl mx-auto bg-slate-50 dark:bg-[#0B1220] rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden">
            <header className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
              <div><h2 className="font-black text-lg text-slate-900 dark:text-white">Manage student profile</h2><p className="text-xs text-slate-500">Changes to academic claims require fresh verification.</p></div>
              <button onClick={() => setOpen(false)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"><X className="w-5 h-5" /></button>
            </header>
            <div className="flex flex-wrap gap-2 p-4 border-b border-slate-200 dark:border-slate-800">
              {tabs.map(([id, label, Icon]) => <button key={id} onClick={() => { setTab(id); setMessage(''); }} className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 ${tab === id ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}><Icon className="w-4 h-4" />{label}</button>)}
            </div>
            <main className="p-5 sm:p-7">
              {message && <div className={`mb-4 rounded-xl px-4 py-3 text-sm ${message === 'Saved successfully.' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{message}</div>}
              {tab === 'profile' && <form onSubmit={saveProfile} className="grid sm:grid-cols-2 gap-4">
                {[['name','Full name'],['phone','Phone'],['avatarUrl','Avatar HTTPS URL'],['department','Department'],['course','Course'],['rollNo','Roll number'],['prn','PRN'],['graduationYear','Graduation year'],['cgpa','CGPA'],['backlogsCount','Active backlogs'],['linkedinUrl','LinkedIn URL'],['githubUrl','GitHub URL'],['portfolioUrl','Portfolio URL'],['skills','Skills (comma separated)'],['bio','Professional bio']].map(([key,label]) => <label key={key} className={key === 'bio' || key === 'skills' ? 'sm:col-span-2' : ''}><span className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1.5">{label}</span>{key === 'bio' ? <textarea className={inputClass} rows={4} value={form[key] || ''} onChange={e=>setForm({...form,[key]:e.target.value})}/> : <input className={inputClass} type={['graduationYear','cgpa','backlogsCount'].includes(key) ? 'number' : 'text'} step={key==='cgpa'?'0.01':undefined} value={form[key] ?? ''} onChange={e=>setForm({...form,[key]:e.target.value})}/>}</label>)}
                <button disabled={busy} className="sm:col-span-2 rounded-xl bg-blue-600 text-white py-2.5 text-sm font-bold disabled:opacity-50">Save profile</button>
              </form>}
              {tab === 'records' && <div className="space-y-5">
                <div className="flex flex-wrap gap-2">{(['education','projects','experiences'] as Resource[]).map(item=><button key={item} onClick={()=>{setResource(item);setRecord({});setEditingId(null);}} className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize ${resource===item?'bg-blue-600 text-white':'bg-white dark:bg-slate-800'}`}>{item}</button>)}</div>
                <div className="grid md:grid-cols-2 gap-4">{records().map((item:any)=><div key={item.id} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4"><div className="flex justify-between gap-3"><div><div className="font-bold text-sm text-slate-900 dark:text-white">{item.institutionName || item.title || item.role}</div><div className="text-xs text-slate-500">{item.qualification || item.techStack || item.company}</div><span className={`inline-block mt-2 text-[10px] font-bold ${item.verified?'text-emerald-600':'text-amber-600'}`}>{item.verified?'Verified':'Unverified'}</span></div><div className="flex gap-1"><button onClick={()=>editRecord(item)} className="p-2"><Pencil className="w-4 h-4"/></button><button onClick={()=>removeRecord(item.id)} className="p-2 text-rose-600"><Trash2 className="w-4 h-4"/></button></div></div></div>)}</div>
                <form onSubmit={saveRecord} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 grid sm:grid-cols-2 gap-3"><h3 className="sm:col-span-2 font-bold text-sm">{editingId?'Edit':'Add'} {resource}</h3>{fieldsForResource().map(([key,label])=><label key={key} className={key==='description'?'sm:col-span-2':''}><span className="text-xs font-bold text-slate-500 block mb-1">{label}</span>{key==='description'?<textarea rows={3} className={inputClass} value={record[key]||''} onChange={e=>setRecord({...record,[key]:e.target.value})}/>:<input className={inputClass} value={record[key]||''} onChange={e=>setRecord({...record,[key]:e.target.value})}/>}</label>)}<button disabled={busy} className="sm:col-span-2 bg-blue-600 text-white rounded-xl py-2 text-sm font-bold flex justify-center gap-2"><Plus className="w-4 h-4"/>{editingId?'Update':'Add'} record</button></form>
              </div>}
              {tab === 'privacy' && <div className="max-w-2xl space-y-3">{Object.entries(privacyLabels).map(([key,label])=><label key={key} className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4"><span className="text-sm font-semibold">{label}</span><input type="checkbox" checked={Boolean(privacy[key])} onChange={e=>setPrivacy({...privacy,[key]:e.target.checked})} className="w-5 h-5 accent-blue-600"/></label>)}<button onClick={savePrivacy} disabled={busy} className="w-full bg-blue-600 text-white rounded-xl py-2.5 text-sm font-bold">Save privacy controls</button></div>}
              {tab === 'verification' && <form onSubmit={requestVerification} className="max-w-2xl grid gap-4"><p className="text-sm text-slate-500">Submit evidence for TPO or faculty review. Only approved records appear as verified on your public passport.</p><select className={inputClass} value={verification.targetType} onChange={e=>setVerification({...verification,targetType:e.target.value,targetId:''})}><option value="PROFILE">Academic profile</option><option value="EDUCATION">Education</option><option value="PROJECT">Project</option><option value="EXPERIENCE">Experience</option></select>{verification.targetType!=='PROFILE'&&<select required className={inputClass} value={verification.targetId} onChange={e=>setVerification({...verification,targetId:e.target.value})}><option value="">Select a record</option>{(verification.targetType==='EDUCATION'?profile?.educations:verification.targetType==='PROJECT'?profile?.projects:profile?.experiences)?.map((item:any)=><option key={item.id} value={item.id}>{item.institutionName||item.title||`${item.role} at ${item.company}`}</option>)}</select>}<input required className={inputClass} placeholder="HTTPS evidence URL" value={verification.evidenceUrl} onChange={e=>setVerification({...verification,evidenceUrl:e.target.value})}/><textarea className={inputClass} rows={4} placeholder="Review note (optional)" value={verification.note} onChange={e=>setVerification({...verification,note:e.target.value})}/><button disabled={busy} className="bg-blue-600 text-white rounded-xl py-2.5 text-sm font-bold flex justify-center gap-2"><Send className="w-4 h-4"/>Request verification</button><div className="space-y-2">{(profile?.verificationRequests||[]).map((item:any)=><div key={item.id} className="rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 flex justify-between text-xs"><span>{item.targetType}</span><span className="font-bold">{item.status}</span></div>)}</div></form>}
            </main>
          </div>
        </div>
      )}
    </>
  );
}
