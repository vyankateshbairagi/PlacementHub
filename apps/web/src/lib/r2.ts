import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucketName = process.env.R2_BUCKET_NAME || 'careeros-documents';
const publicUrl = process.env.R2_PUBLIC_URL || 'https://pub-careeros.r2.dev';

export const isR2Configured = Boolean(
  accountId && accessKeyId && secretAccessKey
);

let s3ClientInstance: S3Client | null = null;

if (isR2Configured) {
  s3ClientInstance = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: accessKeyId!,
      secretAccessKey: secretAccessKey!,
    },
  });
}

export interface UploadResult {
  url: string;
  key: string;
  storageProvider: 'cloudflare-r2' | 'local-fallback';
}

/**
 * Uploads a file buffer or base64 document to Cloudflare R2 (or fallback storage)
 */
export async function uploadDocument(
  fileBuffer: Buffer,
  filename: string,
  contentType: string,
  folder: 'resumes' | 'offers' | 'resources' | 'logos' = 'resumes'
): Promise<UploadResult> {
  const sanitizedName = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  const key = `${folder}/${Date.now()}_${sanitizedName}`;

  if (isR2Configured && s3ClientInstance) {
    try {
      await s3ClientInstance.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: key,
          Body: fileBuffer,
          ContentType: contentType,
        })
      );

      const url = `${publicUrl.replace(/\/$/, '')}/${key}`;
      return { url, key, storageProvider: 'cloudflare-r2' };
    } catch (err) {
      console.warn('⚠️ Cloudflare R2 upload failed, using fallback storage:', err);
    }
  }

  // Local / simulated fallback URL for seamless development
  const base64Sample = `data:${contentType};base64,${fileBuffer.toString('base64')}`;
  return {
    url: base64Sample.length < 32000 ? base64Sample : `/api/documents/preview?key=${encodeURIComponent(key)}`,
    key,
    storageProvider: 'local-fallback',
  };
}

/**
 * Generates a presigned download/view URL for a document in R2
 */
export async function getDocumentDownloadUrl(key: string, expiresInSeconds = 3600): Promise<string> {
  if (isR2Configured && s3ClientInstance) {
    try {
      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: key,
      });
      return await getSignedUrl(s3ClientInstance, command, { expiresIn: expiresInSeconds });
    } catch (e) {
      console.error('Error generating presigned URL:', e);
    }
  }

  return `${publicUrl}/${key}`;
}
