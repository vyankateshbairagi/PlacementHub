import { PrismaClient, Role, PlacementStatus, JobType, DriveStatus, ApplicationStatus, OfferStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const connectionUrl = process.env.DATABASE_URL_POOLED || process.env.DATABASE_URL;
const prisma = new PrismaClient({
  datasources: connectionUrl ? { db: { url: connectionUrl } } : undefined,
});

const DEFAULT_PASSWORD = 'CareerOS@2026';
const passwordHash = bcrypt.hashSync(DEFAULT_PASSWORD, 12);

async function main() {
  console.log('🌱 Starting CareerOS Database Seeding with Rich Sample Data...');

  // 1. Clear existing data in topological order
  try { await prisma.authSession.deleteMany({}); } catch {}
  try { await prisma.authToken.deleteMany({}); } catch {}
  try { await prisma.authInvitation.deleteMany({}); } catch {}
  try { await prisma.profileVerificationRequest.deleteMany({}); } catch {}
  try { await prisma.assessmentAttempt.deleteMany({}); } catch {}
  try { await prisma.assessmentQuestion.deleteMany({}); } catch {}
  try { await prisma.assessment.deleteMany({}); } catch {}
  try { await prisma.studentRoadmapProgress.deleteMany({}); } catch {}
  try { await prisma.learningModule.deleteMany({}); } catch {}
  try { await prisma.learningRoadmap.deleteMany({}); } catch {}
  try { await prisma.skill.deleteMany({}); } catch {}
  await prisma.skillProof.deleteMany({});
  await prisma.interviewDebrief.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.tacieAssessment.deleteMany({});
  await prisma.codingSubmission.deleteMany({});
  await prisma.codingProblem.deleteMany({});
  await prisma.resourceItem.deleteMany({});
  await prisma.interviewExperience.deleteMany({});
  await prisma.referralPosting.deleteMany({});
  await prisma.mentorshipBooking.deleteMany({});
  await prisma.mentorshipSlot.deleteMany({});
  await prisma.jobOffer.deleteMany({});
  await prisma.interviewSchedule.deleteMany({});
  await prisma.jobApplication.deleteMany({});
  await prisma.placementDrive.deleteMany({});
  await prisma.resume.deleteMany({});
  await prisma.studentProject.deleteMany({});
  await prisma.studentExperience.deleteMany({});
  try { await prisma.studentEducation.deleteMany({}); } catch {}
  await prisma.studentProfile.deleteMany({});
  await prisma.recruiterProfile.deleteMany({});
  await prisma.facultyProfile.deleteMany({});
  await prisma.alumniProfile.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.institution.deleteMany({});

  console.log('🧹 Cleaned existing tables.');

  // 2. Create Lead Institution (Government College of Engineering, Nashik)
  const gcoen = await prisma.institution.create({
    data: {
      name: 'Government College of Engineering & Technology (GCOEN)',
      slug: 'gcoen',
      code: 'ENG-5120',
      logoUrl: 'https://images.unsplash.com/photo-1562774053-701939374585?w=150&auto=format&fit=crop&q=80',
      address: 'Samarth Nagar, Lawathe Road',
      city: 'Nashik',
      state: 'Maharashtra',
      tier: 'GROWTH',
      subscriptionStatus: 'ACTIVE',
      naacGrade: 'A++',
      nirfRank: 42,
      departments: JSON.stringify([
        'Computer Engineering',
        'Information Technology',
        'Electronics & Telecommunication',
        'Mechanical Engineering',
        'Artificial Intelligence & Data Science',
      ]),
      placementPolicy:
        'Dream Company Offer Policy: Students securing < ₹8 LPA may apply for Dream Companies (≥ ₹12 LPA). One final dream offer allowed.',
      dreamOfferThreshold: 10.0,
      superDreamThreshold: 20.0,
      maxRegularOffers: 1,
    },
  });

  console.log('🏛️ Created Institution:', gcoen.name);

  // 3. Create Super Admin (PlacementHub Founder)
  await prisma.user.create({
    data: {
      email: 'admin@thinkbuild.in',
      name: 'Vyankatesh Bairagi',
      role: Role.SUPER_ADMIN,
      passwordHash,
      phone: '+91 9075097235',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    },
  });

  // 4. Create Institute Admin (Principal)
  await prisma.user.create({
    data: {
      email: 'principal@gcoen.ac.in',
      name: 'Dr. Suresh R. Deshmukh',
      role: Role.INSTITUTE_ADMIN,
      passwordHash,
      institutionId: gcoen.id,
      avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    },
  });

  // 5. Create TPO Coordinator
  await prisma.user.create({
    data: {
      email: 'tpo@gcoen.ac.in',
      name: 'Prof. Rajesh Kulkarni',
      role: Role.TPO,
      passwordHash,
      institutionId: gcoen.id,
      phone: '+91 9075097235',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    },
  });

  // 6. Create Faculty Mentor
  const facultyUser = await prisma.user.create({
    data: {
      email: 'faculty.cs@gcoen.ac.in',
      name: 'Prof. Anita Patil',
      role: Role.FACULTY,
      passwordHash,
      institutionId: gcoen.id,
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    },
  });

  await prisma.facultyProfile.create({
    data: {
      userId: facultyUser.id,
      department: 'Computer Engineering',
      designation: 'Associate Professor & Career Mentor',
      employeeId: 'EMP-CS-042',
    },
  });

  // 7. Create Recruiters
  const googleRecruiter = await prisma.user.create({
    data: {
      email: 'recruiter.google@placementhub.org',
      name: 'Arjun Nambiar',
      role: Role.RECRUITER,
      passwordHash,
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    },
  });

  const googleRecruiterProfile = await prisma.recruiterProfile.create({
    data: {
      userId: googleRecruiter.id,
      companyName: 'Google India',
      companyLogo: 'https://www.google.com/favicon.ico',
      website: 'https://careers.google.com',
      designation: 'University Relations & Campus Hiring Lead',
      verified: true,
    },
  });

  const zomatoRecruiter = await prisma.user.create({
    data: {
      email: 'recruiter.zomato@placementhub.org',
      name: 'Rohan Mehra',
      role: Role.RECRUITER,
      passwordHash,
      avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
    },
  });

  const zomatoRecruiterProfile = await prisma.recruiterProfile.create({
    data: {
      userId: zomatoRecruiter.id,
      companyName: 'Zomato',
      companyLogo: 'https://b.zmtcdn.com/images/logo/zomato_logo_2017.png',
      website: 'https://www.zomato.com/careers',
      designation: 'Senior Technical Recruiter',
      verified: true,
    },
  });

  const msRecruiter = await prisma.user.create({
    data: {
      email: 'recruiter.ms@placementhub.org',
      name: 'Priya Rao',
      role: Role.RECRUITER,
      passwordHash,
      avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    },
  });

  const msRecruiterProfile = await prisma.recruiterProfile.create({
    data: {
      userId: msRecruiter.id,
      companyName: 'Microsoft Corporation',
      companyLogo: 'https://www.microsoft.com/favicon.ico',
      website: 'https://careers.microsoft.com',
      designation: 'University Talent Acquisition Specialist',
      verified: true,
    },
  });

  // 8. Create Alumni Mentors
  const amazonAlumniUser = await prisma.user.create({
    data: {
      email: 'alumni.amit@placementhub.org',
      name: 'Amit Joshi',
      role: Role.ALUMNI,
      passwordHash,
      institutionId: gcoen.id,
      avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
    },
  });

  const amazonAlumni = await prisma.alumniProfile.create({
    data: {
      userId: amazonAlumniUser.id,
      graduationYear: 2022,
      currentCompany: 'Amazon',
      currentRole: 'Software Development Engineer II (AWS)',
      industry: 'Cloud Infrastructure & Distributed Systems',
      linkedinUrl: 'https://linkedin.com/in/amit-joshi-dev',
      isMentorAvailable: true,
    },
  });

  const gsAlumniUser = await prisma.user.create({
    data: {
      email: 'alumni.sneha@placementhub.org',
      name: 'Sneha Verma',
      role: Role.ALUMNI,
      passwordHash,
      institutionId: gcoen.id,
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    },
  });

  const gsAlumni = await prisma.alumniProfile.create({
    data: {
      userId: gsAlumniUser.id,
      graduationYear: 2020,
      currentCompany: 'Goldman Sachs',
      currentRole: 'Vice President, Quantitative Analytics',
      industry: 'Investment Banking & FinTech',
      linkedinUrl: 'https://linkedin.com/in/sneha-verma-quant',
      isMentorAvailable: true,
    },
  });

  const airbnbAlumniUser = await prisma.user.create({
    data: {
      email: 'alumni.rohan@airbnb.com',
      name: 'Rohan Patil',
      role: Role.ALUMNI,
      passwordHash,
      institutionId: gcoen.id,
      avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
    },
  });

  const airbnbAlumni = await prisma.alumniProfile.create({
    data: {
      userId: airbnbAlumniUser.id,
      graduationYear: 2023,
      currentCompany: 'Airbnb',
      currentRole: 'Product & Analytics Lead',
      industry: 'Travel Tech & Growth Analytics',
      linkedinUrl: 'https://linkedin.com/in/rohanpatil-airbnb',
      isMentorAvailable: true,
    },
  });

  // 9. Create Students with Rich Profiles, Skill Proofs, Projects, and Experiences
  // Student 1: Aditya Shinde (Full-Stack Engineer, Placed @ Zomato, Gold Verified)
  const adityaUser = await prisma.user.create({
    data: {
      email: 'aditya.shinde@student.gcoen.ac.in',
      name: 'Aditya Shinde',
      role: Role.STUDENT,
      passwordHash,
      institutionId: gcoen.id,
      phone: '+91 9075097235',
      avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&auto=format&fit=crop&q=80',
    },
  });

  const adityaProfile = await prisma.studentProfile.create({
    data: {
      userId: adityaUser.id,
      rollNo: '21CS045',
      prn: '72149823B',
      department: 'Computer Engineering',
      course: 'B.Tech in Computer Engineering',
      graduationYear: 2026,
      cgpa: 9.24,
      backlogsCount: 0,
      gender: 'Male',
      talentPassportSlug: 'aditya-shinde',
      skills: JSON.stringify(['React', 'Next.js', 'Node.js', 'TypeScript', 'PostgreSQL', 'Docker', 'Redis', 'Go', 'System Design']),
      bio: 'Full-stack software engineer passionate about distributed microservices, low-latency API architectures, and developer tooling. Built core modules of CareerOS and won Smart India Hackathon.',
      linkedinUrl: 'https://linkedin.com/in/adityashinde-dev',
      githubUrl: 'https://github.com/adityashinde',
      portfolioUrl: 'https://adityashinde.tech',
      careerReadinessScore: 94,
      trustScore: 94,
      verifiedSkillsCount: 5,
      placementStatus: PlacementStatus.PLACED,
    },
  });

  await prisma.skillProof.createMany({
    data: [
      {
        studentProfileId: adityaProfile.id,
        canonicalSkill: 'React',
        category: 'Frontend',
        confidenceTier: 'GOLD_VERIFIED',
        sourceType: 'GITHUB_REPO (AST-Parsed)',
        locator: 'https://github.com/adityashinde/careeros-web',
        metric: '48 commits, 12 PRs merged',
        auditNote: 'High commit frequency across 2 production-grade web repositories.',
      },
      {
        studentProfileId: adityaProfile.id,
        canonicalSkill: 'Node.js',
        category: 'Backend',
        confidenceTier: 'GOLD_VERIFIED',
        sourceType: 'GITHUB_REPO (AST-Parsed)',
        locator: 'https://github.com/adityashinde/job-queue',
        metric: '35 commits, microservice architecture',
        auditNote: 'Architected distributed worker queue handling Redis streams.',
      },
      {
        studentProfileId: adityaProfile.id,
        canonicalSkill: 'PostgreSQL',
        category: 'Database',
        confidenceTier: 'GOLD_VERIFIED',
        sourceType: 'CODING_ASSESSMENT (Proctored)',
        locator: 'https://careeros.thinkbuild.in/verify/assessment/sql_01',
        metric: 'Score: 96/100, passed 15/15 test cases',
        auditNote: 'Proctored database query and schema optimization assessment passed.',
      },
      {
        studentProfileId: adityaProfile.id,
        canonicalSkill: 'Docker',
        category: 'DevOps & Cloud',
        confidenceTier: 'SILVER_VALIDATED',
        sourceType: 'GITHUB_REPO (Config Analysis)',
        locator: 'https://github.com/adityashinde/job-queue/blob/main/Dockerfile',
        metric: 'Production multi-stage Dockerfile verified',
        auditNote: 'Verified containerization and compose topology in repository.',
      },
      {
        studentProfileId: adityaProfile.id,
        canonicalSkill: 'Redis',
        category: 'Database',
        confidenceTier: 'SILVER_VALIDATED',
        sourceType: 'EVALUATED_PROJECT (Faculty Rubric)',
        locator: 'https://github.com/adityashinde/job-queue',
        metric: 'Rubric Score: 92/100',
        auditNote: 'Evaluated capstone project using Redis pub/sub and distributed locks.',
      },
      {
        studentProfileId: adityaProfile.id,
        canonicalSkill: 'TypeScript',
        category: 'Programming Language',
        confidenceTier: 'BRONZE_SELF_REPORTED',
        sourceType: 'COURSEWORK_SELF_REPORTED',
        locator: 'Profile Verification Pending',
        metric: 'Coursework Complete',
        auditNote: 'Self-reported in student profile. Complete a proctored assessment to upgrade to Gold.',
      },
    ],
  });

  await prisma.studentProject.createMany({
    data: [
      {
        studentProfileId: adityaProfile.id,
        title: 'Cloud Distributed Job Queue Engine',
        description:
          'High-throughput asynchronous task processing engine using Redis Streams and Go workers with priority scheduling.',
        techStack: 'Go, Redis, Docker, PostgreSQL',
        githubUrl: 'https://github.com/adityashinde/job-queue',
      },
      {
        studentProfileId: adityaProfile.id,
        title: 'CareerOS Talent Passport & ATS Parser',
        description:
          'Engineered ATS compatibility scoring algorithm extracting semantic keywords from LaTeX and PDF resumes.',
        techStack: 'TypeScript, Next.js, Tailwind, Neon Postgres',
        liveUrl: 'https://careeros.thinkbuild.in',
      },
    ],
  });

  await prisma.studentExperience.create({
    data: {
      studentProfileId: adityaProfile.id,
      company: 'ThinkBuild Technologies',
      role: 'Full Stack Engineering Intern',
      type: 'INTERNSHIP',
      startDate: 'Jan 2025',
      endDate: 'Present',
      description:
        'Architected high-concurrency student placement dashboard and automated eligibility filtering modules.',
    },
  });

  await prisma.resume.create({
    data: {
      studentProfileId: adityaProfile.id,
      title: 'Aditya_Shinde_SWE_FullStack_2026.pdf',
      version: 'v2.3 (ATS Optimized)',
      atsScore: 92,
      targetRole: 'Product Software Engineer',
      isDefault: true,
      fileUrl: 'https://pub-careeros.r2.dev/offers/Zomato_Offer_Aditya_Shinde.pdf',
      parsedData: JSON.stringify({
        strengths: ['Action verbs utilized', 'Metrics highlighted in ₹ and %', 'Strong tech stack match'],
        suggestions: ['Add patent or published research citation if available'],
        keywordsFound: ['System Design', 'Distributed Systems', 'PostgreSQL', 'Next.js', 'Docker', 'Redis'],
      }),
    },
  });

  // Student 2: Priya Kulkarni (IT, In-Process with Google & Zomato)
  const priyaUser = await prisma.user.create({
    data: {
      email: 'priya.kulkarni@student.gcoen.ac.in',
      name: 'Priya Kulkarni',
      role: Role.STUDENT,
      passwordHash,
      institutionId: gcoen.id,
      phone: '+91 9876543211',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
    },
  });

  const priyaProfile = await prisma.studentProfile.create({
    data: {
      userId: priyaUser.id,
      rollNo: '21IT021',
      prn: '72149855C',
      department: 'Information Technology',
      course: 'B.Tech in Information Technology',
      graduationYear: 2026,
      cgpa: 8.78,
      backlogsCount: 0,
      gender: 'Female',
      talentPassportSlug: 'priya-kulkarni',
      skills: JSON.stringify(['Java', 'Spring Boot', 'Python', 'Machine Learning', 'SQL', 'FastAPI', 'Docker']),
      bio: 'Machine learning practitioner and backend systems developer. Top 5% in national LeetCode contests, passionate about high-throughput distributed architectures.',
      linkedinUrl: 'https://linkedin.com/in/priyakulkarni-it',
      githubUrl: 'https://github.com/priyakulkarni',
      careerReadinessScore: 88,
      trustScore: 88,
      verifiedSkillsCount: 4,
      placementStatus: PlacementStatus.IN_PROCESS,
    },
  });

  await prisma.skillProof.createMany({
    data: [
      {
        studentProfileId: priyaProfile.id,
        canonicalSkill: 'Java',
        category: 'Programming Language',
        confidenceTier: 'GOLD_VERIFIED',
        sourceType: 'CODING_ASSESSMENT (Proctored)',
        locator: 'assessment:java_dsa_01',
        metric: 'Score: 92/100, passed 12/12 test cases',
        auditNote: 'Passed proctored Data Structures & Algorithms assessment in Java with optimal asymptotic complexity.',
      },
      {
        studentProfileId: priyaProfile.id,
        canonicalSkill: 'Python',
        category: 'Programming Language',
        confidenceTier: 'GOLD_VERIFIED',
        sourceType: 'GITHUB_REPO (AST-Parsed)',
        locator: 'https://github.com/priyakulkarni/ml-classifier',
        metric: '32 commits, scikit-learn models',
        auditNote: 'Built ML classification pipeline with high model accuracy and cross-validation metrics.',
      },
      {
        studentProfileId: priyaProfile.id,
        canonicalSkill: 'FastAPI',
        category: 'Backend',
        confidenceTier: 'SILVER_VALIDATED',
        sourceType: 'EVALUATED_PROJECT (Faculty Rubric)',
        locator: 'https://github.com/priyakulkarni/fastapi-backend',
        metric: 'Faculty Evaluation Rubric: 85/100',
        auditNote: 'Evaluated capstone project implementing asynchronous REST APIs with Pydantic validation.',
      },
      {
        studentProfileId: priyaProfile.id,
        canonicalSkill: 'Spring Boot',
        category: 'Backend',
        confidenceTier: 'SILVER_VALIDATED',
        sourceType: 'GITHUB_REPO (Config Analysis)',
        locator: 'https://github.com/priyakulkarni/spring-order-service',
        metric: 'Production microservice with JPA and Liquibase',
        auditNote: 'Architected scalable microservice backend handling transactional ordering workflows.',
      },
    ],
  });

  await prisma.studentProject.createMany({
    data: [
      {
        studentProfileId: priyaProfile.id,
        title: 'Distributed Real-Time Traffic & Logistics ML Predictor',
        description: 'End-to-end ML prediction pipeline ingesting live GPS sensor streams with FastAPI and Redis pub/sub.',
        techStack: 'Python, FastAPI, Redis, Docker, Scikit-learn',
        githubUrl: 'https://github.com/priyakulkarni/ml-classifier',
      },
      {
        studentProfileId: priyaProfile.id,
        title: 'Enterprise Spring Cloud Order Gateway',
        description: 'Fault-tolerant microservice gateway with circuit breaker patterns and distributed tracing.',
        techStack: 'Java, Spring Boot, PostgreSQL, Docker',
        githubUrl: 'https://github.com/priyakulkarni/spring-order-service',
      },
    ],
  });

  // Student 3: Rahul Deshmukh (Computer Eng, Actively seeking placement)
  const rahulUser = await prisma.user.create({
    data: {
      email: 'rahul.deshmukh@student.gcoen.ac.in',
      name: 'Rahul Deshmukh',
      role: Role.STUDENT,
      passwordHash,
      institutionId: gcoen.id,
      phone: '+91 9876543222',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
    },
  });

  const rahulProfile = await prisma.studentProfile.create({
    data: {
      userId: rahulUser.id,
      rollNo: '21CS089',
      prn: '72149899A',
      department: 'Computer Engineering',
      course: 'B.Tech in Computer Engineering',
      graduationYear: 2026,
      cgpa: 7.45,
      backlogsCount: 0,
      gender: 'Male',
      talentPassportSlug: 'rahul-deshmukh',
      skills: JSON.stringify(['JavaScript', 'React', 'Node.js', 'Express', 'MongoDB', 'Python']),
      bio: 'Enthusiastic web developer preparing for campus placements. Practicing DSA and full-stack development daily on CareerOS.',
      linkedinUrl: 'https://linkedin.com/in/rahuldeshmukh',
      githubUrl: 'https://github.com/rahuldeshmukh',
      careerReadinessScore: 72,
      trustScore: 70,
      verifiedSkillsCount: 2,
      placementStatus: PlacementStatus.UNPLACED,
    },
  });

  await prisma.skillProof.createMany({
    data: [
      {
        studentProfileId: rahulProfile.id,
        canonicalSkill: 'React',
        category: 'Frontend',
        confidenceTier: 'GOLD_VERIFIED',
        sourceType: 'GITHUB_REPO (AST-Parsed)',
        locator: 'https://github.com/rahuldeshmukh/portfolio-web',
        metric: '24 commits, responsive design',
        auditNote: 'Built clean responsive frontend portfolio using modern React hooks and Tailwind CSS.',
      },
      {
        studentProfileId: rahulProfile.id,
        canonicalSkill: 'Node.js',
        category: 'Backend',
        confidenceTier: 'SILVER_VALIDATED',
        sourceType: 'EVALUATED_PROJECT (Faculty Rubric)',
        locator: 'https://github.com/rahuldeshmukh/express-api',
        metric: 'Faculty Evaluation Rubric: 78/100',
        auditNote: 'Evaluated backend API with JWT authentication and modular router structure.',
      },
    ],
  });

  await prisma.studentProject.create({
    data: {
      studentProfileId: rahulProfile.id,
      title: 'Campus Peer Resource & Notes Sharing Hub',
      description: 'Collaborative document sharing and search platform for engineering study materials.',
      techStack: 'React, Node.js, Express, MongoDB',
      githubUrl: 'https://github.com/rahuldeshmukh/campus-hub',
    },
  });

  // Student 4: Pooja Patil (ENTC, Shortlisted for Core / IoT)
  const poojaUser = await prisma.user.create({
    data: {
      email: 'pooja.patil@student.gcoen.ac.in',
      name: 'Pooja Patil',
      role: Role.STUDENT,
      passwordHash,
      institutionId: gcoen.id,
      avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80',
    },
  });

  const poojaProfile = await prisma.studentProfile.create({
    data: {
      userId: poojaUser.id,
      rollNo: '21ET014',
      prn: '72149712D',
      department: 'Electronics & Telecommunication',
      course: 'B.Tech in Electronics & Telecommunication',
      graduationYear: 2026,
      cgpa: 6.82,
      backlogsCount: 0,
      gender: 'Female',
      talentPassportSlug: 'pooja-patil',
      skills: JSON.stringify(['Embedded C', 'IoT', 'Microcontrollers', 'Python', 'MATLAB', 'VLSI']),
      bio: 'Electronics & Embedded Systems enthusiast with hands-on IoT firmware engineering experience.',
      careerReadinessScore: 68,
      trustScore: 68,
      verifiedSkillsCount: 2,
      placementStatus: PlacementStatus.UNPLACED,
    },
  });

  await prisma.skillProof.createMany({
    data: [
      {
        studentProfileId: poojaProfile.id,
        canonicalSkill: 'Embedded C',
        category: 'Embedded Systems',
        confidenceTier: 'GOLD_VERIFIED',
        sourceType: 'CODING_ASSESSMENT (Proctored)',
        locator: 'assessment:embedded_c_01',
        metric: 'Score: 88/100, hardware simulation passed',
        auditNote: 'Proctored microcontroller programming assessment on register manipulation and timer interrupts.',
      },
      {
        studentProfileId: poojaProfile.id,
        canonicalSkill: 'IoT',
        category: 'Hardware & Systems',
        confidenceTier: 'SILVER_VALIDATED',
        sourceType: 'EVALUATED_PROJECT (Faculty Rubric)',
        locator: 'https://github.com/poojapatil/iot-agro-mesh',
        metric: 'Hardware Lab Rubric: 82/100',
        auditNote: 'Evaluated capstone project using ESP32 sensor mesh and MQTT broker.',
      },
    ],
  });

  // Student 5 & 6: Additional students for TPO batch ranking
  const rahulVermaUser = await prisma.user.create({
    data: {
      email: 'rahul.verma@student.gcoen.ac.in',
      name: 'Rahul Verma',
      role: Role.STUDENT,
      passwordHash,
      institutionId: gcoen.id,
      avatarUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&auto=format&fit=crop&q=80',
    },
  });

  const rahulVermaProfile = await prisma.studentProfile.create({
    data: {
      userId: rahulVermaUser.id,
      rollNo: '21IT055',
      prn: '72149811X',
      department: 'Information Technology',
      course: 'B.Tech in Information Technology',
      graduationYear: 2026,
      cgpa: 8.42,
      backlogsCount: 0,
      gender: 'Male',
      talentPassportSlug: 'rahul-verma',
      skills: JSON.stringify(['Go', 'Linux', 'Docker', 'Kubernetes', 'Python']),
      bio: 'Cloud infrastructure and systems programming enthusiast.',
      careerReadinessScore: 82,
      trustScore: 80,
      verifiedSkillsCount: 3,
      placementStatus: PlacementStatus.UNPLACED,
    },
  });

  const priyaNairUser = await prisma.user.create({
    data: {
      email: 'priya.nair@student.gcoen.ac.in',
      name: 'Priya Nair',
      role: Role.STUDENT,
      passwordHash,
      institutionId: gcoen.id,
      avatarUrl: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=200&auto=format&fit=crop&q=80',
    },
  });

  const priyaNairProfile = await prisma.studentProfile.create({
    data: {
      userId: priyaNairUser.id,
      rollNo: '21CS034',
      prn: '72149877Y',
      department: 'Computer Engineering',
      course: 'B.Tech in Computer Engineering',
      graduationYear: 2026,
      cgpa: 8.65,
      backlogsCount: 0,
      gender: 'Female',
      talentPassportSlug: 'priya-nair',
      skills: JSON.stringify(['Python', 'SQL', 'Apache Spark', 'Data Engineering', 'TypeScript']),
      bio: 'Big data engineer passionate about distributed data pipelines and analytical modeling.',
      careerReadinessScore: 86,
      trustScore: 85,
      verifiedSkillsCount: 3,
      placementStatus: PlacementStatus.UNPLACED,
    },
  });


  // 10. Create Comprehensive Placement Drives (Super Dream, Dream, Core, On-Campus & Off-Campus)
  const msDrive = await prisma.placementDrive.create({
    data: {
      institutionId: gcoen.id,
      recruiterId: msRecruiterProfile.id,
      companyName: 'Microsoft Corporation',
      companyLogo: 'https://www.microsoft.com/favicon.ico',
      roleTitle: 'Software Engineer Intern & FTE (Azure Core)',
      jobType: JobType.ON_CAMPUS,
      jobCategory: 'TECH',
      description:
        'Design highly resilient cloud control planes and high-throughput microservices using C#/.NET, Go, and Kubernetes across Azure Core infrastructure.',
      ctc: '₹51.0 LPA',
      ctcAmount: 51.0,
      isDreamCompany: true,
      isSuperDream: true,
      requiredSkills: JSON.stringify(['C#', 'Cloud', 'Azure', 'Microservices', 'Distributed Systems']),
      preferredSkills: JSON.stringify(['Kubernetes', 'Go', 'High Concurrency', 'Linux Internals']),
      source: 'ON_CAMPUS',
      stipend: '₹1,25,000/mo',
      location: 'Bengaluru / Hyderabad',
      deadline: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
      driveDate: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000),
      minCgpa: 8.0,
      maxBacklogs: 0,
      eligibleBranches: JSON.stringify([
        'Computer Engineering',
        'Information Technology',
        'Artificial Intelligence & Data Science',
      ]),
      selectionRounds: JSON.stringify([
        'Codility Online Assessment (3 Coding Questions)',
        'Technical Round 1 (Data Structures & Concurrency)',
        'Technical Round 2 (Distributed Systems Architecture)',
        'Director / AA Interview (Microsoft Cultural Alignment)',
      ]),
      status: DriveStatus.ACTIVE,
    },
  });

  const googleDrive = await prisma.placementDrive.create({
    data: {
      institutionId: gcoen.id,
      recruiterId: googleRecruiterProfile.id,
      companyName: 'Google India',
      companyLogo: 'https://www.google.com/favicon.ico',
      roleTitle: 'Associate Software Engineer (STEP & University)',
      jobType: JobType.ON_CAMPUS,
      jobCategory: 'TECH',
      description:
        'Join Google engineering teams in Bengaluru and Hyderabad building globally scalable search, cloud, and Android products.',
      ctc: '₹54.5 LPA',
      ctcAmount: 54.5,
      isDreamCompany: true,
      isSuperDream: true,
      requiredSkills: JSON.stringify(['Data Structures & Algorithms', 'System Design', 'Python', 'Java']),
      preferredSkills: JSON.stringify(['Distributed Systems', 'GCP', 'Kubernetes']),
      source: 'ON_CAMPUS',
      stipend: '₹1,10,000/mo',
      location: 'Bengaluru / Hyderabad',
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      driveDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      minCgpa: 8.5,
      maxBacklogs: 0,
      eligibleBranches: JSON.stringify([
        'Computer Engineering',
        'Information Technology',
        'Artificial Intelligence & Data Science',
      ]),
      selectionRounds: JSON.stringify([
        'Google OA (HackerEarth)',
        'Technical Round 1 (DSA)',
        'Technical Round 2 (System Design)',
        'Googliness & Leadership',
      ]),
      status: DriveStatus.ACTIVE,
    },
  });

  const atlassianDrive = await prisma.placementDrive.create({
    data: {
      institutionId: gcoen.id,
      companyName: 'Atlassian India',
      companyLogo: 'https://www.atlassian.com/favicon.ico',
      roleTitle: 'Associate SDE - Cloud Ecosystem & Jira Platform',
      jobType: JobType.ON_CAMPUS,
      jobCategory: 'TECH',
      description:
        'Engineer multi-tenant collaboration architectures, real-time sync engines, and developer extensibility platforms powering Jira and Confluence.',
      ctc: '₹26.5 LPA',
      ctcAmount: 26.5,
      isDreamCompany: true,
      isSuperDream: true,
      requiredSkills: JSON.stringify(['Java', 'Distributed Systems', 'React', 'AWS']),
      preferredSkills: JSON.stringify(['Microservices', 'GraphQL', 'Kafka']),
      source: 'ON_CAMPUS',
      stipend: '₹80,000/mo',
      location: 'Bengaluru (Remote-First)',
      deadline: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000),
      driveDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      minCgpa: 7.5,
      maxBacklogs: 0,
      eligibleBranches: JSON.stringify(['Computer Engineering', 'Information Technology', 'Artificial Intelligence & Data Science']),
      selectionRounds: JSON.stringify(['Online Assessment', 'Machine Coding Round', 'System Design', 'Values & Culture']),
      status: DriveStatus.ACTIVE,
    },
  });

  const razorpayDrive = await prisma.placementDrive.create({
    data: {
      institutionId: gcoen.id,
      companyName: 'Razorpay Technologies',
      companyLogo: 'https://razorpay.com/favicon.ico',
      roleTitle: 'FinTech Backend Systems Engineer',
      jobType: JobType.ON_CAMPUS,
      jobCategory: 'TECH',
      description:
        'Build high-concurrency payment gateways, settlement pipelines, and neo-banking ledger services processing billions in transaction volume.',
      ctc: '₹22.0 LPA',
      ctcAmount: 22.0,
      isDreamCompany: true,
      isSuperDream: true,
      requiredSkills: JSON.stringify(['Go', 'PostgreSQL', 'Redis', 'Kafka', 'Microservices']),
      preferredSkills: JSON.stringify(['Distributed Transactions', 'Docker', 'AWS']),
      source: 'ON_CAMPUS',
      stipend: '₹60,000/mo',
      location: 'Bengaluru',
      deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      minCgpa: 7.5,
      maxBacklogs: 0,
      eligibleBranches: JSON.stringify(['Computer Engineering', 'Information Technology']),
      selectionRounds: JSON.stringify(['OA', 'Technical Architecture Round', 'Director Interview']),
      status: DriveStatus.ACTIVE,
    },
  });

  const zomatoDrive = await prisma.placementDrive.create({
    data: {
      institutionId: gcoen.id,
      recruiterId: zomatoRecruiterProfile.id,
      companyName: 'Zomato',
      companyLogo: 'https://b.zmtcdn.com/images/logo/zomato_logo_2017.png',
      roleTitle: 'Associate Product Engineer',
      jobType: JobType.ON_CAMPUS,
      jobCategory: 'PRODUCT',
      description:
        'Build hyper-local delivery algorithms, rider assignment systems, and high-conversion customer interfaces serving 10M+ orders daily.',
      ctc: '₹18.0 LPA',
      ctcAmount: 18.0,
      isDreamCompany: true,
      isSuperDream: false,
      requiredSkills: JSON.stringify(['Node.js', 'React', 'PostgreSQL', 'Redis']),
      preferredSkills: JSON.stringify(['Docker', 'High Concurrency Architecture', 'Microservices']),
      source: 'ON_CAMPUS',
      stipend: '₹45,000/mo',
      location: 'Gurugram, NCR (Hybrid)',
      deadline: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      driveDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      minCgpa: 7.5,
      maxBacklogs: 0,
      eligibleBranches: JSON.stringify([
        'Computer Engineering',
        'Information Technology',
        'Electronics & Telecommunication',
        'Artificial Intelligence & Data Science',
      ]),
      selectionRounds: JSON.stringify(['Machine Coding Test', 'Technical Architecture Round', 'Director Interview']),
      status: DriveStatus.ACTIVE,
    },
  });

  const deloitteDrive = await prisma.placementDrive.create({
    data: {
      institutionId: gcoen.id,
      companyName: 'Deloitte',
      companyLogo: 'https://www.deloitte.com/favicon.ico',
      roleTitle: 'Data Analyst & Enterprise Intelligence',
      jobType: JobType.ON_CAMPUS,
      jobCategory: 'TECH',
      description:
        'Analyze enterprise business intelligence datasets, construct predictive statistical models, and build automated reporting pipelines across global advisory engagements.',
      ctc: '₹14.5 LPA',
      ctcAmount: 14.5,
      isDreamCompany: true,
      isSuperDream: false,
      requiredSkills: JSON.stringify(['SQL', 'Python', 'PowerBI', 'Tableau']),
      preferredSkills: JSON.stringify(['Data Warehousing', 'AWS S3', 'Statistics']),
      source: 'ON_CAMPUS',
      stipend: '₹40,000/mo',
      location: 'Bengaluru / Hyderabad',
      deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      minCgpa: 7.0,
      maxBacklogs: 0,
      eligibleBranches: JSON.stringify(['Computer Engineering', 'Information Technology', 'Electronics & Telecommunication', 'Artificial Intelligence & Data Science']),
      selectionRounds: JSON.stringify(['Aptitude & SQL Assessment', 'Technical Round', 'Partner Round']),
      status: DriveStatus.ACTIVE,
    },
  });

  const amazonDrive = await prisma.placementDrive.create({
    data: {
      institutionId: gcoen.id,
      companyName: 'Amazon AWS',
      companyLogo: 'https://aws.amazon.com/favicon.ico',
      roleTitle: 'Cloud Support Associate',
      jobType: JobType.ON_CAMPUS,
      jobCategory: 'TECH',
      description:
        'Support enterprise customers on AWS cloud architecture, troubleshooting VPC, EC2, and distributed storage systems.',
      ctc: '₹18.0 LPA',
      ctcAmount: 18.0,
      isDreamCompany: true,
      isSuperDream: false,
      requiredSkills: JSON.stringify(['Linux', 'Networking', 'AWS', 'Python']),
      preferredSkills: JSON.stringify(['CloudFormation', 'Docker', 'DNS']),
      source: 'ON_CAMPUS',
      stipend: '₹50,000/mo',
      location: 'Hyderabad / Pune',
      deadline: new Date(Date.now() + 11 * 24 * 60 * 60 * 1000),
      minCgpa: 7.5,
      maxBacklogs: 0,
      eligibleBranches: JSON.stringify(['Computer Engineering', 'Information Technology', 'Electronics & Telecommunication']),
      selectionRounds: JSON.stringify(['Online Assessment', 'Technical Round 1', 'Leadership Principles Interview']),
      status: DriveStatus.ACTIVE,
    },
  });

  const tcsDrive = await prisma.placementDrive.create({
    data: {
      institutionId: gcoen.id,
      companyName: 'Tata Consultancy Services',
      companyLogo: 'https://www.tcs.com/content/dam/global-tcs/en/images/home/tcs-logo-1.svg',
      roleTitle: 'TCS Prime / Digital Software Developer',
      jobType: JobType.ON_CAMPUS,
      jobCategory: 'TECH',
      description:
        'National Qualifier Test (NQT) hiring for high-demand digital and cloud transformation projects across banking, aviation, and healthcare.',
      ctc: '₹9.0 LPA',
      ctcAmount: 9.0,
      isDreamCompany: false,
      isSuperDream: false,
      requiredSkills: JSON.stringify(['Java', 'SQL', 'Data Structures', 'Web Development']),
      preferredSkills: JSON.stringify(['Cloud Basics', 'Spring Boot']),
      source: 'ON_CAMPUS',
      stipend: '₹25,000/mo',
      location: 'Pune / Mumbai / Pan-India',
      deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      driveDate: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000),
      minCgpa: 6.5,
      maxBacklogs: 0,
      eligibleBranches: JSON.stringify([
        'Computer Engineering',
        'Information Technology',
        'Electronics & Telecommunication',
        'Mechanical Engineering',
        'Artificial Intelligence & Data Science',
      ]),
      selectionRounds: JSON.stringify(['TCS NQT Cognitive + Coding', 'Technical Interview', 'HR Round']),
      status: DriveStatus.ACTIVE,
    },
  });

  const tataElxsiDrive = await prisma.placementDrive.create({
    data: {
      institutionId: null, // Global Off-Campus via ThinkBuild Crack Off-Campus
      companyName: 'Tata Elxsi',
      companyLogo: 'https://tataelxsi.com/favicon.ico',
      roleTitle: 'Embedded Software Engineer (Automotive / IoT)',
      jobType: JobType.OFF_CAMPUS,
      jobCategory: 'CORE',
      description:
        'Specialized hiring for Autonomous Driving, ADAS, and connected vehicle infotainment software engineering.',
      ctc: '₹7.5 LPA',
      ctcAmount: 7.5,
      isDreamCompany: false,
      isSuperDream: false,
      requiredSkills: JSON.stringify(['Embedded C', 'IoT', 'Microcontrollers', 'C++']),
      preferredSkills: JSON.stringify(['RTOS', 'CAN Protocol']),
      source: 'ALUMNI_REFERRAL',
      location: 'Pune / Bengaluru',
      deadline: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
      minCgpa: 6.5,
      maxBacklogs: 1,
      eligibleBranches: JSON.stringify([
        'Electronics & Telecommunication',
        'Computer Engineering',
        'Information Technology',
      ]),
      selectionRounds: JSON.stringify(['Aptitude & Technical OA', 'Domain Interview', 'HR']),
      status: DriveStatus.ACTIVE,
    },
  });

  const infosysDrive = await prisma.placementDrive.create({
    data: {
      institutionId: gcoen.id,
      companyName: 'Infosys',
      companyLogo: 'https://www.infosys.com/favicon.ico',
      roleTitle: 'Frontend & Systems Developer',
      jobType: JobType.ON_CAMPUS,
      jobCategory: 'TECH',
      description:
        'Build responsive modern user interfaces, optimize web performance metrics, and contribute to enterprise React component ecosystems.',
      ctc: '₹9.0 LPA',
      ctcAmount: 9.0,
      isDreamCompany: false,
      isSuperDream: false,
      requiredSkills: JSON.stringify(['React', 'TypeScript', 'Tailwind CSS', 'Next.js']),
      preferredSkills: JSON.stringify(['Redux', 'Jest', 'CI/CD']),
      source: 'ON_CAMPUS',
      stipend: '₹45,000/mo',
      location: 'Pune / Bengaluru / Hybrid',
      deadline: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
      minCgpa: 6.5,
      maxBacklogs: 0,
      eligibleBranches: JSON.stringify(['Computer Engineering', 'Information Technology']),
      selectionRounds: JSON.stringify(['Online Assessment', 'Technical Interview', 'HR']),
      status: DriveStatus.ACTIVE,
    },
  });

  console.log('💼 Created Placement Drives in Neon DB (On-Campus & Off-Campus)');

  // 11. Create Real Applications & Offers
  // Aditya Shinde -> Zomato (Selected & Offer Accepted)
  const adityaZomatoApp = await prisma.jobApplication.create({
    data: {
      studentProfileId: adityaProfile.id,
      driveId: zomatoDrive.id,
      status: ApplicationStatus.OFFERED,
      fitScore: 94,
      matchTier: 'STRONG_MATCH',
      verifiedProofSummary:
        'Gold: React (48 commits), Node.js (35 commits), PostgreSQL (96/100 assessment); Silver: Redis (evaluated capstone), Docker (containerized repo)',
      currentRoundIndex: 2,
      stageNotes: 'Exemplary machine coding performance. Solved LRU cache and rate limiter under 45 mins.',
    },
  });

  await prisma.jobOffer.create({
    data: {
      applicationId: adityaZomatoApp.id,
      studentProfileId: adityaProfile.id,
      companyName: 'Zomato Limited',
      roleTitle: 'Associate Product Engineer',
      ctc: '₹18.0 LPA',
      offerLetterUrl: 'https://pub-careeros.r2.dev/offers/Zomato_Offer_Aditya_Shinde.pdf',
      status: OfferStatus.ACCEPTED,
    },
  });

  // Priya Kulkarni -> Google (In Interview stage)
  const priyaGoogleApp = await prisma.jobApplication.create({
    data: {
      studentProfileId: priyaProfile.id,
      driveId: googleDrive.id,
      status: ApplicationStatus.INTERVIEW,
      fitScore: 88,
      matchTier: 'STRONG_MATCH',
      verifiedProofSummary:
        'Gold: Java (92/100 DSA assessment), Python (32 commits ML repo); Silver: FastAPI (85/100 capstone)',
      currentRoundIndex: 2,
      stageNotes: 'Cleared Online Assessment with 100% test cases. Scheduled for Technical Round 2.',
    },
  });

  await prisma.interviewSchedule.create({
    data: {
      applicationId: priyaGoogleApp.id,
      roundName: 'Technical Round 2: Data Structures & System Algorithms',
      scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      meetingLink: 'https://meet.google.com/xyz-careeros-interview',
      interviewerName: 'Dr. Vikram Sen (Google Staff Engineer)',
      status: 'SCHEDULED',
    },
  });

  // Rahul Deshmukh -> TCS (Applied)
  await prisma.jobApplication.create({
    data: {
      studentProfileId: rahulProfile.id,
      driveId: tcsDrive.id,
      status: ApplicationStatus.APPLIED,
      fitScore: 78,
      matchTier: 'POTENTIAL_MATCH',
      verifiedProofSummary: 'Gold: React (24 commits portfolio); Silver: Node.js (78/100 capstone)',
      stageNotes: 'Application submitted. Eligible per CGPA criteria.',
    },
  });

  // Pooja Patil -> Tata Elxsi (Shortlisted)
  await prisma.jobApplication.create({
    data: {
      studentProfileId: poojaProfile.id,
      driveId: tataElxsiDrive.id,
      status: ApplicationStatus.SHORTLISTED,
      fitScore: 82,
      matchTier: 'STRONG_MATCH',
      verifiedProofSummary: 'Verified coursework & projects: Embedded C, IoT, Microcontrollers',
      stageNotes: 'Profile matches Embedded C and IoT criteria.',
    },
  });

  // 12. Student Opportunity Submissions & Alumni Referrals (ReferralPosting)
  await prisma.referralPosting.createMany({
    data: [
      {
        studentProfileId: rahulVermaProfile.id,
        postedByName: 'Rahul Verma',
        postedByEmail: 'rahul.verma@student.gcoen.ac.in',
        company: 'Stripe India',
        jobTitle: 'Software Engineer - Infrastructure',
        experienceRequired: '0-1 Years / 2026 Batch',
        location: 'Bengaluru / Remote',
        ctc: '₹28.0 LPA',
        applyUrl: 'https://stripe.com/jobs/new-grad-2026',
        status: 'PENDING',
        rewardPoints: 50,
        referralNotes:
          'Stripe new graduate hiring for global payment network infrastructure. Focus on Linux systems and concurrency.',
      },
      {
        postedByName: 'Naman Mani',
        postedByEmail: 'naman.mani@niituniversity.in',
        company: 'Databricks',
        jobTitle: 'Core Systems Resident Engineer',
        experienceRequired: 'Freshers / 2026 Batch',
        location: 'Bengaluru / Hybrid',
        ctc: '₹36.0 LPA',
        applyUrl: 'https://databricks.com/company/careers',
        status: 'APPROVED',
        rewardPoints: 100,
        referralNotes:
          'Apache Spark engine optimization, C++ memory management, and distributed query execution.',
      },
      {
        studentProfileId: priyaNairProfile.id,
        postedByName: 'Priya Nair',
        postedByEmail: 'priya.nair@student.gcoen.ac.in',
        company: 'Palantir Technologies',
        jobTitle: 'Forward Deployed Software Engineer',
        experienceRequired: '0-1 Years / 2026 Batch',
        location: 'Bengaluru',
        ctc: '₹32.0 LPA',
        applyUrl: 'https://palantir.com/careers',
        status: 'PENDING',
        rewardPoints: 75,
        referralNotes:
          'Complex data architecture, ontology integration, and direct client engineering problem solving.',
      },
      {
        alumniProfileId: airbnbAlumni.id,
        postedByName: 'Rohan Patil (Alumni 2023)',
        postedByEmail: 'alumni.rohan@airbnb.com',
        company: 'Airbnb',
        jobTitle: 'Product Analyst Intern',
        experienceRequired: 'Final Year / Intern',
        location: 'Remote',
        ctc: '₹85,000 / mo',
        applyUrl: 'https://careers.airbnb.com',
        status: 'APPROVED',
        rewardPoints: 75,
        referralNotes:
          'I am referring GCOEN students with strong SQL modeling and quantitative intuition. Ping me on CareerOS.',
      },
      {
        alumniProfileId: amazonAlumni.id,
        postedByName: 'Amit Joshi (Alumni 2022)',
        postedByEmail: 'alumni.amit@placementhub.org',
        company: 'Amazon Web Services (AWS)',
        jobTitle: 'Software Development Engineer I (Cloud Storage)',
        experienceRequired: '0-1 Years / 2026 Batch',
        location: 'Pune / Hyderabad',
        ctc: '₹18.0 LPA',
        applyUrl: 'https://amazon.jobs/en/jobs/2819401',
        status: 'APPROVED',
        rewardPoints: 100,
        referralNotes:
          'Direct referral for AWS S3 and DynamoDB distributed storage engineering. Send your ATS resume on CareerOS.',
      },
      {
        postedByName: 'Priya Sharma',
        postedByEmail: 'priya.sharma@student.gcoen.ac.in',
        company: 'Swiggy',
        jobTitle: 'Frontend SDE Intern',
        experienceRequired: 'Final Year Intern',
        location: 'Bengaluru / Hybrid',
        ctc: '₹60,000 / mo',
        applyUrl: 'https://careers.swiggy.com',
        status: 'APPROVED',
        rewardPoints: 50,
        referralNotes:
          'React web platform team building high-performance customer-facing interfaces.',
      },
      {
        postedByName: 'Sneha Kulkarni',
        postedByEmail: 'sneha.kulkarni@student.gcoen.ac.in',
        company: 'Zomato',
        jobTitle: 'Marketing & Operations Intern',
        experienceRequired: 'Internship',
        location: 'Gurugram',
        ctc: '₹35,000 / mo',
        applyUrl: 'https://zomato.com/careers',
        status: 'APPROVED',
        rewardPoints: 50,
        referralNotes:
          'Fast-paced consumer growth and local dining campaign analytics.',
      },
      {
        postedByName: 'Aditya Jadhav',
        postedByEmail: 'aditya.jadhav@student.gcoen.ac.in',
        company: 'Ola',
        jobTitle: 'Business Development & Charging Grid Intern',
        experienceRequired: 'Internship',
        location: 'Bengaluru',
        ctc: '₹40,000 / mo',
        applyUrl: 'https://olaelectric.com/careers',
        status: 'APPROVED',
        rewardPoints: 50,
        referralNotes:
          'Electric mobility infrastructure operations and fleet supply forecasting.',
      },
    ],
  });

  console.log('🔗 Seeded Student & Alumni Opportunity Submissions');

  // 13. Alumni Mentorship Slots & Bookings
  const slot1 = await prisma.mentorshipSlot.create({
    data: {
      alumniProfileId: amazonAlumni.id,
      topic: 'Crack Amazon & FAANG SDE Technical Coding Rounds',
      description:
        '1:1 45-minute live mock coding interview focusing on Graphs, Dynamic Programming, and clean architectural code.',
      durationMinutes: 45,
      date: 'Tomorrow',
      timeSlot: '7:30 PM - 8:15 PM IST',
      isBooked: false,
    },
  });

  const slot2 = await prisma.mentorshipSlot.create({
    data: {
      alumniProfileId: gsAlumni.id,
      topic: 'FinTech Quant & Product Architecture Career Roadmap',
      description:
        'Insights into Quantitative Development roles at global investment banks, high-frequency trading systems, and resume tuning.',
      durationMinutes: 45,
      date: 'This Saturday',
      timeSlot: '5:00 PM - 5:45 PM IST',
      isBooked: true,
    },
  });

  await prisma.mentorshipBooking.create({
    data: {
      slotId: slot2.id,
      studentProfileId: priyaProfile.id,
      meetingLink: 'https://meet.google.com/gs-alumni-priya',
      studentNotes: 'Interested in mathematical modeling and distributed trading architecture.',
      status: 'CONFIRMED',
    },
  });

  // 14. Real Interview Debriefs (Crowdsourced Question Bank for Interview Vault)
  await prisma.interviewDebrief.createMany({
    data: [
      {
        studentProfileId: priyaProfile.id,
        candidateName: 'Priya Kulkarni',
        companyName: 'Google India',
        roleTitle: 'Software Engineer (University Graduate)',
        roundType: 'Round 1: Online Assessment (Coding)',
        difficulty: 'Hard',
        questionsAsked: JSON.stringify([
          'Given a directed acyclic graph representing task dependencies with runtimes, compute minimum time to finish all tasks with k parallel workers.',
          'Find the subarray with given bitwise XOR sum closest to target using prefix tries.',
        ]),
        tips: 'Time complexity must be strictly optimal (O(V+E) or O(N log N)). Edge cases with disconnected components will TLE unless handled with memoized DP.',
        outcome: 'SELECTED',
      },
      {
        studentProfileId: priyaProfile.id,
        candidateName: 'Priya Kulkarni',
        companyName: 'Google India',
        roleTitle: 'Software Engineer',
        roundType: 'Round 2: Technical Interview (DSA & Trees)',
        difficulty: 'Hard',
        questionsAsked: JSON.stringify([
          'Serialize and deserialize a k-ary tree with variable length children under strict memory constraints.',
          'Design an in-memory inverted index supporting fuzzy prefix search.',
        ]),
        tips: 'Always state edge conditions out loud and clarify inputs before coding. Clean variable names and modular functions earn high Googliness points.',
        outcome: 'PENDING',
      },
      {
        studentProfileId: adityaProfile.id,
        candidateName: 'Aditya Shinde',
        companyName: 'Zomato',
        roleTitle: 'Associate Product Engineer',
        roundType: 'Round 1: Machine Coding (Live)',
        difficulty: 'Medium',
        questionsAsked: JSON.stringify([
          'Design an in-memory Sliding Window Rate Limiter supporting configurable window sizes (e.g. 100 req/min) per client API key.',
          'Implement thread-safe token bucket eviction and mock clock injection for unit testing.',
        ]),
        tips: 'Focus on concurrency primitives (Mutex / Sync primitives) and modular object-oriented classes with clean separation.',
        outcome: 'OFFERED',
      },
      {
        studentProfileId: adityaProfile.id,
        candidateName: 'Aditya Shinde',
        companyName: 'Zomato',
        roleTitle: 'Associate Product Engineer',
        roundType: 'Round 2: Systems & Database Architecture',
        difficulty: 'Medium',
        questionsAsked: JSON.stringify([
          'How would you handle sudden flash sale spikes on New Years Eve with 10M orders/day?',
          'Database indexing trade-offs between B-Trees and Hash Indexes under heavy write contention.',
          'Sliding expiration caching with Redis and Cache Stampede prevention.',
        ]),
        tips: 'Draw the architecture diagram starting from DNS/Load Balancer down to write replicas.',
        outcome: 'OFFERED',
      },
      {
        candidateName: 'Amit Joshi',
        companyName: 'Amazon AWS',
        roleTitle: 'SDE-I (AWS)',
        roundType: 'Round 1: Online Assessment (Coding & Work Simulation)',
        difficulty: 'Medium',
        questionsAsked: JSON.stringify([
          'Find the median from a live data stream using Two Heaps (Max-Heap and Min-Heap) in O(log N) insertion time.',
          'Find minimum total cost to connect all AWS availability zones using Kruskals or Prims MST.',
        ]),
        tips: 'Pay close attention to large 64-bit integer overflows and write clean unit tests.',
        outcome: 'SELECTED',
      },
      {
        candidateName: 'Amit Joshi',
        companyName: 'Amazon AWS',
        roleTitle: 'SDE-I (AWS)',
        roundType: 'Round 2: System Architecture & Leadership Principles',
        difficulty: 'Hard',
        questionsAsked: JSON.stringify([
          'Design a globally distributed URL shortener (TinyURL) handling 100M writes/day and 10B reads/day.',
          'Cache invalidation strategies (Write-Through vs Write-Back) and distributed ID generation using Snowflake ID vs UUID.',
          'Tell me about a time you took a calculated risk and failed (LP: Bias for Action & Earn Trust).',
        ]),
        tips: 'Do not ignore Leadership Principles! Every technical round evaluates at least one LP with the STAR method (Situation, Task, Action, Result).',
        outcome: 'OFFERED',
      },
      {
        candidateName: 'Rahul Verma',
        companyName: 'Microsoft Corporation',
        roleTitle: 'Software Engineer',
        roundType: 'Round 1: Technical (Data Structures & Concurrency)',
        difficulty: 'Hard',
        questionsAsked: JSON.stringify([
          'Design a thread-safe bounded blocking queue using condition variables without busy-waiting.',
          'Reconstruct binary tree from preorder and inorder traversals with duplicate elements handling.',
        ]),
        tips: 'Explain lock contention and deadlock prevention strategies clearly.',
        outcome: 'SELECTED',
      },
      {
        studentProfileId: rahulProfile.id,
        candidateName: 'Rahul Deshmukh',
        companyName: 'Tata Consultancy Services',
        roleTitle: 'TCS Prime / Digital Developer',
        roundType: 'Technical Round 1',
        difficulty: 'Medium',
        questionsAsked: JSON.stringify([
          'Difference between HashMap and ConcurrentHashMap in Java.',
          'Explain ACID properties and write a query to fetch the second highest salary using window functions vs subqueries.',
          'Reverse a singly linked list in-place.',
        ]),
        tips: 'Explain internal hash collisions, equals() and hashCode() contract, and indexing mechanisms clearly.',
        outcome: 'SELECTED',
      },
      {
        studentProfileId: priyaNairProfile.id,
        candidateName: 'Priya Nair',
        companyName: 'Deloitte',
        roleTitle: 'Data Analyst & Advisory',
        roundType: 'Technical & Case Study',
        difficulty: 'Medium',
        questionsAsked: JSON.stringify([
          'Write a SQL query using window functions (SUM OVER PARTITION) to calculate moving 7-day revenue averages.',
          'Explain Star Schema vs Snowflake Schema and when denormalization is preferred in reporting.',
          'Walk through an end-to-end data validation pipeline for inconsistent CSV inputs.',
        ]),
        tips: 'Focus on business interpretation of numbers rather than just raw code.',
        outcome: 'SELECTED',
      },
    ],
  });

  console.log('🏛️ Seeded Interview Debriefs for Interview Vault');

  // 15. Coding Problems for Student Arena
  await prisma.codingProblem.upsert({
    where: { slug: 'two-sum' },
    update: {},
    create: {
      title: 'Two Sum',
      slug: 'two-sum',
      difficulty: 'EASY',
      category: 'Arrays & Hashing',
      description:
        'Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`. You may assume that each input would have exactly one solution, and you may not use the same element twice.',
      starterCode: JSON.stringify({
        javascript:
          'function twoSum(nums, target) {\n  const map = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    const complement = target - nums[i];\n    if (map.has(complement)) {\n      return [map.get(complement), i];\n    }\n    map.set(nums[i], i);\n  }\n  return [];\n}',
        python:
          'def twoSum(nums: list[int], target: int) -> list[int]:\n    seen = {}\n    for i, num in enumerate(nums):\n        if target - num in seen:\n            return [seen[target - num], i]\n        seen[num] = i\n    return []',
      }),
      testCases: JSON.stringify([
        { input: 'nums = [2,7,11,15], target = 9', output: '[0,1]' },
        { input: 'nums = [3,2,4], target = 6', output: '[1,2]' },
        { input: 'nums = [3,3], target = 6', output: '[0,1]' },
      ]),
    },
  });

  await prisma.codingProblem.upsert({
    where: { slug: 'longest-substring-without-repeating-characters' },
    update: {},
    create: {
      title: 'Longest Substring Without Repeating Characters',
      slug: 'longest-substring-without-repeating-characters',
      difficulty: 'MEDIUM',
      category: 'Sliding Window',
      description: 'Given a string `s`, find the length of the longest substring without repeating characters.',
      starterCode: JSON.stringify({
        javascript:
          'function lengthOfLongestSubstring(s) {\n  let set = new Set();\n  let left = 0;\n  let maxLen = 0;\n  for (let right = 0; right < s.length; right++) {\n    while (set.has(s[right])) {\n      set.delete(s[left]);\n      left++;\n    }\n    set.add(s[right]);\n    maxLen = Math.max(maxLen, right - left + 1);\n  }\n  return maxLen;\n}',
        python:
          'def lengthOfLongestSubstring(s: str) -> int:\n    char_set = set()\n    left = 0\n    max_len = 0\n    for right in range(len(s)):\n        while s[right] in char_set:\n            char_set.remove(s[left])\n            left += 1\n        char_set.add(s[right])\n        max_len = max(max_len, right - left + 1)\n    return max_len',
      }),
      testCases: JSON.stringify([
        { input: 's = "abcabcbb"', output: '3' },
        { input: 's = "bbbbb"', output: '1' },
        { input: 's = "pwwkew"', output: '3' },
      ]),
    },
  });

  await prisma.codingProblem.upsert({
    where: { slug: 'sliding-window-rate-limiter' },
    update: {},
    create: {
      title: 'Sliding Window Rate Limiter',
      slug: 'sliding-window-rate-limiter',
      difficulty: 'HARD',
      category: 'System Design & Concurrency',
      description:
        'Implement an in-memory Sliding Window Rate Limiter class `RateLimiter(limit, windowMs)`. Method `isAllowed(clientId, timestamp)` returns true if request is within limit.',
      starterCode: JSON.stringify({
        javascript:
          'class RateLimiter {\n  constructor(limit, windowMs) {\n    this.limit = limit;\n    this.windowMs = windowMs;\n    this.clients = new Map();\n  }\n  isAllowed(clientId, timestamp) {\n    // Implement here\n    return true;\n  }\n}',
        python:
          'class RateLimiter:\n    def __init__(self, limit: int, window_ms: int):\n        self.limit = limit\n        self.window_ms = window_ms\n        self.clients = {}\n    def is_allowed(self, client_id: str, timestamp: int) -> bool:\n        # Implement here\n        return True',
      }),
      testCases: JSON.stringify([
        { input: 'limit = 3, windowMs = 1000, reqs at [100, 200, 300, 400]', output: '[true, true, true, false]' },
      ]),
    },
  });

  // 16. Faculty Study Resources & Placement Kits
  await prisma.resourceItem.createMany({
    data: [
      {
        institutionId: gcoen.id,
        uploadedByName: 'Prof. Anita Patil',
        role: 'FACULTY',
        title: 'Complete DSA & System Design Placement Handbook 2026',
        category: 'INTERVIEW_KIT',
        fileUrl: 'https://pub-careeros.r2.dev/resources/GCOEN_DSA_Handbook_2026.pdf',
        description:
          'Comprehensive 120-page guide covering blind 75 patterns, dynamic programming recipes, and low-level object oriented design cases.',
        tags: JSON.stringify(['DSA', 'System Design', 'Interview Prep', 'Java', 'C++']),
        downloads: 342,
      },
      {
        institutionId: gcoen.id,
        uploadedByName: 'Prof. Rajesh Kulkarni (TPO)',
        role: 'TPO',
        title: 'Institutional Placement Policy, Code of Conduct & Dream Company Rules',
        category: 'SYLLABUS',
        fileUrl: 'https://pub-careeros.r2.dev/resources/TPO_Placement_Policy_2026.pdf',
        description:
          'Mandatory guidelines regarding attendance, registration, offer letters, and multi-tier eligibility rules.',
        tags: JSON.stringify(['Policy', 'TPO', 'Rules', 'Accreditation']),
        downloads: 890,
      },
    ],
  });

  // 17. TACIE AI Assessments
  await prisma.tacieAssessment.create({
    data: {
      studentProfileId: adityaProfile.id,
      type: 'RESUME_ATS',
      targetRole: 'Full Stack Software Engineer',
      score: 92,
      insights: JSON.stringify({
        matchRate: '92%',
        missingKeywords: ['GraphQL', 'Kubernetes'],
        strengths: ['High impact metrics', 'Strong system design experience', 'Clean single-column layout'],
        improvementAction: 'Quantify test coverage and mention any open-source pull requests.',
      }),
    },
  });

  console.log('✅ CareerOS Seeding Completed with Rich Connected Sample Data!');
  // Seeded demo users are pre-verified; production accounts use invite/email flows.
  await prisma.user.updateMany({ data: { emailVerifiedAt: new Date(), isActive: true } });
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
