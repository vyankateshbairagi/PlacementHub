import prisma from '@/lib/db';
import { getDocumentDownloadUrl } from '@/lib/r2';
import type { UserRole } from '@/lib/roles';

export const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
  'text/csv',
]);

export const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB

export interface CreateFileRecordInput {
  uploadedById: string;
  institutionId?: string | null;
  fileName: string;
  fileKey: string;
  fileUrl: string;
  mimeType: string;
  sizeBytes: number;
  folder: string;
  entityType?: string | null;
  entityId?: string | null;
  isPublic?: boolean;
  retentionDays?: number | null;
}

/**
 * Creates a FileAttachment record in PostgreSQL.
 */
export async function createFileAttachmentRecord(input: CreateFileRecordInput) {
  const {
    uploadedById,
    institutionId,
    fileName,
    fileKey,
    fileUrl,
    mimeType,
    sizeBytes,
    folder,
    entityType,
    entityId,
    isPublic = false,
    retentionDays = 365,
  } = input;

  let expiresAt: Date | null = null;
  if (retentionDays && retentionDays > 0) {
    expiresAt = new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000);
  }

  const record = await prisma.fileAttachment.create({
    data: {
      uploadedById,
      institutionId: institutionId || null,
      fileName,
      fileKey,
      fileUrl,
      mimeType,
      sizeBytes,
      folder,
      entityType: entityType || null,
      entityId: entityId || null,
      isPublic,
      retentionDays,
      expiresAt,
    },
  });

  return record;
}

/**
 * Validates whether a user with given role and ID has permission to access or download the file.
 */
export async function canUserAccessFile(
  fileId: string,
  user: { userId: string; role: UserRole; institutionId?: string | null }
): Promise<{ allowed: boolean; file?: any; reason?: string }> {
  const file = await prisma.fileAttachment.findUnique({
    where: { id: fileId },
  });

  if (!file) {
    return { allowed: false, reason: 'File not found' };
  }

  // Soft deleted check
  if (file.deletedAt) {
    return { allowed: false, reason: 'File has been deleted' };
  }

  // Super admin can access anything
  if (user.role === 'SUPER_ADMIN') {
    return { allowed: true, file };
  }

  // Public files can be accessed by any authenticated user
  if (file.isPublic) {
    return { allowed: true, file };
  }

  // Owner can access their own files
  if (file.uploadedById === user.userId) {
    return { allowed: true, file };
  }

  // Staff (TPO / INSTITUTE_ADMIN) can access files from their institution
  if (
    ['TPO', 'INSTITUTE_ADMIN', 'FACULTY'].includes(user.role) &&
    user.institutionId &&
    file.institutionId === user.institutionId
  ) {
    return { allowed: true, file };
  }

  return { allowed: false, reason: 'Access denied: You do not own this document.' };
}

/**
 * Validates whether a user can delete a file.
 */
export async function canUserDeleteFile(
  fileId: string,
  user: { userId: string; role: UserRole; institutionId?: string | null }
): Promise<{ allowed: boolean; file?: any; reason?: string }> {
  const file = await prisma.fileAttachment.findUnique({
    where: { id: fileId },
  });

  if (!file) {
    return { allowed: false, reason: 'File not found' };
  }

  if (user.role === 'SUPER_ADMIN') {
    return { allowed: true, file };
  }

  if (file.uploadedById === user.userId) {
    return { allowed: true, file };
  }

  if (
    ['TPO', 'INSTITUTE_ADMIN'].includes(user.role) &&
    user.institutionId &&
    file.institutionId === user.institutionId
  ) {
    return { allowed: true, file };
  }

  return { allowed: false, reason: 'Access denied: You cannot delete this document.' };
}

/**
 * Runs retention sweep, soft-deleting or purging files whose retention period has expired.
 */
export async function runRetentionCleanup(): Promise<{
  purgedCount: number;
  fileIds: string[];
}> {
  const now = new Date();
  const expiredFiles = await prisma.fileAttachment.findMany({
    where: {
      expiresAt: { lte: now },
      deletedAt: null,
    },
    select: { id: true, fileKey: true, fileName: true },
    take: 100,
  });

  const ids = expiredFiles.map((f) => f.id);

  if (ids.length > 0) {
    await prisma.fileAttachment.updateMany({
      where: { id: { in: ids } },
      data: { deletedAt: now },
    });

    await prisma.auditLog.create({
      data: {
        action: 'RETENTION_CLEANUP',
        details: JSON.stringify({
          purgedCount: ids.length,
          files: expiredFiles.map((f) => ({ id: f.id, key: f.fileKey, name: f.fileName })),
        }),
      },
    });
  }

  return { purgedCount: ids.length, fileIds: ids };
}
