import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const DB_FILE = path.join(process.cwd(), 'cinevora_data.json');

export interface User {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  role: 'USER' | 'EDITOR' | 'SUPER_ADMIN';
  status: 'ACTIVE' | 'SUSPENDED';
  avatar: string;
  created_at: string;
}


export interface Comment {
  id: string;
  anime_id: string;
  username: string;
  content: string;
  created_at: string;
}

export interface AnimeScreenshot {
  id: string;
  anime_id: string;
  image_url: string;
  display_order: number;
  status: 'ENABLED' | 'DISABLED';
  created_at: string;
  updated_at: string;
}

export interface DownloadLink {
  id: string;
  anime_id: string;
  host_name: string;
  label: string;
  url: string;
  enabled: boolean;
  order?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Anime {
  id: string;
  title: string;
  slug: string;
  description: string;
  poster: string;
  backdrop: string;
  banner: string;
  thumbnail?: string;
  genres: string[];
  year: number;
  rating: number; // e.g. 8.9
  type: 'ANIME' | 'MOVIE' | 'SERIES';
  status: 'ONGOING' | 'COMPLETED';
  language: string;
  duration?: string;
  trailer_url: string;
  video_url: string;
  download_links?: DownloadLink[];
  is_featured: boolean;
  is_trending: boolean;
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string;
  created_at: string;
  updated_at?: string;
}

export interface EpisodeQualityMirror {
  id: string;
  name: string;
  url: string;
  drive_file_id?: string;
  enabled?: boolean;
}

export interface EpisodeQuality {
  id: string;
  quality: string;
  codec?: string;
  size?: string;
  video_url: string;
  drive_file_id?: string;
  mirrors?: EpisodeQualityMirror[];
  status: 'PUBLISHED' | 'UNPUBLISHED';
}

export interface Episode {

  id: string;
  anime_id: string;
  season_number: number;
  episode_number: number;
  title: string;
  description: string;
  thumbnail: string;
  duration: string;
  video_url: string;
  drive_file_id?: string;
  subtitle_url?: string;
  is_published?: boolean;
  status?: 'PUBLISHED' | 'UNPUBLISHED';
  download_links?: DownloadLink[];
    qualities?: EpisodeQuality[];
  created_at?: string;
  updated_at?: string;
}

export interface StagePageConfig {
  title: string;
  heading: string;
  description: string;
  button_text?: string;
  custom_text?: string;
  bg_image_url?: string;
  bg_color?: string;
  countdown_seconds: number;
  ads_enabled?: boolean;
  top_ad_slot?: string;
  middle_ad_slot?: string;
  bottom_ad_slot?: string;
  before_timer_ad_slot?: string;
  after_timer_ad_slot?: string;
}

export interface PageSettingsConfig {
  download_step1: StagePageConfig;
  episode_selection: StagePageConfig;
  episode_download: StagePageConfig;
  final_download_links: StagePageConfig;
}

export interface WatchHistory {
  id: string;
  user_id: string;
  anime_id: string;
  episode_id?: string;
  progress_seconds: number;
  watched_at: string;
}

export interface Watchlist {
  id: string;
  user_id: string;
  anime_id: string;
  added_at: string;
}

export interface Favorite {
  id: string;
  user_id: string;
  anime_id: string;
  added_at: string;
}

export interface AdminActivity {
  id: string;
  admin_id: string;
  admin_name: string;
  action: string;
  details: string;
  timestamp: string;
  ip: string;
}

export interface Settings {
  site_name: string;
  logo_url: string;
  maintenance_mode: boolean;
  contact_email: string;
  featured_anime_id: string;
}

export type AdType = 'BANNER' | 'IMAGE' | 'HTML' | 'EXTERNAL_URL' | 'CUSTOM_EMBED';
export type AdStatus = 'ACTIVE' | 'INACTIVE';
export type AdRotation = 'RANDOM' | 'PRIORITY' | 'SEQUENTIAL';
export type AdFrequency = 'SESSION' | 'PAGE_VIEW' | 'EVERY_X_PAGE_VIEWS' | 'EVERY_X_MINUTES';
export type AdScope = 'GLOBAL' | 'ANIME' | 'EPISODE';

export interface Ad {
  id: string;
  name: string;
  type: AdType;
  scope?: AdScope;
  anime_id?: string;
  episode_id?: string;
  code?: string;
  image_url?: string;
  target_url?: string;
  title?: string;
  description?: string;
  slot: string;
  status: AdStatus;
  priority: number;
  frequency: AdFrequency;
  frequency_value?: number;
  start_date?: string;
  end_date?: string;
  impressions: number;
  clicks: number;
  last_displayed?: string;
  last_clicked?: string;
  created_at: string;
  updated_at: string;
}

export interface AdSlotConfig {
  slot: string;
  name: string;
  enabled: boolean;
  section: 'HOME' | 'ANIME' | 'MOVIE' | 'SERIES' | 'DETAILS' | 'WATCH' | 'DOWNLOAD_GATEWAY' | 'DOWNLOAD_INTERSTITIAL' | 'EPISODE_DOWNLOAD_PAGE' | 'HOSTING_LINKS_PAGE' | 'SEARCH';
}

export interface AdSettings {
  enabled: boolean;
  default_rotation: AdRotation;
  default_frequency: AdFrequency;
  section_enabled: {
    HOME: boolean;
    ANIME: boolean;
    MOVIE: boolean;
    SERIES: boolean;
    DETAILS: boolean;
    WATCH: boolean;
    DOWNLOAD_GATEWAY: boolean;
    DOWNLOAD_INTERSTITIAL?: boolean;
    EPISODE_DOWNLOAD_PAGE?: boolean;
    HOSTING_LINKS_PAGE?: boolean;
    SEARCH: boolean;
  };
}

export interface DBData {
  users: User[];
  anime: Anime[];
  episodes: Episode[];
  watch_history: WatchHistory[];
  watchlist: Watchlist[];
  favorites: Favorite[];
  admin_activity: AdminActivity[];
  settings: Settings;
  ads?: Ad[];
  ad_slots?: AdSlotConfig[];
  ad_settings?: AdSettings;
  page_settings?: PageSettingsConfig;
  anime_screenshots?: AnimeScreenshot[];
  comments?: Comment[];
}

// Initial Database Seeding with rich legal public-domain / royalty-free / open-source anime content
const defaultAnimeList: Anime[] = [
  {
    id: 'ani-1',
    title: 'Cyberpulse: Neon Genesis 2088',
    slug: 'cyberpulse-neon-genesis-2088',
    description: 'In Neo-Tokyo 2088, a rogue cyber-detective unlocks a hidden AI core that holds the key to human consciousness and orbital space megastructures.',
    poster: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80',
    backdrop: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=1600&auto=format&fit=crop&q=80',
    banner: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=1600&auto=format&fit=crop&q=80',
    genres: ['Sci-Fi', 'Action', 'Cyberpunk', 'Mecha'],
    year: 2026,
    rating: 9.4,
    type: 'SERIES',
    status: 'ONGOING',
    language: 'Japanese (Sub / Dub)',
    trailer_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    is_featured: true,
    is_trending: true,
    created_at: new Date('2026-01-15').toISOString(),
  },
  {
    id: 'ani-2',
    title: 'Solaris: Blade of the Eclipse',
    slug: 'solaris-blade-of-the-eclipse',
    description: 'A legendary swordswoman born under a dying celestial star must journey across nine floating realms to seal the abyss before total eternal night.',
    poster: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
    backdrop: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1600&auto=format&fit=crop&q=80',
    banner: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&auto=format&fit=crop&q=80',
    genres: ['Fantasy', 'Action', 'Adventure', 'Supernatural'],
    year: 2025,
    rating: 9.1,
    type: 'SERIES',
    status: 'COMPLETED',
    language: 'Japanese (Sub)',
    trailer_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    is_featured: true,
    is_trending: true,
    created_at: new Date('2026-02-01').toISOString(),
  },
  {
    id: 'ani-3',
    title: 'Aetheria: Last Vanguard',
    slug: 'aetheria-last-vanguard',
    description: 'When alien leviathans emerge from sky rifts, an elite squad of mech pilots forms humanity’s last defensive line over metropolis spires.',
    poster: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80',
    backdrop: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1600&auto=format&fit=crop&q=80',
    banner: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1600&auto=format&fit=crop&q=80',
    genres: ['Sci-Fi', 'Mecha', 'Action'],
    year: 2025,
    rating: 8.8,
    type: 'MOVIE',
    status: 'COMPLETED',
    language: 'Japanese / English',
    trailer_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    is_featured: true,
    is_trending: false,
    created_at: new Date('2026-02-10').toISOString(),
  },
  {
    id: 'ani-4',
    title: 'Chrono Horizon: Zero Hour',
    slug: 'chrono-horizon-zero-hour',
    description: 'A time-loop thriller where a quantum physicist tries to prevent a cataclysmic singularity while navigating alternate timeline realities.',
    poster: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=600&auto=format&fit=crop&q=80',
    backdrop: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&auto=format&fit=crop&q=80',
    banner: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1600&auto=format&fit=crop&q=80',
    genres: ['Sci-Fi', 'Mystery', 'Psychological'],
    year: 2026,
    rating: 9.3,
    type: 'SERIES',
    status: 'ONGOING',
    language: 'Japanese (Sub / Dub)',
    trailer_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    is_featured: false,
    is_trending: true,
    created_at: new Date('2026-03-01').toISOString(),
  },
  {
    id: 'ani-5',
    title: 'Phantom Resonance',
    slug: 'phantom-resonance',
    description: 'Musicians in an underground cyberpunk city channel soul vibrations to break free from totalitarian surveillance algorithms.',
    poster: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
    backdrop: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1600&auto=format&fit=crop&q=80',
    banner: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1600&auto=format&fit=crop&q=80',
    genres: ['Music', 'Cyberpunk', 'Drama'],
    year: 2024,
    rating: 8.7,
    type: 'MOVIE',
    status: 'COMPLETED',
    language: 'Japanese (Sub)',
    trailer_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    is_featured: false,
    is_trending: false,
    created_at: new Date('2025-11-20').toISOString(),
  },
  {
    id: 'ani-6',
    title: 'Valkyrie Protocol: Rebirth',
    slug: 'valkyrie-protocol-rebirth',
    description: 'An android warrior reawakens 500 years after earth’s downfall and embarks on a quest to revive forgotten human culture.',
    poster: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80',
    backdrop: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1600&auto=format&fit=crop&q=80',
    banner: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=1600&auto=format&fit=crop&q=80',
    genres: ['Sci-Fi', 'Action', 'Adventure'],
    year: 2025,
    rating: 9.0,
    type: 'SERIES',
    status: 'COMPLETED',
    language: 'Japanese / English',
    trailer_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    is_featured: false,
    is_trending: true,
    created_at: new Date('2025-12-10').toISOString(),
  }
];

const defaultEpisodes: Episode[] = [
  {
    id: 'ep-101',
    anime_id: 'ani-1',
    season_number: 1,
    episode_number: 1,
    title: 'Episode 1: Awakening in the Glass Spire',
    description: 'Ren unlocks a encrypted neural node inside Neon Core, sparking a manhunt across Sector 7.',
    thumbnail: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80',
    duration: '24m',
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
  },
  {
    id: 'ep-102',
    anime_id: 'ani-1',
    season_number: 1,
    episode_number: 2,
    title: 'Episode 2: Quantum Echoes',
    description: 'The squad investigates an abandoned orbital satellite broadcasting mysterious harmonic pulses.',
    thumbnail: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80',
    duration: '23m',
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
  },
  {
    id: 'ep-103',
    anime_id: 'ani-1',
    season_number: 1,
    episode_number: 3,
    title: 'Episode 3: Orbital Overdrive',
    description: 'An enemy mecha battalion ambushes the sky bridge during high solar flare radiation.',
    thumbnail: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=600&auto=format&fit=crop&q=80',
    duration: '25m',
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  },
  {
    id: 'ep-201',
    anime_id: 'ani-2',
    season_number: 1,
    episode_number: 1,
    title: 'Episode 1: The Celestial Blade',
    description: 'Lyra claims the Blade of the Eclipse as shadows engulf the northern kingdom of Aethelgard.',
    thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
    duration: '24m',
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
  },
  {
    id: 'ep-202',
    anime_id: 'ani-2',
    season_number: 1,
    episode_number: 2,
    title: 'Episode 2: Realm of Whispers',
    description: 'Traversing the cloud bridge, Lyra confronts the guardian of the spectral winds.',
    thumbnail: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80',
    duration: '22m',
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
  }
];

export function normalizeGoogleDriveUrl(url: string): string {
  if (!url || typeof url !== 'string') return url || '';
  const trimmed = url.trim();
  if (trimmed.includes('drive.google.com') || trimmed.includes('docs.google.com') || trimmed.includes('googleusercontent.com')) {
    if (trimmed.includes('googleusercontent.com/d/')) {
      return trimmed;
    }
    const match = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/) ||
                  trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
                  trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return `https://lh3.googleusercontent.com/d/${match[1]}`;
    }
  }
  return trimmed;
}

export function saveBase64Image(dataUrl: string, prefix: string = 'img'): string {
  if (!dataUrl || typeof dataUrl !== 'string') return dataUrl || '';
  const trimmed = dataUrl.trim();
  if (!trimmed.startsWith('data:')) {
    return normalizeGoogleDriveUrl(trimmed);
  }
  try {
    const parts = trimmed.split(';base64,');
    if (parts.length === 2) {
      const mimeMatch = parts[0].match(/^data:([^;]+)$/);
      let ext = 'png';
      if (mimeMatch) {
        const mime = mimeMatch[1];
        if (mime.includes('jpeg') || mime.includes('jpg')) ext = 'jpg';
        else if (mime.includes('webp')) ext = 'webp';
        else if (mime.includes('gif')) ext = 'gif';
        else if (mime.includes('svg')) ext = 'svg';
      }
      const base64Data = parts[1].replace(/\s/g, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      const filename = `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${ext}`;
      const filePath = path.join(uploadsDir, filename);
      fs.writeFileSync(filePath, buffer);
      return `/uploads/${filename}`;
    }
  } catch (e) {
    console.error(`Failed to convert base64 ${prefix} image to file:`, e);
  }
  return trimmed;
}

class Database {
  private data: DBData;

  constructor() {
    this.data = this.loadData();
    this.syncAdminFromEnv();
  }

  public syncAdminFromEnv(): void {
    dotenv.config({ override: true });
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@cinevora.com').trim().toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD || 'AdminSecretPass2026!';

    let adminUser = this.data.users.find(u => u.role === 'SUPER_ADMIN' || u.id === 'usr-admin');
    if (adminUser) {
      adminUser.email = adminEmail;
      adminUser.password_hash = bcrypt.hashSync(adminPassword, 10);
      adminUser.status = 'ACTIVE';
    } else {
      adminUser = {
        id: 'usr-admin',
        username: 'superadmin',
        email: adminEmail,
        password_hash: bcrypt.hashSync(adminPassword, 10),
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        created_at: new Date('2026-01-01').toISOString(),
      };
      this.data.users.unshift(adminUser);
    }
    this.saveData();
  }

  private loadData(): DBData {
    let data: DBData;
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        data = JSON.parse(raw);
      } catch (err) {
        console.error('Error reading database file, initializing default data', err);
        data = this.getInitialSeed();
      }
    } else {
      data = this.getInitialSeed();
    }

    if (data.anime && Array.isArray(data.anime)) {
      data.anime.forEach(a => {
        if (a.banner) a.banner = saveBase64Image(a.banner, 'banner');
        if (a.poster) a.poster = saveBase64Image(a.poster, 'poster');
        if (a.backdrop) a.backdrop = saveBase64Image(a.backdrop, 'backdrop');
        if (a.thumbnail) a.thumbnail = saveBase64Image(a.thumbnail, 'thumb');
        if ((a as any).banner_image_url) (a as any).banner_image_url = saveBase64Image((a as any).banner_image_url, 'banner');
        if ((a as any).poster_image_url) (a as any).poster_image_url = saveBase64Image((a as any).poster_image_url, 'poster');
      });
    }

    // Ensure ad collections exist
    const defaultSlots = this.getDefaultAdSlots();
    if (!data.ad_slots || data.ad_slots.length === 0) {
      data.ad_slots = defaultSlots;
    } else {
      // Merge missing default slots if any
      defaultSlots.forEach(ds => {
        if (!data.ad_slots!.some(s => s.slot === ds.slot)) {
          data.ad_slots!.push(ds);
        }
      });
    }
    if (!data.ad_settings) {
      data.ad_settings = this.getDefaultAdSettings();
    }
    if (!data.ads) {
      data.ads = this.getDefaultAds();
    }
    if (!data.page_settings) {
      data.page_settings = this.getDefaultPageSettings();
    }
    if (!data.anime_screenshots || data.anime_screenshots.length === 0) {
      data.anime_screenshots = this.getDefaultScreenshots();
    } else {
      data.anime_screenshots.forEach(s => {
        if (s.image_url) {
          s.image_url = saveBase64Image(s.image_url, 'scr');
        }
      });
    }

    this.saveData(data);
    return data;
  }

  private getDefaultScreenshots(): AnimeScreenshot[] {
    const now = new Date().toISOString();
    return [
      {
        id: 'scr-101',
        anime_id: 'ani-1',
        image_url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1000&auto=format&fit=crop&q=80',
        display_order: 1,
        status: 'ENABLED',
        created_at: now,
        updated_at: now
      },
      {
        id: 'scr-102',
        anime_id: 'ani-1',
        image_url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=1000&auto=format&fit=crop&q=80',
        display_order: 2,
        status: 'ENABLED',
        created_at: now,
        updated_at: now
      },
      {
        id: 'scr-103',
        anime_id: 'ani-1',
        image_url: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=1000&auto=format&fit=crop&q=80',
        display_order: 3,
        status: 'ENABLED',
        created_at: now,
        updated_at: now
      },
      {
        id: 'scr-104',
        anime_id: 'ani-1',
        image_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1000&auto=format&fit=crop&q=80',
        display_order: 4,
        status: 'ENABLED',
        created_at: now,
        updated_at: now
      },
      {
        id: 'scr-201',
        anime_id: 'ani-2',
        image_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1000&auto=format&fit=crop&q=80',
        display_order: 1,
        status: 'ENABLED',
        created_at: now,
        updated_at: now
      },
      {
        id: 'scr-202',
        anime_id: 'ani-2',
        image_url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1000&auto=format&fit=crop&q=80',
        display_order: 2,
        status: 'ENABLED',
        created_at: now,
        updated_at: now
      },
      {
        id: 'scr-203',
        anime_id: 'ani-2',
        image_url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=1000&auto=format&fit=crop&q=80',
        display_order: 3,
        status: 'ENABLED',
        created_at: now,
        updated_at: now
      }
    ];
  }

  public saveData(dataToSave?: DBData) {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(dataToSave || this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save DB data', err);
    }
  }

  private getDefaultAdSlots(): AdSlotConfig[] {
    return [
      { slot: 'HOME_TOP', name: 'Home Top Banner', enabled: true, section: 'HOME' },
      { slot: 'HOME_MIDDLE', name: 'Home Middle Section', enabled: true, section: 'HOME' },
      { slot: 'HOME_BOTTOM', name: 'Home Bottom Footer', enabled: true, section: 'HOME' },

      { slot: 'ANIME_TOP', name: 'Anime Catalog Top', enabled: true, section: 'ANIME' },
      { slot: 'ANIME_MIDDLE', name: 'Anime Catalog Middle', enabled: true, section: 'ANIME' },
      { slot: 'ANIME_BOTTOM', name: 'Anime Catalog Bottom', enabled: true, section: 'ANIME' },

      { slot: 'MOVIE_TOP', name: 'Movies Top Banner', enabled: true, section: 'MOVIE' },
      { slot: 'MOVIE_MIDDLE', name: 'Movies Middle Grid', enabled: true, section: 'MOVIE' },
      { slot: 'MOVIE_BOTTOM', name: 'Movies Bottom Banner', enabled: true, section: 'MOVIE' },

      { slot: 'SERIES_TOP', name: 'Series Top Banner', enabled: true, section: 'SERIES' },
      { slot: 'SERIES_MIDDLE', name: 'Series Middle Grid', enabled: true, section: 'SERIES' },
      { slot: 'SERIES_BOTTOM', name: 'Series Bottom Banner', enabled: true, section: 'SERIES' },

      { slot: 'DETAILS_TOP', name: 'Details Top Banner', enabled: true, section: 'DETAILS' },
      { slot: 'DETAILS_MIDDLE', name: 'Details Middle Section', enabled: true, section: 'DETAILS' },
      { slot: 'DETAILS_BOTTOM', name: 'Details Bottom Section', enabled: true, section: 'DETAILS' },

      { slot: 'WATCH_TOP', name: 'Watch Player Top Banner', enabled: true, section: 'WATCH' },
      { slot: 'WATCH_MIDDLE', name: 'Watch Player Below Video', enabled: true, section: 'WATCH' },
      { slot: 'WATCH_BOTTOM', name: 'Watch Player Bottom Section', enabled: true, section: 'WATCH' },

      { slot: 'DOWNLOAD_GATEWAY_TOP', name: 'Download Gateway Top Banner', enabled: true, section: 'DOWNLOAD_GATEWAY' },
      { slot: 'DOWNLOAD_GATEWAY_MIDDLE', name: 'Download Gateway Timer/Button', enabled: true, section: 'DOWNLOAD_GATEWAY' },
      { slot: 'DOWNLOAD_GATEWAY_BOTTOM', name: 'Download Gateway Bottom Footer', enabled: true, section: 'DOWNLOAD_GATEWAY' },

      // GLOBAL DOWNLOAD PAGE PLACEMENTS
      { slot: 'DOWNLOAD_PAGE_TOP', name: 'Download Page — Top', enabled: true, section: 'DOWNLOAD_GATEWAY' },
      { slot: 'DOWNLOAD_BETWEEN_COUNTDOWNS', name: 'Download Page — Between First and Second Countdown', enabled: true, section: 'DOWNLOAD_GATEWAY' },
      { slot: 'DOWNLOAD_ABOVE_BUTTON', name: 'Download Page — Above Download Now / Button', enabled: true, section: 'DOWNLOAD_GATEWAY' },
      { slot: 'DOWNLOAD_BELOW_BUTTON', name: 'Download Page — Below Download Now / Button', enabled: true, section: 'DOWNLOAD_GATEWAY' },

      // DOWNLOAD INTERSTITIAL PLACEMENTS
      { slot: 'DOWNLOAD_INTERSTITIAL_TOP', name: 'Download Interstitial — Top', enabled: true, section: 'DOWNLOAD_INTERSTITIAL' },
      { slot: 'DOWNLOAD_INTERSTITIAL_ABOVE_COUNTDOWN', name: 'Download Interstitial — Above Countdown', enabled: true, section: 'DOWNLOAD_INTERSTITIAL' },
      { slot: 'DOWNLOAD_INTERSTITIAL_BETWEEN_COUNTDOWN_BUTTON', name: 'Download Interstitial — Between Countdown and Button', enabled: true, section: 'DOWNLOAD_INTERSTITIAL' },
      { slot: 'DOWNLOAD_INTERSTITIAL_BELOW_COUNTDOWN', name: 'Download Interstitial — Below Countdown', enabled: true, section: 'DOWNLOAD_INTERSTITIAL' },
      { slot: 'DOWNLOAD_INTERSTITIAL_AFTER_CONTINUE_BUTTON', name: 'Download Interstitial — After First Continue Button', enabled: true, section: 'DOWNLOAD_INTERSTITIAL' },
      { slot: 'DOWNLOAD_INTERSTITIAL_MIDDLE', name: 'Download Interstitial — Middle Section', enabled: true, section: 'DOWNLOAD_INTERSTITIAL' },
      { slot: 'DOWNLOAD_INTERSTITIAL_BOTTOM', name: 'Download Interstitial — Bottom', enabled: true, section: 'DOWNLOAD_INTERSTITIAL' },

      // EPISODE DOWNLOAD PAGE PLACEMENTS
      { slot: 'EPISODE_DOWNLOAD_TOP', name: 'Episode Download — Top', enabled: true, section: 'EPISODE_DOWNLOAD_PAGE' },
      { slot: 'EPISODE_DOWNLOAD_BELOW_TITLE', name: 'Episode Download — Below Title', enabled: true, section: 'EPISODE_DOWNLOAD_PAGE' },
      { slot: 'EPISODE_DOWNLOAD_ABOVE_COUNTDOWN', name: 'Episode Download — Above Countdown', enabled: true, section: 'EPISODE_DOWNLOAD_PAGE' },
      { slot: 'EPISODE_DOWNLOAD_BELOW_COUNTDOWN', name: 'Episode Download — Below Countdown', enabled: true, section: 'EPISODE_DOWNLOAD_PAGE' },
      { slot: 'EPISODE_DOWNLOAD_BEFORE_BUTTON', name: 'Episode Download — Before Download Button', enabled: true, section: 'EPISODE_DOWNLOAD_PAGE' },
      { slot: 'EPISODE_DOWNLOAD_BOTTOM', name: 'Episode Download — Bottom', enabled: true, section: 'EPISODE_DOWNLOAD_PAGE' },

      // HOSTING LINKS PAGE PLACEMENTS
      { slot: 'HOSTING_LINKS_TOP', name: 'Hosting Links — Top', enabled: true, section: 'HOSTING_LINKS_PAGE' },
      { slot: 'HOSTING_LINKS_BETWEEN', name: 'Hosting Links — Between Hosting Links', enabled: true, section: 'HOSTING_LINKS_PAGE' },
      { slot: 'HOSTING_LINKS_ABOVE', name: 'Hosting Links — Above Links', enabled: true, section: 'HOSTING_LINKS_PAGE' },
      { slot: 'HOSTING_LINKS_BELOW', name: 'Hosting Links — Below Links', enabled: true, section: 'HOSTING_LINKS_PAGE' },
      { slot: 'HOSTING_LINKS_BOTTOM', name: 'Hosting Links — Bottom', enabled: true, section: 'HOSTING_LINKS_PAGE' },

      { slot: 'SEARCH_TOP', name: 'Search Results Top Banner', enabled: true, section: 'SEARCH' },
      { slot: 'SEARCH_BOTTOM', name: 'Search Results Bottom Grid', enabled: true, section: 'SEARCH' }
    ];
  }

  private getDefaultAdSettings(): AdSettings {
    return {
      enabled: true,
      default_rotation: 'RANDOM',
      default_frequency: 'PAGE_VIEW',
      section_enabled: {
        HOME: true,
        ANIME: true,
        MOVIE: true,
        SERIES: true,
        DETAILS: true,
        WATCH: true,
        DOWNLOAD_GATEWAY: true,
        SEARCH: true
      }
    };
  }

  private getDefaultAds(): Ad[] {
    const now = new Date().toISOString();
    return [
      {
        id: 'ad-1',
        name: 'Cyberpunk CyberDeck Cyber Sale',
        type: 'BANNER',
        image_url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&auto=format&fit=crop&q=80',
        target_url: 'https://cinevora.com',
        title: 'Upgrade Your Otaku Rig',
        description: 'Get 40% off high performance streaming gear and RGB displays.',
        slot: 'HOME_TOP',
        status: 'ACTIVE',
        priority: 10,
        frequency: 'PAGE_VIEW',
        impressions: 1420,
        clicks: 89,
        created_at: now,
        updated_at: now
      },
      {
        id: 'ad-2',
        name: 'Aetheria Mech Collector Figure',
        type: 'IMAGE',
        image_url: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=800&auto=format&fit=crop&q=80',
        target_url: 'https://cinevora.com',
        title: 'Limited Edition Mech Figurine',
        description: 'Pre-order the 1/7 scale Diecast Mecha pilot edition today!',
        slot: 'ANIME_TOP',
        status: 'ACTIVE',
        priority: 5,
        frequency: 'PAGE_VIEW',
        impressions: 850,
        clicks: 42,
        created_at: now,
        updated_at: now
      },
      {
        id: 'ad-3',
        name: 'Custom HTML Sponsor Message',
        type: 'HTML',
        code: '<div style="padding: 1rem; background: linear-gradient(135deg, rgba(147,51,234,0.2), rgba(59,130,246,0.2)); border: 1px solid rgba(147,51,234,0.4); border-radius: 12px; text-align: center; color: #fff; font-family: sans-serif;">\n  <h4 style="margin: 0 0 0.5rem 0; font-size: 1.1rem; font-weight: 700; color: #a855f7;">✨ Cinevora VIP Supporter Banner</h4>\n  <p style="margin: 0; font-size: 0.9rem; color: #cbd5e1;">Enjoy unlimited 4K anime streaming without buffering. Upgrade to VIP Pass!</p>\n</div>',
        slot: 'DOWNLOAD_GATEWAY_MIDDLE',
        status: 'ACTIVE',
        priority: 1,
        frequency: 'PAGE_VIEW',
        impressions: 310,
        clicks: 19,
        created_at: now,
        updated_at: now
      }
    ];
  }

  private getInitialSeed(): DBData {
    const defaultPasswordHash = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'AdminSecretPass2026!', 10);
    const userPasswordHash = bcrypt.hashSync('User123456!', 10);

    return {
      users: [
        {
          id: 'usr-admin',
          username: 'superadmin',
          email: process.env.ADMIN_EMAIL || 'admin@cinevora.com',
          password_hash: defaultPasswordHash,
          role: 'SUPER_ADMIN',
          status: 'ACTIVE',
          avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
          created_at: new Date('2026-01-01').toISOString(),
        },
        {
          id: 'usr-editor',
          username: 'editor_anime',
          email: 'editor@cinevora.com',
          password_hash: defaultPasswordHash,
          role: 'EDITOR',
          status: 'ACTIVE',
          avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
          created_at: new Date('2026-01-02').toISOString(),
        },
        {
          id: 'usr-demo',
          username: 'otaku_master',
          email: 'user@cinevora.com',
          password_hash: userPasswordHash,
          role: 'USER',
          status: 'ACTIVE',
          avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
          created_at: new Date('2026-01-10').toISOString(),
        }
      ],
      anime: defaultAnimeList,
      episodes: defaultEpisodes,
      watch_history: [],
      watchlist: [
        { id: 'wl-1', user_id: 'usr-demo', anime_id: 'ani-1', added_at: new Date().toISOString() },
        { id: 'wl-2', user_id: 'usr-demo', anime_id: 'ani-2', added_at: new Date().toISOString() }
      ],
      favorites: [
        { id: 'fav-1', user_id: 'usr-demo', anime_id: 'ani-1', added_at: new Date().toISOString() }
      ],
      admin_activity: [
        {
          id: 'act-1',
          admin_id: 'usr-admin',
          admin_name: 'superadmin',
          action: 'System Initialized',
          details: 'Cinevora platform database seeded with core anime catalog',
          timestamp: new Date().toISOString(),
          ip: '127.0.0.1'
        }
      ],
      settings: {
        site_name: 'Cinevora',
        logo_url: '/assets/logo.png',
        maintenance_mode: false,
        contact_email: 'support@cinevora.com',
        featured_anime_id: 'ani-1',
      }
    };
  }

  // --- Users ---
  public getUsers(): User[] {
    return this.data.users;
  }

  public getUserById(id: string): User | undefined {
    return this.data.users.find(u => u.id === id);
  }

  public getUserByEmail(email: string): User | undefined {
    if (!email) return undefined;
    const clean = email.trim().toLowerCase();
    return this.data.users.find(u => u.email && u.email.trim().toLowerCase() === clean);
  }

  public getUserByUsername(username: string): User | undefined {
    if (!username) return undefined;
    const clean = username.trim().toLowerCase();
    return this.data.users.find(u => u.username && u.username.trim().toLowerCase() === clean);
  }

  public getUserByEmailOrUsername(identifier: string): User | undefined {
    if (!identifier) return undefined;
    const clean = identifier.trim().toLowerCase();
    const envAdminEmail = (process.env.ADMIN_EMAIL || 'admin@cinevora.com').trim().toLowerCase();

    // Check direct matches first
    const match = this.data.users.find(u =>
      (u.email && u.email.trim().toLowerCase() === clean) ||
      (u.username && u.username.trim().toLowerCase() === clean)
    );
    if (match) return match;

    // Check admin aliases (superadmin, admin@cinevora.com, env email)
    if (clean === 'superadmin' || clean === 'admin@cinevora.com' || clean === envAdminEmail) {
      return this.data.users.find(u => u.role === 'SUPER_ADMIN' || u.id === 'usr-admin');
    }

    return undefined;
  }

  public createUser(user: Omit<User, 'id' | 'created_at'>): User {
    const newUser: User = {
      ...user,
      id: 'usr-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      created_at: new Date().toISOString()
    };
    this.data.users.push(newUser);
    this.saveData();
    return newUser;
  }

  public updateUserStatus(userId: string, status: 'ACTIVE' | 'SUSPENDED'): User | null {
    const user = this.data.users.find(u => u.id === userId);
    if (!user) return null;
    user.status = status;
    this.saveData();
    return user;
  }

  // --- Anime / Movies / Series ---
  public getAnimeList(filters?: {
    type?: string;
    genre?: string;
    year?: number;
    search?: string;
    featured?: boolean;
    trending?: boolean;
    sort?: 'newest' | 'rating' | 'popular';
  }): Anime[] {
    let list = [...this.data.anime];

    if (filters) {
      if (filters.type) {
        list = list.filter(a => a.type.toLowerCase() === filters.type!.toLowerCase());
      }
      if (filters.genre) {
        const g = filters.genre.toLowerCase();
        list = list.filter(a => a.genres.some(genre => genre.toLowerCase() === g));
      }
      if (filters.year) {
        list = list.filter(a => a.year === filters.year);
      }
      if (filters.featured !== undefined) {
        list = list.filter(a => a.is_featured === filters.featured);
      }
      if (filters.trending !== undefined) {
        list = list.filter(a => a.is_trending === filters.trending);
      }
      if (filters.search) {
        const q = filters.search.toLowerCase();
        list = list.filter(a =>
          a.title.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q) ||
          a.genres.some(genre => genre.toLowerCase().includes(q))
        );
      }
      if (filters.sort === 'rating') {
        list.sort((a, b) => b.rating - a.rating);
      } else if (filters.sort === 'newest') {
        list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      } else if (filters.sort === 'popular') {
        list.sort((a, b) => (b.is_trending ? 1 : 0) - (a.is_trending ? 1 : 0));
      }
    }

    return list;
  }

  public getAnimeById(id: string): Anime | undefined {
    return this.data.anime.find(a => a.id === id || a.slug === id);
  }

  public getAnimeBySlug(slug: string): Anime | undefined {
    if (!slug) return undefined;
    const cleanSlug = slug.trim().toLowerCase();
    return this.data.anime.find(a => a.slug && a.slug.trim().toLowerCase() === cleanSlug);
  }

  public createAnime(item: Omit<Anime, 'id' | 'created_at'> & { banner_image_url?: string; poster_image_url?: string }): Anime {
    const rawBanner = item.banner !== undefined ? item.banner : (item.banner_image_url !== undefined ? item.banner_image_url : '');
    const rawPoster = item.poster !== undefined ? item.poster : (item.poster_image_url !== undefined ? item.poster_image_url : '');
    const poster = saveBase64Image(rawPoster, 'poster');
    const backdrop = saveBase64Image(item.backdrop || '', 'backdrop');
    const banner = saveBase64Image(rawBanner, 'banner');
    const thumbnail = saveBase64Image(item.thumbnail || '', 'thumb');

    const newAnime: Anime = {
      ...item,
      poster,
      backdrop,
      banner,
      thumbnail,
      id: 'ani-' + Date.now(),
      created_at: new Date().toISOString()
    };
    this.data.anime.unshift(newAnime);
    this.saveData();
    return newAnime;
  }

  public updateAnime(id: string, item: Partial<Anime> & { banner_image_url?: string; poster_image_url?: string }): Anime | null {
    const index = this.data.anime.findIndex(a => a.id === id);
    if (index === -1) return null;

    const current = this.data.anime[index];
    const updatePayload: Partial<Anime> = { ...item };

    const rawPoster = item.poster !== undefined ? item.poster : item.poster_image_url;
    if (rawPoster !== undefined) {
      updatePayload.poster = saveBase64Image(rawPoster, 'poster');
    }
    if (item.backdrop !== undefined) {
      updatePayload.backdrop = saveBase64Image(item.backdrop, 'backdrop');
    }
    const rawBanner = item.banner !== undefined ? item.banner : item.banner_image_url;
    if (rawBanner !== undefined) {
      updatePayload.banner = saveBase64Image(rawBanner, 'banner');
    }
    if (item.thumbnail !== undefined) {
      updatePayload.thumbnail = saveBase64Image(item.thumbnail, 'thumb');
    }

    this.data.anime[index] = { ...current, ...updatePayload };
    this.saveData();
    return this.data.anime[index];
  }

  public deleteAnime(id: string): boolean {
    const initialLength = this.data.anime.length;
    this.data.anime = this.data.anime.filter(a => a.id !== id);
    this.data.episodes = this.data.episodes.filter(e => e.anime_id !== id);
    if (this.data.anime_screenshots) {
      this.data.anime_screenshots = this.data.anime_screenshots.filter(s => s.anime_id !== id);
    }
    this.saveData();
    return this.data.anime.length < initialLength;
  }

  // --- Anime Screenshots ---
  public getPublicScreenshots(anime_id: string): AnimeScreenshot[] {
    const list = this.data.anime_screenshots || [];
    return list
      .filter(s => s.anime_id === anime_id && (s.status === 'ENABLED' || (s as any).status === undefined))
      .map(s => ({ ...s, image_url: normalizeGoogleDriveUrl(s.image_url) }))
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
  }

  public getAllScreenshotsAdmin(anime_id: string): AnimeScreenshot[] {
    const list = this.data.anime_screenshots || [];
    return list
      .filter(s => s.anime_id === anime_id)
      .map(s => ({ ...s, image_url: normalizeGoogleDriveUrl(s.image_url) }))
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
  }

  public getScreenshotById(id: string): AnimeScreenshot | undefined {
    const scr = (this.data.anime_screenshots || []).find(s => s.id === id);
    if (scr) {
      return { ...scr, image_url: normalizeGoogleDriveUrl(scr.image_url) };
    }
    return undefined;
  }

  public addScreenshot(data: { anime_id: string; image_url: string; display_order?: number; status?: 'ENABLED' | 'DISABLED' }): AnimeScreenshot {
    if (!this.data.anime_screenshots) {
      this.data.anime_screenshots = [];
    }

    const finalImageUrl = saveBase64Image(data.image_url || '', 'scr');

    const animeScreenshots = this.data.anime_screenshots.filter(s => s.anime_id === data.anime_id);
    const maxOrder = animeScreenshots.reduce((max, s) => Math.max(max, s.display_order || 0), 0);
    const now = new Date().toISOString();

    const newScreenshot: AnimeScreenshot = {
      id: 'scr-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      anime_id: data.anime_id,
      image_url: finalImageUrl,
      display_order: data.display_order !== undefined ? Number(data.display_order) : maxOrder + 1,
      status: data.status || 'ENABLED',
      created_at: now,
      updated_at: now
    };

    this.data.anime_screenshots.push(newScreenshot);
    this.saveData();
    return newScreenshot;
  }

  public updateScreenshot(id: string, data: Partial<AnimeScreenshot>): AnimeScreenshot | null {
    if (!this.data.anime_screenshots) return null;
    const index = this.data.anime_screenshots.findIndex(s => s.id === id);
    if (index === -1) return null;

    const current = this.data.anime_screenshots[index];
    const finalImageUrl = data.image_url !== undefined ? saveBase64Image(data.image_url, 'scr') : current.image_url;

    const updated: AnimeScreenshot = {
      ...current,
      ...data,
      image_url: finalImageUrl,
      id: current.id,
      anime_id: current.anime_id,
      updated_at: new Date().toISOString()
    };

    this.data.anime_screenshots[index] = updated;
    this.saveData();
    return updated;
  }

  public deleteScreenshot(id: string): boolean {
    if (!this.data.anime_screenshots) return false;
    const initialLen = this.data.anime_screenshots.length;
    this.data.anime_screenshots = this.data.anime_screenshots.filter(s => s.id !== id);
    if (this.data.anime_screenshots.length !== initialLen) {
      this.saveData();
      return true;
    }
    return false;
  }

  public reorderScreenshots(anime_id: string, orderedIds: string[]): AnimeScreenshot[] {
    if (!this.data.anime_screenshots) this.data.anime_screenshots = [];
    
    orderedIds.forEach((id, index) => {
      const scr = this.data.anime_screenshots!.find(s => s.id === id && s.anime_id === anime_id);
      if (scr) {
        scr.display_order = index + 1;
        scr.updated_at = new Date().toISOString();
      }
    });

    this.saveData();
    return this.getAllScreenshotsAdmin(anime_id);
  }

  // --- Download Links ---
  public getDownloadLinksForContent(animeId: string): DownloadLink[] {
    const anime = this.getAnimeById(animeId);
    if (!anime) return [];
    if (!anime.download_links || anime.download_links.length === 0) {
      anime.download_links = [
        {
          id: `dl-${anime.id}-1`,
          anime_id: anime.id,
          host_name: 'Server 1 (Primary Cloud)',
          label: 'Direct Fast Mirror Node #1',
          url: anime.video_url || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
          enabled: true,
          order: 1
        },
        {
          id: `dl-${anime.id}-2`,
          anime_id: anime.id,
          host_name: 'Server 2 (Google Drive)',
          label: 'Backup Authorized Cloud Link',
          url: 'https://drive.google.com',
          enabled: true,
          order: 2
        },
        {
          id: `dl-${anime.id}-3`,
          anime_id: anime.id,
          host_name: 'Server 3 (Mega Mirror)',
          label: 'High Speed Storage Node',
          url: 'https://mega.nz',
          enabled: true,
          order: 3
        }
      ];
      this.saveData();
    }
    return (anime.download_links || []).filter(l => l.enabled !== false);
  }

  public getAllDownloadLinksForAdmin(animeId: string): DownloadLink[] {
    const anime = this.getAnimeById(animeId);
    if (!anime) return [];
    if (!anime.download_links || anime.download_links.length === 0) {
      this.getDownloadLinksForContent(animeId);
    }
    return anime.download_links || [];
  }

  public saveDownloadLinksForContent(animeId: string, links: Partial<DownloadLink>[]): DownloadLink[] {
    const anime = this.getAnimeById(animeId);
    if (!anime) return [];

    const formattedLinks: DownloadLink[] = links.map((l, index) => ({
      id: l.id || `dl-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      anime_id: animeId,
      host_name: l.host_name || `Server ${index + 1}`,
      label: l.label || 'Download',
      url: l.url || 'https://example.com',
      enabled: l.enabled !== false,
      order: l.order !== undefined ? Number(l.order) : index + 1,
      updated_at: new Date().toISOString()
    }));

    anime.download_links = formattedLinks;
    this.saveData();
    return formattedLinks;
  }

  public addDownloadLink(animeId: string, linkData: Partial<DownloadLink>): DownloadLink | null {
    const anime = this.getAnimeById(animeId);
    if (!anime) return null;
    if (!anime.download_links) anime.download_links = [];

    const newLink: DownloadLink = {
      id: `dl-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      anime_id: animeId,
      host_name: linkData.host_name || 'Server 1',
      label: linkData.label || 'Download',
      url: linkData.url || 'https://example.com',
      enabled: linkData.enabled !== false,
      order: anime.download_links.length + 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    anime.download_links.push(newLink);
    this.saveData();
    return newLink;
  }

  public updateDownloadLink(linkId: string, linkData: Partial<DownloadLink>): DownloadLink | null {
    for (const anime of this.data.anime) {
      if (anime.download_links) {
        const idx = anime.download_links.findIndex(l => l.id === linkId);
        if (idx !== -1) {
          const existing = anime.download_links[idx];
          const updated: DownloadLink = {
            ...existing,
            ...linkData,
            id: existing.id,
            anime_id: anime.id,
            updated_at: new Date().toISOString()
          };
          anime.download_links[idx] = updated;
          this.saveData();
          return updated;
        }
      }
    }
    return null;
  }

  public deleteDownloadLink(linkId: string): boolean {
    for (const anime of this.data.anime) {
      if (anime.download_links) {
        const initialLen = anime.download_links.length;
        anime.download_links = anime.download_links.filter(l => l.id !== linkId);
        if (anime.download_links.length !== initialLen) {
          this.saveData();
          return true;
        }
      }
    }
    return false;
  }

  // --- Episodes ---
  public formatEpisode(ep: Episode): Episode {
    if (!ep) return ep;
    let video_url = ep.video_url || '';
    let drive_file_id = ep.drive_file_id || '';

    if (!drive_file_id && video_url) {
      const match = video_url.match(/(?:https?:\/\/)?(?:drive|docs)\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        drive_file_id = match[1];
      }
    }

    if (!video_url && drive_file_id) {
      video_url = `https://drive.google.com/file/d/${drive_file_id}/view`;
    }

    return {
      ...ep,
      video_url,
      drive_file_id
    };
  }

  
  // --- Comments ---
  public getAllComments(): Comment[] {
    return this.data.comments || [];
  }

  public getCommentsForAnime(animeId: string): Comment[] {
    if (!this.data.comments) this.data.comments = [];
    return this.data.comments.filter(c => c.anime_id === animeId).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public addComment(animeId: string, username: string, content: string): Comment {
    if (!this.data.comments) this.data.comments = [];
    const newComment: Comment = {
      id: 'com-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      anime_id: animeId,
      username,
      content,
      created_at: new Date().toISOString()
    };
    this.data.comments.push(newComment);
    this.saveData();
    return newComment;
  }

  public deleteComment(commentId: string): boolean {
    if (!this.data.comments) return false;
    const initialLen = this.data.comments.length;
    this.data.comments = this.data.comments.filter(c => c.id !== commentId);
    if (this.data.comments.length < initialLen) {
      this.saveData();
      return true;
    }
    return false;
  }

  public getEpisodesByAnimeId(animeId: string, publishedOnly = false): Episode[] {
    let list = this.data.episodes.filter(e => e.anime_id === animeId);
    if (publishedOnly) {
      list = list.filter(e => e.is_published !== false && e.status !== 'UNPUBLISHED');
    }
    return list
      .map(e => this.formatEpisode(e))
      .sort((a, b) => (a.season_number || 1) - (b.season_number || 1) || a.episode_number - b.episode_number);
  }

  public getEpisodeById(id: string): Episode | undefined {
    const ep = this.data.episodes.find(e => e.id === id);
    return ep ? this.formatEpisode(ep) : undefined;
  }

  public addEpisode(episode: Omit<Episode, 'id'>): Episode {
    const finalThumbnail = episode.thumbnail ? saveBase64Image(episode.thumbnail, 'ep') : '';
    let videoUrl = (episode.video_url || '').trim();
    let driveFileId = episode.drive_file_id;

    if (!driveFileId && videoUrl) {
      const match = videoUrl.match(/(?:https?:\/\/)?(?:drive|docs)\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        driveFileId = match[1];
      }
    }

    if (!videoUrl && driveFileId) {
      videoUrl = `https://drive.google.com/file/d/${driveFileId}/view`;
    }


    if (episode.qualities && Array.isArray(episode.qualities)) {
      episode.qualities.forEach(q => {
        if (q.video_url) {
           const match = String(q.video_url).trim().match(/(?:https?:\/\/)?(?:drive|docs)\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)([a-zA-Z0-9_-]+)/);
           if (match && match[1]) {
             q.drive_file_id = match[1];
           }
        }
        if (q.mirrors && Array.isArray(q.mirrors)) {
           q.mirrors.forEach(m => {
             if (m.url) {
               const mMatch = String(m.url).trim().match(/(?:https?:\/\/)?(?:drive|docs)\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)([a-zA-Z0-9_-]+)/);
               if (mMatch && mMatch[1]) {
                 m.drive_file_id = mMatch[1];
               }
             }
           });
        }
      });
    }

    const newEpisode: Episode = {

      ...episode,
      thumbnail: finalThumbnail,
      video_url: videoUrl,
      drive_file_id: driveFileId,
      id: 'ep-' + Date.now(),
      status: episode.status || 'PUBLISHED',
      is_published: episode.is_published !== false,
      created_at: new Date().toISOString()
    };
    this.data.episodes.push(newEpisode);
    this.saveData();
    return this.formatEpisode(newEpisode);
  }

  public updateEpisode(id: string, updates: Partial<Episode>): Episode | null {
    const index = this.data.episodes.findIndex(e => e.id === id);
    if (index === -1) return null;
    const existing = this.data.episodes[index];

    const updatePayload: Partial<Episode> = {};
    Object.keys(updates).forEach(key => {
      const val = (updates as any)[key];
      if (val !== undefined) {
        (updatePayload as any)[key] = val;
      }
    });

    if (updates.thumbnail) {
      updatePayload.thumbnail = saveBase64Image(updates.thumbnail, 'ep');
    }

    if (updatePayload.video_url !== undefined) {
      const trimmedUrl = String(updatePayload.video_url).trim();
      if (trimmedUrl) {
        updatePayload.video_url = trimmedUrl;
        const match = trimmedUrl.match(/(?:https?:\/\/)?(?:drive|docs)\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)([a-zA-Z0-9_-]+)/);
        if (match && match[1]) {
          updatePayload.drive_file_id = match[1];
        } else if (existing.drive_file_id) {
          updatePayload.drive_file_id = existing.drive_file_id;
        }
      } else if (existing.video_url || existing.drive_file_id) {
        updatePayload.video_url = existing.video_url || `https://drive.google.com/file/d/${existing.drive_file_id}/view`;
        updatePayload.drive_file_id = existing.drive_file_id || '';
      }
    } else {
      if (existing.video_url || existing.drive_file_id) {
        updatePayload.video_url = existing.video_url || `https://drive.google.com/file/d/${existing.drive_file_id}/view`;
        updatePayload.drive_file_id = existing.drive_file_id || '';
      }
    }


    if (updatePayload.qualities && Array.isArray(updatePayload.qualities)) {
      updatePayload.qualities.forEach(q => {
        if (q.video_url) {
           const match = String(q.video_url).trim().match(/(?:https?:\/\/)?(?:drive|docs)\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)([a-zA-Z0-9_-]+)/);
           if (match && match[1]) {
             q.drive_file_id = match[1];
           }
        }
        if (q.mirrors && Array.isArray(q.mirrors)) {
           q.mirrors.forEach(m => {
             if (m.url) {
               const mMatch = String(m.url).trim().match(/(?:https?:\/\/)?(?:drive|docs)\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)([a-zA-Z0-9_-]+)/);
               if (mMatch && mMatch[1]) {
                 m.drive_file_id = mMatch[1];
               }
             }
           });
        }
      });
    }

    const updated: Episode = {
      ...existing,
      ...updatePayload,
      id: existing.id,
      updated_at: new Date().toISOString()
    };
    if (updates.status !== undefined) {
      updated.is_published = updates.status === 'PUBLISHED';
    } else if (updates.is_published !== undefined) {
      updated.status = updates.is_published ? 'PUBLISHED' : 'UNPUBLISHED';
    }
    this.data.episodes[index] = updated;
    this.saveData();
    return this.formatEpisode(updated);
  }

  public deleteEpisode(id: string): boolean {
    const initialLen = this.data.episodes.length;
    this.data.episodes = this.data.episodes.filter(e => e.id !== id);
    if (this.data.episodes.length !== initialLen) {
      this.saveData();
      return true;
    }
    return false;
  }

  public deleteSeason(animeId: string, seasonNumber: number): { success: boolean; deletedCount: number } {
    const initialLen = this.data.episodes.length;
    this.data.episodes = this.data.episodes.filter(
      e => !(e.anime_id === animeId && (e.season_number || 1) === seasonNumber)
    );
    const deletedCount = initialLen - this.data.episodes.length;
    this.saveData();
    return { success: true, deletedCount };
  }

  public reorderEpisodes(animeId: string, orderedIds: string[]): Episode[] {
    orderedIds.forEach((id, index) => {
      const ep = this.data.episodes.find(e => e.id === id && e.anime_id === animeId);
      if (ep) {
        ep.episode_number = index + 1;
        ep.updated_at = new Date().toISOString();
      }
    });
    this.saveData();
    return this.getEpisodesByAnimeId(animeId);
  }

  // --- Episode Download Links ---
  public getDownloadLinksForEpisode(episodeId: string): DownloadLink[] {
    const ep = this.getEpisodeById(episodeId);
    if (!ep) return [];

    const epVideoUrl = ep.video_url || (ep.drive_file_id ? `https://drive.google.com/file/d/${ep.drive_file_id}/view` : '');

    if (!ep.download_links || ep.download_links.length === 0) {
      const anime = this.getAnimeById(ep.anime_id);
      const primaryUrl = epVideoUrl || anime?.video_url || 'https://drive.google.com';
      ep.download_links = [
        {
          id: `dl-${ep.id}-1`,
          anime_id: ep.anime_id,
          host_name: 'Server 1 (Google Drive Direct)',
          label: 'Direct Fast Mirror',
          url: primaryUrl,
          enabled: true,
          order: 1
        },
        {
          id: `dl-${ep.id}-2`,
          anime_id: ep.anime_id,
          host_name: 'Server 2 (Backup Mirror)',
          label: 'Backup Authorized Cloud Link',
          url: epVideoUrl || 'https://drive.google.com',
          enabled: true,
          order: 2
        }
      ];
      this.saveData();
    } else {
      let changed = false;
      ep.download_links.forEach(link => {
        if (epVideoUrl && (!link.url || link.url.includes('commondatastorage.googleapis.com') || link.url === 'https://drive.google.com' || link.url === 'https://example.com')) {
          link.url = epVideoUrl;
          changed = true;
        }
      });
      if (changed) {
        this.saveData();
      }
    }
    return (ep.download_links || []).filter(l => l.enabled !== false);
  }

  public getAllDownloadLinksForEpisodeAdmin(episodeId: string): DownloadLink[] {
    const ep = this.getEpisodeById(episodeId);
    if (!ep) return [];
    if (!ep.download_links || ep.download_links.length === 0) {
      this.getDownloadLinksForEpisode(episodeId);
    }
    return ep.download_links || [];
  }

  public saveDownloadLinksForEpisode(episodeId: string, links: Partial<DownloadLink>[]): DownloadLink[] {
    const ep = this.getEpisodeById(episodeId);
    if (!ep) return [];

    const formattedLinks: DownloadLink[] = links.map((l, index) => ({
      id: l.id || `dl-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      anime_id: ep.anime_id,
      host_name: l.host_name || `Server ${index + 1}`,
      label: l.label || 'Download',
      url: l.url || 'https://example.com',
      enabled: l.enabled !== false,
      order: l.order !== undefined ? Number(l.order) : index + 1,
      updated_at: new Date().toISOString()
    }));

    ep.download_links = formattedLinks;
    this.saveData();
    return formattedLinks;
  }

  // --- Page Settings ---
  private getDefaultPageSettings(): PageSettingsConfig {
    return {
      download_step1: {
        title: 'Download Step 1 — Cinevora',
        heading: 'DOWNLOAD',
        description: 'Click below to verify node availability and initialize secure link generation.',
        button_text: 'CLICK HERE TO CONTINUE',
        custom_text: 'Your request will be processed through encrypted CDN edge servers.',
        bg_image_url: '',
        bg_color: '#080a18',
        countdown_seconds: 10,
        ads_enabled: true,
        top_ad_slot: 'DOWNLOAD_GATEWAY_TOP',
        middle_ad_slot: 'DOWNLOAD_GATEWAY_MIDDLE',
        bottom_ad_slot: 'DOWNLOAD_GATEWAY_BOTTOM'
      },
      episode_selection: {
        title: 'Select Episode — Cinevora',
        heading: 'EPISODE SELECTION',
        description: 'Select your desired episode to proceed to the secure download mirror gateway.',
        custom_text: 'All episodes are updated immediately when published by administrators.',
        bg_image_url: '',
        bg_color: '#080a18',
        countdown_seconds: 10,
        ads_enabled: true,
        top_ad_slot: 'ANIME_TOP',
        middle_ad_slot: 'ANIME_MIDDLE',
        bottom_ad_slot: 'ANIME_BOTTOM'
      },
      episode_download: {
        title: 'Episode Download Gateway — Cinevora',
        heading: 'SECURE EPISODE DOWNLOAD',
        description: 'Click below and complete the countdown sequence to unlock authorized download mirrors.',
        button_text: 'CLICK HERE TO CONTINUE',
        custom_text: 'Ensure popup blockers are paused if you encounter issues opening external hosts.',
        bg_image_url: '',
        bg_color: '#080a18',
        countdown_seconds: 10,
        ads_enabled: true,
        top_ad_slot: 'DOWNLOAD_GATEWAY_TOP',
        before_timer_ad_slot: 'DOWNLOAD_GATEWAY_TOP',
        middle_ad_slot: 'DOWNLOAD_GATEWAY_MIDDLE',
        after_timer_ad_slot: 'DOWNLOAD_GATEWAY_MIDDLE',
        bottom_ad_slot: 'DOWNLOAD_GATEWAY_BOTTOM'
      },
      final_download_links: {
        title: 'Authorized Download Links — Cinevora',
        heading: 'AUTHORIZED DOWNLOAD MIRRORS',
        description: 'Choose your preferred cloud host below to open the authorized download link.',
        custom_text: 'All mirrors are verified and encrypted for direct file delivery.',
        bg_image_url: '',
        bg_color: '#080a18',
        countdown_seconds: 0,
        ads_enabled: true,
        top_ad_slot: 'DOWNLOAD_GATEWAY_TOP',
        middle_ad_slot: 'DOWNLOAD_GATEWAY_MIDDLE',
        bottom_ad_slot: 'DOWNLOAD_GATEWAY_BOTTOM'
      }
    };
  }

  public getPageSettings(): PageSettingsConfig {
    if (!this.data.page_settings) {
      this.data.page_settings = this.getDefaultPageSettings();
      this.saveData();
    }
    return this.data.page_settings;
  }

  public updatePageSettings(newSettings: Partial<PageSettingsConfig>): PageSettingsConfig {
    const current = this.getPageSettings();
    this.data.page_settings = {
      download_step1: { ...current.download_step1, ...(newSettings.download_step1 || {}) },
      episode_selection: { ...current.episode_selection, ...(newSettings.episode_selection || {}) },
      episode_download: { ...current.episode_download, ...(newSettings.episode_download || {}) },
      final_download_links: { ...current.final_download_links, ...(newSettings.final_download_links || {}) }
    };
    this.saveData();
    return this.data.page_settings;
  }

  // --- Watchlist & Favorites ---
  public getWatchlist(userId: string): Anime[] {
    const animeIds = this.data.watchlist.filter(w => w.user_id === userId).map(w => w.anime_id);
    return this.data.anime.filter(a => animeIds.includes(a.id));
  }

  public toggleWatchlist(userId: string, animeId: string): { inWatchlist: boolean } {
    const index = this.data.watchlist.findIndex(w => w.user_id === userId && w.anime_id === animeId);
    if (index > -1) {
      this.data.watchlist.splice(index, 1);
      this.saveData();
      return { inWatchlist: false };
    } else {
      this.data.watchlist.push({
        id: 'wl-' + Date.now(),
        user_id: userId,
        anime_id: animeId,
        added_at: new Date().toISOString()
      });
      this.saveData();
      return { inWatchlist: true };
    }
  }

  public getFavorites(userId: string): Anime[] {
    const animeIds = this.data.favorites.filter(f => f.user_id === userId).map(f => f.anime_id);
    return this.data.anime.filter(a => animeIds.includes(a.id));
  }

  public toggleFavorite(userId: string, animeId: string): { isFavorite: boolean } {
    const index = this.data.favorites.findIndex(f => f.user_id === userId && f.anime_id === animeId);
    if (index > -1) {
      this.data.favorites.splice(index, 1);
      this.saveData();
      return { isFavorite: false };
    } else {
      this.data.favorites.push({
        id: 'fav-' + Date.now(),
        user_id: userId,
        anime_id: animeId,
        added_at: new Date().toISOString()
      });
      this.saveData();
      return { isFavorite: true };
    }
  }

  // --- Watch History ---
  public recordWatchHistory(userId: string, animeId: string, episodeId?: string, progressSeconds = 0) {
    const existingIndex = this.data.watch_history.findIndex(
      h => h.user_id === userId && h.anime_id === animeId
    );
    if (existingIndex > -1) {
      this.data.watch_history[existingIndex] = {
        ...this.data.watch_history[existingIndex],
        episode_id: episodeId,
        progress_seconds: progressSeconds,
        watched_at: new Date().toISOString()
      };
    } else {
      this.data.watch_history.push({
        id: 'hist-' + Date.now(),
        user_id: userId,
        anime_id: animeId,
        episode_id: episodeId,
        progress_seconds: progressSeconds,
        watched_at: new Date().toISOString()
      });
    }
    this.saveData();
  }

  public getWatchHistory(userId: string) {
    return this.data.watch_history
      .filter(h => h.user_id === userId)
      .sort((a, b) => new Date(b.watched_at).getTime() - new Date(a.watched_at).getTime())
      .map(h => {
        const anime = this.getAnimeById(h.anime_id);
        return { ...h, anime };
      });
  }

  // --- Admin Activity ---
  public logAdminAction(adminId: string, adminName: string, action: string, details: string, ip = '127.0.0.1') {
    this.data.admin_activity.unshift({
      id: 'act-' + Date.now(),
      admin_id: adminId,
      admin_name: adminName,
      action,
      details,
      timestamp: new Date().toISOString(),
      ip
    });
    // Keep last 100 activities
    if (this.data.admin_activity.length > 100) {
      this.data.admin_activity = this.data.admin_activity.slice(0, 100);
    }
    this.saveData();
  }

  public getAdminLogs(): AdminActivity[] {
    return this.data.admin_activity;
  }

  // --- Ads Management Methods ---
  public getAds(): Ad[] {
    return this.data.ads || [];
  }

  public getAdById(id: string): Ad | undefined {
    return (this.data.ads || []).find(a => a.id === id);
  }

  public createAd(adData: Partial<Ad>): Ad {
    const now = new Date().toISOString();
    const newAd: Ad = {
      id: 'ad-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      name: adData.name || 'Untitled Ad',
      type: adData.type || 'BANNER',
      scope: adData.scope || 'GLOBAL',
      anime_id: adData.anime_id || undefined,
      episode_id: adData.episode_id || undefined,
      code: adData.code || '',
      image_url: adData.image_url || '',
      target_url: adData.target_url || '',
      title: adData.title || '',
      description: adData.description || '',
      slot: adData.slot || 'HOME_TOP',
      status: adData.status || 'ACTIVE',
      priority: Number(adData.priority) || 1,
      frequency: adData.frequency || 'PAGE_VIEW',
      frequency_value: adData.frequency_value ? Number(adData.frequency_value) : undefined,
      start_date: adData.start_date || undefined,
      end_date: adData.end_date || undefined,
      impressions: 0,
      clicks: 0,
      created_at: now,
      updated_at: now
    };
    if (!this.data.ads) this.data.ads = [];
    this.data.ads.unshift(newAd);
    this.saveData();
    return newAd;
  }

  public updateAd(id: string, adData: Partial<Ad>): Ad | undefined {
    if (!this.data.ads) this.data.ads = [];
    const index = this.data.ads.findIndex(a => a.id === id);
    if (index === -1) return undefined;

    const existing = this.data.ads[index];
    const updatedAd: Ad = {
      ...existing,
      ...adData,
      id: existing.id,
      scope: adData.scope !== undefined ? adData.scope : (existing.scope || 'GLOBAL'),
      anime_id: adData.anime_id !== undefined ? adData.anime_id : existing.anime_id,
      episode_id: adData.episode_id !== undefined ? adData.episode_id : existing.episode_id,
      priority: adData.priority !== undefined ? Number(adData.priority) : existing.priority,
      updated_at: new Date().toISOString()
    };
    this.data.ads[index] = updatedAd;
    this.saveData();
    return updatedAd;
  }

  public deleteAd(id: string): boolean {
    if (!this.data.ads) return false;
    const lenBefore = this.data.ads.length;
    this.data.ads = this.data.ads.filter(a => a.id !== id);
    if (this.data.ads.length !== lenBefore) {
      this.saveData();
      return true;
    }
    return false;
  }

  public toggleAdStatus(id: string): Ad | undefined {
    if (!this.data.ads) return undefined;
    const ad = this.data.ads.find(a => a.id === id);
    if (!ad) return undefined;
    ad.status = ad.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    ad.updated_at = new Date().toISOString();
    this.saveData();
    return ad;
  }

  public duplicateAd(id: string): Ad | undefined {
    if (!this.data.ads) return undefined;
    const source = this.data.ads.find(a => a.id === id);
    if (!source) return undefined;

    const now = new Date().toISOString();
    const cloned: Ad = {
      ...source,
      id: 'ad-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      name: source.name + ' (Copy)',
      impressions: 0,
      clicks: 0,
      created_at: now,
      updated_at: now
    };
    this.data.ads.unshift(cloned);
    this.saveData();
    return cloned;
  }

  public getAdSlots(): AdSlotConfig[] {
    return this.data.ad_slots || this.getDefaultAdSlots();
  }

  public updateAdSlots(slots: AdSlotConfig[]): AdSlotConfig[] {
    this.data.ad_slots = slots;
    this.saveData();
    return this.data.ad_slots;
  }

  public getAdSettings(): AdSettings {
    return this.data.ad_settings || this.getDefaultAdSettings();
  }

  public updateAdSettings(newSettings: Partial<AdSettings>): AdSettings {
    const current = this.getAdSettings();
    this.data.ad_settings = {
      ...current,
      ...newSettings,
      section_enabled: {
        ...current.section_enabled,
        ...(newSettings.section_enabled || {})
      }
    };
    this.saveData();
    return this.data.ad_settings;
  }

  public recordAdImpression(id: string): Ad | undefined {
    if (!this.data.ads) return undefined;
    const ad = this.data.ads.find(a => a.id === id);
    if (!ad) return undefined;
    ad.impressions = (ad.impressions || 0) + 1;
    ad.last_displayed = new Date().toISOString();
    this.saveData();
    return ad;
  }

  public recordAdClick(id: string): Ad | undefined {
    if (!this.data.ads) return undefined;
    const ad = this.data.ads.find(a => a.id === id);
    if (!ad) return undefined;
    ad.clicks = (ad.clicks || 0) + 1;
    ad.last_clicked = new Date().toISOString();
    this.saveData();
    return ad;
  }

  public getAdsForSlot(slotName: string, animeId?: string, episodeId?: string): Ad[] {
    const settings = this.getAdSettings();
    if (!settings.enabled) return [];

    const slots = this.getAdSlots();
    const slotConfig = slots.find(s => s.slot === slotName);
    if (slotConfig && !slotConfig.enabled) return [];

    if (slotConfig && settings.section_enabled) {
      const section = slotConfig.section;
      if (settings.section_enabled[section] === false) {
        return [];
      }
    }

    const now = new Date().getTime();

    const isMatchingSlot = (adSlot: string, targetSlot: string): boolean => {
      if (adSlot === targetSlot) return true;

      const topSlots = ['DOWNLOAD_PAGE_TOP', 'DOWNLOAD_GATEWAY_TOP', 'DOWNLOAD_INTERSTITIAL_TOP', 'EPISODE_DOWNLOAD_TOP', 'HOSTING_LINKS_TOP'];
      if (topSlots.includes(adSlot) && topSlots.includes(targetSlot)) return true;

      const betweenSlots = ['DOWNLOAD_BETWEEN_COUNTDOWNS', 'DOWNLOAD_INTERSTITIAL_BETWEEN_COUNTDOWN_BUTTON'];
      if (betweenSlots.includes(adSlot) && betweenSlots.includes(targetSlot)) return true;

      const aboveSlots = ['DOWNLOAD_ABOVE_BUTTON', 'DOWNLOAD_INTERSTITIAL_ABOVE_COUNTDOWN', 'EPISODE_DOWNLOAD_BEFORE_BUTTON', 'HOSTING_LINKS_ABOVE'];
      if (aboveSlots.includes(adSlot) && aboveSlots.includes(targetSlot)) return true;

      const belowSlots = ['DOWNLOAD_BELOW_BUTTON', 'DOWNLOAD_INTERSTITIAL_BELOW_COUNTDOWN', 'EPISODE_DOWNLOAD_BOTTOM', 'HOSTING_LINKS_BELOW'];
      if (belowSlots.includes(adSlot) && belowSlots.includes(targetSlot)) return true;

      return false;
    };

    let activeAds = (this.data.ads || []).filter(a => {
      if (!isMatchingSlot(a.slot, slotName)) return false;
      if (a.status !== 'ACTIVE') return false;

      const scope = a.scope || 'GLOBAL';
      if (scope === 'ANIME') {
        if (animeId && a.anime_id && a.anime_id !== animeId) return false;
      } else if (scope === 'EPISODE') {
        if (episodeId && a.episode_id && a.episode_id !== episodeId) return false;
      }

      if (a.start_date) {
        const start = new Date(a.start_date).getTime();
        if (!isNaN(start) && now < start) return false;
      }
      if (a.end_date) {
        const end = new Date(a.end_date).getTime();
        if (!isNaN(end) && now > end) return false;
      }

      return true;
    });

    if (activeAds.length === 0) return [];

    const rotation = settings.default_rotation || 'RANDOM';
    if (rotation === 'PRIORITY') {
      activeAds.sort((a, b) => (b.priority || 1) - (a.priority || 1));
    } else if (rotation === 'SEQUENTIAL') {
      activeAds.sort((a, b) => {
        const tA = a.last_displayed ? new Date(a.last_displayed).getTime() : 0;
        const tB = b.last_displayed ? new Date(b.last_displayed).getTime() : 0;
        return tA - tB;
      });
    } else {
      // Sort by priority first (highest first), then randomize among equal priority
      activeAds.sort((a, b) => {
        const pDiff = (b.priority || 1) - (a.priority || 1);
        if (pDiff !== 0) return pDiff;
        return Math.random() - 0.5;
      });
    }

    return activeAds;
  }

  // --- Settings ---
  public getSettings(): Settings {
    return this.data.settings;
  }

  public updateSettings(newSettings: Partial<Settings>): Settings {
    this.data.settings = { ...this.data.settings, ...newSettings };
    this.saveData();
    return this.data.settings;
  }

  // --- Stats for Admin Dashboard ---
  public getAdminStats() {
    return {
      totalAnime: this.data.anime.length,
      totalMovies: this.data.anime.filter(a => a.type === 'MOVIE').length,
      totalSeries: this.data.anime.filter(a => a.type === 'SERIES').length,
      totalEpisodes: this.data.episodes.length,
      totalUsers: this.data.users.length,
      recentUsers: this.data.users.slice(-5).reverse().map(u => ({
        id: u.id,
        username: u.username,
        email: u.email,
        role: u.role,
        status: u.status,
        created_at: u.created_at
      })),
      recentAnime: this.data.anime.slice(0, 5)
    };
  }
}

export const db = new Database();
