import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { generateCoverLetter } from '@/lib/resume-service';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Unauthorized: Student account required' }, { status: 403 });
    }

    const body = await req.json();
    const { companyName, roleTitle, jobDescription, resumeId } = body;

    if (!companyName || !roleTitle) {
      return NextResponse.json({ error: 'companyName and roleTitle are required' }, { status: 400 });
    }

    const result = await generateCoverLetter({
      userId: session.userId,
      companyName: companyName.trim(),
      roleTitle: roleTitle.trim(),
      jobDescription: jobDescription?.trim(),
      resumeId,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Error generating cover letter:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}

