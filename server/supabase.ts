import dotenv from 'dotenv';

dotenv.config();

export interface SupabaseAnimeRow {
  id: string;
  title: string;
  description: string | null;
  poster_url: string | null;
  backdrop_url: string | null;
  genres: string[] | null;
  year: number | null;
  rating: number | string | null;
  language: string | null;
  type: string | null;
  status: string | null;
  created_at: string | null;
}

export interface SupabaseSeasonRow {
  id: string;
  anime_id: string;
  season_number: number;
  title: string | null;
  created_at: string | null;
}

export interface SupabaseEpisodeRow {
  id: string;
  season_id: string;
  episode_number: number;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  video_url: string | null;
  duration: string | null;
  created_at: string | null;
}

export interface SupabaseCatalog {
  anime: SupabaseAnimeRow[];
  seasons: SupabaseSeasonRow[];
  episodes: SupabaseEpisodeRow[];
}

function getConfig() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || '';
  return { url, key };
}

export function isSupabaseConfigured(): boolean {
  const { url, key } = getConfig();
  return Boolean(url && key);
}

async function selectRows<T>(table: string, columns: string): Promise<T[]> {
  const { url, key } = getConfig();
  if (!url || !key) throw new Error('Supabase URL/key not configured');

  const endpoint = `${url}/rest/v1/${table}?select=${encodeURIComponent(columns)}`;
  const response = await fetch(endpoint, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Supabase ${table} query failed (${response.status}): ${body.slice(0, 300)}`);
  }

  return (await response.json()) as T[];
}

export async function fetchSupabaseCatalog(): Promise<SupabaseCatalog> {
  const [anime, seasons, episodes] = await Promise.all([
    selectRows<SupabaseAnimeRow>(
      'anime',
      'id,title,description,poster_url,backdrop_url,genres,year,rating,language,type,status,created_at'
    ),
    selectRows<SupabaseSeasonRow>(
      'seasons',
      'id,anime_id,season_number,title,created_at'
    ),
    selectRows<SupabaseEpisodeRow>(
      'episodes',
      'id,season_id,episode_number,title,description,thumbnail_url,video_url,duration,created_at'
    ),
  ]);

  return { anime, seasons, episodes };
}
