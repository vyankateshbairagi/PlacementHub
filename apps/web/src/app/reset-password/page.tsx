'use client';
import { FormEvent, Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import AuthCard from '@/components/auth/AuthCard';

function ResetForm() {
  const token=useSearchParams().get('token')||''; const [password,setPassword]=useState(''); const [message,setMessage]=useState(''); const [busy,setBusy]=useState(false);
  async function submit(e:FormEvent){e.preventDefault();setBusy(true);const response=await fetch('/api/auth/password/confirm',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,password})});const data=await response.json();setMessage(data.message||data.error);setBusy(false);}
  return <AuthCard title="Choose a new password" subtitle="Use 12+ characters with upper/lower case, a number and a symbol."><form onSubmit={submit} className="space-y-4"><input required type="password" minLength={12} value={password} onChange={e=>setPassword(e.target.value)} placeholder="New password" className="w-full rounded-xl border p-3 bg-transparent"/><button disabled={busy||!token} className="w-full rounded-xl bg-blue-600 text-white font-bold py-3 disabled:opacity-50">Update password</button>{message&&<p className="text-sm text-slate-600 dark:text-slate-300">{message}</p>}</form></AuthCard>;
}
export default function ResetPasswordPage(){return <Suspense><ResetForm/></Suspense>;}

