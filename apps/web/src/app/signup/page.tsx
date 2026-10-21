'use client';
import { FormEvent, Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import AuthCard from '@/components/auth/AuthCard';

function SignupForm(){
  const token=useSearchParams().get('token')||''; const [form,setForm]=useState({name:'',password:'',rollNo:'',department:'',course:'B.Tech',graduationYear:new Date().getFullYear()+4}); const [message,setMessage]=useState(''); const [busy,setBusy]=useState(false);
  async function submit(e:FormEvent){e.preventDefault();setBusy(true);const response=await fetch('/api/auth/signup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,...form,graduationYear:Number(form.graduationYear)})});const data=await response.json();setMessage(data.message||data.error);setBusy(false);}
  const cls='w-full rounded-xl border p-3 bg-transparent';
  return <AuthCard title="Accept your invitation" subtitle="Create the verified account linked to your invitation."><form onSubmit={submit} className="space-y-3"><input required className={cls} placeholder="Full name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/><input required className={cls} type="password" minLength={12} placeholder="Secure password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/><input className={cls} placeholder="Student roll number (students only)" value={form.rollNo} onChange={e=>setForm({...form,rollNo:e.target.value})}/><input className={cls} placeholder="Department (students only)" value={form.department} onChange={e=>setForm({...form,department:e.target.value})}/><button disabled={busy||!token} className="w-full rounded-xl bg-blue-600 text-white font-bold py-3 disabled:opacity-50">Create account</button>{message&&<p className="text-sm text-slate-600 dark:text-slate-300">{message}</p>}</form></AuthCard>;
}
export default function SignupPage(){return <Suspense><SignupForm/></Suspense>;}

