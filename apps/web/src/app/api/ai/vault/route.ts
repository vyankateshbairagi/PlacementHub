import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/db';
import placementAiClient from '@/lib/placementAiClient';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const companyName = searchParams.get('companyName') || searchParams.get('company') || '';

    if (!companyName.trim()) {
      // If no company specified, return all recent debriefs grouped or listed
      const allDebriefs = await prisma.interviewDebrief.findMany({
        take: 50,
        orderBy: { createdAt: 'desc' },
      });
      return NextResponse.json({ success: true, debriefs: allDebriefs });
    }

    // 1. Fetch DB debriefs for this company
    const dbDebriefs = await prisma.interviewDebrief.findMany({
      where: {
        companyName: {
          contains: companyName,
          mode: 'insensitive',
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 2. Fetch college alumni mapped to this company
    const mappedAlumni = await prisma.alumniProfile.findMany({
      where: {
        currentCompany: {
          contains: companyName,
          mode: 'insensitive',
        },
      },
      include: {
        user: { select: { name: true, email: true, avatarUrl: true } },
      },
    });

    // 3. Query AI Vault service for curated analytics and round patterns
    let aiVaultData: any = null;
    try {
      aiVaultData = await placementAiClient.getCompanyInterviewVault(companyName);
    } catch (aiErr) {
      console.warn('AI Vault service unavailable, falling back to database debriefs:', aiErr);
    }

    return NextResponse.json({
      success: true,
      companyName,
      totalDebriefs: dbDebriefs.length,
      debriefs: dbDebriefs,
      mappedAlumni: mappedAlumni.map((a) => ({
        id: a.id,
        name: a.user.name,
        email: a.user.email,
        avatarUrl: a.user.avatarUrl,
        currentRole: a.currentRole,
        currentCompany: a.currentCompany,
        graduationYear: a.graduationYear,
        linkedinUrl: a.linkedinUrl,
        isMentorAvailable: a.isMentorAvailable,
      })),
      aiVault: aiVaultData,
    });
  } catch (error: any) {
    console.error('Error fetching interview vault:', error);
    return NextResponse.json(
      { error: error.message || 'Error retrieving interview vault' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    const body = await req.json().catch(() => ({}));
    const {
      companyName,
      roleTitle,
      roundType,
      difficulty = 'Medium',
      questionsAsked = [],
      tips = '',
      outcome = 'PENDING',
      studentEmail,
    } = body;

    if (!companyName || !roleTitle || !roundType) {
      return NextResponse.json(
        { error: 'companyName, roleTitle, and roundType are required' },
        { status: 400 }
      );
    }

    // Find student profile if author is student
    let student = null;
    if (session && session.userId) {
      student = await prisma.studentProfile.findUnique({
        where: { userId: session.userId },
        include: { user: true },
      });
    }

    if (!student && studentEmail) {
      student = await prisma.studentProfile.findFirst({
        where: { user: { email: studentEmail } },
        include: { user: true },
      });
    }

    if (!student) {
      student = await prisma.studentProfile.findFirst({
        where: { user: { email: 'aditya.shinde@student.gcoen.ac.in' } },
        include: { user: true },
      });
    }

    const candidateName = session?.name || student?.user?.name || 'Aditya Shinde';

    const newDebrief = await prisma.interviewDebrief.create({
      data: {
        studentProfileId: student ? student.id : null,
        candidateName,
        companyName,
        roleTitle,
        roundType,
        difficulty,
        questionsAsked: Array.isArray(questionsAsked)
          ? JSON.stringify(questionsAsked)
          : String(questionsAsked),
        tips,
        outcome,
      },
    });

    // Also forward to AI service vault asynchronously if possible
    try {
      await placementAiClient.submitInterviewDebrief({
        student_name: candidateName,
        company_name: companyName,
        role_title: roleTitle,
        round_type: roundType,
        difficulty: difficulty as any,
        questions_asked: Array.isArray(questionsAsked) ? questionsAsked : [String(questionsAsked)],
        tips,
        outcome: outcome as any,
      });
    } catch (e) {
      console.warn('Could not forward debrief to AI microservice vault:', e);
    }

    return NextResponse.json({
      success: true,
      debrief: newDebrief,
    });
  } catch (error: any) {
    console.error('Error submitting interview debrief:', error);
    return NextResponse.json(
      { error: error.message || 'Error saving interview debrief' },
      { status: 500 }
    );
  }
}

