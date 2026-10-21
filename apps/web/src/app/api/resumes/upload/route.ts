import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { uploadDocument } from '@/lib/r2';
import { extractTextFromBuffer, parseResumeText, createResumeVersion } from '@/lib/resume-service';
import prisma from '@/lib/db';
import placementAiClient, { VerifiedProofItem } from '@/lib/placementAiClient';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Unauthorized: Student account required' }, { status: 403 });
    }

    const contentType = req.headers.get('content-type') || '';

    let buffer: Buffer;
    let filename = 'resume.pdf';
    let fileMime = 'application/pdf';
    let targetRole = 'Software Development Engineer';
    let title = 'Uploaded Resume';
    let isDefault = false;

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
      }

      filename = file.name || 'resume.pdf';
      fileMime = file.type || 'application/pdf';
      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);

      const targetRoleInput = formData.get('targetRole');
      if (targetRoleInput && typeof targetRoleInput === 'string') {
        targetRole = targetRoleInput;
      }

      const titleInput = formData.get('title');
      if (titleInput && typeof titleInput === 'string') {
        title = titleInput;
      } else {
        title = filename.replace(/\.[^/.]+$/, '');
      }

      const isDefaultInput = formData.get('isDefault');
      if (isDefaultInput === 'true' || isDefaultInput === '1') {
        isDefault = true;
      }
    } else {
      // JSON payload fallback with base64 or text
      const body = await req.json();
      if (!body.fileContent) {
        return NextResponse.json({ error: 'fileContent (base64 or text) is required' }, { status: 400 });
      }

      filename = body.filename || 'resume.pdf';
      fileMime = body.contentType || 'application/pdf';
      targetRole = body.targetRole || 'Software Development Engineer';
      title = body.title || filename.replace(/\.[^/.]+$/, '');
      isDefault = Boolean(body.isDefault);

      if (body.isBase64) {
        buffer = Buffer.from(body.fileContent, 'base64');
      } else {
        buffer = Buffer.from(body.fileContent, 'utf-8');
      }
    }

    // 1. Extract text from uploaded document
    const extractedText = extractTextFromBuffer(buffer, fileMime, filename);

    // 2. Fetch student's verified skill proofs from database
    const student = await prisma.studentProfile.findUnique({
      where: { userId: session.userId },
      include: { skillProofs: true },
    });

    const verifiedProofItems: VerifiedProofItem[] = (student?.skillProofs || []).map((p) => ({
      canonical_skill: p.canonicalSkill,
      category: p.category,
      confidence_tier: p.confidenceTier as any,
      source_type: p.sourceType as any,
      locator: p.locator,
      metric: p.metric,
      audit_note: p.auditNote,
    }));

    // 3. Auto-run Truthful Claims Audit (Bullshit Detector)
    let claimsAudit: any = null;
    try {
      claimsAudit = await placementAiClient.auditResumeClaims({
        resume_text: extractedText,
        verified_skills: verifiedProofItems,
      });
    } catch (auditErr) {
      console.warn('AI Service audit failed during upload, falling back to deterministic auditor:', auditErr);
    }

    if (!claimsAudit) {
      claimsAudit = placementAiClient.fallbackAuditResumeClaims({
        resume_text: extractedText,
        verified_skills: verifiedProofItems,
      });
    }

    // 4. Parse ATS sections, keywords, and score
    const parsedData: any = parseResumeText(extractedText, targetRole);
    parsedData.claimsAudit = claimsAudit;
    parsedData.application_blocked = Boolean(claimsAudit.application_blocked);
    parsedData.block_reason = claimsAudit.block_reason || null;
    parsedData.integrity_score = claimsAudit.integrity_score;

    // 5. Upload file to R2 or fallback storage
    const uploadRes = await uploadDocument(buffer, filename, fileMime, 'resumes');

    // 6. Create managed resume version in database
    const newResume = await createResumeVersion({
      userId: session.userId,
      title: title.trim(),
      targetRole,
      fileUrl: uploadRes.url,
      parsedData,
      atsScore: parsedData.atsAnalysis?.score ?? 85,
      isDefault,
    });

    // 7. Persist audit assessment record and update student trust score
    if (student) {
      try {
        await prisma.tacieAssessment.create({
          data: {
            studentProfileId: student.id,
            type: 'RESUME_CLAIMS_AUDIT',
            targetRole,
            score: claimsAudit.integrity_score ?? 85,
            insights: JSON.stringify(claimsAudit),
          },
        });

        // Reflect claims audit integrity score in student trust score
        const newTrustScore = claimsAudit.application_blocked
          ? Math.min(student.trustScore, claimsAudit.integrity_score, 40)
          : Math.round((student.trustScore * 0.4) + (claimsAudit.integrity_score * 0.6));

        await prisma.studentProfile.update({
          where: { id: student.id },
          data: { trustScore: newTrustScore },
        });
      } catch (tacieErr) {
        console.warn('Could not record TacieAssessment on upload:', tacieErr);
      }
    }

    return NextResponse.json({
      success: true,
      resume: newResume,
      parsedData,
      audit: claimsAudit,
      applicationBlocked: parsedData.application_blocked,
      blockReason: parsedData.block_reason,
      integrityScore: claimsAudit.integrity_score,
      storageProvider: uploadRes.storageProvider,
      message: parsedData.application_blocked
        ? `Resume uploaded with policy warning: ${parsedData.block_reason || 'Unsubstantiated or contradictory claims detected. Applications are blocked until resolved.'}`
        : 'Resume parsed, claims verified, and version saved successfully.',
    });
  } catch (err: any) {
    console.error('Error in resume upload/parse route:', err);
    return NextResponse.json({ error: err.message || 'Failed to process resume' }, { status: 500 });
  }
}

