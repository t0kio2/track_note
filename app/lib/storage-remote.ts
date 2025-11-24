"use client";

import type { Track, Video } from "./types";
import { sbFetch, supabaseEnabled } from "./supabase-rest";
import { getUserId } from "./auth";

function toSnakeVideo(v: Video) {
  return {
    id: v.id,
    provider: v.provider,
    video_id: v.videoId,
    url: v.url,
    title: v.title,
    duration_sec: v.durationSec,
    thumbnail_url: v.thumbnailUrl,
    instrument: v.instrument ?? null,
    note: v.note ?? null,
    created_at: v.createdAt,
    updated_at: v.updatedAt,
  };
}

function fromSnakeVideo(row: any): Video {
  return {
    id: row.id,
    provider: row.provider,
    videoId: row.video_id,
    url: row.url,
    title: row.title,
    durationSec: row.duration_sec,
    thumbnailUrl: row.thumbnail_url,
    instrument: row.instrument ?? undefined,
    note: row.note ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  } as Video;
}

function toSnakeTrack(t: Track) {
  return {
    video_id: t.videoId,
    block_size_sec: t.blockSizeSec,
    levels: t.levels,
  };
}

function fromSnakeTrack(row: any): Track {
  return {
    videoId: row.video_id,
    blockSizeSec: row.block_size_sec,
    levels: Array.isArray(row.levels) ? row.levels : [],
  } as Track;
}

export function isRemoteEnabled() {
  return supabaseEnabled();
}

// ---- Reads ----
export async function fetchAllVideosRemote(): Promise<Video[]> {
  const rows = await sbFetch(`/rest/v1/videos?select=*&order=created_at.desc`, { requireAuth: true });
  return (rows as any[]).map(fromSnakeVideo);
}

export async function fetchVideoRemote(videoId: string): Promise<Video | null> {
  const rows = await sbFetch(`/rest/v1/videos?select=*&video_id=eq.${encodeURIComponent(videoId)}&limit=1`, { requireAuth: true });
  const arr = rows as any[];
  if (!arr.length) return null;
  return fromSnakeVideo(arr[0]);
}

export async function fetchTrackRemote(videoId: string): Promise<Track | null> {
  const rows = await sbFetch(`/rest/v1/tracks?select=*&video_id=eq.${encodeURIComponent(videoId)}&limit=1`, { requireAuth: true });
  const arr = rows as any[];
  if (!arr.length) return null;
  return fromSnakeTrack(arr[0]);
}

// ---- Mutations ----
export async function insertVideoRemote(v: Video): Promise<Video> {
  const userId = await getUserId().catch(() => null);
  const body = { ...toSnakeVideo(v), ...(userId ? { user_id: userId } : {}) } as any;
  const rows = await sbFetch(`/rest/v1/videos`, {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body,
    requireAuth: true,
  });
  return fromSnakeVideo((rows as any[])[0]);
}

export async function updateVideoRemote(id: string, patch: Partial<Video>): Promise<void> {
  const snake: any = {};
  if (patch.title != null) snake.title = patch.title;
  if (patch.instrument !== undefined) snake.instrument = patch.instrument ?? null;
  if (patch.note !== undefined) snake.note = patch.note ?? null;
  if (patch.durationSec != null) snake.duration_sec = patch.durationSec;
  if (patch.thumbnailUrl != null) snake.thumbnail_url = patch.thumbnailUrl;
  if (patch.updatedAt != null) snake.updated_at = patch.updatedAt;
  await sbFetch(`/rest/v1/videos?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: snake,
    requireAuth: true,
  });
}

export async function deleteVideoRemote(id: string, videoId: string): Promise<void> {
  // 先に tracks を削除
  await sbFetch(`/rest/v1/tracks?video_id=eq.${encodeURIComponent(videoId)}`, {
    method: "DELETE",
    requireAuth: true,
  }).catch(() => {});
  // videos 削除
  await sbFetch(`/rest/v1/videos?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    requireAuth: true,
  });
}

export async function upsertTrackRemote(track: Track): Promise<void> {
  const userId = await getUserId().catch(() => null);
  const body = { ...toSnakeTrack(track), ...(userId ? { user_id: userId } : {}) } as any;
  await sbFetch(`/rest/v1/tracks`, {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body,
    requireAuth: true,
  });
}
