'use client';
import { FormEvent, useState } from 'react';
import AuthCard from '@/components/auth/AuthCard';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState(''); const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) { e.preventDefault(); setBusy(true); const response = await fetch('/api/auth/password/request',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email})}); const data=await response.json(); setMessage(data.message || data.error); setBusy(false); }
  return <AuthCard title="Reset your password" subtitle="We will send a one-time reset link if the account exists."><form onSubmit={submit} className="space-y-4"><input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Institutional email" className="w-full rounded-xl border p-3 bg-transparent"/><button disabled={busy} className="w-full rounded-xl bg-blue-600 text-white font-bold py-3 disabled:opacity-50">Send reset link</button>{message&&<p className="text-sm text-slate-600 dark:text-slate-300">{message}</p>}</form></AuthCard>;
}

