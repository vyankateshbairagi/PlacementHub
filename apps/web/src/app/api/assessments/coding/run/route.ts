import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { authErrorResponse } from '@/lib/auth-http';
import { runCodeInSandbox } from '@/lib/code-runner';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    await requireSession(['STUDENT']);
    const body = await req.json();
    const code = typeof body.code === 'string' ? body.code : '';
    const language = typeof body.language === 'string' ? body.language.toLowerCase() : 'javascript';

    if (!code.trim()) {
      return NextResponse.json({ success: false, error: 'Code is required.' }, { status: 400 });
    }

    const supportedLanguages = ['javascript', 'js', 'typescript', 'ts', 'python', 'py', 'python3'];
    if (!supportedLanguages.includes(language)) {
      return NextResponse.json(
        { success: false, error: `Language '${language}' not supported. Supported: JavaScript, TypeScript, Python.` },
        { status: 400 }
      );
    }

    const testCases = Array.isArray(body.testCases)
      ? body.testCases.filter((item: any) => item && typeof item.input === 'string' && typeof item.output === 'string')
      : [];

    const result = await runCodeInSandbox({
      code,
      language,
      testCases,
      revealHidden: true,
    });

    return NextResponse.json(result);
  } catch (error) {
    return authErrorResponse(error);
  }
}
