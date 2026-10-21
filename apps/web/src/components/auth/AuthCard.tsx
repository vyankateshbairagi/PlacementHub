import Link from 'next/link';
import type { ReactNode } from 'react';

export default function AuthCard({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return <main className="min-h-screen bg-slate-950 flex items-center justify-center p-5"><section className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl p-7"><Link href="/login" className="text-sm font-black text-blue-600">PlacementHub</Link><h1 className="text-2xl font-black text-slate-900 dark:text-white mt-5">{title}</h1><p className="text-sm text-slate-500 mt-1 mb-6">{subtitle}</p>{children}</section></main>;
}

