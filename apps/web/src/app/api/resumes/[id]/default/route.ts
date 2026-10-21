import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { setDefaultResume } from '@/lib/resume-service';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Unauthorized: Student account required' }, { status: 403 });
    }

    const { id } = params;
    const result = await setDefaultResume(id, session.userId);

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Error setting default resume:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 400 });
  }
}

