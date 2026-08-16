import { db } from './server/db.js';
const slots = [
  'DOWNLOAD_INTERSTITIAL_TOP', 
  'DOWNLOAD_INTERSTITIAL_MIDDLE', 
  'DOWNLOAD_INTERSTITIAL_ABOVE_COUNTDOWN'
];
let created = false;
for (const slot of slots) {
  const existing = db.getAdsForSlot(slot);
  if (existing.length === 0) {
    db.createAd({
      name: `TEST AD FOR ${slot}`,
      type: 'HTML',
      slot: slot,
      status: 'ACTIVE',
      priority: 100,
      frequency: 'PAGE_VIEW',
      scope: 'GLOBAL',
      code: `<div style="width:100%;height:250px;padding:20px;text-align:center;background:#111;color:#38bdf8;font-size:20px;font-weight:bold;border: 1px solid #38bdf8; display:flex; align-items:center; justify-content:center;">ADVERTISEMENT<br/>${slot}</div>`
    });
    created = true;
    console.log('Created test ad for', slot);
  }
}
if (!created) {
  console.log('Test ads already exist.');
}
