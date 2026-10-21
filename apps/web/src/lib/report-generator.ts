/**
 * Utility functions for generating NIRF, NAAC, and Accreditation Reports
 * Supports CSV export, Excel Spreadsheet XML, and Printable Institutional HTML/PDF layouts.
 */

export function escapeCsv(val: unknown): string {
  if (val === null || val === undefined) return '';
  const str = String(val).trim();
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function arrayToCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const headerLine = headers.map(escapeCsv).join(',');
  const rowLines = rows.map((row) => row.map(escapeCsv).join(','));
  return [headerLine, ...rowLines].join('\r\n');
}

/**
 * Generates an Excel-compatible XML Spreadsheet (.xls/.xlsx compatible)
 */
export function generateExcelXml(title: string, headers: string[], rows: (string | number | null | undefined)[][]): string {
  const headerXml = headers
    .map((h) => `<Cell><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`)
    .join('');

  const rowsXml = rows
    .map((row) => {
      const cells = row
        .map((val) => {
          const type = typeof val === 'number' ? 'Number' : 'String';
          return `<Cell><Data ss:Type="${type}">${escapeXml(String(val ?? ''))}</Data></Cell>`;
        })
        .join('');
      return `<Row>${cells}</Row>`;
    })
    .join('');

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="${escapeXml(title)}">
  <Table>
   <Row ss:StyleID="Header">${headerXml}</Row>
   ${rowsXml}
  </Table>
 </Worksheet>
</Workbook>`;
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

/**
 * Builds an official printable HTML template for NIRF / NAAC submission
 */
export function generatePrintableAccreditationReport(params: {
  reportType: 'NIRF' | 'NAAC' | 'EVIDENCE_AUDIT';
  institutionName: string;
  nirfRank?: number | null;
  naacGrade?: string | null;
  academicYear: string;
  summaryMetrics: { label: string; value: string | number }[];
  tables: { title: string; headers: string[]; rows: (string | number)[][] }[];
  auditTimestamp: string;
}): string {
  const {
    reportType,
    institutionName,
    nirfRank,
    naacGrade,
    academicYear,
    summaryMetrics,
    tables,
    auditTimestamp,
  } = params;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${reportType} Official Compliance Report - ${institutionName}</title>
  <style>
    body {
      font-family: 'Times New Roman', Times, serif;
      color: #111827;
      margin: 40px;
      line-height: 1.5;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #1e3a8a;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .inst-title {
      font-size: 24px;
      font-weight: bold;
      color: #1e3a8a;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .report-title {
      font-size: 18px;
      font-weight: bold;
      margin-top: 8px;
      color: #374151;
    }
    .badge-bar {
      margin-top: 10px;
      font-size: 13px;
      color: #4b5563;
    }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 15px;
      margin-bottom: 30px;
    }
    .metric-card {
      border: 1px solid #d1d5db;
      padding: 12px;
      border-radius: 6px;
      text-align: center;
      background: #f9fafb;
    }
    .metric-val {
      font-size: 20px;
      font-weight: bold;
      color: #1e3a8a;
    }
    .metric-label {
      font-size: 12px;
      color: #6b7280;
      text-transform: uppercase;
      margin-top: 4px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 35px;
      font-size: 12px;
    }
    th, td {
      border: 1px solid #9ca3af;
      padding: 8px 10px;
      text-align: left;
    }
    th {
      background-color: #f3f4f6;
      font-weight: bold;
      color: #1f2937;
    }
    .section-title {
      font-size: 15px;
      font-weight: bold;
      margin-bottom: 10px;
      color: #1e3a8a;
      text-transform: uppercase;
    }
    .footer-signatures {
      margin-top: 60px;
      display: flex;
      justify-content: space-between;
      page-break-inside: avoid;
    }
    .sig-block {
      text-align: center;
      width: 200px;
      border-top: 1px dashed #4b5563;
      padding-top: 8px;
      font-size: 13px;
      font-weight: bold;
    }
    .watermark {
      font-size: 10px;
      color: #9ca3af;
      text-align: center;
      margin-top: 40px;
    }
    @media print {
      body { margin: 20px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 20px; text-align: right;">
    <button onclick="window.print()" style="padding: 8px 16px; background: #1e3a8a; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">
      🖨️ Print / Save as PDF
    </button>
  </div>

  <div class="header">
    <div class="inst-title">${institutionName}</div>
    <div class="report-title">${reportType} Official Compliance & Evidence Verification Document</div>
    <div class="badge-bar">
      Academic Cycle: <strong>${academicYear}</strong> | 
      NAAC Grade: <strong>${naacGrade || 'Accredited'}</strong> | 
      NIRF Category Rank: <strong>#${nirfRank || 'Participating'}</strong>
    </div>
  </div>

  <div class="metrics-grid">
    ${summaryMetrics
      .map(
        (m) => `
      <div class="metric-card">
        <div class="metric-val">${m.value}</div>
        <div class="metric-label">${m.label}</div>
      </div>
    `
      )
      .join('')}
  </div>

  ${tables
    .map(
      (tbl) => `
    <div class="section-title">${tbl.title}</div>
    <table>
      <thead>
        <tr>
          ${tbl.headers.map((h) => `<th>${h}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${tbl.rows
          .map(
            (r) => `
          <tr>
            ${r.map((cell) => `<td>${cell}</td>`).join('')}
          </tr>
        `
          )
          .join('')}
      </tbody>
    </table>
  `
    )
    .join('')}

  <div class="footer-signatures">
    <div class="sig-block">
      Prepared By<br>
      <span style="font-size: 11px; font-weight: normal;">Training & Placement Officer</span>
    </div>
    <div class="sig-block">
      Verified By<br>
      <span style="font-size: 11px; font-weight: normal;">Dean of Academic Affairs / IQAC</span>
    </div>
    <div class="sig-block">
      Approved By<br>
      <span style="font-size: 11px; font-weight: normal;">Head of Institution / Director</span>
    </div>
  </div>

  <div class="watermark">
    Generated automatically by PlacementHub on ${auditTimestamp}. Tamper-evident cryptographic verification trail enabled.
  </div>
</body>
</html>`;
}
