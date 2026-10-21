import { NextResponse } from 'next/server';
import { analyzeResumeAts } from '@/lib/tacie';

export async function POST(request: Request) {
  try {
    const { resumeText, targetRole = 'Software Engineer' } = await request.json();
    if (!resumeText) {
      return NextResponse.json({ success: false, error: 'Resume text is required' }, { status: 400 });
    }

    const result = await analyzeResumeAts(resumeText, targetRole);
    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error('Error in TACIE ATS:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
