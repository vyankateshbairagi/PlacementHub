'use client';
import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import AuthCard from '@/components/auth/AuthCard';

function Verify(){const token=useSearchParams().get('token')||'';const [message,setMessage]=useState('Verifying your email…');useEffect(()=>{if(!token){setMessage('Verification token is missing.');return;}fetch('/api/auth/email-verification/confirm',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token})}).then(r=>r.json()).then(d=>setMessage(d.message||d.error)).catch(()=>setMessage('Verification failed.'));},[token]);return <AuthCard title="Email verification" subtitle={message}><Link href="/login" className="block text-center rounded-xl bg-blue-600 text-white font-bold py-3">Continue to sign in</Link></AuthCard>}
export default function VerifyEmailPage(){return <Suspense><Verify/></Suspense>;}
