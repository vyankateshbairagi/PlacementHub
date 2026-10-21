import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireSession } from '@/lib/auth';
import { authErrorResponse } from '@/lib/auth-http';
import { arrayToCsv, generateExcelXml, generatePrintableAccreditationReport } from '@/lib/report-generator';

export const dynamic = 'force-dynamic';

function parseCTC(ctcStr: string): number {
  const match = ctcStr.replace(/[₹,\s]/g, '').match(/([\d.]+)\s*LPA?/i);
  return match ? parseFloat(match[1]) : 0;
}

function median(sorted: number[]): number {
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * GET /api/reports/nirf
 * Query params:
 *   year          - graduation year filter
 *   department    - department filter
 *   institutionId - SUPER_ADMIN only
 *   format        - "json" | "csv" | "excel" | "html"
 */
export async function GET(request: Request) {
  try {
    const session = await requireSession(['TPO', 'INSTITUTE_ADMIN', 'SUPER_ADMIN']);
    const { searchParams } = new URL(request.url);

    const yearParam = searchParams.get('year');
    const department = searchParams.get('department') ?? undefined;
    const format = (searchParams.get('format') ?? 'json').toLowerCase();

    let institutionId: string | undefined;
    if (session.role === 'SUPER_ADMIN') {
      institutionId = searchParams.get('institutionId') ?? undefined;
    } else {
      institutionId = session.institutionId ?? undefined;
    }

    const institution = institutionId
      ? await prisma.institution.findUnique({ where: { id: institutionId } })
      : null;

    const studentWhere: Record<string, unknown> = {};
    if (yearParam) studentWhere.graduationYear = parseInt(yearParam, 10);
    if (department) studentWhere.department = department;
    if (institutionId) {
      studentWhere.user = { institutionId };
    }

    const students = await prisma.studentProfile.findMany({
      where: studentWhere,
      include: {
        user: { select: { id: true, name: true, email: true } },
        offers: {
          where: { status: 'ACCEPTED' },
          select: {
            id: true,
            companyName: true,
            roleTitle: true,
            ctc: true,
            issuedAt: true,
          },
        },
      },
      orderBy: { rollNo: 'asc' },
    });

    const totalStudents = students.length;

    // Collate accepted offers
    const allOffers: {
      studentId: string;
      rollNo: string;
      studentName: string;
      department: string;
      companyName: string;
      roleTitle: string;
      ctcStr: string;
      ctcLPA: number;
    }[] = [];

    for (const student of students) {
      for (const offer of student.offers) {
        allOffers.push({
          studentId: student.id,
          rollNo: student.rollNo,
          studentName: student.user.name,
          department: student.department,
          companyName: offer.companyName,
          roleTitle: offer.roleTitle,
          ctcStr: offer.ctc,
          ctcLPA: parseCTC(offer.ctc),
        });
      }
    }

    const placedStudentIds = new Set(allOffers.map((o) => o.studentId));
    const placedStudents = placedStudentIds.size;
    const notPlacedStudents = totalStudents - placedStudents;
    const placementPercentage =
      totalStudents > 0
        ? parseFloat(((placedStudents / totalStudents) * 100).toFixed(2))
        : 0;

    const ctcValues = allOffers.map((o) => o.ctcLPA).sort((a, b) => a - b);
    const averageCTC =
      ctcValues.length > 0
        ? parseFloat((ctcValues.reduce((s, v) => s + v, 0) / ctcValues.length).toFixed(2))
        : 0;
    const medianCTC = parseFloat(median(ctcValues).toFixed(2));
    const highestCTC =
      ctcValues.length > 0 ? parseFloat(ctcValues[ctcValues.length - 1].toFixed(2)) : 0;
    const companiesVisited = new Set(allOffers.map((o) => o.companyName)).size;

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        institutionId: institutionId ?? null,
        action: 'NIRF_EXPORT',
        details: JSON.stringify({
          format,
          totalStudents,
          placedStudents,
          placementPercentage,
          averageCTC,
          medianCTC,
        }),
      },
    });

    const yearLabel = yearParam || '2025-2026';
    const instName = institution?.name || 'CareerOS Partner Institution';

    // CSV format
    if (format === 'csv') {
      const headers = [
        'Academic Year',
        'Intake Graduating Batch',
        'Students Placed',
        'Placement %',
        'Median Salary (LPA)',
        'Average Salary (LPA)',
        'Highest Salary (LPA)',
        'Companies Visited',
      ];
      const rows = [
        [
          yearLabel,
          totalStudents,
          placedStudents,
          `${placementPercentage}%`,
          medianCTC,
          averageCTC,
          highestCTC,
          companiesVisited,
        ],
      ];
      const csv = arrayToCsv(headers, rows);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="NIRF_Placement_Table5_${yearLabel}.csv"`,
        },
      });
    }

    // Excel XML format
    if (format === 'excel') {
      const headers = [
        'Academic Year',
        'Intake Batch',
        'Students Placed',
        'Placement Rate (%)',
        'Median Salary (LPA)',
        'Average Salary (LPA)',
        'Highest Package (LPA)',
        'Recruiting Companies Count',
      ];
      const rows = [
        [
          yearLabel,
          totalStudents,
          placedStudents,
          placementPercentage,
          medianCTC,
          averageCTC,
          highestCTC,
          companiesVisited,
        ],
      ];
      const xml = generateExcelXml('NIRF Table 5 Placements', headers, rows);
      return new NextResponse(xml, {
        headers: {
          'Content-Type': 'application/vnd.ms-excel',
          'Content-Disposition': `attachment; filename="NIRF_Table5_${yearLabel}.xls"`,
        },
      });
    }

    // Printable HTML / PDF view
    if (format === 'html') {
      const html = generatePrintableAccreditationReport({
        reportType: 'NIRF',
        institutionName: instName,
        academicYear: yearLabel,
        nirfRank: institution?.nirfRank,
        naacGrade: institution?.naacGrade,
        summaryMetrics: [
          { label: 'Total Enrolled', value: totalStudents },
          { label: 'Students Placed', value: placedStudents },
          { label: 'Placement Rate', value: `${placementPercentage}%` },
          { label: 'Median Package', value: `₹${medianCTC} LPA` },
        ],
        tables: [
          {
            title: 'NIRF Table 5.1: Minimum Stipulated Time Placements',
            headers: ['Academic Year', 'Batch Size', 'Placed', 'Placement %', 'Median CTC', 'Top CTC', 'Companies'],
            rows: [[yearLabel, totalStudents, placedStudents, `${placementPercentage}%`, `₹${medianCTC} LPA`, `₹${highestCTC} LPA`, companiesVisited]],
          },
          {
            title: 'NIRF Annexure A: Verified Placed Candidates & Employers',
            headers: ['Roll No', 'Student Name', 'Department', 'Company', 'Role', 'Compensation'],
            rows: allOffers.map((o) => [o.rollNo, o.studentName, o.department, o.companyName, o.roleTitle, o.ctcStr]),
          },
        ],
        auditTimestamp: new Date().toLocaleString(),
      });

      return new NextResponse(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // Default JSON
    return NextResponse.json({
      success: true,
      data: {
        totalStudents,
        placedStudents,
        notPlacedStudents,
        placementPercentage,
        averageCTC,
        medianCTC,
        highestCTC,
        companiesVisited,
        offersCount: allOffers.length,
        year: yearParam ? parseInt(yearParam, 10) : null,
        department: department ?? null,
        institutionName: instName,
        generatedAt: new Date().toISOString(),
        placedStudentsList: allOffers,
      },
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
