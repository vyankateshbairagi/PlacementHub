import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { authErrorResponse } from '@/lib/auth-http';
import { uploadDocument } from '@/lib/r2';
import prisma from '@/lib/db';
import type { UserRole } from '@/lib/roles';

export const dynamic = 'force-dynamic';

/** Allowed MIME types for every upload */
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

/** Maximum file size: 10 MB */
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

/** Valid upload folders */
const VALID_FOLDERS = ['resumes', 'offers', 'resources', 'logos'] as const;
type UploadFolder = (typeof VALID_FOLDERS)[number];

/** Roles that may upload to the logos folder */
const LOGO_ROLES: readonly UserRole[] = ['TPO', 'INSTITUTE_ADMIN', 'SUPER_ADMIN'];

/** Roles that may upload to the resources folder */
const RESOURCE_ROLES: readonly UserRole[] = ['FACULTY', 'TPO', 'INSTITUTE_ADMIN', 'SUPER_ADMIN'];

export async function POST(request: Request) {
  try {
    // ── 1. Authentication ──────────────────────────────────────────────────────
    const session = await requireSession();

    // ── 2. Parse multipart form data ──────────────────────────────────────────
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided.' }, { status: 400 });
    }

    // ── 3. Validate folder param ───────────────────────────────────────────────
    const rawFolder = (formData.get('folder') as string | null) || 'resumes';
    if (!VALID_FOLDERS.includes(rawFolder as UploadFolder)) {
      return NextResponse.json(
        { success: false, error: `Invalid folder. Must be one of: ${VALID_FOLDERS.join(', ')}.` },
        { status: 400 }
      );
    }
    const folder = rawFolder as UploadFolder;

    // ── 4. Role-based folder access guards ────────────────────────────────────
    if (folder === 'resumes' && session.role !== 'STUDENT') {
      return NextResponse.json(
        { success: false, error: 'Only students may upload to the resumes folder.' },
        { status: 403 }
      );
    }

    if (folder === 'logos' && !LOGO_ROLES.includes(session.role)) {
      return NextResponse.json(
        { success: false, error: 'Only TPO, Institute Admins, and Super Admins may upload logos.' },
        { status: 403 }
      );
    }

    if (folder === 'resources' && !RESOURCE_ROLES.includes(session.role)) {
      return NextResponse.json(
        { success: false, error: 'Only Faculty, TPO, Institute Admins, and Super Admins may upload resources.' },
        { status: 403 }
      );
    }

    // ── 5. Validate MIME type ─────────────────────────────────────────────────
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: `File type "${file.type}" is not allowed. Accepted types: PDF, JPEG, PNG, WEBP, DOC, DOCX.`,
        },
        { status: 400 }
      );
    }

    // ── 6. Validate file size ─────────────────────────────────────────────────
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { success: false, error: 'File exceeds the 10 MB size limit.' },
        { status: 400 }
      );
    }

    // ── 7. Upload to R2 / fallback storage ────────────────────────────────────
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadResult = await uploadDocument(buffer, file.name, file.type, folder);

    // ── 8. Persist FileAttachment DB Record ───────────────────────────────────
    const entityType = (formData.get('entityType') as string | null)?.trim() || null;
    const entityId = (formData.get('entityId') as string | null)?.trim() || null;
    const isPublic = formData.get('isPublic') === 'true' || folder === 'resources' || folder === 'logos';
    const retentionDaysRaw = formData.get('retentionDays') as string | null;
    const retentionDays = retentionDaysRaw ? parseInt(retentionDaysRaw, 10) : 365;

    let attachmentRecord;
    try {
      attachmentRecord = await prisma.fileAttachment.create({
        data: {
          uploadedById: session.userId,
          institutionId: session.institutionId ?? null,
          fileName: file.name,
          fileKey: uploadResult.key,
          fileUrl: uploadResult.url,
          mimeType: file.type,
          sizeBytes: file.size,
          folder,
          entityType,
          entityId,
          isPublic,
          retentionDays,
          expiresAt: retentionDays > 0 ? new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000) : null,
        },
      });
    } catch (e) {
      console.warn('Error saving FileAttachment record:', e);
    }

    // ── 9. Persist ResourceItem for institution resources ─────────────────────
    if (folder === 'resources') {
      const title = (formData.get('title') as string | null)?.trim();
      const category = (formData.get('category') as string | null)?.trim();

      if (!title || !category) {
        return NextResponse.json(
          { success: false, error: 'title and category are required when uploading to the resources folder.' },
          { status: 400 }
        );
      }

      const description = (formData.get('description') as string | null)?.trim() || undefined;
      const tagsRaw = formData.get('tags') as string | null;
      let tags = '[]';
      if (tagsRaw) {
        try {
          const parsed = JSON.parse(tagsRaw);
          tags = Array.isArray(parsed) ? JSON.stringify(parsed) : '[]';
        } catch {
          // If not valid JSON, treat as comma-separated string
          tags = JSON.stringify(tagsRaw.split(',').map((t) => t.trim()).filter(Boolean));
        }
      }

      await prisma.resourceItem.create({
        data: {
          institutionId: session.institutionId ?? null,
          uploadedByName: session.email,
          role: session.role,
          title,
          category,
          fileUrl: uploadResult.url,
          description,
          tags,
        },
      });
    }

    // ── 10. Write audit log ───────────────────────────────────────────────────
    await prisma.auditLog.create({
      data: {
        institutionId: session.institutionId ?? null,
        userId: session.userId,
        action: 'FILE_UPLOADED',
        details: JSON.stringify({
          attachmentId: attachmentRecord?.id,
          folder,
          filename: file.name,
          mimeType: file.type,
          size: file.size,
          storageProvider: uploadResult.storageProvider,
          key: uploadResult.key,
        }),
      },
    });

    // ── 11. Return success payload ─────────────────────────────────────────────
    return NextResponse.json({
      success: true,
      attachmentId: attachmentRecord?.id,
      url: uploadResult.url,
      key: uploadResult.key,
      storageProvider: uploadResult.storageProvider,
      filename: file.name,
      size: file.size,
      mimeType: file.type,
      folder,
      isPublic,
      expiresAt: attachmentRecord?.expiresAt,
    });
  } catch (error: unknown) {
    return authErrorResponse(error, 'Upload failed.');
  }
}
