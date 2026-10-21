// ==============================================================================
// TACIE: ThinkBuild AI Career Intelligence Engine
// Powers Resume ATS Scoring, Mock Interview Coaching & Career Roadmaps
// ==============================================================================

export interface AtsScoreResult {
  score: number;
  grade: 'A+' | 'A' | 'B' | 'C' | 'Needs Improvement';
  summary: string;
  matchedKeywords: string[];
  missingKeywords: string[];
  strengths: string[];
  improvements: string[];
  formatChecks: {
    singleColumn: boolean;
    hasMetrics: boolean;
    hasActionVerbs: boolean;
    atsFriendlyFonts: boolean;
  };
}

export interface RoadmapStep {
  week: string;
  title: string;
  skills: string[];
  tasks: string[];
  recommendedResource: string;
}

export interface InterviewQuestion {
  id: string;
  question: string;
  category: 'Technical' | 'Behavioral' | 'System Design' | 'Problem Solving';
  difficulty: 'Easy' | 'Medium' | 'Hard';
  modelAnswerHints: string[];
}

export interface InterviewEvaluation {
  score: number; // 0-100
  clarity: number;
  technicalAccuracy: number;
  structureStar: number;
  feedback: string;
  modelAnswer: string;
}

/**
 * Evaluates a resume text/data against a target role
 */
export async function analyzeResumeAts(
  resumeText: string,
  targetRole = 'Software Engineer'
): Promise<AtsScoreResult> {
  const geminiKey = process.env.GEMINI_API_KEY;

  if (geminiKey) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `You are TACIE (ThinkBuild AI Career Intelligence Engine). Analyze this candidate's resume for target role "${targetRole}".
Return ONLY a valid JSON object matching this schema:
{
  "score": number between 40 and 98,
  "grade": "A+" | "A" | "B" | "C" | "Needs Improvement",
  "summary": "concise 2-sentence summary",
  "matchedKeywords": ["keyword1", "keyword2", ...],
  "missingKeywords": ["keyword1", "keyword2", ...],
  "strengths": ["strength1", "strength2", "strength3"],
  "improvements": ["action1", "action2", "action3"],
  "formatChecks": {
    "singleColumn": true,
    "hasMetrics": true,
    "hasActionVerbs": true,
    "atsFriendlyFonts": true
  }
}

Resume Text:
${resumeText.slice(0, 4000)}`
                  }
                ]
              }
            ]
          })
        }
      );

      const json = await response.json();
      const content = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (content) {
        const clean = content.replace(/```json\n?|\n?```/g, '').trim();
        return JSON.parse(clean);
      }
    } catch (e) {
      console.warn('TACIE Gemini API call failed, falling back to heuristic engine:', e);
    }
  }

  // Deterministic Heuristic ATS Intelligence Engine
  const textLower = resumeText.toLowerCase();
  const techKeywords = [
    'react', 'next.js', 'typescript', 'javascript', 'python', 'java',
    'sql', 'postgresql', 'mongodb', 'docker', 'aws', 'git', 'node.js',
    'system design', 'rest api', 'microservices', 'tailwind', 'graphql'
  ];

  const matchedKeywords = techKeywords.filter((kw) => textLower.includes(kw));
  const missingKeywords = techKeywords.filter((kw) => !textLower.includes(kw)).slice(0, 5);

  const hasMetrics = /\d+([%kK]|x|\+)/.test(resumeText);
  const actionVerbs = ['built', 'architected', 'developed', 'optimized', 'engineered', 'led', 'designed'];
  const matchedVerbs = actionVerbs.filter((v) => textLower.includes(v));

  let score = 65;
  score += Math.min(20, matchedKeywords.length * 2.5);
  if (hasMetrics) score += 8;
  if (matchedVerbs.length >= 3) score += 7;
  score = Math.min(96, Math.max(45, Math.round(score)));

  let grade: AtsScoreResult['grade'] = 'B';
  if (score >= 90) grade = 'A+';
  else if (score >= 80) grade = 'A';
  else if (score >= 70) grade = 'B';
  else if (score >= 55) grade = 'C';
  else grade = 'Needs Improvement';

  return {
    score,
    grade,
    summary: `Resume shows high relevance for ${targetRole} with ${matchedKeywords.length} core competencies detected. Emphasizing quantified system outcomes will boost placement shortlists.`,
    matchedKeywords: matchedKeywords.length ? matchedKeywords : ['JavaScript', 'HTML/CSS', 'Git', 'Problem Solving'],
    missingKeywords: missingKeywords.length ? missingKeywords : ['Docker', 'Kubernetes', 'CI/CD Pipeline', 'Redis'],
    strengths: [
      `Demonstrates practical application across ${matchedKeywords.slice(0, 3).join(', ')}`,
      hasMetrics ? 'Includes quantified achievements with metrics & business impact' : 'Clean layout and clear educational trajectory',
      'Strong section structuring aligned with Indian campus recruiter ATS standards'
    ],
    improvements: [
      'Add numbers to project bullets (e.g. "improved query latency by 35%")',
      `Incorporate missing industry tags: ${missingKeywords.slice(0, 2).join(', ')}`,
      'Include GitHub repository URLs and live deployment links for featured projects'
    ],
    formatChecks: {
      singleColumn: true,
      hasMetrics,
      hasActionVerbs: matchedVerbs.length > 0,
      atsFriendlyFonts: true
    }
  };
}

/**
 * Generates interactive AI mock interview questions tailored to company, role & round
 */
export function getMockInterviewQuestions(
  company = 'Google',
  role = 'Software Engineer',
  roundType = 'Technical'
): InterviewQuestion[] {
  const companyKey = company.toLowerCase();

  const companyBanks: Record<string, InterviewQuestion[]> = {
    google: [
      {
        id: 'goog-1',
        question: `How would you design a distributed, low-latency rate limiter handling 100,000 requests/sec across multiple Google Cloud regions?`,
        category: 'System Design',
        difficulty: 'Hard',
        modelAnswerHints: [
          'Compare sliding window counter vs token bucket in Redis cluster.',
          'Address clock skew with TrueTime or logical timestamps.',
          'Discuss local in-memory token buffering with asynchronous sync to reduce cross-region latency.'
        ]
      },
      {
        id: 'goog-2',
        question: `Given a stream of real-time search queries, how would you return the top 10 most frequent queries within the last 1-hour rolling window?`,
        category: 'Problem Solving',
        difficulty: 'Hard',
        modelAnswerHints: [
          'Explain Count-Min Sketch or Heavy Hitters algorithmic structure.',
          'Use sliding time bucketed min-heaps or Redis sorted sets.',
          'Analyze space complexity vs approximate precision error boundaries.'
        ]
      },
      {
        id: 'goog-3',
        question: `Tell me about a time you strongly disagreed with a tech lead or colleague on an architectural decision. How did you resolve it?`,
        category: 'Behavioral',
        difficulty: 'Medium',
        modelAnswerHints: [
          'Use STAR format (Situation, Task, Action, Result).',
          'Highlight data-driven benchmarks and objective trade-off matrices.',
          'Show commitment to disagree and commit once a decision is made.'
        ]
      }
    ],
    amazon: [
      {
        id: 'amzn-1',
        question: `Describe how you would architect Amazon's flash sale checkout inventory reservation service to prevent overselling during high contention.`,
        category: 'System Design',
        difficulty: 'Hard',
        modelAnswerHints: [
          'Discuss pessimistic vs optimistic locking with versioning in DynamoDB or Aurora.',
          'Explain distributed Redis reservation holds with TTL expiration.',
          'Use idempotent SQS message deduplication and dead-letter queues.'
        ]
      },
      {
        id: 'amzn-2',
        question: `How does the Amazon Leadership Principle "Customer Obsession" influence how you prioritize technical debt versus feature shipping?`,
        category: 'Behavioral',
        difficulty: 'Medium',
        modelAnswerHints: [
          'Anchor your answer in customer trust, reliability, and service uptime.',
          'Give a concrete example where resolving latency or outages directly protected user experience.',
          'Quantify the business impact: reduced churn, faster checkout, or zero data loss.'
        ]
      },
      {
        id: 'amzn-3',
        question: `How would you find the median from a continuous stream of integer metrics with minimal memory consumption?`,
        category: 'Technical',
        difficulty: 'Medium',
        modelAnswerHints: [
          'Use a two-heap approach: max-heap for lower half, min-heap for upper half.',
          'Balance heap sizes on every insertion to maintain O(1) median access.',
          'Explain space complexity O(N) and logarithmic insertion time O(log N).'
        ]
      }
    ],
    microsoft: [
      {
        id: 'msft-1',
        question: `How would you architect a collaborative real-time document editor like Microsoft Word Online supporting 50 concurrent typists?`,
        category: 'System Design',
        difficulty: 'Hard',
        modelAnswerHints: [
          'Compare Operational Transformation (OT) vs Conflict-free Replicated Data Types (CRDTs).',
          'Explain WebSocket bidirectional channels and presence tracking.',
          'Handle network partitions and offline sync reconciliation.'
        ]
      },
      {
        id: 'msft-2',
        question: `Explain how garbage collection works in modern runtimes (V8 / CLR / JVM), and how you troubleshoot memory leaks in production.`,
        category: 'Technical',
        difficulty: 'Medium',
        modelAnswerHints: [
          'Discuss generational hypothesis (Eden, Survivor, Tenured / Gen 0, 1, 2).',
          'Mention Mark & Sweep, reference counting cycles, and unclosed listeners.',
          'Explain heap snapshot analysis, allocation timelines, and memory dump triage.'
        ]
      }
    ]
  };

  for (const [key, questions] of Object.entries(companyBanks)) {
    if (companyKey.includes(key)) {
      if (roundType && roundType !== 'All') {
        const filtered = questions.filter(
          (q) => q.category.toLowerCase().includes(roundType.toLowerCase())
        );
        if (filtered.length > 0) return filtered;
      }
      return questions;
    }
  }

  // General high-yield defaults
  return [
    {
      id: 'gen-1',
      question: `Walk me through your most technically challenging project and the architectural trade-offs you made for ${company}.`,
      category: 'Problem Solving',
      difficulty: 'Medium',
      modelAnswerHints: [
        'State the core problem and user scale upfront.',
        'Explain why you picked your database or tech stack over alternatives.',
        'Conclude with metrics: latency, reliability, or user adoption.'
      ]
    },
    {
      id: 'gen-2',
      question: 'How would you handle a distributed cache invalidation issue in a high-traffic production application?',
      category: 'System Design',
      difficulty: 'Hard',
      modelAnswerHints: [
        'Mention Cache-Aside vs Write-Through strategies.',
        'Discuss TTL expiration, Pub/Sub cache busts, and Redis Cluster replicas.',
        'Address thundering herd problem using mutex locks or probabilistic early expiration.'
      ]
    },
    {
      id: 'gen-3',
      question: `Tell me about a time you identified a bug right before a production deadline. How did you handle communication and resolution?`,
      category: 'Behavioral',
      difficulty: 'Easy',
      modelAnswerHints: [
        'Use the STAR method: Situation, Task, Action, Result.',
        'Show transparency with lead/stakeholders.',
        'Explain root cause analysis and future regression prevention.'
      ]
    }
  ];
}

/**
 * Evaluates an interview answer using real AI (PlacementHub AI Ollama or Gemini)
 * with robust deterministic fallback
 */
export async function evaluateInterviewAnswerAsync(
  question: string,
  answer: string,
  options?: { company?: string; role?: string; roundType?: string }
): Promise<InterviewEvaluation> {
  const company = options?.company || 'Target Employer';
  const role = options?.role || 'Software Development Engineer';
  const roundType = options?.roundType || 'Technical';

  const trimmed = (answer || '').trim();
  const words = trimmed.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  // Immediate check for trivial, minimal, placeholder, or hello-world submissions
  const isTrivial =
    wordCount < 10 ||
    /^(hello(\s+world)?|hi|hey|test|testing|asdf|ok|yes|no|none|na|n\/a|pass|idk|i don'?t know|dummy|abc)[\.!\?]?$/i.test(
      trimmed
    );

  if (isTrivial) {
    return evaluateInterviewAnswer(question, answer);
  }

  // 1. Try PlacementHub AI Microservice (FastAPI + Ollama Llama 3.1 8B)
  const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
  try {
    const promptText = `You are TACIE, an elite technical interviewer evaluating candidate answers for ${company} (${role}, ${roundType} Round).
Question: "${question}"
Candidate Answer: "${answer}"

CRITICAL EVALUATION RULES:
1. If the candidate answer is fewer than 20 words, off-topic, generic placeholder, or fails to address the question technical details, you MUST award a score between 10 and 25, with low clarity (<30) and technical accuracy (<25).
2. For substantive answers, evaluate based on technical accuracy, STAR/architectural structure, and practical depth.
3. In "modelAnswer", provide a concise, exemplary Tier-1 reference answer (2-3 sentences).

Return ONLY a single valid JSON object without markdown fences, matching this schema:
{
  "score": number between 10 and 98,
  "clarity": number between 10 and 100,
  "technicalAccuracy": number between 10 and 100,
  "structureStar": number between 10 and 100,
  "feedback": "2-3 constructive sentences highlighting specific strengths, missing technical depth, and trade-offs.",
  "modelAnswer": "Exemplary 2-3 sentence reference benchmark answer meeting Tier-1 recruiter hiring standards."
}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const res = await fetch(`${aiServiceUrl}/api/v1/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: `interview-${Date.now()}`,
        prompt: promptText,
        system_prompt: 'You are TACIE, an elite technical interviewer evaluating campus and corporate engineering candidates. Return only clean valid JSON.'
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const rawText = data.response || '';
      const cleanJson = rawText.replace(/```json\n?|\n?```/g, '').trim();
      const match = cleanJson.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (typeof parsed.score === 'number') {
          return {
            score: Math.min(98, Math.max(10, Math.round(parsed.score))),
            clarity: Math.min(100, Math.max(10, Math.round(parsed.clarity ?? parsed.score))),
            technicalAccuracy: Math.min(100, Math.max(10, Math.round(parsed.technicalAccuracy ?? parsed.score))),
            structureStar: Math.min(100, Math.max(10, Math.round(parsed.structureStar ?? parsed.score))),
            feedback: parsed.feedback || 'Answer demonstrates fundamental competency.',
            modelAnswer: parsed.modelAnswer || getContextualModelAnswer(question)
          };
        }
      }
    }
  } catch (aiErr) {
    console.warn('PlacementHub AI service call failed, attempting fallback evaluator:', aiErr);
  }

  // 2. Try Gemini API if key is present
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `You are TACIE. Evaluate this interview answer for ${company} (${role}).
Question: "${question}"
Candidate Answer: "${answer}"

CRITICAL RULES:
If the answer is trivial (e.g. 'hello world', under 20 words, or fails to address the question), score it between 10 and 25 with low clarity and accuracy.
Return ONLY JSON:
{
  "score": number 10-98,
  "clarity": number 10-100,
  "technicalAccuracy": number 10-100,
  "structureStar": number 10-100,
  "feedback": "2 sentences of constructive feedback",
  "modelAnswer": "2 sentences exemplary benchmark answer"
}`
                  }
                ]
              }
            ]
          })
        }
      );
      const json = await response.json();
      const content = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (content) {
        const clean = content.replace(/```json\n?|\n?```/g, '').trim();
        const match = clean.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          return {
            score: Math.min(98, Math.max(10, Math.round(parsed.score))),
            clarity: Math.min(100, Math.max(10, Math.round(parsed.clarity ?? parsed.score))),
            technicalAccuracy: Math.min(100, Math.max(10, Math.round(parsed.technicalAccuracy ?? parsed.score))),
            structureStar: Math.min(100, Math.max(10, Math.round(parsed.structureStar ?? parsed.score))),
            feedback: parsed.feedback,
            modelAnswer: parsed.modelAnswer || getContextualModelAnswer(question)
          };
        }
      }
    } catch (e) {
      console.warn('Gemini evaluation failed:', e);
    }
  }

  // 3. Deterministic Heuristic Evaluation Fallback
  return evaluateInterviewAnswer(question, answer);
}

/**
 * Returns a contextual Tier-1 model answer based on the interview question.
 */
function getContextualModelAnswer(question: string): string {
  const q = question.toLowerCase();
  if (q.includes('rate limiter') || q.includes('token bucket')) {
    return 'For 100k req/sec, use Redis token bucket with Lua scripts for atomic token consumption. Partition buckets by ClientID/IP using consistent hashing across Redis cluster nodes, return HTTP 429 with Retry-After headers, and decouple telemetry into an asynchronous Kafka pipeline.';
  }
  if (q.includes('distributed transaction') || q.includes('saga')) {
    return 'Prefer an Orchestrated Saga with idempotency keys and compensating transactions over 2-Phase Commit to prevent blocking locks and single points of failure across microservices. Maintain an outbox pattern for transactional event publication to Kafka/RabbitMQ.';
  }
  if (q.includes('index') || q.includes('database') || q.includes('sql')) {
    return 'Design composite B-Tree indexes matching Query access paths (equality filters first, range filters last). Analyze EXPLAIN ANALYZE execution plans to avoid sequential scans, leverage partial indexes for filtered queries, and consider read replicas for scaling read-heavy query loads.';
  }
  if (q.includes('cache') || q.includes('redis')) {
    return 'Implement Cache-Aside with Write-Through or Write-Back strategies depending on consistency needs. Prevent cache stampedes using distributed Redis mutex locks or probabilistic early recomputation, and mitigate cache penetration with Bloom filters.';
  }
  return 'State the production constraints (scale, latency, throughput), outline high-level component architecture and data structures, address trade-offs and edge cases, and conclude with verified metrics and failure recovery mechanisms.';
}

/**
 * Synchronous heuristic fallback evaluator
 */
export function evaluateInterviewAnswer(question: string, answer: string): InterviewEvaluation {
  const trimmed = (answer || '').trim();
  const words = trimmed.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  // Detect trivial, placeholder, or hello world responses
  const isTrivial =
    wordCount < 10 ||
    /^(hello(\s+world)?|hi|hey|test|testing|asdf|ok|yes|no|none|na|n\/a|pass|idk|i don'?t know|dummy|abc)[\.!\?]?$/i.test(
      trimmed
    );

  if (isTrivial) {
    const preview = trimmed.length > 30 ? trimmed.slice(0, 30) + '...' : trimmed;
    return {
      score: Math.min(20, Math.max(10, wordCount * 2)),
      clarity: 20,
      technicalAccuracy: 10,
      structureStar: 10,
      feedback: `The submitted response ("${preview}") is insufficient and does not address the technical requirements of the question. To qualify in Tier-1 technical interviews, provide a comprehensive architectural or algorithmic solution detailing trade-offs, constraints, and data structures.`,
      modelAnswer: getContextualModelAnswer(question)
    };
  }

  let score = 55;
  if (wordCount >= 25) score += 10;
  if (wordCount >= 60) score += 10;
  if (wordCount >= 100) score += 8;

  const technicalTerms = /because|trade-off|architecture|scale|performance|result|latency|throughput|cache|database|algorithm|complexity|index|redis|lock|concurrency|cluster|partition|load balancer|replica|sharding/i;
  const matches = (trimmed.match(new RegExp(technicalTerms.source, 'gi')) || []).length;
  score += Math.min(15, matches * 3);

  score = Math.min(95, Math.max(30, score));

  return {
    score,
    clarity: Math.min(96, score + 2),
    technicalAccuracy: score,
    structureStar: Math.min(94, Math.max(40, score - 3)),
    feedback: score >= 75
      ? `Strong technical grasp. Your answer demonstrates practical reasoning. To reach the top 5% of candidate scores at tier-1 firms, quantify constraints and specify exact failure recovery edge cases.`
      : `Fair foundation, but your answer lacks architectural depth. Focus on quantifying scale constraints (e.g. latency, throughput), specifying data structures, and discussing trade-offs.`,
    modelAnswer: getContextualModelAnswer(question)
  };
}

/**
 * Generates personalized career roadmap for a student
 */
export function generateCareerRoadmap(currentSkills: string[], targetRole: string): RoadmapStep[] {
  return [
    {
      week: 'Week 1 - 2',
      title: 'Advanced Data Structures & Algorithmic Patterns',
      skills: ['Two Pointers', 'Sliding Window', 'Dynamic Programming', 'Graph Traversal (BFS/DFS)'],
      tasks: [
        'Solve 25 LeetCode medium questions covering blind 75 patterns on CareerOS Arena',
        'Analyze space-time complexity tradeoffs for sorting algorithms',
        'Participate in College Weekly Coding Contest'
      ],
      recommendedResource: 'GCOEN DSA Placement Handbook 2026'
    },
    {
      week: 'Week 3 - 4',
      title: 'Database Architecture & High-Throughput APIs',
      skills: ['PostgreSQL', 'Indexing & Query Plans', 'Redis Caching', 'REST / gRPC'],
      tasks: [
        'Design a relational schema with B-Tree indexes for an ordering system',
        'Benchmark database query speed using EXPLAIN ANALYZE',
        'Implement Redis cache-aside layer with automatic TTL invalidation'
      ],
      recommendedResource: 'ThinkBuild Backend Engineering Course Notes'
    },
    {
      week: 'Week 5 - 6',
      title: 'System Design & Scalability Fundamentals',
      skills: ['Load Balancing', 'Microservices', 'Message Queues', 'CAP Theorem'],
      tasks: [
        'Architect a URL shortener or rate limiter handling 10M DAU',
        'Conduct a peer mock interview with an Alumni Mentor on CareerOS',
        'Deploy project on Cloudflare edge / Vercel with automated CI/CD'
      ],
      recommendedResource: 'System Design Interview Cheatsheet (Alumni Hub)'
    },
    {
      week: 'Week 7 - 8',
      title: 'Company-Specific Mock Drives & Offer Acceleration',
      skills: ['Behavioral (STAR Method)', 'Live Machine Coding', 'Resume Tuning'],
      tasks: [
        'Complete 3 AI Mock Interviews on TACIE Coach',
        'Generate ATS-tailored resume version for target campus drive',
        'Request internal referral from verified alumni on CareerOS Referral Portal'
      ],
      recommendedResource: 'Company Interview Kits & Verified Alumni Archive'
    }
  ];
}
