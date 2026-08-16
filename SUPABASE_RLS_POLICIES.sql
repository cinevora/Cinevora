-- CineVora Supabase catalog read policies
-- Run this once in Supabase SQL Editor.
-- These statements are intentionally safe if the policies already exist.

alter table public.anime enable row level security;
alter table public.seasons enable row level security;
alter table public.episodes enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='anime' and policyname='Public can read anime'
  ) then
    create policy "Public can read anime"
      on public.anime for select to anon, authenticated using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='seasons' and policyname='Public can read seasons'
  ) then
    create policy "Public can read seasons"
      on public.seasons for select to anon, authenticated using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='episodes' and policyname='Public can read episodes'
  ) then
    create policy "Public can read episodes"
      on public.episodes for select to anon, authenticated using (true);
  end if;
end
$$;
