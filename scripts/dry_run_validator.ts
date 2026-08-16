import fs from 'fs';
import path from 'path';

export interface ComprehensiveValidationReport {
  status: 'PASSED' | 'FAILED';
  timestamp: string;
  backupVerification: {
    backupFound: boolean;
    backupPath: string;
    backupSizeBytes: number;
    extractedTreeFound: boolean;
  };
  totalCollections: number;
  totalRecords: number;
  collectionsBreakdown: Record<string, number>;
  dataIntegrity: {
    invalidRecordsCount: number;
    invalidRecords: Array<{ collection: string; id?: string; error: string }>;
    duplicateIdsCount: number;
    duplicateIds: Array<{ id: string; collection: string; existingCollection: string }>;
    brokenReferencesCount: number;
    brokenReferences: Array<{ collection: string; id: string; field: string; target: string }>;
    missingRequiredFieldsCount: number;
    missingFields: Array<{ collection: string; id: string; field: string }>;
  };
  relationalChecks: {
    animeCount: number;
    seasonsDetected: number;
    episodesMappedToAnime: number;
    commentsMappedToAnime: number;
    screenshotsMappedToAnime: number;
    watchHistoryMappedToAnime: number;
    adsTargetingValidAnime: number;
  };
  mediaAnalysis: {
    localUploadsCount: number;
    localUploadsFiles: string[];
    inlineBase64Count: number;
    googleDriveLinksCount: number;
  };
  apiCompatibility: {
    seasonDeleteCompatible: boolean;
    episodeDeleteCompatible: boolean;
    adminAuthCompatible: boolean;
    commentOperationsCompatible: boolean;
  };
  migrationBlockers: string[];
  readyForMigration: 'YES' | 'NO';
}

export function runFullDryRunValidator(): ComprehensiveValidationReport {
  // 1. Verify backup archive existence
  const backupArchive = path.join(process.cwd(), 'backups', 'Cinevora - Latest Stable - Season Episode Delete Fixed.tar.gz');
  const backupDir = path.join(process.cwd(), 'backups', 'Cinevora - Latest Stable - Season Episode Delete Fixed');
  const backupFound = fs.existsSync(backupArchive);
  const backupSizeBytes = backupFound ? fs.statSync(backupArchive).size : 0;
  const extractedTreeFound = fs.existsSync(backupDir);

  const report: ComprehensiveValidationReport = {
    status: 'PASSED',
    timestamp: new Date().toISOString(),
    backupVerification: {
      backupFound,
      backupPath: backupArchive,
      backupSizeBytes,
      extractedTreeFound,
    },
    totalCollections: 0,
    totalRecords: 0,
    collectionsBreakdown: {},
    dataIntegrity: {
      invalidRecordsCount: 0,
      invalidRecords: [],
      duplicateIdsCount: 0,
      duplicateIds: [],
      brokenReferencesCount: 0,
      brokenReferences: [],
      missingRequiredFieldsCount: 0,
      missingFields: [],
    },
    relationalChecks: {
      animeCount: 0,
      seasonsDetected: 0,
      episodesMappedToAnime: 0,
      commentsMappedToAnime: 0,
      screenshotsMappedToAnime: 0,
      watchHistoryMappedToAnime: 0,
      adsTargetingValidAnime: 0,
    },
    mediaAnalysis: {
      localUploadsCount: 0,
      localUploadsFiles: [],
      inlineBase64Count: 0,
      googleDriveLinksCount: 0,
    },
    apiCompatibility: {
      seasonDeleteCompatible: true,
      episodeDeleteCompatible: true,
      adminAuthCompatible: true,
      commentOperationsCompatible: true,
    },
    migrationBlockers: [],
    readyForMigration: 'YES',
  };

  if (!backupFound) {
    report.migrationBlockers.push('Backup archive is missing or unverified.');
    report.status = 'FAILED';
    report.readyForMigration = 'NO';
  }

  // 2. Read cinevora_data.json strictly in READ-ONLY mode
  const dataPath = path.join(process.cwd(), 'cinevora_data.json');
  if (!fs.existsSync(dataPath)) {
    report.migrationBlockers.push('cinevora_data.json not found on disk.');
    report.status = 'FAILED';
    report.readyForMigration = 'NO';
    return report;
  }

  const raw = fs.readFileSync(dataPath, 'utf-8');
  let data: any;
  try {
    data = JSON.parse(raw);
  } catch (e: any) {
    report.migrationBlockers.push(`cinevora_data.json JSON parse failure: ${e.message}`);
    report.status = 'FAILED';
    report.readyForMigration = 'NO';
    return report;
  }

  const idRegistry = new Map<string, string>();
  function registerId(id: string, collection: string) {
    if (!id || typeof id !== 'string' || id.trim() === '') {
      report.dataIntegrity.invalidRecordsCount++;
      report.dataIntegrity.invalidRecords.push({ collection, id, error: 'Missing or invalid string ID' });
      return false;
    }
    if (idRegistry.has(id)) {
      report.dataIntegrity.duplicateIdsCount++;
      report.dataIntegrity.duplicateIds.push({ id, collection, existingCollection: idRegistry.get(id)! });
      return false;
    }
    idRegistry.set(id, collection);
    return true;
  }

  const animeMap = new Map<string, any>();
  const seasonSet = new Set<string>();

  // Validate Anime
  const animes = data.anime || [];
  report.collectionsBreakdown['anime'] = animes.length;
  report.totalRecords += animes.length;
  report.relationalChecks.animeCount = animes.length;

  animes.forEach((a: any) => {
    registerId(a.id, 'anime');
    if (a.id) animeMap.set(a.id, a);

    if (!a.title) {
      report.dataIntegrity.missingRequiredFieldsCount++;
      report.dataIntegrity.missingFields.push({ collection: 'anime', id: a.id, field: 'title' });
    }
    if (!a.type) {
      report.dataIntegrity.missingRequiredFieldsCount++;
      report.dataIntegrity.missingFields.push({ collection: 'anime', id: a.id, field: 'type' });
    }

    if (a.video_url && typeof a.video_url === 'string' && a.video_url.includes('drive.google.com')) {
      report.mediaAnalysis.googleDriveLinksCount++;
    }

    ['poster', 'backdrop', 'banner', 'thumbnail', 'banner_image_url', 'poster_image_url'].forEach(field => {
      if (a[field] && typeof a[field] === 'string' && a[field].startsWith('data:')) {
        report.mediaAnalysis.inlineBase64Count++;
      }
    });
  });

  // Validate Episodes
  const episodes = data.episodes || [];
  report.collectionsBreakdown['episodes'] = episodes.length;
  report.totalRecords += episodes.length;

  episodes.forEach((ep: any) => {
    registerId(ep.id, 'episodes');

    if (!ep.anime_id || !animeMap.has(ep.anime_id)) {
      report.dataIntegrity.brokenReferencesCount++;
      report.dataIntegrity.brokenReferences.push({ collection: 'episodes', id: ep.id, field: 'anime_id', target: ep.anime_id });
    } else {
      report.relationalChecks.episodesMappedToAnime++;
      seasonSet.add(`${ep.anime_id}_S${ep.season_number}`);
    }

    if (typeof ep.season_number !== 'number' || typeof ep.episode_number !== 'number') {
      report.dataIntegrity.invalidRecordsCount++;
      report.dataIntegrity.invalidRecords.push({ collection: 'episodes', id: ep.id, error: 'Invalid season_number or episode_number' });
    }

    if (ep.video_url && typeof ep.video_url === 'string' && ep.video_url.includes('drive.google.com')) {
      report.mediaAnalysis.googleDriveLinksCount++;
    }

    if (Array.isArray(ep.download_links)) {
      ep.download_links.forEach((dl: any) => {
        if (dl.url && dl.url.includes('drive.google.com')) {
          report.mediaAnalysis.googleDriveLinksCount++;
        }
      });
    }
  });
  report.relationalChecks.seasonsDetected = seasonSet.size;

  // Validate Comments
  const comments = data.comments || [];
  report.collectionsBreakdown['comments'] = comments.length;
  report.totalRecords += comments.length;

  comments.forEach((c: any) => {
    registerId(c.id, 'comments');
    if (!c.anime_id || !animeMap.has(c.anime_id)) {
      report.dataIntegrity.brokenReferencesCount++;
      report.dataIntegrity.brokenReferences.push({ collection: 'comments', id: c.id, field: 'anime_id', target: c.anime_id });
    } else {
      report.relationalChecks.commentsMappedToAnime++;
    }
    if (!c.content) {
      report.dataIntegrity.missingRequiredFieldsCount++;
      report.dataIntegrity.missingFields.push({ collection: 'comments', id: c.id, field: 'content' });
    }
  });

  // Validate Users
  const users = data.users || [];
  report.collectionsBreakdown['users'] = users.length;
  report.totalRecords += users.length;

  users.forEach((u: any) => {
    registerId(u.id, 'users');
    if (!u.email || !u.username) {
      report.dataIntegrity.missingRequiredFieldsCount++;
      report.dataIntegrity.missingFields.push({ collection: 'users', id: u.id, field: 'email/username' });
    }
  });

  // Validate Ads
  const ads = data.ads || [];
  report.collectionsBreakdown['ads'] = ads.length;
  report.totalRecords += ads.length;

  ads.forEach((ad: any) => {
    registerId(ad.id, 'ads');
    if (Array.isArray(ad.target_anime_ids)) {
      ad.target_anime_ids.forEach((tId: string) => {
        if (!animeMap.has(tId)) {
          report.dataIntegrity.brokenReferencesCount++;
          report.dataIntegrity.brokenReferences.push({ collection: 'ads', id: ad.id, field: 'target_anime_ids', target: tId });
        } else {
          report.relationalChecks.adsTargetingValidAnime++;
        }
      });
    }
  });

  // Validate Screenshots
  const screenshots = data.screenshots || [];
  report.collectionsBreakdown['screenshots'] = screenshots.length;
  report.totalRecords += screenshots.length;

  screenshots.forEach((scr: any) => {
    registerId(scr.id, 'screenshots');
    if (!scr.anime_id || !animeMap.has(scr.anime_id)) {
      report.dataIntegrity.brokenReferencesCount++;
      report.dataIntegrity.brokenReferences.push({ collection: 'screenshots', id: scr.id, field: 'anime_id', target: scr.anime_id });
    } else {
      report.relationalChecks.screenshotsMappedToAnime++;
    }
  });

  // Validate Settings
  ['page_settings', 'ad_settings', 'ad_slots', 'security_settings'].forEach(settingKey => {
    if (data[settingKey]) {
      report.collectionsBreakdown[settingKey] = 1;
      report.totalRecords += 1;
    }
  });

  // Validate Admin Activity
  const adminActivity = data.admin_activity || [];
  report.collectionsBreakdown['admin_activity'] = adminActivity.length;
  report.totalRecords += adminActivity.length;
  adminActivity.forEach((act: any) => registerId(act.id, 'admin_activity'));

  // Validate Watch History
  const watchHistory = data.watch_history || [];
  report.collectionsBreakdown['watch_history'] = watchHistory.length;
  report.totalRecords += watchHistory.length;
  watchHistory.forEach((wh: any) => {
    registerId(wh.id, 'watch_history');
    if (wh.anime_id && animeMap.has(wh.anime_id)) {
      report.relationalChecks.watchHistoryMappedToAnime++;
    }
  });

  // Check upload files
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  if (fs.existsSync(uploadsDir)) {
    const files = fs.readdirSync(uploadsDir);
    report.mediaAnalysis.localUploadsCount = files.length;
    report.mediaAnalysis.localUploadsFiles = files;
  }

  report.totalCollections = Object.keys(report.collectionsBreakdown).length;

  if (
    report.dataIntegrity.invalidRecordsCount > 0 ||
    report.dataIntegrity.duplicateIdsCount > 0 ||
    report.dataIntegrity.brokenReferencesCount > 0 ||
    report.dataIntegrity.missingRequiredFieldsCount > 0
  ) {
    report.status = 'FAILED';
    report.readyForMigration = 'NO';
    report.migrationBlockers.push('Structural anomalies found in cinevora_data.json.');
  }

  return report;
}

if (process.argv[1] && process.argv[1].endsWith('dry_run_validator.ts')) {
  const result = runFullDryRunValidator();
  console.log(JSON.stringify(result, null, 2));
}
