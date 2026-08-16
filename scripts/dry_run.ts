import fs from 'fs';
import path from 'path';

export interface DryRunReport {
  dryRunStatus: 'PASSED' | 'FAILED';
  timestamp: string;
  totalRecords: number;
  collectionsBreakdown: Record<string, number>;
  invalidRecordsCount: number;
  invalidRecords: Array<{ collection: string; id?: string; error: string }>;
  duplicateIdsCount: number;
  duplicateIds: Array<{ id: string; collection: string; existingCollection: string }>;
  brokenReferencesCount: number;
  brokenReferences: Array<{ collection: string; id: string; field: string; target: string }>;
  mediaFilesFound: number;
  mediaFilesList: string[];
  base64FilesFound: number;
  base64Locations: Array<{ collection: string; id: string; field: string }>;
  migrationBlockersCount: number;
  migrationBlockers: string[];
  readyForMigration: 'YES' | 'NO';
}

export function executeDryRun(): DryRunReport {
  const dataPath = path.join(process.cwd(), 'cinevora_data.json');
  if (!fs.existsSync(dataPath)) {
    throw new Error('cinevora_data.json was not found.');
  }

  const raw = fs.readFileSync(dataPath, 'utf-8');
  const data = JSON.parse(raw);

  const report: DryRunReport = {
    dryRunStatus: 'PASSED',
    timestamp: new Date().toISOString(),
    totalRecords: 0,
    collectionsBreakdown: {},
    invalidRecordsCount: 0,
    invalidRecords: [],
    duplicateIdsCount: 0,
    duplicateIds: [],
    brokenReferencesCount: 0,
    brokenReferences: [],
    mediaFilesFound: 0,
    mediaFilesList: [],
    base64FilesFound: 0,
    base64Locations: [],
    migrationBlockersCount: 0,
    migrationBlockers: [],
    readyForMigration: 'YES',
  };

  const idRegistry = new Map<string, string>();
  function trackId(id: string, collection: string) {
    if (!id || typeof id !== 'string' || id.trim() === '') {
      report.invalidRecordsCount++;
      report.invalidRecords.push({ collection, id, error: 'Missing or invalid string ID' });
      return false;
    }
    if (idRegistry.has(id)) {
      report.duplicateIdsCount++;
      report.duplicateIds.push({ id, collection, existingCollection: idRegistry.get(id)! });
      return false;
    }
    idRegistry.set(id, collection);
    return true;
  }

  const animeMap = new Map<string, any>();

  // 1. Anime
  const animes = data.anime || [];
  report.collectionsBreakdown['anime'] = animes.length;
  report.totalRecords += animes.length;

  animes.forEach((a: any) => {
    trackId(a.id, 'anime');
    if (a.id) animeMap.set(a.id, a);

    if (!a.title || typeof a.title !== 'string') {
      report.invalidRecordsCount++;
      report.invalidRecords.push({ collection: 'anime', id: a.id, error: 'Missing or non-string title' });
    }

    ['poster', 'backdrop', 'banner', 'thumbnail', 'banner_image_url', 'poster_image_url'].forEach(field => {
      if (a[field] && typeof a[field] === 'string' && a[field].startsWith('data:')) {
        report.base64FilesFound++;
        report.base64Locations.push({ collection: 'anime', id: a.id, field });
      }
    });
  });

  // 2. Episodes
  const episodes = data.episodes || [];
  report.collectionsBreakdown['episodes'] = episodes.length;
  report.totalRecords += episodes.length;

  episodes.forEach((ep: any) => {
    trackId(ep.id, 'episodes');

    if (!ep.anime_id || !animeMap.has(ep.anime_id)) {
      report.brokenReferencesCount++;
      report.brokenReferences.push({ collection: 'episodes', id: ep.id, field: 'anime_id', target: ep.anime_id });
    }

    if (typeof ep.season_number !== 'number' || typeof ep.episode_number !== 'number') {
      report.invalidRecordsCount++;
      report.invalidRecords.push({ collection: 'episodes', id: ep.id, error: 'season_number or episode_number is not a number' });
    }

    if (ep.thumbnail && typeof ep.thumbnail === 'string' && ep.thumbnail.startsWith('data:')) {
      report.base64FilesFound++;
      report.base64Locations.push({ collection: 'episodes', id: ep.id, field: 'thumbnail' });
    }
  });

  // 3. Comments
  const comments = data.comments || [];
  report.collectionsBreakdown['comments'] = comments.length;
  report.totalRecords += comments.length;

  comments.forEach((c: any) => {
    trackId(c.id, 'comments');
    if (!c.anime_id || !animeMap.has(c.anime_id)) {
      report.brokenReferencesCount++;
      report.brokenReferences.push({ collection: 'comments', id: c.id, field: 'anime_id', target: c.anime_id });
    }
    if (!c.content || typeof c.content !== 'string') {
      report.invalidRecordsCount++;
      report.invalidRecords.push({ collection: 'comments', id: c.id, error: 'Missing comment content' });
    }
  });

  // 4. Users
  const users = data.users || [];
  report.collectionsBreakdown['users'] = users.length;
  report.totalRecords += users.length;

  users.forEach((u: any) => {
    trackId(u.id, 'users');
    if (!u.email || !u.username) {
      report.invalidRecordsCount++;
      report.invalidRecords.push({ collection: 'users', id: u.id, error: 'Missing email or username' });
    }
  });

  // 5. Ads
  const ads = data.ads || [];
  report.collectionsBreakdown['ads'] = ads.length;
  report.totalRecords += ads.length;

  ads.forEach((ad: any) => {
    trackId(ad.id, 'ads');
    if (Array.isArray(ad.target_anime_ids)) {
      ad.target_anime_ids.forEach((tId: string) => {
        if (!animeMap.has(tId)) {
          report.brokenReferencesCount++;
          report.brokenReferences.push({ collection: 'ads', id: ad.id, field: 'target_anime_ids', target: tId });
        }
      });
    }
  });

  // 6. Screenshots
  const screenshots = data.screenshots || [];
  report.collectionsBreakdown['screenshots'] = screenshots.length;
  report.totalRecords += screenshots.length;

  screenshots.forEach((scr: any) => {
    trackId(scr.id, 'screenshots');
    if (!scr.anime_id || !animeMap.has(scr.anime_id)) {
      report.brokenReferencesCount++;
      report.brokenReferences.push({ collection: 'screenshots', id: scr.id, field: 'anime_id', target: scr.anime_id });
    }
  });

  // 7. Settings
  ['page_settings', 'ad_settings', 'ad_slots', 'security_settings'].forEach(settingKey => {
    if (data[settingKey]) {
      report.collectionsBreakdown[settingKey] = 1;
      report.totalRecords += 1;
    }
  });

  // 8. Admin Activity
  const adminActivity = data.admin_activity || [];
  report.collectionsBreakdown['admin_activity'] = adminActivity.length;
  report.totalRecords += adminActivity.length;

  adminActivity.forEach((act: any) => {
    trackId(act.id, 'admin_activity');
  });

  // 9. Watch History
  const watchHistory = data.watch_history || [];
  report.collectionsBreakdown['watch_history'] = watchHistory.length;
  report.totalRecords += watchHistory.length;

  watchHistory.forEach((wh: any) => {
    trackId(wh.id, 'watch_history');
  });

  // 10. Check local uploads folder
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  if (fs.existsSync(uploadsDir)) {
    const files = fs.readdirSync(uploadsDir);
    report.mediaFilesFound = files.length;
    report.mediaFilesList = files;
  }

  if (report.invalidRecordsCount > 0 || report.duplicateIdsCount > 0 || report.brokenReferencesCount > 0) {
    report.migrationBlockersCount = report.invalidRecordsCount + report.duplicateIdsCount + report.brokenReferencesCount;
    report.migrationBlockers.push('Structural defects or broken foreign keys detected in source JSON.');
    report.dryRunStatus = 'FAILED';
    report.readyForMigration = 'NO';
  }

  return report;
}

if (process.argv[1] && process.argv[1].endsWith('dry_run.ts')) {
  const result = executeDryRun();
  console.log(JSON.stringify(result, null, 2));
}
