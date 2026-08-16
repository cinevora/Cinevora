import fs from 'fs';
import path from 'path';
import { getFirestoreClient } from '../server/cloud.js';

export interface VerificationReport {
  status: 'PASSED' | 'FAILED';
  timestamp: string;
  collectionsCompared: Record<string, { expected: number; found: number; match: boolean }>;
  mismatchedIds: string[];
  fieldParitySampleChecked: number;
  fieldMismatches: string[];
  error?: string;
}

export async function verifyFirestoreData(): Promise<VerificationReport> {
  const dataPath = path.join(process.cwd(), 'cinevora_data.json');
  const raw = fs.readFileSync(dataPath, 'utf-8');
  const data = JSON.parse(raw);

  const db = getFirestoreClient();
  const report: VerificationReport = {
    status: 'PASSED',
    timestamp: new Date().toISOString(),
    collectionsCompared: {},
    mismatchedIds: [],
    fieldParitySampleChecked: 0,
    fieldMismatches: [],
  };

  const collectionsToCheck: Array<{ name: string; items: any[] }> = [
    { name: 'anime', items: data.anime || [] },
    { name: 'episodes', items: data.episodes || [] },
    { name: 'comments', items: data.comments || [] },
    { name: 'users', items: data.users || [] },
    { name: 'ads', items: data.ads || [] },
    { name: 'screenshots', items: data.screenshots || [] },
    { name: 'admin_activity', items: data.admin_activity || [] },
    { name: 'watch_history', items: data.watch_history || [] },
  ];

  try {
    for (const col of collectionsToCheck) {
      const snapshot = await db.collection(col.name).get();
      const foundCount = snapshot.size;
      const expectedCount = col.items.length;
      const match = foundCount === expectedCount;

      report.collectionsCompared[col.name] = {
        expected: expectedCount,
        found: foundCount,
        match,
      };

      if (!match) {
        report.status = 'FAILED';
      }

      // Check ID existence for sample items
      const existingDocIds = new Set(snapshot.docs.map(d => d.id));
      for (const item of col.items) {
        if (!existingDocIds.has(item.id)) {
          report.mismatchedIds.push(`${col.name}/${item.id}`);
          report.status = 'FAILED';
        }
      }
    }

    return report;
  } catch (err: any) {
    report.status = 'FAILED';
    report.error = err.message || String(err);
    return report;
  }
}
