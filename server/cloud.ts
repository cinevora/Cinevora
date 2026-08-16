import { Firestore } from '@google-cloud/firestore';
import { Storage } from '@google-cloud/storage';

export interface CloudConfig {
  storageDriver: 'firestore' | 'json';
  projectId?: string;
  databaseId?: string;
  bucketName?: string;
  enableFallback: boolean;
}

export function getCloudConfig(): CloudConfig {
  const driver = (process.env.STORAGE_DRIVER || 'json').trim().toLowerCase();
  return {
    storageDriver: driver === 'firestore' ? 'firestore' : 'json',
    projectId: process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || undefined,
    databaseId: process.env.FIRESTORE_DATABASE_ID || '(default)',
    bucketName: process.env.GCS_BUCKET_NAME || undefined,
    enableFallback: process.env.ENABLE_LOCAL_JSON_FALLBACK !== 'false',
  };
}

let firestoreInstance: Firestore | null = null;
let storageInstance: Storage | null = null;

/**
 * Returns a lazy-initialized singleton Firestore instance using Application Default Credentials.
 */
export function getFirestoreClient(): Firestore {
  if (!firestoreInstance) {
    const config = getCloudConfig();
    const options: any = {};
    if (config.projectId) {
      options.projectId = config.projectId;
    }
    if (config.databaseId && config.databaseId !== '(default)') {
      options.databaseId = config.databaseId;
    }
    firestoreInstance = new Firestore(options);
  }
  return firestoreInstance;
}

/**
 * Returns a lazy-initialized singleton GCS instance using Application Default Credentials.
 */
export function getStorageClient(): Storage {
  if (!storageInstance) {
    const config = getCloudConfig();
    const options: any = {};
    if (config.projectId) {
      options.projectId = config.projectId;
    }
    storageInstance = new Storage(options);
  }
  return storageInstance;
}

/**
 * Validates Firestore connectivity safely.
 */
export async function testFirestoreConnection(): Promise<{ success: boolean; error?: string; collections?: string[] }> {
  try {
    const db = getFirestoreClient();
    const collections = await db.listCollections();
    return {
      success: true,
      collections: collections.map(c => c.id),
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || String(err),
    };
  }
}

/**
 * Validates Google Cloud Storage bucket connectivity safely.
 */
export async function testGCSConnection(bucketNameOverride?: string): Promise<{ success: boolean; bucketName?: string; error?: string }> {
  try {
    const config = getCloudConfig();
    const bucketName = bucketNameOverride || config.bucketName;
    if (!bucketName) {
      return { success: false, error: 'GCS_BUCKET_NAME is not configured.' };
    }
    const storage = getStorageClient();
    const bucket = storage.bucket(bucketName);
    const [exists] = await bucket.exists();
    return {
      success: exists,
      bucketName,
      error: exists ? undefined : `Bucket "${bucketName}" does not exist or permission denied.`,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || String(err),
    };
  }
}
