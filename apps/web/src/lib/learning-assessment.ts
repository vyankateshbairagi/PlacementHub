export function parseStringArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch { return []; }
}

export function parseJsonArray<T = any>(value: string | null | undefined): T[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

export function assessmentMarkScale(assessment: {
  totalMarks?: number | null;
  passingMarks?: number | null;
  questions?: Array<{ marks?: number | null }>;
}) {
  const questionTotal = (assessment.questions || []).reduce((sum, question) => {
    const marks = Number(question.marks);
    return sum + (Number.isFinite(marks) && marks > 0 ? marks : 10);
  }, 0);
  const hasStoredTotal = assessment.totalMarks !== null && assessment.totalMarks !== undefined;
  const storedTotal = hasStoredTotal ? Number(assessment.totalMarks) : Number.NaN;
  const totalMarks = questionTotal > 0
    ? questionTotal
    : Number.isFinite(storedTotal) && storedTotal > 0
      ? storedTotal
      : 0;

  const hasStoredPassing = assessment.passingMarks !== null && assessment.passingMarks !== undefined;
  const storedPassing = hasStoredPassing ? Number(assessment.passingMarks) : Number.NaN;
  let passingMarks = Math.ceil(totalMarks * 0.6);
  if (Number.isFinite(storedPassing) && storedPassing >= 0 && totalMarks > 0) {
    // Existing records were commonly stored as 60/100. Preserve that ratio when
    // the real question total is different (for example, 5 x 10 = 50 marks).
    passingMarks = Number.isFinite(storedTotal) && storedTotal > 0 && storedTotal !== totalMarks
      ? Math.ceil((storedPassing / storedTotal) * totalMarks)
      : Math.ceil(storedPassing);
  }

  return { totalMarks, passingMarks: Math.max(0, Math.min(totalMarks, passingMarks)) };
}

export function publicQuestion(question: any) {
  const visibleCases = parseJsonArray<any>(question.testCases).filter((testCase) => !testCase?.isHidden);
  return {
    id: question.id,
    title: question.title,
    prompt: question.prompt,
    options: question.options,
    type: question.type || 'MCQ',
    orderIndex: question.orderIndex || 0,
    marks: question.marks || 10,
    negativeMarks: question.negativeMarks || 0,
    starterCode: question.starterCode,
    codingProblemId: question.codingProblemId,
    testCases: visibleCases,
  };
}

export function roadmapTopics(modules: Array<{ id: string; topics: string }>) {
  return modules.flatMap((module) => parseJsonArray<any>(module.topics).map((topic, index) => ({
    ...topic,
    id: typeof topic.id === 'string' && topic.id ? topic.id : `${module.id}-t-${index}`,
    moduleId: module.id,
  })));
}

