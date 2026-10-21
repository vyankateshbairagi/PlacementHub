import prisma from '@/lib/db';

export const studentProfileInclude = {
  user: { select: { id: true, name: true, email: true, phone: true, avatarUrl: true, role: true, institutionId: true, institution: { select: { id: true, name: true, logoUrl: true, city: true, state: true } } } },
  educations: { orderBy: { startYear: 'desc' as const } },
  projects: { orderBy: { createdAt: 'desc' as const } },
  experiences: { orderBy: { createdAt: 'desc' as const } },
  resumes: { orderBy: { updatedAt: 'desc' as const } },
  skillProofs: { orderBy: { verifiedAt: 'desc' as const } },
  verificationRequests: { orderBy: { createdAt: 'desc' as const } },
};

export async function getStudentProfileForUser(userId: string) {
  return prisma.studentProfile.findUnique({ where: { userId }, include: studentProfileInclude });
}

export function parseSkills(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch { return []; }
}

export function toPrivateStudentDto(student: any) {
  return { ...student, skills: parseSkills(student.skills) };
}

export function toPublicStudentDto(student: any) {
  const user = student.user || {};
  return {
    id: student.id,
    talentPassportSlug: student.talentPassportSlug,
    department: student.department,
    course: student.course,
    graduationYear: student.graduationYear,
    cgpa: student.showAcademicsPublic ? student.cgpa : null,
    backlogsCount: student.showAcademicsPublic ? student.backlogsCount : null,
    rollNo: student.showAcademicsPublic ? student.rollNo : null,
    skills: parseSkills(student.skills),
    bio: student.bio,
    linkedinUrl: student.linkedinUrl,
    githubUrl: student.githubUrl,
    portfolioUrl: student.portfolioUrl,
    careerReadinessScore: student.careerReadinessScore,
    trustScore: student.trustScore,
    verifiedSkillsCount: student.verifiedSkillsCount,
    placementStatus: student.placementStatus,
    verificationStatus: student.verificationStatus,
    user: {
      id: user.id,
      name: user.name,
      avatarUrl: user.avatarUrl,
      email: student.showEmailPublic ? user.email : undefined,
      phone: student.showPhonePublic ? user.phone : undefined,
      institution: user.institution,
    },
    educations: student.showAcademicsPublic ? (student.educations || []).filter((item: any) => item.verified) : [],
    projects: student.showProjectsPublic ? (student.projects || []).filter((item: any) => item.verified) : [],
    experiences: student.showExperiencePublic ? (student.experiences || []).filter((item: any) => item.verified) : [],
    resumes: student.showResumePublic ? (student.resumes || []).filter((item: any) => item.isDefault) : [],
    resumeUrl: student.showResumePublic ? student.resumeUrl : null,
    skillProofs: student.skillProofs || [],
  };
}

export function cleanText(value: unknown, max = 500): string | null {
  if (typeof value !== 'string') return null;
  const cleaned = value.trim();
  return cleaned ? cleaned.slice(0, max) : null;
}

export function cleanHttpsUrl(value: unknown): string | null {
  const text = cleanText(value, 2048);
  if (!text) return null;
  try {
    const url = new URL(text);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch { return null; }
}

