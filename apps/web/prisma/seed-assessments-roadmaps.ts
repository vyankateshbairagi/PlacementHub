import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Assessments, Roadmaps, and Student Progress into Neon DB...');

  const adityaProfile = await prisma.studentProfile.findFirst({
    where: { talentPassportSlug: 'aditya-shinde' },
  });

  const priyaProfile = await prisma.studentProfile.findFirst({
    where: { talentPassportSlug: 'priya-kulkarni' },
  });

  if (!adityaProfile) {
    console.error('Aditya profile not found, aborting assessment seeding.');
    return;
  }

  // 1. Create Assessments
  const codingAssessment = await prisma.assessment.create({
    data: {
      title: 'Google & Top Tier SDE Machine Coding Qualifier',
      slug: 'google-sde-coding-qualifier',
      category: 'CODING',
      difficulty: 'HARD',
      durationMin: 90,
      totalMarks: 100,
      passingMarks: 70,
      isMandatory: false,
      skillsCovered: JSON.stringify(['Data Structures', 'Dynamic Programming', 'Graph Theory', 'Algorithms']),
      targetBatch: '2026 Batch',
      instructions: 'Solve 2 algorithmic challenges within 90 minutes. Code sandbox evaluates O(N) complexity and corner test cases.',
      status: 'ACTIVE',
      questions: {
        create: [
          {
            prompt: 'Design an LRU (Least Recently Used) cache with get(key) and put(key, value) operations running in strictly O(1) average time complexity.',
            options: ['Using Doubly Linked List + HashMap', 'Using Single Array + Linear Scan', 'Using Binary Search Tree', 'Using Stack'],
            answerIndex: 0,
            type: 'CODING',
            marks: 50,
            orderIndex: 0,
            explanation: 'Doubly Linked List allows O(1) removal and insertion at head/tail, and HashMap provides O(1) key lookups.',
          },
          {
            prompt: 'Given an array of integers heights representing the histogram bar width of 1, find the area of the largest rectangle in the histogram.',
            options: ['Monotonic Increasing Stack in O(N)', 'Brute force double loop in O(N^2)', 'Dynamic Programming in O(N^2)', 'Divide and Conquer in O(N log N)'],
            answerIndex: 0,
            type: 'CODING',
            marks: 50,
            orderIndex: 1,
            explanation: 'Monotonic stack keeps track of bar indices with increasing heights to compute width in linear time.',
          },
        ],
      },
    },
  });

  const fullstackAssessment = await prisma.assessment.create({
    data: {
      title: 'Full Stack & High-Concurrency Systems Qualifier',
      slug: 'fullstack-systems-qualifier',
      category: 'TECHNICAL_MCQ',
      difficulty: 'MEDIUM',
      durationMin: 45,
      totalMarks: 100,
      passingMarks: 60,
      isMandatory: false,
      skillsCovered: JSON.stringify(['React', 'Node.js', 'PostgreSQL', 'Redis', 'REST APIs']),
      targetBatch: '2026 Batch',
      instructions: 'Evaluates production Node.js event loop behavior, ACID isolation levels, and React 18 concurrency.',
      status: 'ACTIVE',
      questions: {
        create: [
          {
            prompt: 'Which PostgreSQL transaction isolation level prevents both dirty reads and non-repeatable reads, while allowing phantom reads?',
            options: ['Read Committed', 'Repeatable Read', 'Serializable', 'Read Uncommitted'],
            answerIndex: 1,
            type: 'MCQ',
            marks: 25,
            orderIndex: 0,
            explanation: 'Repeatable Read guarantees that any data read cannot change, preventing non-repeatable reads.',
          },
          {
            prompt: 'How does Node.js libuv threadpool handle asynchronous DNS lookups and fs operations?',
            options: ['Offloads to a default pool of 4 worker threads', 'Runs synchronously on the main V8 thread', 'Delegates directly to Linux kernel epoll without threads', 'Creates a new thread per file operation'],
            answerIndex: 0,
            type: 'MCQ',
            marks: 25,
            orderIndex: 1,
            explanation: 'libuv manages a thread pool (size UV_THREADPOOL_SIZE, default 4) for tasks that cannot be handled via non-blocking OS primitives.',
          },
          {
            prompt: 'What Redis data structure is optimal for implementing a sliding window rate limiter?',
            options: ['Sorted Set (ZSET)', 'String with INCR', 'Hash Map (HSET)', 'HyperLogLog'],
            answerIndex: 0,
            type: 'MCQ',
            marks: 25,
            orderIndex: 2,
            explanation: 'ZSET scored by Unix timestamp allows removing expired requests and querying the window count atomically.',
          },
          {
            prompt: 'In React 18, what is the primary purpose of the useDeferredValue hook?',
            options: ['Defers updating non-urgent parts of the UI while keeping the input responsive', 'Caches asynchronous fetch promises indefinitely', 'Prevents component re-renders completely', 'Runs a background Web Worker task'],
            answerIndex: 0,
            type: 'MCQ',
            marks: 25,
            orderIndex: 3,
            explanation: 'useDeferredValue allows deferring a value update until urgent updates like keyboard typing have finished.',
          },
        ],
      },
    },
  });

  const aptitudeAssessment = await prisma.assessment.create({
    data: {
      title: 'Cognitive, Numerical & Logical Reasoning Qualifier',
      slug: 'mandatory-campus-aptitude-2026',
      category: 'APTITUDE',
      difficulty: 'MEDIUM',
      durationMin: 60,
      totalMarks: 100,
      passingMarks: 60,
      isMandatory: true,
      skillsCovered: JSON.stringify(['Quantitative Aptitude', 'Logical Reasoning', 'Data Interpretation', 'Critical Thinking']),
      targetBatch: '2026 Batch',
      instructions: 'Mandatory college placement qualifier exam. Required for Day-1 campus drive eligibility.',
      status: 'ACTIVE',
      questions: {
        create: [
          {
            prompt: 'A pipe can fill a tank in 12 hours, while an outlet empties it in 20 hours. If both are opened simultaneously, in how many hours will the tank be full?',
            options: ['30 hours', '24 hours', '36 hours', '15 hours'],
            answerIndex: 0,
            type: 'MCQ',
            marks: 50,
            orderIndex: 0,
            explanation: 'Net rate = (1/12) - (1/20) = (5 - 3) / 60 = 2/60 = 1/30. So it takes 30 hours.',
          },
          {
            prompt: 'Statements: All engineers are problem solvers. Some problem solvers are designers. Conclusion: (I) Some engineers are designers. (II) Some designers are problem solvers.',
            options: ['Only (II) follows', 'Only (I) follows', 'Both (I) and (II) follow', 'Neither follows'],
            answerIndex: 0,
            type: 'MCQ',
            marks: 50,
            orderIndex: 1,
            explanation: 'Since "Some problem solvers are designers", by conversion "Some designers are problem solvers" is definitely true.',
          },
        ],
      },
    },
  });

  const cloudAssessment = await prisma.assessment.create({
    data: {
      title: 'Cloud Architecture & Kubernetes Microservices',
      slug: 'cloud-kubernetes-microservices',
      category: 'TECHNICAL_MCQ',
      difficulty: 'HARD',
      durationMin: 45,
      totalMarks: 100,
      passingMarks: 60,
      isMandatory: false,
      skillsCovered: JSON.stringify(['Docker', 'Kubernetes', 'AWS', 'Microservices', 'Distributed Systems']),
      targetBatch: '2026 Batch',
      instructions: 'Assessment on containerization, ingress routing, stateful sets, and cloud observability.',
      status: 'ACTIVE',
      questions: {
        create: [
          {
            prompt: 'What Kubernetes controller ensures that a specified number of pod replicas are running at all times?',
            options: ['ReplicaSet', 'DaemonSet', 'Job', 'StatefulSet'],
            answerIndex: 0,
            type: 'MCQ',
            marks: 50,
            orderIndex: 0,
            explanation: 'A ReplicaSet’s purpose is to maintain a stable set of replica Pods running at any given time.',
          },
          {
            prompt: 'In distributed systems, the CAP theorem states that a system cannot simultaneously guarantee:',
            options: ['Consistency, Availability, and Partition Tolerance', 'Concurrency, Authorization, and Performance', 'Computation, Allocation, and Persistence', 'Capacity, Auditing, and Protection'],
            answerIndex: 0,
            type: 'MCQ',
            marks: 50,
            orderIndex: 1,
            explanation: 'Under network partitions, a distributed store must choose between Consistency or Availability.',
          },
        ],
      },
    },
  });

  // 2. Create Assessment Attempts for Aditya
  await prisma.assessmentAttempt.create({
    data: {
      assessmentId: fullstackAssessment.id,
      studentProfileId: adityaProfile.id,
      score: 96,
      percentage: 96,
      status: 'COMPLETED',
      timeSpentSeconds: 1820,
      proctorLogs: JSON.stringify([
        { event: 'EXAM_STARTED', timestamp: new Date(Date.now() - 3600000).toISOString() },
        { event: 'AST_SANDBOX_VALIDATED', timestamp: new Date(Date.now() - 2400000).toISOString() },
        { event: 'EXAM_SUBMITTED', timestamp: new Date(Date.now() - 1800000).toISOString() },
      ]),
      answers: JSON.stringify({
        0: 1,
        1: 0,
        2: 0,
        3: 0,
      }),
    },
  });

  await prisma.assessmentAttempt.create({
    data: {
      assessmentId: aptitudeAssessment.id,
      studentProfileId: adityaProfile.id,
      score: 92,
      percentage: 92,
      status: 'COMPLETED',
      timeSpentSeconds: 2400,
      answers: JSON.stringify({
        0: 0,
        1: 0,
      }),
    },
  });

  if (priyaProfile) {
    await prisma.assessmentAttempt.create({
      data: {
        assessmentId: codingAssessment.id,
        studentProfileId: priyaProfile.id,
        score: 88,
        percentage: 88,
        status: 'COMPLETED',
        timeSpentSeconds: 3200,
        answers: JSON.stringify({ 0: 0, 1: 0 }),
      },
    });
  }

  // 3. Create Learning Roadmaps
  const dsaRoadmap = await prisma.learningRoadmap.create({
    data: {
      title: 'Striver A2Z DSA Placement Sheet',
      slug: 'striver-a2z-dsa',
      category: 'DSA',
      provider: 'TakeUForward',
      providerBadge: 'TUF',
      badgeColor: 'emerald',
      description: 'Comprehensive 450+ curated algorithmic problem sheet covering Arrays, Trees, Graphs, DP, and Tries.',
      totalItems: 450,
      estimatedHours: 80,
      difficulty: 'INTERMEDIATE',
      tags: JSON.stringify(['DSA', 'LeetCode', 'Dynamic Programming', 'Graphs', 'Blind75']),
      modules: {
        create: [
          {
            title: 'Basics & Array Fundamentals',
            description: 'Two pointers, sliding window, prefix sums, and kadane algorithm',
            orderIndex: 0,
            totalItems: 30,
            topics: JSON.stringify([
              { id: 'arr-1', title: 'Kadane Algorithm - Maximum Subarray Sum', type: 'CODING', completed: true, leetcodeUrl: 'https://leetcode.com/problems/maximum-subarray/' },
              { id: 'arr-2', title: 'Two Sum & 3-Sum Optimal Solution', type: 'CODING', completed: true, leetcodeUrl: 'https://leetcode.com/problems/3sum/' },
              { id: 'arr-3', title: 'Merge Intervals with In-Place Sorting', type: 'CODING', completed: true, leetcodeUrl: 'https://leetcode.com/problems/merge-intervals/' },
              { id: 'arr-4', title: 'Trapping Rainwater (Two Pointer Technique)', type: 'CODING', completed: true, leetcodeUrl: 'https://leetcode.com/problems/trapping-rain-water/' },
            ]),
          },
          {
            title: 'Binary Trees & BST Mastery',
            description: 'Tree traversals, Lowest Common Ancestor, and Morris Traversal',
            orderIndex: 1,
            totalItems: 40,
            topics: JSON.stringify([
              { id: 'tree-1', title: 'Diameter & Max Path Sum of Binary Tree', type: 'CODING', completed: true, leetcodeUrl: 'https://leetcode.com/problems/binary-tree-maximum-path-sum/' },
              { id: 'tree-2', title: 'Lowest Common Ancestor in Binary Tree', type: 'CODING', completed: true, leetcodeUrl: 'https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-tree/' },
              { id: 'tree-3', title: 'Serialize and Deserialize Binary Tree', type: 'CODING', completed: false, leetcodeUrl: 'https://leetcode.com/problems/serialize-and-deserialize-binary-tree/' },
            ]),
          },
          {
            title: 'Graphs & Dynamic Programming',
            description: 'Dijkstra, Bellman-Ford, Disjoint Set Union, and Knapsack variants',
            orderIndex: 2,
            totalItems: 50,
            topics: JSON.stringify([
              { id: 'dp-1', title: '0/1 Knapsack & Unbounded Knapsack', type: 'CODING', completed: true },
              { id: 'dp-2', title: 'Longest Common Subsequence & Edit Distance', type: 'CODING', completed: true },
              { id: 'graph-1', title: 'Topological Sort using Kahn Algorithm', type: 'CODING', completed: true },
              { id: 'graph-2', title: 'Shortest Path via Dijkstra with PriorityQueue', type: 'CODING', completed: false },
            ]),
          },
        ],
      },
    },
  });

  const sqlRoadmap = await prisma.learningRoadmap.create({
    data: {
      title: 'Production SQL & Database Engine Internals',
      slug: 'sql-database-internals',
      category: 'DATABASE',
      provider: 'DataCamp',
      providerBadge: 'SQL',
      badgeColor: 'blue',
      description: 'Master ACID transactions, B-Tree indexes, window functions, and query optimization for backend engineers.',
      totalItems: 60,
      estimatedHours: 35,
      difficulty: 'INTERMEDIATE',
      tags: JSON.stringify(['SQL', 'PostgreSQL', 'Indexes', 'Transactions', 'ACID']),
      modules: {
        create: [
          {
            title: 'Advanced Window Functions & CTEs',
            description: 'ROW_NUMBER, RANK, DENSE_RANK, NTILE, and recursive queries',
            orderIndex: 0,
            totalItems: 20,
            topics: JSON.stringify([
              { id: 'sql-1', title: 'Nth Highest Salary using DENSE_RANK', type: 'CODING', completed: true },
              { id: 'sql-2', title: 'Recursive CTE for Hierarchical Org Chart traversal', type: 'CODING', completed: true },
              { id: 'sql-3', title: 'Running Cumulative Totals using Window Framing', type: 'CODING', completed: true },
            ]),
          },
          {
            title: 'Query Optimization & EXPLAIN ANALYZE',
            description: 'B-Tree vs GiST vs GIN indexing, sequential scan elimination, and query planner cost models',
            orderIndex: 1,
            totalItems: 25,
            topics: JSON.stringify([
              { id: 'sql-4', title: 'Reading Postgres EXPLAIN (ANALYZE, BUFFERS) Trees', type: 'ARTICLE', completed: true },
              { id: 'sql-5', title: 'Index-Only Scans and Covering Indexes', type: 'ARTICLE', completed: true },
              { id: 'sql-6', title: 'Connection Pooling with PgBouncer', type: 'ARTICLE', completed: true },
            ]),
          },
        ],
      },
    },
  });

  const sysDesignRoadmap = await prisma.learningRoadmap.create({
    data: {
      title: 'System Design & Distributed Scalability',
      slug: 'system-design-distributed',
      category: 'SYSTEM_DESIGN',
      provider: 'ThinkBuild',
      providerBadge: 'SYS',
      badgeColor: 'purple',
      description: 'Architecting fault-tolerant microservices, horizontal sharding, rate limiters, and CDC event streams.',
      totalItems: 45,
      estimatedHours: 45,
      difficulty: 'ADVANCED',
      tags: JSON.stringify(['System Design', 'Caching', 'Load Balancers', 'Kafka', 'CDC', 'Microservices']),
      modules: {
        create: [
          {
            title: 'Distributed Caching & Concurrency',
            description: 'Cache-aside, write-through, cache stampede prevention with Redis',
            orderIndex: 0,
            totalItems: 20,
            topics: JSON.stringify([
              { id: 'sys-1', title: 'Consistent Hashing with Virtual Nodes', type: 'ARTICLE', completed: true },
              { id: 'sys-2', title: 'Designing a Scalable Rate Limiter with Redis Token Bucket', type: 'CODING', completed: true },
              { id: 'sys-3', title: 'Distributed Locking using Redlock Algorithm', type: 'ARTICLE', completed: false },
            ]),
          },
        ],
      },
    },
  });

  // 4. Create Student Roadmap Progress for Aditya
  await prisma.studentRoadmapProgress.create({
    data: {
      studentProfileId: adityaProfile.id,
      roadmapId: dsaRoadmap.id,
      completedItems: 270,
      progressPercentage: 60,
      status: 'IN_PROGRESS',
      lastActivityAt: new Date(),
    },
  });

  await prisma.studentRoadmapProgress.create({
    data: {
      studentProfileId: adityaProfile.id,
      roadmapId: sqlRoadmap.id,
      completedItems: 54,
      progressPercentage: 90,
      status: 'IN_PROGRESS',
      lastActivityAt: new Date(),
    },
  });

  await prisma.studentRoadmapProgress.create({
    data: {
      studentProfileId: adityaProfile.id,
      roadmapId: sysDesignRoadmap.id,
      completedItems: 20,
      progressPercentage: 44,
      status: 'IN_PROGRESS',
      lastActivityAt: new Date(),
    },
  });

  console.log('✅ Successfully seeded Assessments, Roadmaps, and Progress!');
}

main()
  .catch((e) => {
    console.error('Error seeding assessments and roadmaps:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

