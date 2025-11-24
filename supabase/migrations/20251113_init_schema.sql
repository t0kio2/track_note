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
  -- 行の所有者（Supabase Auth のユーザー）
  user_id uuid not null references auth.users(id),
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

-- RLS: enable (row-level security)
alter table public.videos enable row level security;
alter table public.tracks enable row level security;

-- 既存ポリシーを全削除（存在しなくてもOK）
drop policy if exists "anon select videos" on public.videos;
drop policy if exists "anon insert videos" on public.videos;
drop policy if exists "anon update videos" on public.videos;
drop policy if exists "anon delete videos" on public.videos;
drop policy if exists "auth select videos" on public.videos;
drop policy if exists "auth insert videos" on public.videos;
drop policy if exists "auth update videos" on public.videos;
drop policy if exists "auth delete videos" on public.videos;

drop policy if exists "anon select tracks" on public.tracks;
drop policy if exists "anon insert tracks" on public.tracks;
drop policy if exists "anon update tracks" on public.tracks;
drop policy if exists "anon delete tracks" on public.tracks;
drop policy if exists "auth select tracks" on public.tracks;
drop policy if exists "auth insert tracks" on public.tracks;
drop policy if exists "auth update tracks" on public.tracks;
drop policy if exists "auth delete tracks" on public.tracks;

-- Row ownership: videos
-- 自分の user_id の行だけ読める
create policy "videos_select_own"
  on public.videos
  for select
  using (user_id = auth.uid());

-- 自分の user_id の行だけ INSERT できる
create policy "videos_insert_own"
  on public.videos
  for insert
  with check (user_id = auth.uid());

-- 自分の user_id の行だけ UPDATE できる
create policy "videos_update_own"
  on public.videos
  for update
  using (user_id = auth.uid());

-- 自分の user_id の行だけ DELETE できる
create policy "videos_delete_own"
  on public.videos
  for delete
  using (user_id = auth.uid());

-- Row ownership: tracks
-- 紐づく videos の user_id が自分のものだけアクセス可

create policy "tracks_select_own"
  on public.tracks
  for select
  using (
    exists (
      select 1
      from public.videos v
      where v.video_id = tracks.video_id
        and v.user_id = auth.uid()
    )
  );

create policy "tracks_insert_own"
  on public.tracks
  for insert
  with check (
    exists (
      select 1
      from public.videos v
      where v.video_id = tracks.video_id
        and v.user_id = auth.uid()
    )
  );

create policy "tracks_update_own"
  on public.tracks
  for update
  using (
    exists (
      select 1
      from public.videos v
      where v.video_id = tracks.video_id
        and v.user_id = auth.uid()
    )
  );

create policy "tracks_delete_own"
  on public.tracks
  for delete
  using (
    exists (
      select 1
      from public.videos v
      where v.video_id = tracks.video_id
        and v.user_id = auth.uid()
    )
  );
