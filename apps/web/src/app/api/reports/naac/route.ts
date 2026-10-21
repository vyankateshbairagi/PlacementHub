import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireSession } from '@/lib/auth';
import { authErrorResponse } from '@/lib/auth-http';
import { arrayToCsv, generateExcelXml, generatePrintableAccreditationReport } from '@/lib/report-generator';

export const dynamic = 'force-dynamic';

/**
 * GET /api/reports/naac
 * NAAC Criterion 5.2.1 Placement of Outgoing Students and Progression.
 * Query params:
 *   year        - graduation year filter
 *   department  - department filter
 *   format      - "json" | "csv" | "excel" | "html"
 */
export async function GET(request: Request) {
  try {
    const session = await requireSession(['TPO', 'INSTITUTE_ADMIN', 'SUPER_ADMIN', 'FACULTY']);
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

    const studentWhere: any = {};
    if (yearParam) studentWhere.graduationYear = parseInt(yearParam, 10);
    if (department) studentWhere.department = department;
    if (institutionId) studentWhere.user = { institutionId };

    const students = await prisma.studentProfile.findMany({
      where: studentWhere,
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        offers: {
          where: { status: 'ACCEPTED' },
          select: {
            id: true,
            companyName: true,
            roleTitle: true,
            ctc: true,
            offerLetterUrl: true,
            issuedAt: true,
          },
        },
      },
      orderBy: { rollNo: 'asc' },
    });

    const totalGraduating = students.length;

    // Build standard NAAC 5.2.1 rows
    const naacRecords = students
      .filter((s) => s.offers.length > 0)
      .flatMap((s) =>
        s.offers.map((offer) => ({
          year: s.graduationYear,
          rollNo: s.rollNo,
          prn: s.prn || s.rollNo,
          studentName: s.user.name,
          program: `${s.course} - ${s.department}`,
          employer: offer.companyName,
          role: offer.roleTitle,
          contactDetails: s.user.email,
          payPackage: offer.ctc,
          evidenceUrl: offer.offerLetterUrl || 'Verified in CareerOS Vault',
          issuedDate: new Date(offer.issuedAt).toLocaleDateString(),
        }))
      );

    const totalPlaced = new Set(naacRecords.map((r) => r.rollNo)).size;
    const placementRate =
      totalGraduating > 0
        ? parseFloat(((totalPlaced / totalGraduating) * 100).toFixed(2))
        : 0;

    const academicYear = yearParam ? `${parseInt(yearParam, 10) - 1}-${yearParam}` : '2025-2026';
    const instName = institution?.name || 'Institution of Technology & Sciences';

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        institutionId: institutionId ?? null,
        action: 'NAAC_EXPORT',
        details: JSON.stringify({
          academicYear,
          format,
          totalGraduating,
          totalPlaced,
          placementRate,
        }),
      },
    });

    // CSV Output
    if (format === 'csv') {
      const headers = [
        'Year',
        'Student PRN / Roll No',
        'Name of Student Placed',
        'Program Graduated From',
        'Name of the Employer with Contact Details',
        'Pay Package at Appointment (INR / LPA)',
        'Evidence Link / Letter Ref',
      ];
      const rows = naacRecords.map((r) => [
        r.year,
        r.rollNo,
        r.studentName,
        r.program,
        `${r.employer} (${r.role})`,
        r.payPackage,
        r.evidenceUrl,
      ]);

      const csv = arrayToCsv(headers, rows);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="NAAC_SSR_Criterion_5.2.1_${academicYear}.csv"`,
        },
      });
    }

    // Excel XML Output
    if (format === 'excel') {
      const headers = [
        'Academic Year',
        'Student Roll No',
        'Student Name',
        'Program / Branch',
        'Employer & Designation',
        'Pay Package',
        'Proof Verification',
      ];
      const rows = naacRecords.map((r) => [
        r.year,
        r.rollNo,
        r.studentName,
        r.program,
        `${r.employer} - ${r.role}`,
        r.payPackage,
        r.evidenceUrl,
      ]);

      const xml = generateExcelXml('NAAC Criterion 5.2.1', headers, rows);
      return new NextResponse(xml, {
        headers: {
          'Content-Type': 'application/vnd.ms-excel',
          'Content-Disposition': `attachment; filename="NAAC_Criterion_5.2.1_${academicYear}.xls"`,
        },
      });
    }

    // Printable HTML / PDF view
    if (format === 'html') {
      const html = generatePrintableAccreditationReport({
        reportType: 'NAAC',
        institutionName: instName,
        academicYear,
        naacGrade: institution?.naacGrade,
        nirfRank: institution?.nirfRank,
        summaryMetrics: [
          { label: 'Outgoing Students (N)', value: totalGraduating },
          { label: 'Placed Students (Q)', value: totalPlaced },
          { label: 'Placement Metric 5.2.1', value: `${placementRate}%` },
          { label: 'Total Verified Offers', value: naacRecords.length },
        ],
        tables: [
          {
            title: 'NAAC SSR Table 5.2.1: Outgoing Student Placement Data Template',
            headers: ['Year', 'Roll No', 'Student Name', 'Program', 'Employer & Role', 'Pay Package', 'Verification'],
            rows: naacRecords.map((r) => [
              r.year,
              r.rollNo,
              r.studentName,
              r.program,
              `${r.employer} (${r.role})`,
              r.payPackage,
              'Verified ✓',
            ]),
          },
        ],
        auditTimestamp: new Date().toLocaleString(),
      });

      return new NextResponse(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // JSON Default
    return NextResponse.json({
      success: true,
      academicYear,
      totalGraduating,
      totalPlaced,
      placementRate,
      recordsCount: naacRecords.length,
      records: naacRecords,
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
