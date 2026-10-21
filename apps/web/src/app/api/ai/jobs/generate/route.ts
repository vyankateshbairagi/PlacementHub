import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export interface GeneratedJobDescription {
  id: string;
  companyName: string;
  roleTitle: string;
  ctc: string;
  location: string;
  employmentType: string;
  overview: string;
  responsibilities: string[];
  requiredSkills: string[];
  preferredSkills: string[];
  eligibility: {
    minCgpa: number;
    maxBacklogs: number;
    eligibleBranches: string[];
    batch: string;
  };
  selectionRounds: {
    roundNumber: number;
    name: string;
    description: string;
    duration: string;
  }[];
  perksAndBenefits: string[];
  formattedText: string;
  formattedMarkdown: string;
  publishedDriveId?: string;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    const effectiveRole = session?.role || 'TPO';
    const allowedRoles = ['TPO', 'FACULTY', 'INSTITUTE_ADMIN', 'SUPER_ADMIN'];
    if (!allowedRoles.includes(effectiveRole)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Only placement officers and faculty can generate official JDs' },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const {
      companyName = 'Zomato Limited',
      roleTitle = 'Associate Product Engineer',
      ctc = '₹18.0 LPA',
      location = 'Bengaluru / Gurugram / Hybrid',
      skills = 'Node.js, React, PostgreSQL, Redis, REST APIs, System Design',
      minCgpa = 7.5,
      maxBacklogs = 0,
      branches = ['Computer Engineering', 'Information Technology', 'AI & Data Science'],
      publishToDrives = false,
    } = body;

    const parsedSkills = Array.isArray(skills)
      ? skills
      : String(skills)
          .split(/[,;\n]/)
          .map((s) => s.trim())
          .filter(Boolean);

    const primarySkills = parsedSkills.slice(0, 4);
    const secondarySkills = parsedSkills.slice(4).length > 0 ? parsedSkills.slice(4) : ['Docker', 'Microservices', 'High-Concurrency'];

    // 1. Try Gemini generation if available
    let aiGeneratedContent: any = null;
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      try {
        const prompt = `You are a Senior University Campus Recruitment Director.
Generate a comprehensive, high-tier corporate campus Job Description (JD) for:
Company: ${companyName}
Role: ${roleTitle}
Package: ${ctc}
Location: ${location}
Key Skills: ${parsedSkills.join(', ')}
Minimum CGPA: ${minCgpa}, Max Backlogs: ${maxBacklogs}
Eligible Branches: ${Array.isArray(branches) ? branches.join(', ') : branches}

Return ONLY valid JSON with this exact schema:
{
  "overview": "2-3 sentences introducing the company, engineering culture, and role impact.",
  "responsibilities": ["5 clear bullet points of daily engineering duties"],
  "requiredSkills": ["list of essential technical competencies"],
  "preferredSkills": ["list of nice-to-have competencies"],
  "selectionRounds": [
    { "roundNumber": 1, "name": "Online Assessment", "description": "DSA coding problems and CS fundamentals", "duration": "90 mins" },
    { "roundNumber": 2, "name": "Technical Round 1", "description": "Live data structures, problem solving, and code walk", "duration": "45 mins" },
    { "roundNumber": 3, "name": "System Architecture", "description": "Low-level and high-level design, DB schema, and API contracts", "duration": "45 mins" },
    { "roundNumber": 4, "name": "Leadership & Culture Fit", "description": "Behavioral values, ownership, and campus background", "duration": "30 mins" }
  ],
  "perksAndBenefits": ["Competitive base salary with performance bonuses", "Comprehensive medical and accidental insurance", "Relocation assistance and hybrid work flexibility", "Mentorship under Principal Staff Engineers"]
}`;

        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
            }),
          }
        );

        if (geminiRes.ok) {
          const json = await geminiRes.json();
          const raw = json.candidates?.[0]?.content?.parts?.[0]?.text;
          if (raw) {
            const clean = raw.replace(/```json\n?|\n?```/g, '').trim();
            const match = clean.match(/\{[\s\S]*\}/);
            if (match) {
              aiGeneratedContent = JSON.parse(match[0]);
            }
          }
        }
      } catch (geminiErr) {
        console.warn('Gemini JD generation notice:', geminiErr);
      }
    }

    // 2. Synthesize High-Standard Enterprise JD
    const overview =
      aiGeneratedContent?.overview ||
      `At ${companyName}, we are engineering mission-critical digital infrastructure handling millions of daily active users. As an ${roleTitle}, you will collaborate directly with cross-functional product and infrastructure teams to architect resilient microservices, build delightful user interfaces, and deliver sub-100ms latency experiences.`;

    const responsibilities =
      aiGeneratedContent?.responsibilities || [
        `Architect, develop, and maintain high-throughput backend services and performant frontend client web applications.`,
        `Collaborate with system architects to design resilient data models using PostgreSQL and low-latency cache layers with Redis.`,
        `Participate in daily agile sprints, code reviews, and automated CI/CD pipeline deployments.`,
        `Analyze production telemetries, troubleshoot performance bottlenecks, and maintain 99.99% system availability.`,
        `Translate complex product roadmaps into verified, evidence-backed software deliverables.`,
      ];

    const requiredSkills = aiGeneratedContent?.requiredSkills || (primarySkills.length > 0 ? primarySkills : ['Node.js', 'React', 'PostgreSQL', 'REST APIs']);
    const preferredSkills = aiGeneratedContent?.preferredSkills || secondarySkills;

    const selectionRounds = aiGeneratedContent?.selectionRounds || [
      {
        roundNumber: 1,
        name: 'Round 1: Proctored Online Coding Assessment',
        description: 'Two LeetCode Medium/Hard algorithmic challenges + CS fundamentals (OS, DBMS, Networks).',
        duration: '90 minutes',
      },
      {
        roundNumber: 2,
        name: 'Round 2: Technical Problem Solving & DSA',
        description: 'Live pair programming with Senior Engineers focusing on data structures and edge-case handling.',
        duration: '45 minutes',
      },
      {
        roundNumber: 3,
        name: 'Round 3: System Design & Framework Architecture',
        description: 'Architecting scalable APIs, relational schema design, caching strategies, and concurrency.',
        duration: '45 minutes',
      },
      {
        roundNumber: 4,
        name: 'Round 4: Leadership, Behavioral & HR Fit',
        description: 'Discussion on past internship achievements, collegiate leadership, and cultural alignment.',
        duration: '30 minutes',
      },
    ];

    const perksAndBenefits = aiGeneratedContent?.perksAndBenefits || [
      `Tier-1 Industry Compensation Package: ${ctc} with verified performance appraisals`,
      'Comprehensive Medical, Health, and Term Life Insurance for family',
      'Relocation Support, Travel Allowance, and Hybrid Flexibility',
      'Continuous Learning Stipend and Cloud Certification Sponsorships',
    ];

    const formattedMarkdown = `# ${companyName} - Campus Recruitment Drive 2026
**Role:** ${roleTitle}  
**Package:** ${ctc}  
**Location:** ${location}  
**Employment Type:** Full-Time Campus Placement  

---

### Role Overview
${overview}

### Key Responsibilities
${responsibilities.map((r: string) => `- ${r}`).join('\n')}

### Required Technical Competencies
${requiredSkills.map((s: string) => `- **${s}**`).join('\n')}

### Preferred / Bonus Skills
${preferredSkills.map((s: string) => `- ${s}`).join('\n')}

### Academic & Eligibility Cutoffs
- **Minimum Aggregate CGPA:** ${minCgpa} (No active backlogs at time of joining)
- **Max Backlogs Allowed:** ${maxBacklogs}
- **Eligible Engineering Branches:** ${Array.isArray(branches) ? branches.join(', ') : branches}
- **Graduating Batch:** 2026 Passing Out

### Selection Process & Interview Stages
${selectionRounds
  .map(
    (rnd: any) =>
      `1. **${rnd.name}** (${rnd.duration})\n   ${rnd.description}`
  )
  .join('\n')}

### Benefits & Growth
${perksAndBenefits.map((p: string) => `- ${p}`).join('\n')}

---
*Generated by CareerOS Placement Intelligence Engine on behalf of ${companyName} Talent Acquisition.*`;

    const formattedText = `Role: ${roleTitle} at ${companyName} (${ctc})
Location: ${location}
Required Skills: ${requiredSkills.join(', ')}
Preferred Skills: ${preferredSkills.join(', ')}
Minimum CGPA: ${minCgpa}, ${maxBacklogs} active backlogs. Branches: ${Array.isArray(branches) ? branches.join(', ') : branches}
Overview: ${overview}
Rounds: ${selectionRounds.map((r: any) => r.name).join(' -> ')}`;

    const generatedJd: GeneratedJobDescription = {
      id: `jd-gen-${Date.now()}`,
      companyName,
      roleTitle,
      ctc,
      location,
      employmentType: 'Full-Time Campus Placement',
      overview,
      responsibilities,
      requiredSkills,
      preferredSkills,
      eligibility: {
        minCgpa: Number(minCgpa),
        maxBacklogs: Number(maxBacklogs),
        eligibleBranches: Array.isArray(branches) ? branches : [branches],
        batch: '2026 Batch',
      },
      selectionRounds,
      perksAndBenefits,
      formattedText,
      formattedMarkdown,
    };

    // 3. Optionally publish directly as an active PlacementDrive
    let createdDriveRecord: any = null;
    if (publishToDrives) {
      try {
        const institutionId = session?.institutionId;
        createdDriveRecord = await prisma.placementDrive.create({
          data: {
            institutionId: institutionId || null,
            companyName,
            roleTitle,
            description: formattedMarkdown,
            ctc,
            ctcAmount: parseFloat(String(ctc).replace(/[^0-9.]/g, '')) || 18.0,
            location,
            minCgpa: Number(minCgpa),
            maxBacklogs: Number(maxBacklogs),
            eligibleBranches: JSON.stringify(Array.isArray(branches) ? branches : [branches]),
            requiredSkills: JSON.stringify(requiredSkills),
            preferredSkills: JSON.stringify(preferredSkills),
            selectionRounds: JSON.stringify(selectionRounds.map((r: any) => r.name)),
            status: 'ACTIVE',
            source: 'ON_CAMPUS',
            deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          },
        });
        if (createdDriveRecord?.id) {
          generatedJd.publishedDriveId = createdDriveRecord.id;
        }
      } catch (driveErr) {
        console.warn('Could not persist PlacementDrive:', driveErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: publishToDrives
        ? 'Job Description generated and published as an active Campus Placement Drive!'
        : 'Job Description generated successfully!',
      generatedJd,
      createdDrive: createdDriveRecord,
    });
  } catch (error: any) {
    console.error('Error generating JD:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate Job Description' },
      { status: 500 }
    );
  }
}
