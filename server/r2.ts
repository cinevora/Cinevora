import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';

export interface R2Config {
  accountId?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  bucketName?: string;
  publicDomain?: string;
  isConfigured: boolean;
}

export function getR2Config(): R2Config {
  const accountId = (process.env.R2_ACCOUNT_ID || '').trim();
  const accessKeyId = (process.env.R2_ACCESS_KEY_ID || '').trim();
  const secretAccessKey = (process.env.R2_SECRET_ACCESS_KEY || '').trim();
  const bucketName = (process.env.R2_BUCKET_NAME || '').trim();
  const publicDomain = (process.env.R2_PUBLIC_DOMAIN || '').trim();

  const isConfigured = Boolean(accountId && accessKeyId && secretAccessKey && bucketName);

  return {
    accountId: accountId || undefined,
    accessKeyId: accessKeyId || undefined,
    secretAccessKey: secretAccessKey || undefined,
    bucketName: bucketName || undefined,
    publicDomain: publicDomain || undefined,
    isConfigured,
  };
}

let s3ClientInstance: S3Client | null = null;

/**
 * Returns a lazy-initialized S3Client configured for Cloudflare R2.
 */
export function getR2Client(): S3Client | null {
  const config = getR2Config();
  if (!config.isConfigured || !config.accountId || !config.accessKeyId || !config.secretAccessKey) {
    return null;
  }

  if (!s3ClientInstance) {
    s3ClientInstance = new S3Client({
      region: 'auto',
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  return s3ClientInstance;
}

export interface UploadResult {
  success: boolean;
  storage: 'r2' | 'local';
  url: string;
  key: string;
  error?: string;
}

/**
 * Uploads a file buffer or local file to Cloudflare R2 if configured,
 * or safely falls back to /public/uploads/ local directory.
 */
export async function uploadMedia(
  fileBuffer: Buffer,
  filename: string,
  mimeType: string,
  folder: 'screenshots' | 'posters' | 'banners' | 'uploads' = 'uploads'
): Promise<UploadResult> {
  const config = getR2Config();
  const client = getR2Client();

  const cleanFilename = path.basename(filename).replace(/[^a-zA-Z0-9_.-]/g, '_');
  const objectKey = `${folder}/${Date.now()}-${cleanFilename}`;

  // 1. Try R2 if configured
  if (client && config.bucketName) {
    try {
      await client.send(
        new PutObjectCommand({
          Bucket: config.bucketName,
          Key: objectKey,
          Body: fileBuffer,
          ContentType: mimeType,
        })
      );

      const publicUrl = config.publicDomain
        ? `${config.publicDomain.replace(/\/$/, '')}/${objectKey}`
        : `/uploads/${objectKey}`;

      return {
        success: true,
        storage: 'r2',
        url: publicUrl,
        key: objectKey,
      };
    } catch (err: any) {
      console.warn(`[R2 Storage] Upload to R2 failed (${err.message}). Falling back to local storage.`);
    }
  }

  // 2. Local disk fallback
  try {
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const localFilename = `${Date.now()}-${cleanFilename}`;
    const localFilePath = path.join(uploadsDir, localFilename);
    fs.writeFileSync(localFilePath, fileBuffer);

    return {
      success: true,
      storage: 'local',
      url: `/uploads/${localFilename}`,
      key: localFilename,
    };
  } catch (err: any) {
    return {
      success: false,
      storage: 'local',
      url: '',
      key: '',
      error: `Failed to save media locally: ${err.message}`,
    };
  }
}

/**
 * Deletes a media item from R2 and/or local storage safely.
 */
export async function deleteMedia(mediaUrlOrKey: string): Promise<{ success: boolean; deletedFrom: string[]; error?: string }> {
  const deletedFrom: string[] = [];
  if (!mediaUrlOrKey) return { success: true, deletedFrom };

  const config = getR2Config();
  const client = getR2Client();

  // Extract key
  let key = mediaUrlOrKey;
  if (key.startsWith('/uploads/')) {
    key = key.replace('/uploads/', '');
  } else if (key.startsWith('http://') || key.startsWith('https://')) {
    try {
      const urlObj = new URL(key);
      key = urlObj.pathname.replace(/^\//, '');
    } catch {}
  }

  // Delete from R2 if configured
  if (client && config.bucketName) {
    try {
      await client.send(
        new DeleteObjectCommand({
          Bucket: config.bucketName,
          Key: key,
        })
      );
      deletedFrom.push('r2');
    } catch (err: any) {
      console.warn(`[R2 Storage] Delete from R2 failed for key ${key}:`, err.message);
    }
  }

  // Delete from local disk
  try {
    const localName = path.basename(key);
    const localPath = path.join(process.cwd(), 'public', 'uploads', localName);
    if (fs.existsSync(localPath)) {
      fs.unlinkSync(localPath);
      deletedFrom.push('local');
    }
  } catch (err: any) {
    console.warn(`[Local Storage] Delete local file failed:`, err.message);
  }

  return { success: true, deletedFrom };
}

/**
 * Diagnostic test for Cloudflare R2 connectivity (read-only head check or list).
 */
export async function testR2Connection(): Promise<{ success: boolean; isConfigured: boolean; error?: string }> {
  const config = getR2Config();
  if (!config.isConfigured) {
    return { success: false, isConfigured: false, error: 'Cloudflare R2 is not configured in environment.' };
  }

  const client = getR2Client();
  if (!client || !config.bucketName) {
    return { success: false, isConfigured: true, error: 'Failed to initialize S3 client for R2.' };
  }

  try {
    // Attempt a light non-destructive head check
    await client.send(
      new HeadObjectCommand({
        Bucket: config.bucketName,
        Key: '__ping_check_non_existent__',
      })
    );
    return { success: true, isConfigured: true };
  } catch (err: any) {
    // If error is NotFound (404), credentials and bucket existence are valid!
    if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
      return { success: true, isConfigured: true };
    }
    return {
      success: false,
      isConfigured: true,
      error: `R2 connection check returned: ${err.message || String(err)}`,
    };
  }
}
