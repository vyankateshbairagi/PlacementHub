import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession, requireSession } from '@/lib/auth';
import { authErrorResponse } from '@/lib/auth-http';
import {
  evaluateEligibility,
  parseCtcAmount,
  parseJsonArray,
  toSafeDriveDto,
  getStudentBookmarks,
} from '@/lib/drive-service';
import { DriveStatus, JobType } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const session = await getSession();

    const jobTypeParam = searchParams.get('type') || searchParams.get('jobType');
    const statusParam = searchParams.get('status');
    const categoryParam = searchParams.get('category') || searchParams.get('jobCategory');
    const search = searchParams.get('search');
    const minCgpaParam = searchParams.get('minCgpa');
    const maxBacklogsParam = searchParams.get('maxBacklogs');
    const myDrives = searchParams.get('myDrives') === 'true';
    const eligibleOnly = searchParams.get('eligibleOnly') === 'true';
    const includeApplicants = searchParams.get('includeApplicants') === 'true';

    const where: any = {};

    // 1. Job Type filter
    if (jobTypeParam && jobTypeParam !== 'ALL') {
      where.jobType = jobTypeParam as JobType;
    }

    // 2. Status filter
    if (statusParam && statusParam !== 'ALL') {
      where.status = statusParam as DriveStatus;
    } else if (!session || session.role === 'STUDENT') {
      // Default to ACTIVE for students and unauthenticated visitors
      where.status = DriveStatus.ACTIVE;
    }

    // 3. Category filter
    if (categoryParam && categoryParam !== 'ALL') {
      where.jobCategory = categoryParam;
    }

    // 4. CGPA & Backlogs filter
    if (minCgpaParam) {
      const cgpaVal = parseFloat(minCgpaParam);
      if (!Number.isNaN(cgpaVal)) where.minCgpa = { lte: cgpaVal };
    }
    if (maxBacklogsParam) {
      const blVal = parseInt(maxBacklogsParam, 10);
      if (!Number.isNaN(blVal)) where.maxBacklogs = { gte: blVal };
    }

    // 5. Search text filter
    if (search) {
      where.OR = [
        { companyName: { contains: search, mode: 'insensitive' } },
        { roleTitle: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
        { requiredSkills: { contains: search, mode: 'insensitive' } },
      ];
    }

    // 6. Tenancy & Role-specific filters
    let recruiterProfileId: string | null = null;
    let studentData: any = null;
    let bookmarkedIds: string[] = [];
    let studentApplicationMap: Record<string, any> = {};

    if (session) {
      if (session.role === 'STUDENT') {
        // Scoped to student's institution or non-campus drives
        if (session.institutionId) {
          where.OR = [
            { institutionId: session.institutionId },
            { jobType: { not: 'ON_CAMPUS' } },
          ];
        }

        // Fetch student profile for eligibility and application state
        studentData = await prisma.studentProfile.findUnique({
          where: { userId: session.userId },
          include: {
            user: { select: { id: true, name: true, institutionId: true, institution: true } },
            offers: { where: { status: 'ACCEPTED' }, select: { ctc: true, status: true } },
            skillProofs: { select: { canonicalSkill: true, confidenceTier: true, metric: true } },
            applications: { select: { id: true, driveId: true, status: true } },
          },
        });

        bookmarkedIds = await getStudentBookmarks(session.userId);

        if (studentData?.applications) {
          for (const app of studentData.applications) {
            studentApplicationMap[app.driveId] = app;
          }
        }
      } else if (session.role === 'RECRUITER') {
        const recruiterProfile = await prisma.recruiterProfile.findUnique({
          where: { userId: session.userId },
          select: { id: true },
        });
        recruiterProfileId = recruiterProfile?.id || null;
        if (myDrives && recruiterProfileId) {
          where.recruiterId = recruiterProfileId;
        }
      } else if (session.role === 'TPO' || session.role === 'INSTITUTE_ADMIN' || session.role === 'FACULTY') {
        if (session.institutionId) {
          where.OR = [
            { institutionId: session.institutionId },
            { jobType: { not: 'ON_CAMPUS' } },
          ];
        }
      }
      // SUPER_ADMIN has global visibility across all institutions
    } else {
      // Unauthenticated: only public or pooled/off-campus drives
      where.jobType = { not: 'ON_CAMPUS' };
    }

    // Fetch drives with relations
    const drives = await prisma.placementDrive.findMany({
      where,
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
      orderBy: { createdAt: 'desc' },
      take: 150,
    });

    // Determine if requester is authorized to view applicants
    const canViewApplicants =
      includeApplicants &&
      session &&
      (session.role === 'TPO' ||
        session.role === 'INSTITUTE_ADMIN' ||
        session.role === 'SUPER_ADMIN' ||
        (session.role === 'RECRUITER' && recruiterProfileId !== null));

    // Map to safe DTOs
    let safeDrives = drives.map((drive) => {
      const isBookmarked = bookmarkedIds.includes(drive.id);
      const studentApp = studentApplicationMap[drive.id];
      const hasApplied = Boolean(studentApp);
      const applicationStatus = studentApp?.status;

      let eligibility = undefined;
      if (studentData) {
        eligibility = evaluateEligibility({
          student: {
            id: studentData.id,
            department: studentData.department,
            cgpa: studentData.cgpa,
            backlogsCount: studentData.backlogsCount,
            placementStatus: studentData.placementStatus,
            institutionId: studentData.user?.institutionId,
            offers: studentData.offers,
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
          institution: drive.institution || studentData.user?.institution,
        });
      }

      // Check if this specific drive's applicants can be seen by the caller
      const allowDriveApplicants = Boolean(
        canViewApplicants &&
        (session?.role === 'SUPER_ADMIN' ||
          (session?.role === 'RECRUITER' && drive.recruiterId === recruiterProfileId) ||
          ((session?.role === 'TPO' || session?.role === 'INSTITUTE_ADMIN') &&
            drive.institutionId === session.institutionId))
      );

      return toSafeDriveDto(drive, {
        isBookmarked,
        hasApplied,
        applicationStatus,
        eligibility,
        includeApplicants: allowDriveApplicants,
      });
    });

    // If student requested eligibleOnly
    if (eligibleOnly && studentData) {
      safeDrives = safeDrives.filter((d) => d.eligibility?.isEligible);
    }

    return NextResponse.json({
      success: true,
      count: safeDrives.length,
      drives: safeDrives,
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession(['TPO', 'INSTITUTE_ADMIN', 'RECRUITER', 'SUPER_ADMIN']);
    const body = await request.json();

    const {
      companyName,
      companyLogo,
      roleTitle,
      jobType = 'ON_CAMPUS',
      jobCategory = 'TECH',
      description,
      ctc,
      stipend,
      location = 'Pune / Bengaluru / Hybrid',
      minCgpa = 6.5,
      maxBacklogs = 0,
      eligibleBranches = [],
      selectionRounds = ['Online Assessment', 'Technical Interview', 'HR Round'],
      requiredSkills = [],
      preferredSkills = [],
      deadlineDays = 14,
      deadline,
    } = body;

    if (!roleTitle?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Role title is required.' },
        { status: 400 }
      );
    }

    let resolvedCompanyName = companyName?.trim();
    let resolvedCompanyLogo = companyLogo?.trim() || null;
    let recruiterId: string | null = null;
    let institutionId: string | null = null;

    if (session.role === 'RECRUITER') {
      let recruiterProfile = await prisma.recruiterProfile.findUnique({
        where: { userId: session.userId },
      });
      if (!recruiterProfile) {
        recruiterProfile = await prisma.recruiterProfile.create({
          data: {
            userId: session.userId,
            companyName: resolvedCompanyName || 'Partner Organization',
            designation: 'Campus Talent Lead',
          },
        });
      }
      recruiterId = recruiterProfile.id;
      resolvedCompanyName = resolvedCompanyName || recruiterProfile.companyName;
      resolvedCompanyLogo = resolvedCompanyLogo || recruiterProfile.companyLogo;
      institutionId = body.institutionId || session.institutionId || null;
    } else {
      institutionId = session.institutionId || null;
      if (!resolvedCompanyName) {
        return NextResponse.json(
          { success: false, error: 'Company name is required.' },
          { status: 400 }
        );
      }
    }

    // Determine deadline
    let resolvedDeadline: Date;
    if (deadline) {
      resolvedDeadline = new Date(deadline);
      if (Number.isNaN(resolvedDeadline.getTime())) {
        resolvedDeadline = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
      }
    } else {
      const days = parseInt(deadlineDays?.toString() || '14', 10);
      resolvedDeadline = new Date(Date.now() + (Number.isNaN(days) ? 14 : days) * 24 * 60 * 60 * 1000);
    }

    // Parse CTC
    const parsedCtcAmount = parseCtcAmount(ctc, body.ctcAmount);
    const resolvedCtc = ctc?.trim() || `₹${parsedCtcAmount} LPA`;

    // Institutional thresholds check
    let isDreamCompany = body.isDreamCompany ?? false;
    let isSuperDream = body.isSuperDream ?? false;
    if (institutionId) {
      const inst = await prisma.institution.findUnique({
        where: { id: institutionId },
        select: { dreamOfferThreshold: true, superDreamThreshold: true },
      });
      if (inst) {
        if (parsedCtcAmount >= inst.superDreamThreshold) {
          isSuperDream = true;
          isDreamCompany = true;
        } else if (parsedCtcAmount >= inst.dreamOfferThreshold) {
          isDreamCompany = true;
        }
      }
    }

    const branchesList = parseJsonArray(eligibleBranches);
    const roundsList = parseJsonArray(selectionRounds);
    const reqSkillsList = parseJsonArray(requiredSkills);
    const prefSkillsList = parseJsonArray(preferredSkills);

    const newDrive = await prisma.placementDrive.create({
      data: {
        institutionId: jobType === 'ON_CAMPUS' ? institutionId : null,
        recruiterId,
        companyName: resolvedCompanyName,
        companyLogo: resolvedCompanyLogo,
        roleTitle: roleTitle.trim(),
        jobType: jobType as JobType,
        jobCategory: jobCategory || 'TECH',
        description: description?.trim() || `Campus drive for ${resolvedCompanyName} hiring for ${roleTitle}.`,
        ctc: resolvedCtc,
        ctcAmount: parsedCtcAmount,
        isDreamCompany,
        isSuperDream,
        requiredSkills: JSON.stringify(reqSkillsList),
        preferredSkills: JSON.stringify(prefSkillsList),
        source: session.role === 'RECRUITER' ? 'PARTNER' : 'ON_CAMPUS',
        stipend: stipend?.trim() || null,
        location: location?.trim() || 'Hybrid / Multiple Locations',
        deadline: resolvedDeadline,
        minCgpa: parseFloat(minCgpa?.toString() || '6.5'),
        maxBacklogs: parseInt(maxBacklogs?.toString() || '0', 10),
        eligibleBranches: JSON.stringify(branchesList),
        selectionRounds: JSON.stringify(roundsList.length > 0 ? roundsList : ['Online Assessment', 'Technical Interview', 'HR Round']),
        status: DriveStatus.ACTIVE,
      },
      include: {
        institution: {
          select: { id: true, name: true, logoUrl: true, city: true },
        },
      },
    });

    // Write audit log
    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        institutionId,
        action: 'CREATE_PLACEMENT_DRIVE',
        details: JSON.stringify({
          driveId: newDrive.id,
          companyName: newDrive.companyName,
          roleTitle: newDrive.roleTitle,
          ctc: newDrive.ctc,
          deadline: newDrive.deadline,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Placement drive for ${newDrive.companyName} created successfully!`,
      drive: toSafeDriveDto(newDrive),
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireSession(['TPO', 'INSTITUTE_ADMIN', 'RECRUITER', 'SUPER_ADMIN']);
    const body = await request.json();
    const { id, status, deadline, ...updateFields } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Drive ID is required.' }, { status: 400 });
    }

    const drive = await prisma.placementDrive.findUnique({
      where: { id },
      include: { recruiter: true },
    });

    if (!drive) {
      return NextResponse.json({ success: false, error: 'Placement drive not found.' }, { status: 404 });
    }

    // Tenant and ownership validation
    if (session.role === 'RECRUITER') {
      const recruiterProfile = await prisma.recruiterProfile.findUnique({
        where: { userId: session.userId },
      });
      if (!recruiterProfile || drive.recruiterId !== recruiterProfile.id) {
        return NextResponse.json(
          { success: false, error: 'You do not have permission to modify this placement drive.' },
          { status: 403 }
        );
      }
    } else if (session.role === 'TPO' || session.role === 'INSTITUTE_ADMIN') {
      if (drive.institutionId && drive.institutionId !== session.institutionId) {
        return NextResponse.json(
          { success: false, error: 'Cross-institution modification is not permitted.' },
          { status: 403 }
        );
      }
    }

    const dataToUpdate: any = {};
    if (status && Object.values(DriveStatus).includes(status)) {
      dataToUpdate.status = status;
    }
    if (deadline) {
      const parsedDeadline = new Date(deadline);
      if (!Number.isNaN(parsedDeadline.getTime())) {
        dataToUpdate.deadline = parsedDeadline;
      }
    }
    if (updateFields.companyName) dataToUpdate.companyName = updateFields.companyName.trim();
    if (updateFields.roleTitle) dataToUpdate.roleTitle = updateFields.roleTitle.trim();
    if (updateFields.description) dataToUpdate.description = updateFields.description.trim();
    if (updateFields.location) dataToUpdate.location = updateFields.location.trim();
    if (updateFields.stipend !== undefined) dataToUpdate.stipend = updateFields.stipend;
    if (updateFields.ctc) {
      dataToUpdate.ctc = updateFields.ctc.trim();
      dataToUpdate.ctcAmount = parseCtcAmount(updateFields.ctc, updateFields.ctcAmount);
    } else if (updateFields.ctcAmount !== undefined) {
      dataToUpdate.ctcAmount = parseFloat(updateFields.ctcAmount);
    }
    if (updateFields.minCgpa !== undefined) dataToUpdate.minCgpa = parseFloat(updateFields.minCgpa);
    if (updateFields.maxBacklogs !== undefined) dataToUpdate.maxBacklogs = parseInt(updateFields.maxBacklogs, 10);
    if (updateFields.eligibleBranches !== undefined) {
      dataToUpdate.eligibleBranches = JSON.stringify(parseJsonArray(updateFields.eligibleBranches));
    }
    if (updateFields.selectionRounds !== undefined) {
      dataToUpdate.selectionRounds = JSON.stringify(parseJsonArray(updateFields.selectionRounds));
    }
    if (updateFields.requiredSkills !== undefined) {
      dataToUpdate.requiredSkills = JSON.stringify(parseJsonArray(updateFields.requiredSkills));
    }
    if (updateFields.preferredSkills !== undefined) {
      dataToUpdate.preferredSkills = JSON.stringify(parseJsonArray(updateFields.preferredSkills));
    }

    const updated = await prisma.placementDrive.update({
      where: { id },
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
        details: JSON.stringify({ driveId: id, changes: Object.keys(dataToUpdate) }),
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

export async function DELETE(request: Request) {
  try {
    const session = await requireSession(['TPO', 'INSTITUTE_ADMIN', 'RECRUITER', 'SUPER_ADMIN']);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Drive ID is required.' }, { status: 400 });
    }

    const drive = await prisma.placementDrive.findUnique({
      where: { id },
      include: { applications: { select: { id: true } } },
    });

    if (!drive) {
      return NextResponse.json({ success: false, error: 'Placement drive not found.' }, { status: 404 });
    }

    // Ownership check
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

    // If applications exist, soft-archive to preserve audit integrity
    if (drive.applications.length > 0) {
      const archived = await prisma.placementDrive.update({
        where: { id },
        data: { status: DriveStatus.ARCHIVED },
      });
      await prisma.auditLog.create({
        data: {
          userId: session.userId,
          institutionId: drive.institutionId,
          action: 'ARCHIVE_PLACEMENT_DRIVE',
          details: JSON.stringify({ driveId: id, applicantsCount: drive.applications.length }),
        },
      });
      return NextResponse.json({
        success: true,
        message: 'Drive archived successfully (candidates had already applied).',
        drive: toSafeDriveDto(archived),
      });
    }

    await prisma.placementDrive.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        institutionId: drive.institutionId,
        action: 'DELETE_PLACEMENT_DRIVE',
        details: JSON.stringify({ driveId: id, companyName: drive.companyName }),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Placement drive deleted successfully.',
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
