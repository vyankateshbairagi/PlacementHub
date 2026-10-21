import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession, requireSession } from '@/lib/auth';
import { authErrorResponse } from '@/lib/auth-http';
import {
  evaluateEligibility,
  toSafeDriveDto,
  getStudentBookmarks,
  parseCtcAmount,
  parseJsonArray,
} from '@/lib/drive-service';
import { DriveStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const driveId = params.id;
    const session = await getSession();

    const drive = await prisma.placementDrive.findUnique({
      where: { id: driveId },
      include: {
        institution: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
            city: true,
            dreamOfferThreshold: true,
            superDreamThreshold: true,
            maxRegularOffers: true,
          },
        },
        applications: {
          select: {
            id: true,
            status: true,
            fitScore: true,
            matchTier: true,
            verifiedProofSummary: true,
            stageNotes: true,
            appliedAt: true,
            studentProfile: {
              select: {
                id: true,
                rollNo: true,
                department: true,
                cgpa: true,
                backlogsCount: true,
                verifiedSkillsCount: true,
                trustScore: true,
                placementStatus: true,
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!drive) {
      return NextResponse.json(
        { success: false, error: 'Placement drive not found.' },
        { status: 404 }
      );
    }

    let isBookmarked = false;
    let hasApplied = false;
    let applicationStatus: string | undefined = undefined;
    let eligibility = undefined;

    let canViewApplicants = false;
    if (session) {
      if (session.role === 'SUPER_ADMIN') {
        canViewApplicants = true;
      } else if (session.role === 'RECRUITER') {
        const recruiterProfile = await prisma.recruiterProfile.findUnique({
          where: { userId: session.userId },
          select: { id: true },
        });
        canViewApplicants = recruiterProfile?.id === drive.recruiterId;
      } else if (session.role === 'TPO' || session.role === 'INSTITUTE_ADMIN') {
        canViewApplicants = drive.institutionId === session.institutionId;
      } else if (session.role === 'STUDENT') {
        // Enforce institutional boundary for on-campus drives
        if (drive.jobType === 'ON_CAMPUS' && drive.institutionId && session.institutionId) {
          if (drive.institutionId !== session.institutionId) {
            return NextResponse.json(
              { success: false, error: 'This drive is restricted to students of its host institution.' },
              { status: 403 }
            );
          }
        }

        const studentProfile = await prisma.studentProfile.findUnique({
          where: { userId: session.userId },
          include: {
            user: { select: { id: true, name: true, institutionId: true, institution: true } },
            offers: { where: { status: 'ACCEPTED' }, select: { ctc: true, status: true } },
            applications: { where: { driveId }, select: { id: true, status: true } },
          },
        });

        if (studentProfile) {
          const bookmarks = await getStudentBookmarks(session.userId);
          isBookmarked = bookmarks.includes(drive.id);
          const studentApp = studentProfile.applications[0];
          hasApplied = Boolean(studentApp);
          applicationStatus = studentApp?.status;

          eligibility = evaluateEligibility({
            student: {
              id: studentProfile.id,
              department: studentProfile.department,
              cgpa: studentProfile.cgpa,
              backlogsCount: studentProfile.backlogsCount,
              placementStatus: studentProfile.placementStatus,
              institutionId: studentProfile.user?.institutionId,
              offers: studentProfile.offers,
            },
            drive: {
              id: drive.id,
              jobType: drive.jobType,
              status: drive.status,
              deadline: drive.deadline,
              minCgpa: drive.minCgpa,
              maxBacklogs: drive.maxBacklogs,
              eligibleBranches: drive.eligibleBranches,
              ctcAmount: drive.ctcAmount,
              ctc: drive.ctc,
              isDreamCompany: drive.isDreamCompany,
              isSuperDream: drive.isSuperDream,
              institutionId: drive.institutionId,
            },
            institution: drive.institution || studentProfile.user?.institution,
          });
        }
      }
    }

    const safeDrive = toSafeDriveDto(drive, {
      isBookmarked,
      hasApplied,
      applicationStatus,
      eligibility,
      includeApplicants: canViewApplicants,
    });

    return NextResponse.json({
      success: true,
      drive: safeDrive,
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireSession(['TPO', 'INSTITUTE_ADMIN', 'RECRUITER', 'SUPER_ADMIN']);
    const driveId = params.id;
    const body = await request.json();

    const drive = await prisma.placementDrive.findUnique({
      where: { id: driveId },
    });

    if (!drive) {
      return NextResponse.json(
        { success: false, error: 'Placement drive not found.' },
        { status: 404 }
      );
    }

    if (session.role === 'RECRUITER') {
      const recruiterProfile = await prisma.recruiterProfile.findUnique({
        where: { userId: session.userId },
      });
      if (!recruiterProfile || drive.recruiterId !== recruiterProfile.id) {
        return NextResponse.json({ success: false, error: 'Forbidden.' }, { status: 403 });
      }
    } else if (session.role === 'TPO' || session.role === 'INSTITUTE_ADMIN') {
      if (drive.institutionId && drive.institutionId !== session.institutionId) {
        return NextResponse.json({ success: false, error: 'Forbidden.' }, { status: 403 });
      }
    }

    const dataToUpdate: any = {};
    if (body.status && Object.values(DriveStatus).includes(body.status)) {
      dataToUpdate.status = body.status;
    }
    if (body.deadline) {
      const parsedDeadline = new Date(body.deadline);
      if (!Number.isNaN(parsedDeadline.getTime())) {
        dataToUpdate.deadline = parsedDeadline;
      }
    }
    if (body.companyName) dataToUpdate.companyName = body.companyName.trim();
    if (body.roleTitle) dataToUpdate.roleTitle = body.roleTitle.trim();
    if (body.description) dataToUpdate.description = body.description.trim();
    if (body.location) dataToUpdate.location = body.location.trim();
    if (body.ctc) {
      dataToUpdate.ctc = body.ctc.trim();
      dataToUpdate.ctcAmount = parseCtcAmount(body.ctc, body.ctcAmount);
    }
    if (body.minCgpa !== undefined) dataToUpdate.minCgpa = parseFloat(body.minCgpa);
    if (body.maxBacklogs !== undefined) dataToUpdate.maxBacklogs = parseInt(body.maxBacklogs, 10);
    if (body.eligibleBranches !== undefined) {
      dataToUpdate.eligibleBranches = JSON.stringify(parseJsonArray(body.eligibleBranches));
    }
    if (body.requiredSkills !== undefined) {
      dataToUpdate.requiredSkills = JSON.stringify(parseJsonArray(body.requiredSkills));
    }
    if (body.preferredSkills !== undefined) {
      dataToUpdate.preferredSkills = JSON.stringify(parseJsonArray(body.preferredSkills));
    }

    const updated = await prisma.placementDrive.update({
      where: { id: driveId },
      data: dataToUpdate,
      include: {
        institution: { select: { id: true, name: true, logoUrl: true, city: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        institutionId: updated.institutionId,
        action: 'UPDATE_PLACEMENT_DRIVE',
        details: JSON.stringify({ driveId, changes: Object.keys(dataToUpdate) }),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Placement drive updated successfully.',
      drive: toSafeDriveDto(updated),
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}

