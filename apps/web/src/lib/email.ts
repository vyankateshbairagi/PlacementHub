type EmailMessage = { to: string; subject: string; html: string };

export async function sendEmail(message: EmailMessage): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    if (process.env.NODE_ENV !== 'production') console.info(`[email skipped] ${message.subject} -> ${message.to}`);
    return false;
  }
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, ...message }),
  });
  if (!response.ok) throw new Error(`Email provider rejected the request (${response.status}).`);
  return true;
}

export function appUrl(path: string): string {
  return `${(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '')}${path}`;
}
