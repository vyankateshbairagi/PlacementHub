import { NextResponse } from 'next/server';
import { detectFakeJobPost, SAMPLE_JOB_SCENARIOS, JobPostInput } from '@/lib/fakeJobDetector';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    success: true,
    service: 'CareerOS AI Job Fraud & Fake Post Detector',
    version: '2.0-ai-enhanced',
    status: 'ACTIVE',
    presets: SAMPLE_JOB_SCENARIOS,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { company, role, description, url, ctc, contactEmail, contactChannel, source } = body;

    if (!company && !description && !url && !role) {
      return NextResponse.json(
        { success: false, error: 'At least one field (company, role, description, or URL) is required.' },
        { status: 400 }
      );
    }

    const input: JobPostInput = {
      company: company || 'Unspecified Company',
      role: role || 'Unspecified Role',
      description: description || '',
      url: url || '',
      ctc: ctc || '',
      contactEmail: contactEmail || '',
      contactChannel: contactChannel || '',
      source: source || 'MANUAL_SCAN',
    };

    const analysis = await detectFakeJobPost(input);

    return NextResponse.json({
      success: true,
      analysis,
    });
  } catch (error: any) {
    console.error('Error in detectFakeJobPost API:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error while analyzing job post' },
      { status: 500 }
    );
  }
}
