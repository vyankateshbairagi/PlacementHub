import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireSession } from '@/lib/auth';
import { authErrorResponse } from '@/lib/auth-http';

export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse a CTC string like "₹14.5 LPA" → numeric LPA value, or return 0. */
function parseCTC(ctcStr: string): number {
  const match = ctcStr.replace(/[₹,\s]/g, '').match(/([\d.]+)\s*LPA?/i);
  return match ? parseFloat(match[1]) : 0;
}

/** Calculate the median of a sorted numeric array. */
function median(sorted: number[]): number {
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Escape a single CSV cell value. */
function csvCell(value: string | number | null | undefined): string {
  const str = String(value ?? '');
  // Wrap in quotes if the value contains commas, quotes, or newlines
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Convert an array of objects to a CSV string. */
function toCSV(rows: Record<string, string | number | null | undefined>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.map(csvCell).join(','),
    ...rows.map((row) => headers.map((h) => csvCell(row[h])).join(',')),
  ];
  return lines.join('\r\n');
}

// ---------------------------------------------------------------------------
// GET /api/reports/placement
// ---------------------------------------------------------------------------
// Query params:
//   institutionId  – target institution (SUPER_ADMIN only; others auto-scoped)
//   year           – graduation year filter (number)
//   department     – department name filter
//   format         – "json" (default) | "csv"
// ---------------------------------------------------------------------------
export async function GET(request: Request) {
  try {
    // ── Auth ────────────────────────────────────────────────────────────────
    const session = await requireSession(['TPO', 'INSTITUTE_ADMIN', 'SUPER_ADMIN']);

    const { searchParams } = new URL(request.url);
    const format = (searchParams.get('format') ?? 'json').toLowerCase();
    const yearParam = searchParams.get('year');
    const department = searchParams.get('department') ?? undefined;

    // Resolve institution scope
    let institutionId: string | undefined;
    if (session.role === 'SUPER_ADMIN') {
      institutionId = searchParams.get('institutionId') ?? undefined;
    } else {
      // TPO / INSTITUTE_ADMIN are locked to their own institution
      institutionId = session.institutionId ?? undefined;
    }

    // ── Build student filter ─────────────────────────────────────────────────
    const studentWhere: Record<string, unknown> = {};
    if (yearParam) studentWhere.graduationYear = parseInt(yearParam, 10);
    if (department) studentWhere.department = department;

    // Scope students to the institution via their User relationship
    if (institutionId) {
      studentWhere.user = { institutionId };
    }

    // ── Fetch all student profiles matching filters ──────────────────────────
    const students = await prisma.studentProfile.findMany({
      where: studentWhere,
      select: {
        id: true,
        department: true,
        graduationYear: true,
        gender: true,
        placementStatus: true,
        offers: {
          where: { status: 'ACCEPTED' },
          select: {
            id: true,
            companyName: true,
            roleTitle: true,
            ctc: true,
            issuedAt: true,
            application: {
              select: {
                drive: {
                  select: {
                    isDreamCompany: true,
                    isSuperDream: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const totalStudents = students.length;

    // Collect all accepted offers across all students
    interface OfferItem {
      studentId: string;
      department: string;
      companyName: string;
      roleTitle: string;
      ctc: string;
      ctcLPA: number;
      isDreamCompany: boolean;
      isSuperDream: boolean;
      issuedAt: Date;
    }
    const allOffers: OfferItem[] = [];

    for (const student of students) {
      for (const offer of student.offers) {
        allOffers.push({
          studentId: student.id,
          department: student.department,
          companyName: offer.companyName,
          roleTitle: offer.roleTitle,
          ctc: offer.ctc,
          ctcLPA: offer.application?.drive?.isDreamCompany !== undefined
            ? parseCTC(offer.ctc)
            : parseCTC(offer.ctc),
          isDreamCompany: offer.application?.drive?.isDreamCompany ?? false,
          isSuperDream: offer.application?.drive?.isSuperDream ?? false,
          issuedAt: offer.issuedAt,
        });
      }
    }

    // Count unique placed students (students with ≥1 accepted offer)
    const placedStudentIds = new Set(allOffers.map((o) => o.studentId));
    const placedCount = placedStudentIds.size;
    const notPlacedCount = totalStudents - placedCount;
    const placementPercentage =
      totalStudents > 0
        ? parseFloat(((placedCount / totalStudents) * 100).toFixed(2))
        : 0;

    // CTC analytics
    const ctcValues = allOffers.map((o) => o.ctcLPA).sort((a, b) => a - b);
    const avgCTC =
      ctcValues.length > 0
        ? parseFloat(
            (ctcValues.reduce((s, v) => s + v, 0) / ctcValues.length).toFixed(2)
          )
        : 0;
    const medianCTC = parseFloat(median(ctcValues).toFixed(2));
    const highestCTC =
      ctcValues.length > 0 ? ctcValues[ctcValues.length - 1] : 0;

    // Dream vs non-dream splits
    const dreamOffers = allOffers.filter((o) => o.isDreamCompany && !o.isSuperDream);
    const superDreamOffers = allOffers.filter((o) => o.isSuperDream);
    const regularOffers = allOffers.filter(
      (o) => !o.isDreamCompany && !o.isSuperDream
    );

    // Company-wise breakdown
    const companyMap: Record<
      string,
      { companyName: string; offersCount: number; avgCTC: number; roles: string[] }
    > = {};
    for (const offer of allOffers) {
      if (!companyMap[offer.companyName]) {
        companyMap[offer.companyName] = {
          companyName: offer.companyName,
          offersCount: 0,
          avgCTC: 0,
          roles: [],
        };
      }
      companyMap[offer.companyName].offersCount += 1;
      if (!companyMap[offer.companyName].roles.includes(offer.roleTitle)) {
        companyMap[offer.companyName].roles.push(offer.roleTitle);
      }
    }
    // Compute per-company avg CTC
    for (const companyName of Object.keys(companyMap)) {
      const compOffers = allOffers.filter((o) => o.companyName === companyName);
      const compCTCs = compOffers.map((o) => o.ctcLPA);
      companyMap[companyName].avgCTC = parseFloat(
        (compCTCs.reduce((s, v) => s + v, 0) / compCTCs.length).toFixed(2)
      );
    }
    const companyBreakdown = Object.values(companyMap).sort(
      (a, b) => b.offersCount - a.offersCount
    );

    // Department-wise breakdown
    const deptMap: Record<
      string,
      {
        department: string;
        totalStudents: number;
        placedStudents: number;
        placementPercentage: number;
        avgCTC: number;
        highestCTC: number;
      }
    > = {};
    for (const student of students) {
      if (!deptMap[student.department]) {
        deptMap[student.department] = {
          department: student.department,
          totalStudents: 0,
          placedStudents: 0,
          placementPercentage: 0,
          avgCTC: 0,
          highestCTC: 0,
        };
      }
      deptMap[student.department].totalStudents += 1;
    }
    for (const offer of allOffers) {
      const dept = offer.department;
      if (deptMap[dept]) {
        // Will be counted via unique student IDs later
      }
    }
    // Count unique placed students per department
    const deptPlacedStudentIds: Record<string, Set<string>> = {};
    for (const offer of allOffers) {
      if (!deptPlacedStudentIds[offer.department]) {
        deptPlacedStudentIds[offer.department] = new Set();
      }
      deptPlacedStudentIds[offer.department].add(offer.studentId);
    }
    for (const dept of Object.keys(deptMap)) {
      const placed = deptPlacedStudentIds[dept]?.size ?? 0;
      const total = deptMap[dept].totalStudents;
      const deptOffers = allOffers.filter((o) => o.department === dept);
      const deptCTCs = deptOffers.map((o) => o.ctcLPA).sort((a, b) => a - b);
      deptMap[dept].placedStudents = placed;
      deptMap[dept].placementPercentage =
        total > 0 ? parseFloat(((placed / total) * 100).toFixed(2)) : 0;
      deptMap[dept].avgCTC =
        deptCTCs.length > 0
          ? parseFloat(
              (deptCTCs.reduce((s, v) => s + v, 0) / deptCTCs.length).toFixed(2)
            )
          : 0;
      deptMap[dept].highestCTC =
        deptCTCs.length > 0 ? deptCTCs[deptCTCs.length - 1] : 0;
    }
    const departmentBreakdown = Object.values(deptMap).sort(
      (a, b) => b.placementPercentage - a.placementPercentage
    );

    // ── Write Audit Log ──────────────────────────────────────────────────────
    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        institutionId: institutionId ?? null,
        action: 'REPORT_EXPORT',
        details: JSON.stringify({
          reportType: 'PLACEMENT',
          format,
          filters: { institutionId, year: yearParam, department },
          exportedAt: new Date().toISOString(),
          totalStudents,
          placedCount,
        }),
      },
    });

    // ── Build response payload ───────────────────────────────────────────────
    const stats = {
      generatedAt: new Date().toISOString(),
      filters: {
        institutionId: institutionId ?? null,
        year: yearParam ? parseInt(yearParam, 10) : null,
        department: department ?? null,
      },
      summary: {
        totalStudents,
        placedStudents: placedCount,
        notPlacedStudents: notPlacedCount,
        placementPercentage,
        totalOffers: allOffers.length,
        avgCTC,
        medianCTC,
        highestCTC,
        companiesVisited: Object.keys(companyMap).length,
      },
      dreamSplit: {
        regularOffers: regularOffers.length,
        dreamOffers: dreamOffers.length,
        superDreamOffers: superDreamOffers.length,
      },
      companyBreakdown,
      departmentBreakdown,
    };

    // ── CSV export ───────────────────────────────────────────────────────────
    if (format === 'csv') {
      // Flatten company breakdown into CSV rows (NIRF/NAAC compatible)
      const rows = companyBreakdown.map((c) => ({
        'Company Name': c.companyName,
        'Offers Count': c.offersCount,
        'Average CTC (LPA)': c.avgCTC,
        'Roles Offered': c.roles.join('; '),
      }));

      // Prepend summary header rows
      const summaryRows: Record<string, string | number>[] = [
        { 'Company Name': 'PLACEMENT REPORT SUMMARY', 'Offers Count': '', 'Average CTC (LPA)': '', 'Roles Offered': '' },
        { 'Company Name': `Generated At`, 'Offers Count': stats.generatedAt, 'Average CTC (LPA)': '', 'Roles Offered': '' },
        { 'Company Name': `Total Students`, 'Offers Count': totalStudents, 'Average CTC (LPA)': '', 'Roles Offered': '' },
        { 'Company Name': `Placed Students`, 'Offers Count': placedCount, 'Average CTC (LPA)': '', 'Roles Offered': '' },
        { 'Company Name': `Placement %`, 'Offers Count': `${placementPercentage}%`, 'Average CTC (LPA)': '', 'Roles Offered': '' },
        { 'Company Name': `Average CTC (LPA)`, 'Offers Count': avgCTC, 'Average CTC (LPA)': '', 'Roles Offered': '' },
        { 'Company Name': `Median CTC (LPA)`, 'Offers Count': medianCTC, 'Average CTC (LPA)': '', 'Roles Offered': '' },
        { 'Company Name': `Highest CTC (LPA)`, 'Offers Count': highestCTC, 'Average CTC (LPA)': '', 'Roles Offered': '' },
        { 'Company Name': `---`, 'Offers Count': '---', 'Average CTC (LPA)': '---', 'Roles Offered': '---' },
        ...rows,
      ];

      const csvContent = toCSV(summaryRows);
      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="placement-report-${yearParam ?? 'all'}.csv"`,
        },
      });
    }

    // ── JSON response ────────────────────────────────────────────────────────
    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    return authErrorResponse(error);
  }
}
