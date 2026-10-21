/** Same-origin client for the authenticated assessment and learning APIs. */

export interface AssessmentSummary {
  id: string; title: string; slug: string; category: string; difficulty: string;
  durationMin: number; totalMarks: number; passingMarks: number; isMandatory: boolean;
  skillsCovered: string[]; targetBatch: string; questionCount: number; hasCoding: boolean;
  completed: boolean; bestScore?: number | null; percentage?: number | null;
}

export interface RoadmapSummary {
  id: string; title: string; slug: string; category: string; provider: string;
  providerBadge: string; badgeColor: string; description: string; totalItems: number;
  estimatedHours: number; difficulty: string; tags: string[]; moduleCount: number;
  studentProgress: { completedItems: number; progressPercentage: number; status: string; lastActivityAt?: string | null };
}

export interface RoadmapTopic {
  id: string; title: string; type: string; url?: string | null; leetcodeUrl?: string | null;
  codingProblemSlug?: string | null; completed: boolean;
  isLocked?: boolean;
  prerequisiteTopicId?: string | null;
  prerequisiteTitle?: string | null;
  assignment?: { title: string; type: 'CODING' | 'QUIZ'; slug?: string | null } | null;
}

export interface RoadmapModule {
  id: string; title: string; description?: string | null; orderIndex: number;
  totalItems: number; completedCount: number; topics: RoadmapTopic[];
}

export interface RoadmapDetail {
  id: string; title: string; slug: string; category: string; provider: string;
  providerBadge: string; badgeColor: string; description: string; totalItems: number;
  estimatedHours: number; difficulty: string; modules: RoadmapModule[];
  isEnrolled?: boolean;
  progress: { completedItems: number; progressPercentage: number; status: string; lastActivityAt?: string | null };
}

async function jsonRequest<T = any>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: 'no-store', ...init });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) throw new Error(data.error || `Request failed (${response.status})`);
  return data as T;
}

export async function getAssessments(_studentEmail?: string, category?: string): Promise<AssessmentSummary[]> {
  const query = new URLSearchParams();
  if (category) query.set('category', category);
  const data = await jsonRequest<{ assessments: AssessmentSummary[] }>(`/api/assessments${query.size ? `?${query}` : ''}`);
  return data.assessments || [];
}

export async function startAssessmentSession(slug: string, _studentEmail?: string) {
  return jsonRequest(`/api/assessments/${encodeURIComponent(slug)}/start`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
}

export async function submitAssessmentSession(slug: string, payload: { attemptId?: string; studentEmail?: string; answers: Record<string, any>; proctorLogs?: any[]; timeSpentSeconds?: number }) {
  const { studentEmail: _ignored, ...trustedPayload } = payload;
  return jsonRequest(`/api/assessments/${encodeURIComponent(slug)}/submit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(trustedPayload) });
}

export async function runCodeSandbox(payload: { code: string; language?: string; testCases?: any[]; problemSlug?: string }) {
  return jsonRequest('/api/assessments/coding/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
}

export async function getLearningRoadmaps(_studentEmail?: string): Promise<RoadmapSummary[]> {
  const data = await jsonRequest<{ roadmaps: RoadmapSummary[] }>('/api/learning/roadmaps');
  return data.roadmaps || [];
}

export async function getRoadmapDetail(slug: string, _studentEmail?: string): Promise<RoadmapDetail | null> {
  const data = await jsonRequest<{ roadmap: RoadmapDetail }>(`/api/learning/roadmaps/${encodeURIComponent(slug)}`);
  return data.roadmap || null;
}

export async function toggleTopicCompletion(slug: string, _studentEmail: string, topicId: string, isCompleted: boolean) {
  return jsonRequest(`/api/learning/roadmaps/${encodeURIComponent(slug)}/progress`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ topicId, isCompleted }) });
}

export async function enrollRoadmap(slug: string) {
  return jsonRequest(`/api/learning/roadmaps/${encodeURIComponent(slug)}/enroll`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
}

export async function markResourceCompleted(resourceId: string, isCompleted: boolean = true) {
  return jsonRequest(`/api/files/${encodeURIComponent(resourceId)}/complete`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isCompleted }) });
}

export async function getFacultyLearningAnalytics(department?: string) {
  const query = department ? `?department=${encodeURIComponent(department)}` : '';
  return jsonRequest(`/api/learning/analytics${query}`);
}

export async function createFacultyAssignment(payload: { title: string; type?: string; roadmapSlug?: string; targetCohort?: string; department?: string; dueDate?: string; instructions?: string }) {
  return jsonRequest('/api/learning/assignments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
}

export async function getFacultyAssignments(department?: string) {
  const query = department ? `?department=${encodeURIComponent(department)}` : '';
  return jsonRequest(`/api/learning/assignments${query}`);
}

