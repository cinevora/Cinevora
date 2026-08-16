# CineVora + Supabase setup

This backup is a Vite/React + Express app. Do **not** put Supabase values in `package.json`.

## 1. Environment
Copy `.env.example` to `.env` and fill:

```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
```

Use the values from Supabase **Connect -> Framework -> `.env.local`**. Never use or expose a `service_role`/secret key in the browser.

## 2. What this migration does
The server now attempts to load the `anime`, `seasons`, and `episodes` catalog from Supabase at startup. Other CineVora state remains on the existing JSON database for now, so authentication/settings/ads/comments are not silently migrated. If Supabase is unavailable or RLS blocks a table, the app keeps using the local JSON catalog instead of crashing.

## 3. Required read policies
The publishable key can only read rows allowed by RLS. Create SELECT policies for `anime`, `seasons`, and `episodes` if they are not already present. Example for a public catalog:

```sql
alter table public.anime enable row level security;
alter table public.seasons enable row level security;
alter table public.episodes enable row level security;

create policy "Public can read anime" on public.anime for select to anon, authenticated using (true);
create policy "Public can read seasons" on public.seasons for select to anon, authenticated using (true);
create policy "Public can read episodes" on public.episodes for select to anon, authenticated using (true);
```

If a policy already exists, do not create it again.

## 4. Install/build
Run `npm install`, then `npm run build`.
