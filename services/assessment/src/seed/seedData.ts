import { prisma } from '../db.js';

export async function seedAssessmentsAndRoadmaps() {
  console.log('🌱 Starting Assessment & Learning Data Seeding...');

  // 1. Resolve student Aditya Shinde
  const student = await prisma.studentProfile.findFirst({
    where: {
      user: { email: 'aditya.shinde@student.gcoen.ac.in' },
    },
  });

  const studentId = student?.id;
  console.log('Resolved student profile id:', studentId);

  // 2. Update existing 5 assessments if their slugs are null
  const existingAssessments = await prisma.assessment.findMany();
  for (const a of existingAssessments) {
    if (!a.slug) {
      const generatedSlug = a.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      await prisma.assessment.update({
        where: { id: a.id },
        data: {
          slug: generatedSlug,
          category: 'TECHNICAL_MCQ',
          difficulty: 'MEDIUM',
          durationMin: a.durationMin || 15,
          totalMarks: 50,
          passingMarks: 30,
          status: 'ACTIVE',
          skillsCovered: JSON.stringify([a.title.replace('Fundamentals', '').replace('Basics', '').trim()]),
        },
      });
    }
  }

  // 3. Ensure Two Sum and Longest Substring coding problems exist
  let twoSumProblem = await prisma.codingProblem.findFirst({ where: { slug: 'two-sum' } });
  if (!twoSumProblem) {
    twoSumProblem = await prisma.codingProblem.create({
      data: {
        title: 'Two Sum',
        slug: 'two-sum',
        difficulty: 'EASY',
        category: 'Arrays & Hashing',
        description: 'Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.',
        starterCode: JSON.stringify({
          javascript: 'function twoSum(nums, target) {\n  const map = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    const complement = target - nums[i];\n    if (map.has(complement)) {\n      return [map.get(complement), i];\n    }\n    map.set(nums[i], i);\n  }\n  return [];\n}',
          python: 'def twoSum(nums, target):\n    seen = {}\n    for i, num in enumerate(nums):\n        if target - num in seen:\n            return [seen[target - num], i]\n        seen[num] = i\n    return []',
        }),
        testCases: JSON.stringify([
          { input: 'nums = [2,7,11,15], target = 9', output: '[0,1]' },
          { input: 'nums = [3,2,4], target = 6', output: '[1,2]' },
          { input: 'nums = [3,3], target = 6', output: '[0,1]' },
        ]),
      },
    });
  }

  let lswrcProblem = await prisma.codingProblem.findFirst({
    where: { slug: 'longest-substring-without-repeating-characters' },
  });
  if (!lswrcProblem) {
    lswrcProblem = await prisma.codingProblem.create({
      data: {
        title: 'Longest Substring Without Repeating Characters',
        slug: 'longest-substring-without-repeating-characters',
        difficulty: 'MEDIUM',
        category: 'Sliding Window',
        description: 'Given a string `s`, find the length of the longest substring without repeating characters.',
        starterCode: JSON.stringify({
          javascript: 'function lengthOfLongestSubstring(s) {\n  let set = new Set();\n  let left = 0, maxLen = 0;\n  for (let right = 0; right < s.length; right++) {\n    while (set.has(s[right])) {\n      set.delete(s[left]);\n      left++;\n    }\n    set.add(s[right]);\n    maxLen = Math.max(maxLen, right - left + 1);\n  }\n  return maxLen;\n}',
          python: 'def lengthOfLongestSubstring(s: str) -> int:\n    char_set = set()\n    left = 0, max_len = 0\n    for right in range(len(s)):\n        while s[right] in char_set:\n            char_set.remove(s[left])\n            left += 1\n        char_set.add(s[right])\n        max_len = max(max_len, right - left + 1)\n    return max_len',
        }),
        testCases: JSON.stringify([
          { input: 's = "abcabcbb"', output: '3' },
          { input: 's = "bbbbb"', output: '1' },
          { input: 's = "pwwkew"', output: '3' },
        ]),
      },
    });
  }

  // 4. Create TCS NQT Aptitude Assessment if not present
  let tcsNqt = await prisma.assessment.findFirst({ where: { slug: 'tcs-nqt-aptitude' } });
  if (!tcsNqt) {
    tcsNqt = await prisma.assessment.create({
      data: {
        title: 'TCS NQT Aptitude Assessment',
        slug: 'tcs-nqt-aptitude',
        category: 'APTITUDE',
        difficulty: 'MEDIUM',
        durationMin: 60,
        totalMarks: 100,
        passingMarks: 60,
        isMandatory: true,
        targetBatch: '2026 Batch',
        skillsCovered: JSON.stringify(['Quantitative Aptitude', 'Verbal Reasoning', 'Advanced Logic']),
        instructions: 'Duration: 60 Mins. Auto-evaluated proctored campus qualifier. Negative marking: 0.25 on incorrect answers.',
        status: 'ACTIVE',
      },
    });

    // Seed questions for TCS NQT
    const nqtQuestions = [
      {
        prompt: 'A pipe can fill a tank in 6 hours and another pipe can empty it in 8 hours. If both pipes are opened together, in how many hours will the tank be filled?',
        options: ['12 hours', '18 hours', '24 hours', '30 hours'],
        answerIndex: 2,
        explanation: 'Net rate = 1/6 - 1/8 = 1/24. Thus, it takes 24 hours to fill the tank.',
        marks: 10,
        negativeMarks: 2.5,
      },
      {
        prompt: 'In a certain code, COMPUTER is written as RFUVQNPC. How is MEDICINE written in that code?',
        options: ['MFEDJJOE', 'EOJDEJFM', 'MFEJDJOE', 'EOJDJEFM'],
        answerIndex: 3,
        explanation: 'Letters reversed and shifted by +1 for internal characters: EOJDJEFM.',
        marks: 10,
        negativeMarks: 2.5,
      },
      {
        prompt: 'What is the sum of all integers from 1 to 100 inclusive?',
        options: ['5000', '5050', '5100', '5150'],
        answerIndex: 1,
        explanation: 'Formula n(n+1)/2 = 100 * 101 / 2 = 5050.',
        marks: 10,
        negativeMarks: 2.5,
      },
      {
        prompt: 'Choose the word nearest in meaning to: PRAGMATIC',
        options: ['Idealistic', 'Practical', 'Theoretical', 'Hesitant'],
        answerIndex: 1,
        explanation: 'Pragmatic means dealing with things sensibly and realistically in a practical way.',
        marks: 10,
        negativeMarks: 2.5,
      },
      {
        prompt: 'Two trains 140m and 160m long run at speeds of 60 km/h and 40 km/h respectively in opposite directions. The time taken to cross each other is:',
        options: ['9.6 seconds', '10.8 seconds', '12.0 seconds', '14.4 seconds'],
        answerIndex: 1,
        explanation: 'Relative speed = 60 + 40 = 100 km/h = 100 * 5/18 = 250/9 m/s. Total distance = 300m. Time = 300 / (250/9) = 10.8 seconds.',
        marks: 10,
        negativeMarks: 2.5,
      },
    ];

    for (let i = 0; i < nqtQuestions.length; i++) {
      const q = nqtQuestions[i];
      await prisma.assessmentQuestion.create({
        data: {
          assessmentId: tcsNqt.id,
          prompt: q.prompt,
          options: q.options,
          answerIndex: q.answerIndex,
          explanation: q.explanation,
          type: 'MCQ',
          title: `Question ${i + 1}`,
          orderIndex: i,
          marks: q.marks,
          negativeMarks: q.negativeMarks,
        },
      });
    }
  }

  // 5. Create Google SDE Coding Challenge if not present
  let googleSde = await prisma.assessment.findFirst({ where: { slug: 'google-sde-challenge' } });
  if (!googleSde) {
    googleSde = await prisma.assessment.create({
      data: {
        title: 'Google SDE Coding Challenge',
        slug: 'google-sde-challenge',
        category: 'CODING',
        difficulty: 'HARD',
        durationMin: 90,
        totalMarks: 100,
        passingMarks: 70,
        isMandatory: false,
        targetBatch: '2026 Batch',
        skillsCovered: JSON.stringify(['Dynamic Programming', 'Sliding Window', 'Hash Maps', 'Time Complexity']),
        instructions: 'Duration: 90 Mins. Implement solutions passing all hidden test cases. Evaluated with Node VM runner.',
        status: 'ACTIVE',
      },
    });

    await prisma.assessmentQuestion.create({
      data: {
        assessmentId: googleSde.id,
        prompt: 'Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\n### Example:\n```\nInput: nums = [2,7,11,15], target = 9\nOutput: [0,1]\n```',
        options: [],
        answerIndex: 0,
        type: 'CODING',
        title: 'Problem 1: Two Sum Target Lookup',
        orderIndex: 0,
        marks: 50,
        codingProblemId: twoSumProblem.id,
        starterCode: twoSumProblem.starterCode,
        testCases: twoSumProblem.testCases,
        explanation: 'Use a Hash Map to achieve O(n) time complexity by storing complements.',
      },
    });

    await prisma.assessmentQuestion.create({
      data: {
        assessmentId: googleSde.id,
        prompt: 'Given a string `s`, find the length of the longest substring without repeating characters.\n\n### Example:\n```\nInput: s = "abcabcbb"\nOutput: 3 (The answer is "abc")\n```',
        options: [],
        answerIndex: 0,
        type: 'CODING',
        title: 'Problem 2: Longest Substring Without Repeating Characters',
        orderIndex: 1,
        marks: 50,
        codingProblemId: lswrcProblem.id,
        starterCode: lswrcProblem.starterCode,
        testCases: lswrcProblem.testCases,
        explanation: 'Use Sliding Window technique with a Set or Map to track character positions.',
      },
    });
  }

  // 6. Seed Learning Roadmaps
  const roadmapsData = [
    {
      title: 'Striver A2Z DSA Course',
      slug: 'striver-a2z-dsa',
      category: 'DSA',
      provider: 'TUF',
      providerBadge: 'TUF',
      badgeColor: 'slate',
      description: '450+ curated problems covering Arrays, Two Pointers, Trees, Graphs, and Dynamic Programming.',
      totalItems: 450,
      estimatedHours: 120,
      difficulty: 'INTERMEDIATE',
      tags: JSON.stringify(['DSA', 'LeetCode', 'TUF', 'Blind75']),
      initialCompleted: 270,
      modules: [
        {
          title: 'Step 1: Learn the Basics',
          orderIndex: 1,
          totalItems: 4,
          topics: JSON.stringify([
            { id: 'dsa-1-1', title: 'Things to Know in C++ / Java / Python', type: 'lesson' },
            { id: 'dsa-1-2', title: 'Build-up Logical Thinking (Patterns)', type: 'exercise' },
            { id: 'dsa-1-3', title: 'Basic Math for Competitive Programming', type: 'problem' },
            { id: 'dsa-1-4', title: 'Basic Recursion Patterns', type: 'problem' },
          ]),
        },
        {
          title: 'Step 2: Arrays & Hashing [Easy to Hard]',
          orderIndex: 2,
          totalItems: 4,
          topics: JSON.stringify([
            { id: 'dsa-2-1', title: 'Two Sum Problem', type: 'coding', codingProblemSlug: 'two-sum' },
            { id: 'dsa-2-2', title: 'Maximum Subarray (Kadane Algorithm)', type: 'problem' },
            { id: 'dsa-2-3', title: 'Sort an array of 0s, 1s and 2s (Dutch National Flag)', type: 'problem' },
            { id: 'dsa-2-4', title: 'Next Permutation', type: 'problem' },
          ]),
        },
        {
          title: 'Step 3: Sliding Window & Two Pointers',
          orderIndex: 3,
          totalItems: 3,
          topics: JSON.stringify([
            { id: 'dsa-3-1', title: 'Longest Substring Without Repeating Characters', type: 'coding', codingProblemSlug: 'longest-substring-without-repeating-characters' },
            { id: 'dsa-3-2', title: 'Max Consecutive Ones III', type: 'problem' },
            { id: 'dsa-3-3', title: 'Subarrays with K Different Integers', type: 'problem' },
          ]),
        },
      ],
    },
    {
      title: 'DataCamp SQL for Data Analysis',
      slug: 'datacamp-sql-data-analysis',
      category: 'DATABASE',
      provider: 'DataCamp',
      providerBadge: 'DC',
      badgeColor: 'blue',
      description: 'Window functions, query optimization, indexing strategies, and analytical aggregations.',
      totalItems: 40,
      estimatedHours: 25,
      difficulty: 'INTERMEDIATE',
      tags: JSON.stringify(['SQL', 'PostgreSQL', 'Query Tuning', 'Window Functions']),
      initialCompleted: 18,
      modules: [
        {
          title: 'Module 1: Advanced Aggregations & Grouping Sets',
          orderIndex: 1,
          totalItems: 3,
          topics: JSON.stringify([
            { id: 'sql-1-1', title: 'GROUP BY with ROLLUP and CUBE', type: 'lesson' },
            { id: 'sql-1-2', title: 'HAVING vs WHERE Filter Performance', type: 'exercise' },
            { id: 'sql-1-3', title: 'Conditional Aggregations using CASE WHEN', type: 'exercise' },
          ]),
        },
        {
          title: 'Module 2: Analytical Window Functions',
          orderIndex: 2,
          totalItems: 3,
          topics: JSON.stringify([
            { id: 'sql-2-1', title: 'ROW_NUMBER vs RANK vs DENSE_RANK', type: 'exercise' },
            { id: 'sql-2-2', title: 'LAG and LEAD offsets for temporal difference', type: 'exercise' },
            { id: 'sql-2-3', title: 'Running totals with SUM OVER (PARTITION BY)', type: 'exercise' },
          ]),
        },
      ],
    },
    {
      title: 'GeeksforGeeks Aptitude Preparation',
      slug: 'gfg-aptitude-prep',
      category: 'APTITUDE',
      provider: 'GeeksforGeeks',
      providerBadge: 'GFG',
      badgeColor: 'emerald',
      description: 'Permutations, Probability, Work & Time, Syllogisms, and Data Interpretation for campus qualifiers.',
      totalItems: 100,
      estimatedHours: 35,
      difficulty: 'BEGINNER',
      tags: JSON.stringify(['Aptitude', 'Quantitative', 'Reasoning', 'Campus Prep']),
      initialCompleted: 30,
      modules: [
        {
          title: 'Part 1: Quantitative Arithmetic Foundations',
          orderIndex: 1,
          totalItems: 3,
          topics: JSON.stringify([
            { id: 'apt-1-1', title: 'Work and Time Equation Shortcuts', type: 'lesson' },
            { id: 'apt-1-2', title: 'Pipes and Cisterns Net Flow', type: 'exercise' },
            { id: 'apt-1-3', title: 'Relative Speed, Trains & Boats', type: 'exercise' },
          ]),
        },
        {
          title: 'Part 2: Logical Reasoning & Syllogisms',
          orderIndex: 2,
          totalItems: 2,
          topics: JSON.stringify([
            { id: 'apt-2-1', title: 'Venn Diagram Syllogism Analysis', type: 'lesson' },
            { id: 'apt-2-2', title: 'Seating Arrangements & Blood Relations', type: 'exercise' },
          ]),
        },
      ],
    },
  ];

  for (const rData of roadmapsData) {
    let roadmap = await prisma.learningRoadmap.findUnique({ where: { slug: rData.slug } });
    if (!roadmap) {
      roadmap = await prisma.learningRoadmap.create({
        data: {
          title: rData.title,
          slug: rData.slug,
          category: rData.category,
          provider: rData.provider,
          providerBadge: rData.providerBadge,
          badgeColor: rData.badgeColor,
          description: rData.description,
          totalItems: rData.totalItems,
          estimatedHours: rData.estimatedHours,
          difficulty: rData.difficulty,
          tags: rData.tags,
        },
      });

      for (const m of rData.modules) {
        await prisma.learningModule.create({
          data: {
            roadmapId: roadmap.id,
            title: m.title,
            orderIndex: m.orderIndex,
            totalItems: m.totalItems,
            topics: m.topics,
          },
        });
      }
    }

    // Seed student progress if student exists
    if (studentId) {
      console.log('Seeding progress for student:', studentId, 'roadmap:', roadmap.id);
      const existingProg = await prisma.studentRoadmapProgress.findUnique({
        where: {
          studentProfileId_roadmapId: {
            studentProfileId: studentId,
            roadmapId: roadmap.id,
          },
        },
      });

      if (!existingProg) {
        const pct = parseFloat(((rData.initialCompleted / rData.totalItems) * 100).toFixed(1));
        await prisma.studentRoadmapProgress.create({
          data: {
            studentProfileId: studentId,
            roadmapId: roadmap.id,
            completedItems: rData.initialCompleted,
            progressPercentage: pct,
            status: 'IN_PROGRESS',
            completedTopicIds: JSON.stringify(['dsa-1-1', 'dsa-1-2', 'sql-1-1', 'apt-1-1']),
          },
        });
      }
    }
  }

  console.log('✅ Assessments & Roadmaps Seeding Completed Successfully!');
}

// Direct execution
if (process.argv[1]?.includes('seedData')) {
  seedAssessmentsAndRoadmaps()
    .catch((err) => {
      console.error('Seeding error:', err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
