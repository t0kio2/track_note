"use client";

import type { Track, Video } from "./types";
import { extractYouTubeId, normalizeYouTubeUrl, thumbnailUrlFromId } from "./youtube";
import {
  fetchAllVideosRemote,
  fetchTrackRemote,
  fetchVideoRemote,
  insertVideoRemote,
  updateVideoRemote as updateVideoRemoteApi,
  deleteVideoRemote,
  upsertTrackRemote,
} from "./storage-remote";

function nowISO() {
  return new Date().toISOString();
}

function uuid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    // @ts-ignore
    return crypto.randomUUID();
  }
  return `id_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

// --- Remote-only API ---
export async function getVideos(): Promise<Video[]> {
  return await fetchAllVideosRemote();
}

export async function getVideoByVideoId(videoId: string): Promise<Video | undefined> {
  const v = await fetchVideoRemote(videoId);
  return v ?? undefined;
}

export async function getTrack(videoId: string): Promise<Track | null> {
  return await fetchTrackRemote(videoId);
}

export async function setTrack(track: Track): Promise<void> {
  await upsertTrackRemote(track);
}

export async function removeVideo(id: string, videoId: string): Promise<void> {
  await deleteVideoRemote(id, videoId);
}

export async function updateVideo(id: string, patch: Partial<Pick<Video, "title" | "instrument" | "note" | "durationSec">>): Promise<void> {
  const updatedAt = nowISO();
  await updateVideoRemoteApi(id, { ...(patch as any), updatedAt } as any);
}

export async function addVideo(params: { url: string; title?: string; instrument?: string; durationSec?: number; blockSizeSec?: number }): Promise<Video> {
  const url = normalizeYouTubeUrl(params.url);
  const videoId = extractYouTubeId(url);
  if (!videoId) throw new Error("YouTube の URL ではないようです");

  const exist = await fetchVideoRemote(videoId);
  if (exist) return exist;

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
    createdAt,
    updatedAt: createdAt,
  };
  const inserted = await insertVideoRemote(v);

  // Track 初期化
  const blockSizeSec = params.blockSizeSec && params.blockSizeSec > 0 ? Math.floor(params.blockSizeSec) : 5;
  const blocks = Math.ceil(inserted.durationSec / blockSizeSec);
  const track: Track = {
    videoId: inserted.videoId,
    blockSizeSec,
    levels: Array.from({ length: blocks }, () => 0),
  };
  await setTrack(track);
  return inserted;
}

// --- ブロック変換ユーティリティ ---
export function resampleLevelsMax(oldLevels: number[], oldBlock: number, newBlock: number, totalSec?: number): number[] {
  if (oldLevels.length === 0 || oldBlock <= 0 || newBlock <= 0) return [];
  const duration = totalSec && totalSec > 0 ? totalSec : oldLevels.length * oldBlock;
  const newLen = Math.max(1, Math.ceil(duration / newBlock));
  const out = new Array<number>(newLen).fill(0);
  for (let j = 0; j < newLen; j++) {
    const start = j * newBlock;
    const end = Math.min(duration, start + newBlock);
    let maxLevel = 0;
    const iStart = Math.floor(start / oldBlock);
    const iEnd = Math.floor((Math.max(0, end - 0.000001)) / oldBlock);
    for (let i = iStart; i <= iEnd && i < oldLevels.length; i++) {
      maxLevel = Math.max(maxLevel, oldLevels[i] || 0);
      if (maxLevel === 3) break;
    }
    out[j] = maxLevel;
  }
  return out;
}

export async function updateTrackBlockSize(videoId: string, newBlockSizeSec: number): Promise<void> {
  const track = await getTrack(videoId);
  const video = await getVideoByVideoId(videoId);
  if (!track || !video) return;
  const bs = Math.max(1, Math.floor(newBlockSizeSec));
  if (bs === track.blockSizeSec) return;
  const levels = resampleLevelsMax(track.levels, track.blockSizeSec, bs, video.durationSec);
  await setTrack({ videoId, blockSizeSec: bs, levels });
}
