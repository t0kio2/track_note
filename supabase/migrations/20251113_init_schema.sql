-- Init schema for Track Note
-- tables: videos, tracks
-- extensions and triggers

-- Enable required extensions
create extension if not exists "uuid-ossp" with schema extensions;
create extension if not exists pgcrypto with schema extensions; -- for gen_random_uuid()
create extension if not exists moddatetime with schema extensions;

-- videos table
create table if not exists public.videos (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider = 'youtube'),
  video_id text not null unique,
  url text not null,
  title text not null,
  duration_sec integer not null check (duration_sec > 0),
  thumbnail_url text not null,
  instrument text null,
  note text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- auto update updated_at
drop trigger if exists handle_updated_at on public.videos;
create trigger handle_updated_at
before update on public.videos
for each row execute function extensions.moddatetime(updated_at);

-- tracks table
create table if not exists public.tracks (
  video_id text primary key references public.videos(video_id) on delete cascade,
  block_size_sec integer not null check (block_size_sec > 0),
  levels jsonb not null
);

-- RLS: enable and allow anon full access for local dev
alter table public.videos enable row level security;
alter table public.tracks enable row level security;

-- policies for anon (broad permissions for local development)
drop policy if exists "anon select videos" on public.videos;
drop policy if exists "anon insert videos" on public.videos;
drop policy if exists "anon update videos" on public.videos;
drop policy if exists "anon delete videos" on public.videos;

create policy "anon select videos" on public.videos for select using (true);
create policy "anon insert videos" on public.videos for insert with check (true);
create policy "anon update videos" on public.videos for update using (true);
create policy "anon delete videos" on public.videos for delete using (true);

drop policy if exists "anon select tracks" on public.tracks;
drop policy if exists "anon insert tracks" on public.tracks;
drop policy if exists "anon update tracks" on public.tracks;
drop policy if exists "anon delete tracks" on public.tracks;

create policy "anon select tracks" on public.tracks for select using (true);
create policy "anon insert tracks" on public.tracks for insert with check (true);
create policy "anon update tracks" on public.tracks for update using (true);
create policy "anon delete tracks" on public.tracks for delete using (true);
