'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  BookOpen,
  Award,
  Plus,
  Trash2,
  Sparkles,
  CheckCircle2,
  Clock,
  Layers,
  FileText,
  AlertCircle,
  HelpCircle,
  Code2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  X,
  Users,
} from 'lucide-react';

interface QuestionDraft {
  prompt: string;
  type: 'MCQ' | 'CODING';
  options: string[];
  answerIndex: number;
  explanation: string;
  marks: number;
  starterCode?: string;
}

interface ModuleDraft {
  title: string;
  description: string;
  topics: {
    id: string;
    title: string;
    type: 'ARTICLE' | 'VIDEO' | 'LEETCODE_PROBLEM' | 'EXERCISE';
    url?: string;
  }[];
}

interface AssessmentItem {
  id: string;
  title: string;
  slug: string;
  category: string;
  difficulty: string;
  durationMin: number;
  totalMarks: number;
  passingMarks: number;
  isMandatory: boolean;
  targetBatch: string;
  questionCount: number;
  hasCoding: boolean;
  totalAttempts: number;
  averageScore: number | null;
  createdAt: string;
}

interface RoadmapItem {
  id: string;
  title: string;
  slug: string;
  category: string;
  provider: string;
  providerBadge: string;
  badgeColor: string;
  description: string;
  totalItems: number;
  estimatedHours: number;
  difficulty: string;
  tags: string[];
  moduleCount: number;
  createdAt: string;
}

export default function CurriculumCreatorStudio({
  roleTitle = 'Placement Cell & Faculty',
}: {
  roleTitle?: string;
}) {
  const [activeStudioTab, setActiveStudioTab] = useState<'assessments' | 'roadmaps'>('assessments');

  // Lists state
  const [assessments, setAssessments] = useState<AssessmentItem[]>([]);
  const [roadmaps, setRoadmaps] = useState<RoadmapItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal open states
  const [showAssessmentModal, setShowAssessmentModal] = useState(false);
  const [showRoadmapModal, setShowRoadmapModal] = useState(false);

  // Form states for Assessment
  const [asmtTitle, setAsmtTitle] = useState('');
  const [asmtCategory, setAsmtCategory] = useState('TECHNICAL_MCQ');
  const [asmtDifficulty, setAsmtDifficulty] = useState('MEDIUM');
  const [asmtDuration, setAsmtDuration] = useState(30);
  const [asmtPassingMarks, setAsmtPassingMarks] = useState(60);
  const [asmtTotalMarks, setAsmtTotalMarks] = useState(100);
  const [asmtTargetBatch, setAsmtTargetBatch] = useState('2026 Batch');
  const [asmtIsMandatory, setAsmtIsMandatory] = useState(false);
  const [asmtInstructions, setAsmtInstructions] = useState('Answer all questions. Submit before the timer expires.');
  const [asmtQuestions, setAsmtQuestions] = useState<QuestionDraft[]>([
    {
      prompt: 'What is the average time complexity of searching an element in a balanced Binary Search Tree (AVL / Red-Black)?',
      type: 'MCQ',
      options: ['O(log N)', 'O(1)', 'O(N)', 'O(N log N)'],
      answerIndex: 0,
      explanation: 'Balanced BST height is bounded by O(log N), guaranteeing logarithmic search time.',
      marks: 25,
    },
    {
      prompt: 'Which HTTP status code is most appropriate when a rate limiter throttles an incoming request?',
      type: 'MCQ',
      options: ['429 Too Many Requests', '503 Service Unavailable', '403 Forbidden', '400 Bad Request'],
      answerIndex: 0,
      explanation: 'RFC 6585 specifies HTTP 429 Too Many Requests for rate limiting.',
      marks: 25,
    },
  ]);

  // Form states for Roadmap
  const [rdmTitle, setRdmTitle] = useState('');
  const [rdmCategory, setRdmCategory] = useState('SYSTEM_DESIGN');
  const [rdmProvider, setRdmProvider] = useState('Campus Training Cell');
  const [rdmProviderBadge, setRdmProviderBadge] = useState('CTC');
  const [rdmBadgeColor, setRdmBadgeColor] = useState('blue');
  const [rdmDescription, setRdmDescription] = useState('');
  const [rdmEstimatedHours, setRdmEstimatedHours] = useState(40);
  const [rdmDifficulty, setRdmDifficulty] = useState('INTERMEDIATE');
  const [rdmTags, setRdmTags] = useState('System Design, Redis, Microservices, Scale');
  const [rdmModules, setRdmModules] = useState<ModuleDraft[]>([
    {
      title: 'Module 1: High-Concurrency Foundations & Bottlenecks',
      description: 'Understanding thread contention, latency percentiles (p99), and horizontal scale.',
      topics: [
        { id: 'top-1', title: 'Amdahl’s Law and CPU Caching', type: 'ARTICLE', url: 'https://en.wikipedia.org/wiki/Amdahl%27s_law' },
        { id: 'top-2', title: 'Designing for p99 Latency SLA', type: 'VIDEO', url: 'https://youtube.com' },
      ],
    },
    {
      title: 'Module 2: Distributed Caching & Eventual Consistency',
      description: 'Mastering Redis cluster topologies, write-behind caching, and invalidation stamps.',
      topics: [
        { id: 'top-3', title: 'Redis Sentinel vs Cluster Sharding', type: 'ARTICLE', url: 'https://redis.io' },
        { id: 'top-4', title: 'Mitigating Cache Thundering Herd Problems', type: 'EXERCISE', url: '' },
      ],
    },
  ]);

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 5000);
  };

  const loadAssessments = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/assessments');
      const data = await res.json();
      if (data.success && Array.isArray(data.assessments)) {
        setAssessments(data.assessments);
      }
    } catch {
      showNotification('Could not load assessments from database', 'error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadRoadmaps = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/learning/roadmaps');
      const data = await res.json();
      if (data.success && Array.isArray(data.roadmaps)) {
        setRoadmaps(data.roadmaps);
      }
    } catch {
      showNotification('Could not load learning roadmaps from database', 'error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAssessments();
    loadRoadmaps();
  }, [loadAssessments, loadRoadmaps]);

  // Handle Assessment Template Presets
  const applyAssessmentTemplate = (preset: 'dsa' | 'react' | 'system-design') => {
    if (preset === 'dsa') {
      setAsmtTitle('Data Structures & Algorithms Blind 75 Sprint');
      setAsmtCategory('CODING');
      setAsmtDifficulty('HARD');
      setAsmtDuration(60);
      setAsmtTotalMarks(100);
      setAsmtPassingMarks(70);
      setAsmtQuestions([
        {
          prompt: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target in O(N) time.',
          type: 'CODING',
          options: ['Hash Map Approach O(N)', 'Two-Pointer after O(N log N) Sort', 'Brute Force O(N^2)', 'Binary Search O(N log N)'],
          answerIndex: 0,
          explanation: 'Store complement (target - num) in hash table for instant O(1) lookup.',
          marks: 50,
          starterCode: 'function twoSum(nums: number[], target: number): number[] {\n  const map = new Map<number, number>();\n  // Complete implementation\n}',
        },
        {
          prompt: 'What data structure is used internally by LRU Cache for constant O(1) eviction and insertion?',
          type: 'MCQ',
          options: ['Hash Map + Doubly Linked List', 'Binary Min-Heap', 'Dynamic Array', 'Red-Black Tree'],
          answerIndex: 0,
          explanation: 'Doubly linked list maintains access order in O(1) while hash map stores node pointers in O(1).',
          marks: 50,
        },
      ]);
    } else if (preset === 'react') {
      setAsmtTitle('Full-Stack Web & Next.js Architecture Evaluation');
      setAsmtCategory('TECHNICAL_MCQ');
      setAsmtDifficulty('MEDIUM');
      setAsmtDuration(30);
      setAsmtTotalMarks(100);
      setAsmtPassingMarks(60);
      setAsmtQuestions([
        {
          prompt: 'In React 18 / 19 Server Components, what is the key architectural benefit of Server Actions?',
          type: 'MCQ',
          options: [
            'Executing asynchronous mutations directly on the server without custom API endpoints',
            'Running client-side useState in NodeJS',
            'Bundling CSS files faster',
            'Eliminating the need for a relational database',
          ],
          answerIndex: 0,
          explanation: 'Server Actions allow seamless RPC-style data mutation on the server.',
          marks: 50,
        },
        {
          prompt: 'How does React optimize re-renders using useMemo vs useCallback?',
          type: 'MCQ',
          options: [
            'useMemo caches calculated values; useCallback caches function definitions',
            'useMemo is for CSS styling; useCallback is for API requests',
            'useMemo runs on server; useCallback runs on browser',
            'They are exact synonyms with no difference',
          ],
          answerIndex: 0,
          explanation: 'useMemo memoizes the return value; useCallback memoizes the function reference.',
          marks: 50,
        },
      ]);
    } else {
      setAsmtTitle('High-Throughput Distributed Systems & Kafka Assessment');
      setAsmtCategory('SYSTEM_DESIGN');
      setAsmtDifficulty('HARD');
      setAsmtDuration(45);
      setAsmtTotalMarks(100);
      setAsmtPassingMarks(75);
      setAsmtQuestions([
        {
          prompt: 'In Apache Kafka, what determines the maximum degree of consumer parallelism in a single consumer group?',
          type: 'MCQ',
          options: ['The number of partitions in the topic', 'The number of broker nodes', 'The consumer CPU cores', 'The ZooKeeper/KRaft quorum size'],
          answerIndex: 0,
          explanation: 'Each partition in a Kafka topic can be consumed by at most one consumer instance within a consumer group.',
          marks: 50,
        },
        {
          prompt: 'When designing a distributed rate limiter with Redis, why is a Lua script preferred over multiple sequential GET and INCR commands?',
          type: 'MCQ',
          options: ['Atomicity: Lua runs atomically preventing race conditions between check and update', 'Lua compresses the token bucket JSON', 'Redis does not support INCR without Lua', 'Lua reduces RAM usage by 90%'],
          answerIndex: 0,
          explanation: 'Lua scripts execute atomically on the Redis single-threaded engine, preventing race conditions.',
          marks: 50,
        },
      ]);
    }
  };

  // Handle Roadmap Presets
  const applyRoadmapTemplate = (preset: 'systems' | 'dsa' | 'devops') => {
    if (preset === 'systems') {
      setRdmTitle('Distributed Systems & Cloud Architecture 2026');
      setRdmCategory('SYSTEM_DESIGN');
      setRdmProvider('ThinkBuild Corporate Cell');
      setRdmProviderBadge('TB');
      setRdmBadgeColor('emerald');
      setRdmEstimatedHours(45);
      setRdmDescription('End-to-end curriculum for Tier-1 Product Engineering roles: Microservices, Redis, Kafka, and Database Sharding.');
      setRdmTags('System Design, Redis, Kafka, Microservices, Scale');
    } else if (preset === 'dsa') {
      setRdmTitle('Blind 75 & LeetCode Top Interview 150 Mastery');
      setRdmCategory('DSA');
      setRdmProvider('Campus Placement Cell');
      setRdmProviderBadge('CPC');
      setRdmBadgeColor('blue');
      setRdmEstimatedHours(60);
      setRdmDescription('Structured algorithmic problem solving: Two Pointers, Dynamic Programming, Graphs, and Heaps.');
      setRdmTags('DSA, LeetCode, Algorithms, Problem Solving');
    } else {
      setRdmTitle('Cloud Native & DevOps Acceleration Track');
      setRdmCategory('CLOUD');
      setRdmProvider('AWS Academy Partner');
      setRdmProviderBadge('AWS');
      setRdmBadgeColor('amber');
      setRdmEstimatedHours(35);
      setRdmDescription('Docker containerization, Kubernetes cluster orchestration, and CI/CD automated pipeline deployment.');
      setRdmTags('Docker, Kubernetes, AWS, CI/CD, Terraform');
    }
  };

  // Submit Assessment Form
  const handleCreateAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!asmtTitle.trim()) {
      showNotification('Please enter an assessment title.', 'error');
      return;
    }
    if (asmtQuestions.length === 0) {
      showNotification('Please add at least 1 question to the assessment.', 'error');
      return;
    }

    try {
      const res = await fetch('/api/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: asmtTitle.trim(),
          category: asmtCategory,
          difficulty: asmtDifficulty,
          durationMin: Number(asmtDuration),
          passingMarks: Number(asmtPassingMarks),
          totalMarks: Number(asmtTotalMarks),
          targetBatch: asmtTargetBatch,
          isMandatory: asmtIsMandatory,
          instructions: asmtInstructions,
          questions: asmtQuestions,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification('🎉 Assessment created and published successfully to student portal!');
        setShowAssessmentModal(false);
        setAsmtTitle('');
        loadAssessments();
      } else {
        showNotification(data.error || 'Failed to create assessment.', 'error');
      }
    } catch {
      showNotification('Network error while saving assessment.', 'error');
    }
  };

  // Submit Roadmap Form
  const handleCreateRoadmap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rdmTitle.trim()) {
      showNotification('Please enter a learning roadmap title.', 'error');
      return;
    }

    try {
      const res = await fetch('/api/learning/roadmaps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: rdmTitle.trim(),
          category: rdmCategory,
          provider: rdmProvider,
          providerBadge: rdmProviderBadge,
          badgeColor: rdmBadgeColor,
          description: rdmDescription,
          estimatedHours: Number(rdmEstimatedHours),
          difficulty: rdmDifficulty,
          tags: rdmTags.split(',').map((t) => t.trim()).filter(Boolean),
          modules: rdmModules,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification('🎉 Learning Roadmap published successfully to student portal!');
        setShowRoadmapModal(false);
        setRdmTitle('');
        loadRoadmaps();
      } else {
        showNotification(data.error || 'Failed to create roadmap.', 'error');
      }
    } catch {
      showNotification('Network error while saving roadmap.', 'error');
    }
  };

  // Delete Assessment
  const handleDeleteAssessment = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete assessment "${title}"?`)) return;
    try {
      const res = await fetch(`/api/assessments?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showNotification('Assessment deleted.');
        loadAssessments();
      } else {
        showNotification(data.error || 'Could not delete assessment.', 'error');
      }
    } catch {
      showNotification('Error deleting assessment.', 'error');
    }
  };

  // Delete Roadmap
  const handleDeleteRoadmap = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete roadmap "${title}"?`)) return;
    try {
      const res = await fetch(`/api/learning/roadmaps?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showNotification('Roadmap deleted.');
        loadRoadmaps();
      } else {
        showNotification(data.error || 'Could not delete roadmap.', 'error');
      }
    } catch {
      showNotification('Error deleting roadmap.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {feedbackMsg && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between shadow-md transition ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-900 border-rose-300 dark:bg-rose-950/80 dark:text-rose-200 dark:border-rose-800'
          }`}
        >
          <div className="flex items-center gap-2 text-xs font-bold">
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
          <button type="button" onClick={() => setFeedbackMsg(null)} className="opacity-60 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-6 sm:p-7 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[10px] font-black uppercase tracking-wider">
                Institutional Studio
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-bold">
                Student Portal Live Sync
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black mt-2 tracking-tight flex items-center gap-2.5">
              <Sparkles className="w-6 h-6 text-blue-400" />
              <span>Assessment &amp; Learning Creator Studio</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Design, publish, and manage customized Technical Assessments, Coding Sandboxes, and Learning Roadmaps.
              All items created here appear instantly across student dashboards.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                applyAssessmentTemplate('dsa');
                setShowAssessmentModal(true);
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Create Assessment</span>
            </button>
            <button
              type="button"
              onClick={() => {
                applyRoadmapTemplate('systems');
                setShowRoadmapModal(true);
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Create Roadmap</span>
            </button>
          </div>
        </div>

        {/* Studio Sub-Navigation Tabs */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-white/10 text-xs">
          <button
            type="button"
            onClick={() => setActiveStudioTab('assessments')}
            className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition ${
              activeStudioTab === 'assessments'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Assessments Catalog ({assessments.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveStudioTab('roadmaps')}
            className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition ${
              activeStudioTab === 'roadmaps'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Learning Roadmaps ({roadmaps.length})</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: ASSESSMENTS CATALOG                                               */}
      {/* ========================================================================= */}
      {activeStudioTab === 'assessments' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Active Assessments Catalog</h2>
              <p className="text-xs text-slate-500">Live evaluations currently published and accessible by students.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowAssessmentModal(true)}
              className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-500 flex items-center gap-1 self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Assessment</span>
            </button>
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-xs text-slate-400">Loading assessments catalog...</div>
          ) : assessments.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
              <Award className="w-10 h-10 text-slate-400 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No assessments created yet</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Get started by creating your first technical MCQ or coding assessment with our 1-click templates.
              </p>
              <button
                type="button"
                onClick={() => {
                  applyAssessmentTemplate('dsa');
                  setShowAssessmentModal(true);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Create with Template</span>
              </button>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                      <th className="py-3 px-4">Title &amp; Category</th>
                      <th className="py-3 px-4">Difficulty</th>
                      <th className="py-3 px-4">Duration &amp; Marks</th>
                      <th className="py-3 px-4">Questions</th>
                      <th className="py-3 px-4">Attempts &amp; Avg Score</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {assessments.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-850/50 transition">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 dark:text-white">{a.title}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                              {a.category}
                            </span>
                            <span className="text-[10px] text-slate-400">{a.targetBatch}</span>
                            {a.isMandatory && (
                              <span className="text-[9px] px-1 rounded bg-rose-100 text-rose-700 font-bold">Mandatory</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              a.difficulty === 'EASY'
                                ? 'bg-emerald-100 text-emerald-800'
                                : a.difficulty === 'HARD'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {a.difficulty}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">
                            {a.durationMin} mins • {a.totalMarks} pts
                          </div>
                          <div className="text-[10px] text-slate-400">Pass: {a.passingMarks} pts</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                            {a.questionCount} Qs
                          </span>
                          {a.hasCoding && (
                            <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold">
                              Coding
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                            <Users className="w-3.5 h-3.5 text-blue-500" />
                            <span>{a.totalAttempts} taken</span>
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {a.averageScore !== null ? `Avg: ${a.averageScore}%` : 'No attempts yet'}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteAssessment(a.id, a.title)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                            title="Delete Assessment"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: LEARNING ROADMAPS CATALOG                                         */}
      {/* ========================================================================= */}
      {activeStudioTab === 'roadmaps' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Active Learning Roadmaps</h2>
              <p className="text-xs text-slate-500">Structured curricula and modules published on the student learning portal.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowRoadmapModal(true)}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500 flex items-center gap-1 self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Roadmap</span>
            </button>
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-xs text-slate-400">Loading learning roadmaps...</div>
          ) : roadmaps.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
              <BookOpen className="w-10 h-10 text-slate-400 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No roadmaps created yet</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Create structured career tracks with weekly modules and practice exercises.
              </p>
              <button
                type="button"
                onClick={() => {
                  applyRoadmapTemplate('systems');
                  setShowRoadmapModal(true);
                }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Create with Template</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {roadmaps.map((r) => (
                <div
                  key={r.id}
                  className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4 hover:border-indigo-400 dark:hover:border-indigo-600 transition"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                        {r.category}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteRoadmap(r.id, r.title)}
                        className="text-slate-400 hover:text-rose-600 transition"
                        title="Delete Roadmap"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-snug">{r.title}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {r.description}
                    </p>
                  </div>

                  <div className="space-y-2.5 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-blue-500" />
                        <span>{r.estimatedHours} Hours</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-indigo-500" />
                        <span>{r.moduleCount} Modules</span>
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-slate-400">By {r.provider}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {r.difficulty}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: CREATE ASSESSMENT                                                */}
      {/* ========================================================================= */}
      {showAssessmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-5 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Award className="w-5 h-5 text-blue-600" />
                  <span>Create New Technical Assessment</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Publish a timed MCQ or Coding evaluation directly to student portals.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAssessmentModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Templates Presets */}
            <div className="p-3 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-xl text-xs space-y-2">
              <span className="font-bold text-blue-900 dark:text-blue-300 text-[11px] uppercase tracking-wider block">
                ⚡ 1-Click Assessment Presets (Auto-populate fields &amp; questions):
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => applyAssessmentTemplate('dsa')}
                  className="px-3 py-1 rounded-lg bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-800 font-bold text-blue-700 dark:text-blue-300 hover:bg-blue-100 transition"
                >
                  Blind 75 Coding Test
                </button>
                <button
                  type="button"
                  onClick={() => applyAssessmentTemplate('react')}
                  className="px-3 py-1 rounded-lg bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-800 font-bold text-blue-700 dark:text-blue-300 hover:bg-blue-100 transition"
                >
                  React &amp; Next.js Architecture
                </button>
                <button
                  type="button"
                  onClick={() => applyAssessmentTemplate('system-design')}
                  className="px-3 py-1 rounded-lg bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-800 font-bold text-blue-700 dark:text-blue-300 hover:bg-blue-100 transition"
                >
                  Distributed Kafka &amp; Redis Systems
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateAssessment} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Assessment Title *</label>
                <input
                  type="text"
                  required
                  value={asmtTitle}
                  onChange={(e) => setAsmtTitle(e.target.value)}
                  placeholder="e.g. Distributed Caching & High-Concurrency Redis Test"
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 text-slate-900 dark:text-white font-medium"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Category</label>
                  <select
                    value={asmtCategory}
                    onChange={(e) => setAsmtCategory(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 text-slate-900 dark:text-white"
                  >
                    <option value="TECHNICAL_MCQ">Technical MCQ</option>
                    <option value="CODING">Coding Test</option>
                    <option value="SYSTEM_DESIGN">System Design</option>
                    <option value="APTITUDE">Quantitative Aptitude</option>
                    <option value="DOMAIN_SPECIFIC">Domain Specific</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Difficulty</label>
                  <select
                    value={asmtDifficulty}
                    onChange={(e) => setAsmtDifficulty(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 text-slate-900 dark:text-white"
                  >
                    <option value="EASY">Easy</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HARD">Hard</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Duration (Mins)</label>
                  <input
                    type="number"
                    min={5}
                    max={180}
                    value={asmtDuration}
                    onChange={(e) => setAsmtDuration(Number(e.target.value))}
                    className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Passing Score (Pts)</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={asmtPassingMarks}
                    onChange={(e) => setAsmtPassingMarks(Number(e.target.value))}
                    className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Questions Builder */}
              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span>Questions ({asmtQuestions.length} Configured)</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() =>
                      setAsmtQuestions((prev) => [
                        ...prev,
                        {
                          prompt: `New Question ${prev.length + 1}: `,
                          type: 'MCQ',
                          options: ['Option A', 'Option B', 'Option C', 'Option D'],
                          answerIndex: 0,
                          explanation: 'Explanation for correct answer.',
                          marks: 25,
                        },
                      ])
                    }
                    className="px-2.5 py-1 rounded bg-blue-50 text-blue-700 font-bold hover:bg-blue-100"
                  >
                    + Add Question
                  </button>
                </div>

                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                  {asmtQuestions.map((q, qIdx) => (
                    <div
                      key={qIdx}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-blue-600">Question {qIdx + 1} ({q.type})</span>
                        <div className="flex items-center gap-2">
                          <select
                            value={q.type}
                            onChange={(e) => {
                              const updated = [...asmtQuestions];
                              updated[qIdx].type = e.target.value as any;
                              setAsmtQuestions(updated);
                            }}
                            className="px-2 py-0.5 rounded text-[11px] border border-slate-200 bg-white dark:bg-slate-800"
                          >
                            <option value="MCQ">MCQ</option>
                            <option value="CODING">Coding Problem</option>
                          </select>
                          <button
                            type="button"
                            onClick={() =>
                              setAsmtQuestions((prev) => prev.filter((_, idx) => idx !== qIdx))
                            }
                            className="text-slate-400 hover:text-rose-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <input
                        type="text"
                        value={q.prompt}
                        onChange={(e) => {
                          const updated = [...asmtQuestions];
                          updated[qIdx].prompt = e.target.value;
                          setAsmtQuestions(updated);
                        }}
                        placeholder="Enter question text / problem statement..."
                        className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-medium"
                      />

                      {q.type === 'MCQ' && (
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          {q.options.map((opt, oIdx) => (
                            <div key={oIdx} className="flex items-center gap-1.5">
                              <input
                                type="radio"
                                name={`correct-${qIdx}`}
                                checked={q.answerIndex === oIdx}
                                onChange={() => {
                                  const updated = [...asmtQuestions];
                                  updated[qIdx].answerIndex = oIdx;
                                  setAsmtQuestions(updated);
                                }}
                                className="accent-blue-600"
                                title="Mark as correct answer"
                              />
                              <input
                                type="text"
                                value={opt}
                                onChange={(e) => {
                                  const updated = [...asmtQuestions];
                                  updated[qIdx].options[oIdx] = e.target.value;
                                  setAsmtQuestions(updated);
                                }}
                                className="w-full p-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                                placeholder={`Option ${oIdx + 1}`}
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {q.type === 'CODING' && (
                        <div>
                          <label className="text-[10px] text-slate-500 font-mono block mb-1">Starter Code Template:</label>
                          <textarea
                            rows={3}
                            value={q.starterCode || ''}
                            onChange={(e) => {
                              const updated = [...asmtQuestions];
                              updated[qIdx].starterCode = e.target.value;
                              setAsmtQuestions(updated);
                            }}
                            className="w-full p-2 font-mono text-[11px] rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                            placeholder="function solution() {\n  // Code here\n}"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAssessmentModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-md flex items-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Publish Assessment to Student Portal</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: CREATE ROADMAP                                                   */}
      {/* ========================================================================= */}
      {showRoadmapModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-5 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-indigo-600" />
                  <span>Create New Learning Roadmap &amp; Curriculum</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Publish a multi-week structured learning track with modules and exercises for students.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowRoadmapModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Presets */}
            <div className="p-3 bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 rounded-xl text-xs space-y-2">
              <span className="font-bold text-indigo-900 dark:text-indigo-300 text-[11px] uppercase tracking-wider block">
                ⚡ 1-Click Roadmap Templates:
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => applyRoadmapTemplate('systems')}
                  className="px-3 py-1 rounded-lg bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 font-bold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 transition"
                >
                  Distributed Systems &amp; Redis
                </button>
                <button
                  type="button"
                  onClick={() => applyRoadmapTemplate('dsa')}
                  className="px-3 py-1 rounded-lg bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 font-bold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 transition"
                >
                  Blind 75 DSA Mastery
                </button>
                <button
                  type="button"
                  onClick={() => applyRoadmapTemplate('devops')}
                  className="px-3 py-1 rounded-lg bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 font-bold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 transition"
                >
                  Cloud &amp; DevOps Acceleration
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateRoadmap} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Roadmap Title *</label>
                <input
                  type="text"
                  required
                  value={rdmTitle}
                  onChange={(e) => setRdmTitle(e.target.value)}
                  placeholder="e.g. Full-Stack Distributed Microservices Curriculum"
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 text-slate-900 dark:text-white font-medium"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Category</label>
                  <select
                    value={rdmCategory}
                    onChange={(e) => setRdmCategory(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 text-slate-900 dark:text-white"
                  >
                    <option value="SYSTEM_DESIGN">System Design</option>
                    <option value="DSA">Data Structures &amp; Algo</option>
                    <option value="DATABASE">Databases &amp; SQL</option>
                    <option value="FULL_STACK">Full Stack Web</option>
                    <option value="CLOUD">Cloud &amp; DevOps</option>
                    <option value="APTITUDE">Aptitude &amp; Reasoning</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Estimated Hours</label>
                  <input
                    type="number"
                    min={5}
                    max={200}
                    value={rdmEstimatedHours}
                    onChange={(e) => setRdmEstimatedHours(Number(e.target.value))}
                    className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Difficulty</label>
                  <select
                    value={rdmDifficulty}
                    onChange={(e) => setRdmDifficulty(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 text-slate-900 dark:text-white"
                  >
                    <option value="BEGINNER">Beginner</option>
                    <option value="INTERMEDIATE">Intermediate</option>
                    <option value="ADVANCED">Advanced</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Provider Tag</label>
                  <input
                    type="text"
                    value={rdmProvider}
                    onChange={(e) => setRdmProvider(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Curriculum Description</label>
                <textarea
                  rows={2}
                  value={rdmDescription}
                  onChange={(e) => setRdmDescription(e.target.value)}
                  placeholder="Overview of learning outcomes and target placement roles..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 text-slate-900 dark:text-white"
                />
              </div>

              {/* Modules list builder */}
              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    <span>Roadmap Modules ({rdmModules.length} Modules)</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() =>
                      setRdmModules((prev) => [
                        ...prev,
                        {
                          title: `Module ${prev.length + 1}: `,
                          description: 'Module objectives and topics',
                          topics: [
                            { id: `top-${Date.now()}-1`, title: 'Topic 1: Core Concept', type: 'ARTICLE' },
                            { id: `top-${Date.now()}-2`, title: 'Topic 2: Hands-on Lab', type: 'LEETCODE_PROBLEM' },
                          ],
                        },
                      ])
                    }
                    className="px-2.5 py-1 rounded bg-indigo-50 text-indigo-700 font-bold hover:bg-indigo-100"
                  >
                    + Add Module
                  </button>
                </div>

                <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                  {rdmModules.map((m, mIdx) => (
                    <div
                      key={mIdx}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-indigo-600">Module {mIdx + 1}</span>
                        <button
                          type="button"
                          onClick={() => setRdmModules((prev) => prev.filter((_, idx) => idx !== mIdx))}
                          className="text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <input
                        type="text"
                        value={m.title}
                        onChange={(e) => {
                          const updated = [...rdmModules];
                          updated[mIdx].title = e.target.value;
                          setRdmModules(updated);
                        }}
                        className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-medium"
                        placeholder="Module title..."
                      />
                      <input
                        type="text"
                        value={m.description}
                        onChange={(e) => {
                          const updated = [...rdmModules];
                          updated[mIdx].description = e.target.value;
                          setRdmModules(updated);
                        }}
                        className="w-full p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[11px]"
                        placeholder="Brief summary of skills learned in this module..."
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowRoadmapModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-md flex items-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Publish Roadmap to Student Portal</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
