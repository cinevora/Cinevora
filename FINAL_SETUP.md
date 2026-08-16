# CineVora — final Supabase catalog setup

This ZIP is based on the supplied CineVora project backup.

## What is already included
- Supabase catalog integration in `server/supabase.ts`
- Startup catalog sync in `server/db.ts` / `server.ts`
- Existing JSON database remains as fallback for users, comments, settings, ads, etc.
- `.env.example`
- `.env` placeholder file at the project root
- `SUPABASE_RLS_POLICIES.sql` with safe policy creation
- `SUPABASE_SETUP.md`

## One-time setup
1. Keep `.env` in the project root, beside `package.json`.
2. Open `.env`.
3. Replace only:
   - `YOUR_SUPABASE_URL`
   - `YOUR_SUPABASE_PUBLISHABLE_KEY`
4. Do not put a Supabase secret/service-role key in `.env` for this app.
5. In Supabase SQL Editor, run `SUPABASE_RLS_POLICIES.sql` once.
6. Install dependencies and run the existing project scripts:
   `npm install`
   `npm run build`
   `npm run dev`

The app will attempt to load anime/seasons/episodes from Supabase at startup. If Supabase is unavailable, it falls back to the local JSON catalog.
