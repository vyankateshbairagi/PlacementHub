import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const resume = await prisma.resume.findUnique({
      where: { id },
      include: {
        studentProfile: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!resume) {
      return new NextResponse('Resume not found', { status: 404 });
    }

    let parsed: any = null;
    try {
      if (resume.parsedData) parsed = JSON.parse(resume.parsedData);
    } catch {}

    const name = parsed?.personalInfo?.fullName || resume.studentProfile.user.name || 'Candidate';
    const email = parsed?.personalInfo?.email || resume.studentProfile.user.email || '';
    const phone = parsed?.personalInfo?.phone || '';
    const summary = parsed?.summary || '';
    const skills = parsed?.skills || [];
    const experience = parsed?.experience || [];
    const projects = parsed?.projects || [];
    const education = parsed?.education || [];

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${name} - Resume (${resume.version})</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.5; color: #1e293b; max-width: 800px; margin: 40px auto; padding: 0 24px; }
    h1 { margin: 0 0 4px 0; font-size: 26px; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; }
    .contact { font-size: 13px; color: #475569; margin-bottom: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; }
    .contact a { color: #2563eb; text-decoration: none; }
    h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #1e3a8a; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-top: 18px; margin-bottom: 10px; }
    p { margin: 0 0 8px 0; font-size: 13.5px; }
    ul { margin: 4px 0 12px 18px; padding: 0; font-size: 13px; }
    li { margin-bottom: 4px; }
    .item-header { display: flex; justify-content: space-between; font-weight: 600; font-size: 13.5px; }
    .item-sub { display: flex; justify-content: space-between; font-style: italic; font-size: 13px; color: #475569; margin-bottom: 4px; }
    .skills-row { font-size: 13px; margin-bottom: 6px; }
    .skills-cat { font-weight: 600; color: #334155; }
    @media print {
      body { margin: 0; padding: 0; }
      @page { margin: 1.5cm; }
    }
  </style>
</head>
<body>
  <h1>${name}</h1>
  <div class="contact">
    ${email} | ${phone} | ${parsed?.personalInfo?.location || ''}
    ${parsed?.personalInfo?.linkedinUrl ? ` | <a href="${parsed.personalInfo.linkedinUrl}">LinkedIn</a>` : ''}
    ${parsed?.personalInfo?.githubUrl ? ` | <a href="${parsed.personalInfo.githubUrl}">GitHub</a>` : ''}
  </div>

  ${summary ? `<h2>Professional Summary</h2><p>${summary}</p>` : ''}

  ${
    skills.length > 0
      ? `<h2>Technical Skills</h2>` +
        skills
          .map(
            (s: any) =>
              `<div class="skills-row"><span class="skills-cat">${s.category}:</span> ${(s.items || []).join(', ')}</div>`
          )
          .join('')
      : ''
  }

  ${
    experience.length > 0
      ? `<h2>Professional Experience</h2>` +
        experience
          .map(
            (exp: any) => `
        <div style="margin-bottom: 12px;">
          <div class="item-header"><span>${exp.company}</span><span>${exp.duration || ''}</span></div>
          <div class="item-sub"><span>${exp.role}</span><span>${exp.location || ''}</span></div>
          <ul>
            ${(exp.bullets || []).map((b: string) => `<li>${b}</li>`).join('')}
          </ul>
        </div>
      `
          )
          .join('')
      : ''
  }

  ${
    projects.length > 0
      ? `<h2>Key Engineering Projects</h2>` +
        projects
          .map(
            (proj: any) => `
        <div style="margin-bottom: 12px;">
          <div class="item-header"><span>${proj.title}</span><span>${(proj.techStack || []).join(', ')}</span></div>
          <ul>
            ${(proj.bullets || []).map((b: string) => `<li>${b}</li>`).join('')}
          </ul>
        </div>
      `
          )
          .join('')
      : ''
  }

  ${
    education.length > 0
      ? `<h2>Education</h2>` +
        education
          .map(
            (edu: any) => `
        <div style="margin-bottom: 8px;">
          <div class="item-header"><span>${edu.institution}</span><span>${edu.year || ''}</span></div>
          <div class="item-sub"><span>${edu.degree} ${edu.fieldOfStudy ? `in ${edu.fieldOfStudy}` : ''}</span><span>${edu.score || ''}</span></div>
        </div>
      `
          )
          .join('')
      : ''
  }

  <script>
    if (window.location.search.includes('print=true')) {
      window.onload = () => window.print();
    }
  </script>
</body>
</html>`;

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  } catch (err: any) {
    console.error('Error generating resume preview:', err);
    return new NextResponse('Internal error', { status: 500 });
  }
}

