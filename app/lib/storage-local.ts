"use client";

import type { Track, Video } from "./types";
import { STORAGE_KEYS } from "./types";
import { setCategory as setLocalCategory } from "./categories";
import { extractYouTubeId, normalizeYouTubeUrl, thumbnailUrlFromId } from "./youtube";

function nowISO() {
  return new Date().toISOString();
}

function uuid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function read<T>(key: string, fallback: T): T {
  try {
    const s = sessionStorage.getItem(key);
    if (!s) return fallback;
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

const GUEST_STARTED_KEY = "tracknote.guest.started";

export function isGuestStarted(): boolean {
  try {
    return sessionStorage.getItem(GUEST_STARTED_KEY) === "1";
  } catch {
    return false;
  }
}

function markGuestStarted() {
  try {
    sessionStorage.setItem(GUEST_STARTED_KEY, "1");
  } catch {}
  // 画面上に反映させるためのカスタムイベント
  try {
    window.dispatchEvent(new Event("tracknote-guest-started"));
  } catch {}
}

export function clearGuestData() {
  try {
    sessionStorage.removeItem(STORAGE_KEYS.videos);
    sessionStorage.removeItem(STORAGE_KEYS.tracks);
    sessionStorage.removeItem(GUEST_STARTED_KEY);
  } catch {
    // ignore
  }
}

export async function fetchAllVideosLocal(): Promise<Video[]> {
  return read<Video[]>(STORAGE_KEYS.videos, []);
}

export async function fetchVideoLocal(videoId: string): Promise<Video | null> {
  const vids = await fetchAllVideosLocal();
  return vids.find((v) => v.videoId === videoId) ?? null;
}

export async function insertVideoLocal(params: { url: string; title?: string; instrument?: string; durationSec?: number; category?: string }): Promise<Video> {
  const url = normalizeYouTubeUrl(params.url);
  const videoId = extractYouTubeId(url);
  if (!videoId) throw new Error("YouTube の URL ではないようです");
  const createdAt = nowISO();
  const v: Video = {
    id: uuid(),
    provider: "youtube",
    videoId,
    url,
    title: params.title?.trim() || `YouTube ${videoId}`,
    durationSec: typeof params.durationSec === "number" ? Math.max(1, Math.floor(params.durationSec)) : 180,
    thumbnailUrl: thumbnailUrlFromId(videoId),
    instrument: params.instrument?.trim() || undefined,
    category: params.category?.trim() || undefined,
    createdAt,
    updatedAt: createdAt,
  };

  const vids = await fetchAllVideosLocal();
  // 既存があればそれを返す
  const exist = vids.find((x) => x.videoId === v.videoId);
  if (exist) return exist;

  // ゲストモード上限: 3件
  if (vids.length >= 3) {
    throw new Error("ゲストモードでは3件までしか登録できません。これ以上登録する場合はアカウント登録してください。");
  }

  const next = [v, ...vids];
  write(STORAGE_KEYS.videos, next);
  markGuestStarted();
  if (v.category) {
    try { setLocalCategory(v.videoId, v.category); } catch {}
  }

  // Track 初期化
  const blockSizeSec = 5;
  const blocks = Math.ceil(v.durationSec / blockSizeSec);
  const tracks = read<Record<string, Track>>(STORAGE_KEYS.tracks, {});
  tracks[v.videoId] = { videoId: v.videoId, blockSizeSec, levels: Array.from({ length: blocks }, () => 0) };
  write(STORAGE_KEYS.tracks, tracks);

  return v;
}

export async function updateVideoLocal(id: string, patch: Partial<Pick<Video, "title" | "instrument" | "note" | "durationSec" | "category">>): Promise<void> {
  const vids = await fetchAllVideosLocal();
  const idx = vids.findIndex((v) => v.id === id);
  if (idx < 0) return;
  const updatedAt = nowISO();
  const pv = vids[idx];
  const nv: Video = {
    ...pv,
    title: patch.title != null ? patch.title : pv.title,
    instrument: patch.instrument !== undefined ? patch.instrument : pv.instrument,
    note: patch.note !== undefined ? patch.note : pv.note,
    durationSec: patch.durationSec != null ? patch.durationSec : pv.durationSec,
    category: patch.category !== undefined ? patch.category : pv.category,
    updatedAt,
  };
  vids[idx] = nv;
  write(STORAGE_KEYS.videos, vids);
}

export async function deleteVideoLocal(id: string, videoId: string): Promise<void> {
  const vids = await fetchAllVideosLocal();
  const next = vids.filter((v) => v.id !== id);
  write(STORAGE_KEYS.videos, next);
  const tracks = read<Record<string, Track>>(STORAGE_KEYS.tracks, {});
  if (tracks[videoId]) {
    delete tracks[videoId];
    write(STORAGE_KEYS.tracks, tracks);
  }
}

export async function fetchTrackLocal(videoId: string): Promise<Track | null> {
  const tracks = read<Record<string, Track>>(STORAGE_KEYS.tracks, {});
  return tracks[videoId] ?? null;
}

export async function upsertTrackLocal(track: Track): Promise<void> {
  const tracks = read<Record<string, Track>>(STORAGE_KEYS.tracks, {});
  tracks[track.videoId] = track;
  write(STORAGE_KEYS.tracks, tracks);
}
