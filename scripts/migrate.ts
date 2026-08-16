import fs from 'fs';
import path from 'path';
import { getFirestoreClient, getCloudConfig } from '../server/cloud.js';
import { executeDryRun } from './dry_run.js';

/**
 * Migration tool for importing cinevora_data.json into Firestore Native collections.
 * Uses safe batches <= 450 items per write transaction.
 */
export async function runFirestoreMigration(): Promise<{
  success: boolean;
  totalImported: number;
  collections: Record<string, number>;
  error?: string;
}> {
  // 1. Run Pre-Flight Dry Run
  const dryRun = executeDryRun();
  if (dryRun.dryRunStatus !== 'PASSED' || dryRun.readyForMigration !== 'YES') {
    throw new Error(`Migration halted: Pre-flight dry run failed with ${dryRun.migrationBlockersCount} blockers.`);
  }

  const dataPath = path.join(process.cwd(), 'cinevora_data.json');
  const raw = fs.readFileSync(dataPath, 'utf-8');
  const data = JSON.parse(raw);

  const db = getFirestoreClient();
  const collectionsImported: Record<string, number> = {};
  let totalImported = 0;

  // Helper to commit in safe batches <= 450 items
  async function batchSetDocuments(collectionName: string, items: any[]) {
    if (!items || items.length === 0) return 0;
    const CHUNK_SIZE = 400; // Well below 450 limit
    let count = 0;

    for (let i = 0; i < items.length; i += CHUNK_SIZE) {
      const chunk = items.slice(i, i + CHUNK_SIZE);
      const batch = db.batch();

      for (const item of chunk) {
        if (!item.id) continue;
        const docRef = db.collection(collectionName).doc(item.id);
        batch.set(docRef, item, { merge: true });
        count++;
      }

      await batch.commit();
    }

    collectionsImported[collectionName] = count;
    totalImported += count;
    return count;
  }

  try {
    // 1. Anime
    await batchSetDocuments('anime', data.anime || []);

    // 2. Episodes
    await batchSetDocuments('episodes', data.episodes || []);

    // 3. Comments
    await batchSetDocuments('comments', data.comments || []);

    // 4. Users
    await batchSetDocuments('users', data.users || []);

    // 5. Ads
    await batchSetDocuments('ads', data.ads || []);

    // 6. Screenshots
    await batchSetDocuments('screenshots', data.screenshots || []);

    // 7. Admin Activity
    await batchSetDocuments('admin_activity', data.admin_activity || []);

    // 8. Watch History
    await batchSetDocuments('watch_history', data.watch_history || []);

    // 9. Settings documents (single documents inside 'settings' collection)
    const settingsBatch = db.batch();
    let settingsCount = 0;
    ['page_settings', 'ad_settings', 'ad_slots', 'security_settings'].forEach(key => {
      if (data[key]) {
        const docRef = db.collection('settings').doc(key);
        settingsBatch.set(docRef, { key, data: data[key], updated_at: new Date().toISOString() }, { merge: true });
        settingsCount++;
      }
    });

    if (settingsCount > 0) {
      await settingsBatch.commit();
      collectionsImported['settings'] = settingsCount;
      totalImported += settingsCount;
    }

    return {
      success: true,
      totalImported,
      collections: collectionsImported,
    };
  } catch (err: any) {
    return {
      success: false,
      totalImported,
      collections: collectionsImported,
      error: err.message || String(err),
    };
  }
}
