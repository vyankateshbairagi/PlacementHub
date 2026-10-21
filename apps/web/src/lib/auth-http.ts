import { NextResponse } from 'next/server';
import { AuthError } from '@/lib/auth';

export function authErrorResponse(error: unknown, fallbackMessage = 'Unexpected server error.') {
  if (error instanceof AuthError) {
    return NextResponse.json({ success: false, error: error.message }, { status: error.status });
  }
  console.error(error);
  return NextResponse.json({ success: false, error: fallbackMessage }, { status: 500 });
}

