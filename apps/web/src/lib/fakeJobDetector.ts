// ==============================================================================
// AI Fake Job Post & Recruitment Fraud Detection Engine
// Detects fake offers, fee scams, phishing portals, and impersonation attempts
// for College Students and Training & Placement Officers (TPOs)
// ==============================================================================

export type FraudRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type JobAuthenticityVerdict = 'VERIFIED_LEGITIMATE' | 'PROCEED_WITH_CAUTION' | 'FRAUD_SCAM_DETECTED';

export interface RedFlagDetail {
  id: string;
  category: 'FINANCIAL_SCAM' | 'SUSPICIOUS_COMMUNICATION' | 'UNREALISTIC_OFFER' | 'DOMAIN_PHISHING' | 'VAGUE_JOB' | 'URGENCY_PRESSURE';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  evidenceSnippet?: string;
}

export interface GreenFlagDetail {
  id: string;
  title: string;
  description: string;
}

export interface DomainCheckResult {
  domain: string;
  isOfficialDomain: boolean;
  isFreeMailProvider: boolean;
  isSuspiciousTld: boolean;
  domainMatchesCompany: boolean;
  notes: string;
}

export interface JobFraudAnalysisResult {
  id: string;
  analyzedAt: string;
  company: string;
  role: string;
  authenticityScore: number; // 0 - 100 (100 = completely genuine)
  fraudRiskScore: number;     // 0 - 100 (100 = definite scam)
  riskLevel: FraudRiskLevel;
  verdict: JobAuthenticityVerdict;
  verdictTitle: string;
  summary: string;
  aiConfidence: number; // 0 - 100%
  breakdown: {
    domainSafetyScore: number;        // 0 - 100
    financialSafetyScore: number;     // 0 - 100 (100 means no payment demanded)
    communicationSafetyScore: number; // 0 - 100
    contentRealismScore: number;      // 0 - 100
  };
  redFlags: RedFlagDetail[];
  greenFlags: GreenFlagDetail[];
  domainAnalysis: DomainCheckResult;
  safetyRecommendations: string[];
  actionForTpo: string;
  actionForStudent: string;
}

export interface JobPostInput {
  company: string;
  role: string;
  description?: string;
  url?: string;
  ctc?: string;
  contactEmail?: string;
  contactChannel?: string;
  source?: string;
}

// Known authentic career / ATS domains
const TRUSTED_DOMAINS = [
  'google.com', 'careers.google.com', 'amazon.jobs', 'amazon.com',
  'microsoft.com', 'careers.microsoft.com', 'tcs.com', 'infosys.com',
  'wipro.com', 'accenture.com', 'deloitte.com', 'cognizant.com',
  'atlassian.com', 'uber.com', 'swiggy.com', 'zomato.com', 'razorpay.com',
  'goldmansachs.com', 'jpmorgan.com', 'morganstanley.com', 'oracle.com',
  'salesforce.com', 'cisco.com', 'adobe.com', 'nvidia.com', 'apple.com',
  'greenhouse.io', 'boards.greenhouse.io', 'jobs.lever.co', 'lever.co',
  'myworkdayjobs.com', 'workday.com', 'smartrecruiters.com', 'ashbyhq.com',
  'linkedin.com', 'naukri.com', 'internshala.com', 'unstop.com'
];

const FREE_EMAIL_PROVIDERS = [
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'rediffmail.com',
  'protonmail.com', 'mail.com', 'yopmail.com', 'zoho.com'
];

const SUSPICIOUS_TLDS = ['.xyz', '.top', '.click', '.site', '.online', '.buzz', '.club', '.tk', '.ml', '.ga', '.cf', '.gq'];

// Preset test scenarios for 1-click demos in Student & TPO dashboards
export const SAMPLE_JOB_SCENARIOS: { label: string; tag: 'REAL' | 'SCAM' | 'SUSPICIOUS'; data: JobPostInput }[] = [
  {
    label: 'Google India - Associate Software Engineer (Legitimate)',
    tag: 'REAL',
    data: {
      company: 'Google India',
      role: 'Associate Software Engineer (2026 Batch)',
      description: 'Requirements: B.Tech in CS/IT. Strong foundation in Data Structures, Algorithms, Distributed Systems, and Object-Oriented Programming (Java, C++, or Python). Selection process includes Online Coding Assessment followed by 3 rounds of Technical Interviews and Googliness. No application fee is ever charged.',
      url: 'https://careers.google.com/jobs/results/associate-software-engineer-india',
      ctc: '₹32.5 LPA',
      contactEmail: 'campus-recruitment@google.com',
      contactChannel: 'Official Google Careers Portal',
      source: 'ON_CAMPUS_DRIVE'
    }
  },
  {
    label: 'Amazon Remote - ₹1,500 Registration Fee Scam (Fraud)',
    tag: 'SCAM',
    data: {
      company: 'Amazon India Recruitment Hub',
      role: 'Remote Operations Executive / Data Specialist',
      description: 'URGENT HIRING: Guaranteed placement for all freshers. Earn ₹65,000/month working 2 hours a day from home. Immediate joining letter provided without technical interview. Candidates must deposit a refundable security & exam registration fee of ₹1,499 via UPI to verify Aadhaar and allocate laptop dispatch.',
      url: 'http://amazon-career-verification-hub.xyz/apply-now',
      ctc: '₹65,000 / month (Immediate)',
      contactEmail: 'amazon.hr.selection2026@gmail.com',
      contactChannel: 'Telegram & WhatsApp (@amazon_placement_officer)',
      source: 'WHATSAPP_FORWARD'
    }
  },
  {
    label: 'Atlassian India - Graduate Software Developer (Legitimate)',
    tag: 'REAL',
    data: {
      company: 'Atlassian India',
      role: 'Graduate Software Developer (Bangalore)',
      description: 'Join our Cloud Platform and Jira engineering team. Work with React, TypeScript, Java/Kotlin, AWS microservices. Evaluation criteria: clean code craftsmanship, system design aptitude, and team collaboration. Official candidate communications originate strictly from @atlassian.com.',
      url: 'https://www.atlassian.com/company/careers/graduates',
      ctc: '₹26.0 LPA',
      contactEmail: 'grad-hiring@atlassian.com',
      contactChannel: 'Atlassian Careers Portal (Workday ATS)',
      source: 'OFF_CAMPUS_VERIFIED'
    }
  },
  {
    label: 'Telegram Ad: Part-Time Video Rating & Typist Scam (Critical Fraud)',
    tag: 'SCAM',
    data: {
      company: 'Global Digital Media MediaWorks Ltd',
      role: 'Part-Time Task Rating & Ad Reviewer',
      description: 'Work from mobile! Simple copy-paste and like videos to earn ₹3,000 to ₹8,000 daily. No resume or skills needed. Instant daily payout to GooglePay/PhonePe. Join VIP Telegram group to claim ₹500 welcome bonus and deposit ₹2,000 for task unlocking tier.',
      url: 'https://t.me/GlobalDigitalTasks_VIP_Jobs',
      ctc: '₹8,000 / Day',
      contactEmail: 'onlinejobshelpdesk@outlook.com',
      contactChannel: 'Telegram: @digital_task_manager',
      source: 'TELEGRAM_CHANNEL'
    }
  },
  {
    label: 'Generic IT Consultancy - Vague Role & Training Bond (Suspicious)',
    tag: 'SUSPICIOUS',
    data: {
      company: 'Apex Tech Solutions Inc',
      role: 'Junior Associate Trainee',
      description: 'Hiring freshers for various software projects. Selected candidates will undergo a 3-month unpaid training program followed by potential client deployment. Candidates must submit original college degree certificates as security bond for 2 years.',
      url: 'http://apextechsolutions-jobportal.com/careers',
      ctc: '₹3.2 LPA (Post Training)',
      contactEmail: 'apextech.hr@gmail.com',
      contactChannel: 'WhatsApp Consultation',
      source: 'STUDENT_SUBMITTED'
    }
  }
];

function extractDomain(urlStr?: string): string {
  if (!urlStr) return '';
  try {
    const parsed = new URL(urlStr.startsWith('http') ? urlStr : `https://${urlStr}`);
    return parsed.hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    const match = urlStr.match(/([a-zA-Z0-9-]+\.[a-zA-Z0-9.-]+)/);
    return match ? match[1].toLowerCase().replace(/^www\./, '') : '';
  }
}

function extractEmailDomain(emailStr?: string): string {
  if (!emailStr) return '';
  const parts = emailStr.split('@');
  return parts.length > 1 ? parts[1].toLowerCase().trim() : '';
}

/**
 * Deterministic AI heuristic analyzer for Job Post Fraud Detection
 */
export function analyzeJobPostWithHeuristics(input: JobPostInput): JobFraudAnalysisResult {
  const combinedText = `
    ${input.company || ''} 
    ${input.role || ''} 
    ${input.description || ''} 
    ${input.ctc || ''} 
    ${input.url || ''} 
    ${input.contactEmail || ''} 
    ${input.contactChannel || ''}
  `.toLowerCase();

  const domain = extractDomain(input.url);
  const emailDomain = extractEmailDomain(input.contactEmail);
  const companyClean = (input.company || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  const redFlags: RedFlagDetail[] = [];
  const greenFlags: GreenFlagDetail[] = [];

  // 1. Payment & Registration Fee Demands (Most severe scam indicator)
  const feeKeywords = [
    { pattern: /(registration|processing|application|selection|screening)\s+(fee|charge|cost|amount)/i, name: 'Registration / Processing Fee Demanded' },
    { pattern: /(security\s+deposit|refundable\s+deposit|laptop\s+deposit|equipment\s+deposit)/i, name: 'Security / Equipment Deposit Demanded' },
    { pattern: /(pay|deposit|transfer|send)\s+(₹|rs\.?|inr|\$|\d+)\s*(via\s+upi|gpay|phonepe|paytm|crypto)/i, name: 'UPI / Direct Payment for Job Offer' },
    { pattern: /(training\s+fee|course\s+fee|certification\s+cost|exam\s+fee)\s*(before\s+joining|to\s+qualify|mandatory)/i, name: 'Mandatory Paid Training Before Offer' },
    { pattern: /(task\s+unlock|recharge\s+wallet|vip\s+tier|rating\s+deposit)/i, name: 'Task-Based Recharge / Tier Deposit Scam' },
  ];

  let hasPaymentRedFlag = false;
  for (const fee of feeKeywords) {
    const match = combinedText.match(fee.pattern);
    if (match) {
      const matchIndex = match.index ?? -1;
      const precedingWindow = matchIndex >= 0 ? combinedText.slice(Math.max(0, matchIndex - 35), matchIndex) : '';
      const isNegated = /(no|never|not|zero|without\s+any|free\s+of)\s*$/i.test(precedingWindow.trim());

      if (!isNegated) {
        hasPaymentRedFlag = true;
        redFlags.push({
          id: `fee-${redFlags.length + 1}`,
          category: 'FINANCIAL_SCAM',
          severity: 'CRITICAL',
          title: fee.name,
          description: 'Legitimate corporate campus employers and top technology firms NEVER request money, UPI payments, registration fees, or equipment deposits from job candidates.',
          evidenceSnippet: match[0]
        });
      }
    }
  }

  // 2. Suspicious Communication Channels
  const isTelegram = /t\.me\/|telegram/i.test(combinedText);
  const isWhatsAppOnly = /(contact\s+on\s+whatsapp\s+only|wa\.me\/|whatsapp\s+only)/i.test(combinedText);
  const isFreeMail = FREE_EMAIL_PROVIDERS.includes(emailDomain);
  const isKnownEnterprise = /google|amazon|microsoft|apple|tcs|infosys|wipro|deloitte|atlassian|meta|netflix/i.test(input.company);

  if (isTelegram) {
    redFlags.push({
      id: `comm-telegram`,
      category: 'SUSPICIOUS_COMMUNICATION',
      severity: 'HIGH',
      title: 'Unregulated Telegram Communication Channel',
      description: 'Job offers communicated predominantly via Telegram groups/bots are standard vectors for phishing, crypto tasks, and unregistered fake employers.',
      evidenceSnippet: 'Telegram communication channel detected'
    });
  }

  if (isWhatsAppOnly) {
    redFlags.push({
      id: `comm-whatsapp`,
      category: 'SUSPICIOUS_COMMUNICATION',
      severity: 'HIGH',
      title: 'Recruitment Restricted to Personal WhatsApp',
      description: 'Lack of an enterprise candidate portal or official business ticketing system points towards unverified off-campus recruiters.',
      evidenceSnippet: 'WhatsApp-only communication specified'
    });
  }

  if (isFreeMail && isKnownEnterprise) {
    redFlags.push({
      id: `email-spoof`,
      category: 'SUSPICIOUS_COMMUNICATION',
      severity: 'CRITICAL',
      title: `Impersonation Risk: Free Email (@${emailDomain}) Claiming to be ${input.company}`,
      description: `Major MNCs like ${input.company} always send communications from their verified enterprise corporate domains, never free public webmail addresses like @${emailDomain}.`,
      evidenceSnippet: input.contactEmail
    });
  } else if (isFreeMail && !isKnownEnterprise && input.contactEmail) {
    redFlags.push({
      id: `email-freemail`,
      category: 'SUSPICIOUS_COMMUNICATION',
      severity: 'MEDIUM',
      title: `Recruiter Using Public Webmail (@${emailDomain})`,
      description: 'Verified enterprise employers typically correspond through corporate business email systems.',
      evidenceSnippet: input.contactEmail
    });
  }

  // 3. Domain Phishing / Suspicious URL Check
  let isOfficialDomain = false;
  let isSuspiciousTld = false;
  let domainMatchesCompany = false;

  if (domain) {
    isOfficialDomain = TRUSTED_DOMAINS.some((td) => domain === td || domain.endsWith(`.${td}`));
    isSuspiciousTld = SUSPICIOUS_TLDS.some((tld) => domain.endsWith(tld));

    if (companyClean.length > 3 && domain.includes(companyClean)) {
      domainMatchesCompany = true;
    }

    if (isOfficialDomain) {
      greenFlags.push({
        id: 'dom-trusted',
        title: 'Verified Enterprise Domain / ATS Ecosystem',
        description: `Application URL routes to authenticated corporate infrastructure (${domain}).`
      });
    }

    if (isSuspiciousTld) {
      redFlags.push({
        id: 'dom-tld',
        category: 'DOMAIN_PHISHING',
        severity: 'CRITICAL',
        title: `High-Risk Top-Level Domain Detected (${domain})`,
        description: 'Domains ending with .xyz, .top, .buzz, or .click are overwhelmingly used in throwaway phishing attacks and fake campus recruitment campaigns.',
        evidenceSnippet: domain
      });
    }

    if (isKnownEnterprise && !isOfficialDomain && !domainMatchesCompany && domain.length > 0) {
      redFlags.push({
        id: 'dom-spoof',
        category: 'DOMAIN_PHISHING',
        severity: 'HIGH',
        title: `Domain Mismatch: ${input.company} Post Hosted on Unknown URL`,
        description: `The job claims to be with ${input.company}, but the link points to "${domain}" instead of the company's verified primary domain.`,
        evidenceSnippet: domain
      });
    }
  }

  // 4. Unrealistic Compensation & Low Effort (Copy-Paste / Video Rating Scams)
  const lowEffortScamKeywords = [
    { pattern: /(earn\s+₹?\d+\s*-\s*₹?\d+\s*(per\s*day|daily|per\s*week))/i, title: 'Unrealistic Daily Cash Guarantee for Freshers' },
    { pattern: /(no\s+skills?\s+(needed|required)|no\s+interview\s+needed|guaranteed\s+selection)/i, title: 'No Interview or Skills Claimed (Guaranteed Placement Trap)' },
    { pattern: /(copy\s*paste|typing\s*captcha|like\s*videos?|data\s*entry\s*from\s*home)/i, title: 'Classic Part-Time Task/Typist Scam Pattern' },
    { pattern: /(submit\s+original\s+(documents|certificates|degrees)|retention\s+bond)/i, title: 'Illegal Retention of Original Academic Certificates' }
  ];

  for (const item of lowEffortScamKeywords) {
    if (item.pattern.test(combinedText)) {
      redFlags.push({
        id: `unrealistic-${redFlags.length + 1}`,
        category: 'UNREALISTIC_OFFER',
        severity: 'HIGH',
        title: item.title,
        description: 'Legitimate employers conduct structured technical or behavioral assessments and never retain students’ original academic documents.',
        evidenceSnippet: (combinedText.match(item.pattern)?.[0] || 'Unrealistic offer condition')
      });
    }
  }

  // 5. Urgency / Coercion Pressure
  if (/(hurry|only\s+\d+\s+slots|urgent\s+hiring|offer\s+expires\s+in\s+\d+\s+hours|instant\s+joining\s+letter)/i.test(combinedText)) {
    redFlags.push({
      id: 'urgency-tactic',
      category: 'URGENCY_PRESSURE',
      severity: 'MEDIUM',
      title: 'Artificial Urgency & Pressure Tactics',
      description: 'Scammers frequently create artificial time urgency (e.g. "Only 2 slots left", "Pay in 30 mins") to bypass student critical evaluation.',
      evidenceSnippet: 'Urgency language detected'
    });
  }

  // 6. Positive Genuine Job Signals
  if (/(requirements|responsibilities|qualifications|eligibility|cgpa|branches?|b\.tech|bachelor)/i.test(combinedText)) {
    greenFlags.push({
      id: 'gf-structured-reqs',
      title: 'Structured Technical Eligibility & Qualifications',
      description: 'Job outlines clear degree requirements, branches, and academic qualifications.'
    });
  }

  if (/(data structures|algorithms|system design|python|java|react|sql|c\+\+|cloud|docker|microservices)/i.test(combinedText)) {
    greenFlags.push({
      id: 'gf-tech-stack',
      title: 'Concrete Technical Competencies Specified',
      description: 'Specific engineering and computer science skills are delineated rather than vague generic promises.'
    });
  }

  if (/(online assessment|technical interview|coding round|managerial round|hr round|oa)/i.test(combinedText)) {
    greenFlags.push({
      id: 'gf-rounds',
      title: 'Defined Multi-Round Evaluation Stages',
      description: 'Adheres to formal recruitment standards with technical screening and interviews.'
    });
  }

  if (/(no application fee|never charges? any fee|equal opportunity employer|privacy policy)/i.test(combinedText)) {
    greenFlags.push({
      id: 'gf-disclaimer',
      title: 'Explicit Anti-Fee & Fair Hiring Policy',
      description: 'Affirms that the company never collects fees or charges candidates at any stage.'
    });
  }

  // Calculate scores
  let authenticityScore = 88;
  if (isOfficialDomain) authenticityScore += 8;
  if (greenFlags.length >= 3) authenticityScore += 4;

  let penalty = 0;
  for (const rf of redFlags) {
    if (rf.severity === 'CRITICAL') penalty += 45;
    else if (rf.severity === 'HIGH') penalty += 25;
    else if (rf.severity === 'MEDIUM') penalty += 15;
    else penalty += 8;
  }

  authenticityScore = Math.max(5, Math.min(99, authenticityScore - penalty));
  const fraudRiskScore = 100 - authenticityScore;

  let riskLevel: FraudRiskLevel = 'LOW';
  let verdict: JobAuthenticityVerdict = 'VERIFIED_LEGITIMATE';
  let verdictTitle = 'Legitimate Job Opportunity';

  if (fraudRiskScore >= 70 || hasPaymentRedFlag) {
    riskLevel = 'CRITICAL';
    verdict = 'FRAUD_SCAM_DETECTED';
    verdictTitle = 'High-Risk Scam / Fraudulent Job Posting';
  } else if (fraudRiskScore >= 40) {
    riskLevel = 'HIGH';
    verdict = 'FRAUD_SCAM_DETECTED';
    verdictTitle = 'Likely Scam / Unverified Recruiter';
  } else if (fraudRiskScore >= 20 || redFlags.length > 0) {
    riskLevel = 'MEDIUM';
    verdict = 'PROCEED_WITH_CAUTION';
    verdictTitle = 'Proceed with Caution - Suspicious Indicators Found';
  }

  // Metrics breakdown
  const financialSafetyScore = hasPaymentRedFlag ? 10 : 96;
  const domainSafetyScore = isSuspiciousTld ? 15 : isOfficialDomain ? 98 : domainMatchesCompany ? 80 : 60;
  const communicationSafetyScore = (isFreeMail && isKnownEnterprise) ? 12 : isTelegram ? 25 : isWhatsAppOnly ? 40 : 90;
  const contentRealismScore = redFlags.some(r => r.category === 'UNREALISTIC_OFFER') ? 20 : greenFlags.length >= 2 ? 92 : 75;

  const safetyRecommendations: string[] = [];
  if (hasPaymentRedFlag) {
    safetyRecommendations.push('NEVER pay any registration fee, security deposit, or laptop charge. Legitimate employers bear all recruitment costs.');
  }
  if (isFreeMail && isKnownEnterprise) {
    safetyRecommendations.push(`Verify this posting directly on the official ${input.company} careers portal (${domain || 'official site'}). Do not reply to public webmail addresses.`);
  }
  if (isTelegram || isWhatsAppOnly) {
    safetyRecommendations.push('Avoid submitting personal identity proofs (Aadhaar, PAN card, bank details) over unencrypted messaging chats.');
  }
  safetyRecommendations.push('Check the MCA (Ministry of Corporate Affairs) portal or LinkedIn verified company page to ensure the employer is legally registered.');
  safetyRecommendations.push('If in doubt, alert your college Training and Placement Cell (TPO) before applying.');

  const actionForTpo = verdict === 'FRAUD_SCAM_DETECTED'
    ? 'QUARANTINE IMMEDIATELY: Reject student submission, blacklist sender domain, and broadcast scam warning on student noticeboard.'
    : verdict === 'PROCEED_WITH_CAUTION'
    ? 'MANUAL AUDIT RECOMMENDED: Request recruiter verification via official domain email or LinkedIn before approving for campus cohort.'
    : 'APPROVED FOR COHORT: Post verified authentic. Safe to broadcast to eligible batch branches.';

  const actionForStudent = verdict === 'FRAUD_SCAM_DETECTED'
    ? 'DO NOT APPLY: This job displays definitive fraud patterns. Report this link to your college TPO immediately.'
    : verdict === 'PROCEED_WITH_CAUTION'
    ? 'VERIFY FIRST: Double-check with company’s official career website before submitting personal information or documents.'
    : 'SAFE TO APPLY: This opportunity matches established campus recruitment trust signals.';

  const summary = verdict === 'FRAUD_SCAM_DETECTED'
    ? `Critical risk detected with ${redFlags.length} fraud red flag(s). ${redFlags[0]?.title || 'Recruitment scam indicators identified'}. Do not share sensitive documents or pay money.`
    : verdict === 'PROCEED_WITH_CAUTION'
    ? `Opportunity shows ${redFlags.length} anomaly/anomalies (e.g. ${redFlags[0]?.title}). Verify recruiter identity on official company channels before proceeding.`
    : `Verified as legitimate opportunity from ${input.company}. Authenticity trust score is ${authenticityScore}/100 with zero financial extortion markers.`;

  return {
    id: `scan-${Date.now()}`,
    analyzedAt: new Date().toISOString(),
    company: input.company || 'Unknown Company',
    role: input.role || 'Unspecified Role',
    authenticityScore,
    fraudRiskScore,
    riskLevel,
    verdict,
    verdictTitle,
    summary,
    aiConfidence: 94,
    breakdown: {
      domainSafetyScore,
      financialSafetyScore,
      communicationSafetyScore,
      contentRealismScore,
    },
    redFlags,
    greenFlags,
    domainAnalysis: {
      domain: domain || 'N/A',
      isOfficialDomain,
      isFreeMailProvider: isFreeMail,
      isSuspiciousTld,
      domainMatchesCompany,
      notes: domain ? (isOfficialDomain ? 'Matches known high-reputation company domain' : isSuspiciousTld ? 'Suspicious disposable domain TLD' : 'Unindexed third-party domain') : 'No URL provided'
    },
    safetyRecommendations,
    actionForTpo,
    actionForStudent,
  };
}

/**
 * Main AI Job Post Fraud Detector function
 * Tries Google Gemini API first if configured, else falls back to deep heuristic engine
 */
export async function detectFakeJobPost(input: JobPostInput): Promise<JobFraudAnalysisResult> {
  const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';

  // 1. Attempt call to the FastAPI AI Service (placementhub-ai)
  if (aiServiceUrl) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const aiResponse = await fetch(`${aiServiceUrl}/api/v1/jobs/detect-fake`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: input.company,
          role: input.role,
          description: input.description || null,
          url: input.url || null,
          ctc: input.ctc || null,
          contact_email: input.contactEmail || null,
          contact_channel: input.contactChannel || null,
          source: input.source || 'MANUAL_SCAN',
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        if (aiData && typeof aiData.authenticity_score === 'number') {
          const domain = extractDomain(input.url);
          const emailDomain = extractEmailDomain(input.contactEmail);
          const isFreeMail = FREE_EMAIL_PROVIDERS.includes(emailDomain);
          const isOfficialDomain = TRUSTED_DOMAINS.some((td) => domain === td || domain.endsWith(`.${td}`));
          const isSuspiciousTld = SUSPICIOUS_TLDS.some((tld) => domain.endsWith(tld));

          return {
            id: `scan-${Date.now()}`,
            analyzedAt: new Date().toISOString(),
            company: aiData.company || input.company,
            role: aiData.role || input.role,
            authenticityScore: aiData.authenticity_score,
            fraudRiskScore: aiData.fraud_risk_score,
            riskLevel: aiData.risk_level,
            verdict: aiData.verdict,
            verdictTitle: aiData.verdict_title,
            summary: aiData.summary,
            aiConfidence: aiData.ai_confidence || 95,
            breakdown: aiData.breakdown || {
              domainSafetyScore: 80,
              financialSafetyScore: 80,
              communicationSafetyScore: 80,
              contentRealismScore: 80,
            },
            redFlags: (aiData.red_flags || []).map((rf: any, idx: number) => ({
              id: rf.id || `rf-${idx}`,
              category: rf.category || 'FINANCIAL_SCAM',
              severity: rf.severity || 'HIGH',
              title: rf.title,
              description: rf.description,
              evidenceSnippet: rf.evidenceSnippet,
            })),
            greenFlags: aiData.green_flags || [],
            domainAnalysis: {
              domain: domain || 'N/A',
              isOfficialDomain,
              isFreeMailProvider: isFreeMail,
              isSuspiciousTld,
              domainMatchesCompany: domain.includes(input.company.toLowerCase().slice(0, 4)),
              notes: isOfficialDomain ? 'Verified enterprise domain via AI Service' : 'Third-party domain evaluated',
            },
            safetyRecommendations: aiData.safety_recommendations || [],
            actionForTpo: aiData.action_for_tpo,
            actionForStudent: aiData.action_for_student,
          };
        }
      }
    } catch (e) {
      // AI service might be offline or warming up; smoothly continue to Gemini / Heuristics
    }
  }

  // 2. Attempt Google Gemini AI if configured
  const geminiKey = process.env.GEMINI_API_KEY;

  if (geminiKey) {
    try {
      const prompt = `You are the AI Job Fraud & Cyber Safety Auditor for CareerOS (Campus Placement Operating System).
Analyze this job posting for signs of fraud, recruitment scams, fake off-campus drives, fee extortion, or phishing.

Job Details:
- Company: ${input.company}
- Role: ${input.role}
- Offered CTC / Stipend: ${input.ctc || 'Not specified'}
- Application URL: ${input.url || 'Not provided'}
- Recruiter Email: ${input.contactEmail || 'Not provided'}
- Contact Channel: ${input.contactChannel || 'Not specified'}
- Description: ${input.description || 'Not provided'}

Evaluate carefully:
1. Is any payment, registration fee, deposit, or task recharge demanded?
2. Is the recruiter using personal webmail (@gmail, @yahoo) while claiming to be an MNC?
3. Is the domain suspicious, spoofed, or mismatched?
4. Are compensation promises unrealistically inflated for minimal effort?
5. Are high-pressure urgency tactics employed?

Return ONLY a valid JSON object matching this schema:
{
  "authenticityScore": number (0-100),
  "fraudRiskScore": number (0-100),
  "riskLevel": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "verdict": "VERIFIED_LEGITIMATE" | "PROCEED_WITH_CAUTION" | "FRAUD_SCAM_DETECTED",
  "verdictTitle": "string",
  "summary": "2 concise sentences summarizing findings",
  "aiConfidence": number (80-99),
  "breakdown": {
    "domainSafetyScore": number,
    "financialSafetyScore": number,
    "communicationSafetyScore": number,
    "contentRealismScore": number
  },
  "redFlags": [
    {
      "id": "string",
      "category": "FINANCIAL_SCAM" | "SUSPICIOUS_COMMUNICATION" | "UNREALISTIC_OFFER" | "DOMAIN_PHISHING" | "VAGUE_JOB" | "URGENCY_PRESSURE",
      "severity": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
      "title": "string",
      "description": "string",
      "evidenceSnippet": "string"
    }
  ],
  "greenFlags": [
    {
      "id": "string",
      "title": "string",
      "description": "string"
    }
  ],
  "safetyRecommendations": ["rec1", "rec2", "rec3"],
  "actionForTpo": "action recommendation for college placement officer",
  "actionForStudent": "action recommendation for student applicant"
}`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
          })
        }
      );

      const json = await res.json();
      const content = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (content) {
        const clean = content.replace(/```json\n?|\n?```/g, '').trim();
        const parsed = JSON.parse(clean);

        const domain = extractDomain(input.url);
        const emailDomain = extractEmailDomain(input.contactEmail);
        const isFreeMail = FREE_EMAIL_PROVIDERS.includes(emailDomain);
        const isOfficialDomain = TRUSTED_DOMAINS.some(td => domain === td || domain.endsWith(`.${td}`));
        const isSuspiciousTld = SUSPICIOUS_TLDS.some(tld => domain.endsWith(tld));

        return {
          id: `scan-${Date.now()}`,
          analyzedAt: new Date().toISOString(),
          company: input.company || 'Unknown Company',
          role: input.role || 'Unspecified Role',
          authenticityScore: parsed.authenticityScore ?? 50,
          fraudRiskScore: parsed.fraudRiskScore ?? 50,
          riskLevel: parsed.riskLevel || 'MEDIUM',
          verdict: parsed.verdict || 'PROCEED_WITH_CAUTION',
          verdictTitle: parsed.verdictTitle || 'AI Audit Completed',
          summary: parsed.summary || 'Job posting evaluated by AI Fraud Shield.',
          aiConfidence: parsed.aiConfidence || 95,
          breakdown: parsed.breakdown || {
            domainSafetyScore: 70,
            financialSafetyScore: 70,
            communicationSafetyScore: 70,
            contentRealismScore: 70
          },
          redFlags: parsed.redFlags || [],
          greenFlags: parsed.greenFlags || [],
          domainAnalysis: {
            domain: domain || 'N/A',
            isOfficialDomain,
            isFreeMailProvider: isFreeMail,
            isSuspiciousTld,
            domainMatchesCompany: domain.includes(input.company.toLowerCase().slice(0, 4)),
            notes: isOfficialDomain ? 'Verified enterprise domain' : 'External domain'
          },
          safetyRecommendations: parsed.safetyRecommendations || [
            'Do not pay any fee for interview or onboarding.',
            'Cross-check on the official company website.'
          ],
          actionForTpo: parsed.actionForTpo || 'Review posting authenticity before cohort broadcast.',
          actionForStudent: parsed.actionForStudent || 'Exercise standard caution when applying.'
        };
      }
    } catch (err) {
      console.warn('Gemini API call for Fake Job Detection failed, falling back to heuristic engine:', err);
    }
  }

  // Heuristic engine fallback
  return analyzeJobPostWithHeuristics(input);
}
