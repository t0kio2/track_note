-- Add nullable category to videos
alter table if exists public.videos
  add column if not exists category text null;

-- optional: backfill or create index if needed
-- create index if not exists idx_videos_category on public.videos (category);

