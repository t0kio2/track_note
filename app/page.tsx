"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Video } from "./lib/types";
import { addVideo, getTrack, getVideos } from "./lib/storage";
import { onAuthStateChange, signInWithGoogle } from "./lib/auth";
import { thumbnailUrlFromId } from "./lib/youtube";
import { getCategory as getLocalCategory, getAllCategories as getLocalCategories } from "./lib/categories";
import { getYouTubeDurationSeconds } from "./lib/yt-iframe";
import { fetchYouTubeTitle } from "./lib/yt-oembed";
import { logEvent } from "./lib/analytics";

export default function Home() {
  const router = useRouter();
  const [videos, setVideos] = useState<Video[]>([]);
  const [open, setOpen] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [catRev, setCatRev] = useState(0);
  const categoryOptions = useMemo(() => {
    const fromLocal = getLocalCategories();
    const fromVideos = Array.from(new Set(videos.map((v) => v.category).filter((x): x is string => !!x)));
    return Array.from(new Set([...fromLocal, ...fromVideos])).sort((a, b) => a.localeCompare(b));
  }, [videos, catRev]);

  useEffect(() => {
    // 認証状態を監視
    const off = onAuthStateChange((s) => {
      setAuthed(!!s);
    });
    return () => off();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const list = await getVideos();
        setVideos(list);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [authed]);

  useEffect(() => {
    const onCat = () => setCatRev((x) => x + 1);
    window.addEventListener("tracknote-category-changed", onCat);
    return () => window.removeEventListener("tracknote-category-changed", onCat);
  }, []);

  const handleAdded = async (v: Video | null) => {
    setOpen(false);
    if (v) {
      const list = await getVideos();
      setVideos(list);
      try { logEvent('add_video', { provider: v.provider, video_id: v.videoId }); } catch {}
      router.push(`/videos/${v.videoId}`);
    }
  };

  const guestLimitReached = !authed && videos.length >= 3;

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="mx-auto max-w-5xl px-4 py-6">
        <h1 className="text-2xl font-semibold">TrackNote</h1>
        <p className="text-sm text-zinc-600">YouTube のタブ譜動画で練習進捗を記録</p>
      </header>
      <main className="mx-auto max-w-5xl px-4 pb-24">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-medium">練習曲一覧</h2>
          <button
            className="rounded-md bg-emerald-600 px-3 py-1.5 text-white hover:bg-emerald-700"
            onClick={() => setOpen(true)}
            disabled={guestLimitReached}
          >
            ＋ 追加
          </button>
        </div>

        {guestLimitReached && (
          <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-900">
            ゲストモードでは3件まで登録できます。これ以上登録する場合はアカウント登録してください。
            <button
              className="ml-3 inline-flex items-center rounded-md border border-amber-400 bg-white px-2 py-1 text-sm hover:bg-amber-100"
              onClick={() => signInWithGoogle()}
            >
              アカウント登録 / ログイン
            </button>
          </div>
        )}

        {!videos.length ? (
          <div className="rounded-lg border border-dashed p-10 text-center text-zinc-600">
            <p className="mb-2">YouTube のタブ譜付き演奏動画を登録して、練習の進捗を可視化できます。</p>
            <p className="mb-2">すぐ使い始めたい場合は、未ログインでもゲストモードで利用できます（最大3件まで保存）。</p>
            <p>右上からログインすると、データを保存・同期できます。</p>
          </div>
        ) : (
          (() => {
            const groups = new Map<string, Video[]>();
            const titleOf = (v: Video) => v.category || getLocalCategory(v.videoId) || "";
            for (const v of videos) {
              const cat = titleOf(v);
              const key = cat.trim() || "__none__";
              if (!groups.has(key)) groups.set(key, []);
              groups.get(key)!.push(v);
            }
            const keys = Array.from(groups.keys()).sort((a, b) => {
              if (a === "__none__" && b !== "__none__") return 1;
              if (a !== "__none__" && b === "__none__") return -1;
              return a.localeCompare(b);
            });
            return (
              <div className="space-y-6">
                {keys.map((k) => (
                  <section key={k}>
                    <h3 className="mb-2 text-sm font-medium text-zinc-700">{k === "__none__" ? "カテゴリーなし" : k}</h3>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {groups.get(k)!.map((v) => (
                        <article key={v.id} className="overflow-hidden rounded-lg border bg-white shadow-sm flex sm:block">
                <Link href={`/videos/${v.videoId}`}>
                  {/* use img for remote thumbnail to avoid Next/Image config */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={v.thumbnailUrl || thumbnailUrlFromId(v.videoId)}
                    alt={v.title}
                    className="w-40 aspect-video object-cover flex-none sm:w-full"
                  />
                </Link>
                <div className="p-3 min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link href={`/videos/${v.videoId}`} className="font-medium hover:underline block truncate" title={v.title}>
                        {v.title || v.videoId}
                      </Link>
                      <div className="flex items-center gap-2 text-xs text-zinc-500">
                        <span>{formatDuration(v.durationSec)} / {v.provider}</span>
                        {(v.category || getLocalCategory(v.videoId)) && (
                          <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-700">
                            {v.category || getLocalCategory(v.videoId)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* 進捗ゲージ（完了/習熟） */}
                  <CardMetrics videoId={v.videoId} />
                </div>
              </article>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            );
          })()
        )}
      </main>

      {open && <AddDialog authed={authed} categories={categoryOptions} onClose={() => setOpen(false)} onAdded={handleAdded} />}
    </div>
  );
}

function formatDuration(sec?: number) {
  if (!sec || sec < 0) return "--:--";
  const m = Math.floor(sec / 60)
    .toString()
    .padStart(1, "0");
  const s = Math.floor(sec % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

function AddDialog({
  authed,
  categories,
  onClose,
  onAdded,
}: {
  authed: boolean;
  categories: string[];
  onClose: () => void;
  onAdded: (v: Video | null) => void;
}) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [autoTitleLoading, setAutoTitleLoading] = useState(false);
  const [userEditedTitle, setUserEditedTitle] = useState(false);
  const [instrument, setInstrument] = useState("");
  const [category, setCategory] = useState("");
  const [duration, setDuration] = useState<number | "">(180);
  const [gettingDur, setGettingDur] = useState(false);
  const [userEditedDuration, setUserEditedDuration] = useState(false);
  const [saving, setSaving] = useState(false);
  const valid = useMemo(() => url.trim().length > 0, [url]);

  const submit = async () => {
    if (!valid) return;
    try {
      setSaving(true);
      const v = await addVideo({ url, title: title.trim(), instrument: instrument.trim(), category: category.trim() || undefined, durationSec: typeof duration === "number" ? duration : undefined });
      onAdded(v);
    } catch (e: any) {
      alert(e?.message || "登録に失敗しました");
      onAdded(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid items-start justify-center overflow-y-auto bg-black/40 p-4">
      <div className="mt-16 w-full max-w-md rounded-lg bg-white p-4 shadow-lg">
        <h3 className="mb-3 text-lg font-medium">動画を追加</h3>
        {!authed && (
          <div className="mb-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-900 text-sm">
            ゲストモードで登録しています。ブラウザやタブを閉じるとデータは消えます。最大3件まで登録できます。
            <button
              className="ml-2 inline-flex items-center rounded-md border border-amber-400 bg-white px-2 py-0.5 text-sm hover:bg-amber-100"
              onClick={() => signInWithGoogle()}
            >
              アカウント登録 / ログイン
            </button>
          </div>
        )}
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-sm">YouTube URL</span>
            <input
              className="w-full rounded-md border px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="https://www.youtube.com/watch?v=..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              autoFocus
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm">タイトル（任意）</span>
            <input
              className="w-full rounded-md border px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="例: Sample Guitar Tab"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setUserEditedTitle(true);
              }}
            />
            {autoTitleLoading && (
              <span className="mt-1 block text-xs text-zinc-500">タイトルを自動取得中…</span>
            )}
          </label>
          <label className="block">
            <span className="mb-1 block text-sm">楽器（任意）</span>
            <input
              className="w-full rounded-md border px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Guitar / Bass / Drums"
              value={instrument}
              onChange={(e) => setInstrument(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm">カテゴリー（任意）</span>
            <input
              className="w-full rounded-md border px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="例: 練習中 / 本命 / ジャンル名"
              list="category-suggest"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
            <datalist id="category-suggest">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm">動画長（秒・任意）</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                className="w-full rounded-md border px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                value={duration}
                onChange={(e) => {
                  setDuration(e.target.value === "" ? "" : Number(e.target.value));
                  setUserEditedDuration(true);
                }}
              />
              <button
                type="button"
                className="whitespace-nowrap rounded-md border px-2 py-2 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
                onClick={async () => {
                  try {
                    setGettingDur(true);
                    const sec = await getYouTubeDurationSeconds(url);
                    setDuration(sec);
                  } catch (e: any) {
                    alert(e?.message || "動画長の自動取得に失敗しました");
                  } finally {
                    setGettingDur(false);
                  }
                }}
                disabled={!valid || gettingDur}
              >
                {gettingDur ? "取得中..." : "自動取得"}
              </button>
            </div>
          </label>
        </div>
        {/* URL 入力時のタイトル自動取得 */}
        <AutoTitleFetcher url={url} onTitle={(t) => {
          if (!userEditedTitle && t) setTitle(t);
        }} onLoading={setAutoTitleLoading} />
        <AutoDurationFetcher url={url} onDuration={(sec) => {
          if (!userEditedDuration && typeof sec === "number" && sec > 0) setDuration(sec);
        }} onLoading={setGettingDur} />
        <div className="mt-4 flex justify-end gap-2">
          <button className="rounded-md px-3 py-1.5 text-zinc-700 hover:bg-zinc-100" onClick={onClose} disabled={saving}>
            キャンセル
          </button>
          <button
            className="rounded-md bg-emerald-600 px-4 py-1.5 text-white disabled:opacity-60"
            onClick={submit}
            disabled={!valid || saving}
          >
            {saving ? "保存中..." : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AutoTitleFetcher({ url, onTitle, onLoading }: { url: string; onTitle: (t: string) => void; onLoading: (b: boolean) => void }) {
  const [lastUrl, setLastUrl] = useState<string>("");
  useEffect(() => {
    if (!url || url === lastUrl) return;
    const controller = new AbortController();
    const id = setTimeout(async () => {
      try {
        onLoading(true);
        const t = await fetchYouTubeTitle(url, controller.signal);
        onTitle(t);
        setLastUrl(url);
      } catch {
        // ignore
      } finally {
        onLoading(false);
      }
    }, 500);
    return () => {
      controller.abort();
      clearTimeout(id);
    };
  }, [url]);
  return null;
}

function AutoDurationFetcher({ url, onDuration, onLoading }: { url: string; onDuration: (sec: number) => void; onLoading: (b: boolean) => void }) {
  const [lastUrl, setLastUrl] = useState<string>("");
  useEffect(() => {
    if (!url || url === lastUrl) return;
    const controller = new AbortController();
    const id = setTimeout(async () => {
      try {
        onLoading(true);
        const sec = await getYouTubeDurationSeconds(url);
        if (typeof sec === "number" && sec > 0) {
          onDuration(sec);
          setLastUrl(url);
        }
      } catch {
        // ignore (手動入力/手動取得ボタンを利用可能)
      } finally {
        onLoading(false);
      }
    }, 700);
    return () => {
      controller.abort();
      clearTimeout(id);
    };
  }, [url]);
  return null;
}
function CardMetrics({ videoId }: { videoId: string }) {
  const [coverageRate, setCoverageRate] = useState<number | null>(null);
  const [proficiencyRate, setProficiencyRate] = useState<number | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const track = await getTrack(videoId);
        if (!track || !track.levels?.length) {
          setCoverageRate(null);
          setProficiencyRate(null);
          return;
        }
        const blocks = track.levels.length;
        const covered = track.levels.filter((x) => x > 0).length;
        const cov = Math.round((covered / blocks) * 100);
        const sum = track.levels.reduce((a, b) => a + b, 0);
        const prof = Math.round((sum / (3 * blocks)) * 100);
        setCoverageRate(cov);
        setProficiencyRate(prof);
      } catch {
        setCoverageRate(null);
        setProficiencyRate(null);
      }
    })();
  }, [videoId]);
  if (coverageRate === null || proficiencyRate === null) return null;
  return (
    <div className="mt-2 space-y-1">
      <Gauge label="完了" percent={coverageRate} color="emerald" />
      <Gauge label="習熟" percent={proficiencyRate} color="emerald" subtle />
    </div>
  );
}
function Gauge({ label, percent, color = "emerald", subtle = false }: { label: string; percent: number; color?: "emerald"; subtle?: boolean }) {
  const clamp = Math.max(0, Math.min(100, percent));
  const bar = subtle ? `bg-${color}-200` : `bg-${color}-500`;
  // Tailwind v4 での動的クラス簡易対応: フォールバック色を指定
  const barClass = subtle ? "bg-emerald-200" : "bg-emerald-500";
  return (
    <div className="flex items-center gap-2">
      <span className="w-8 shrink-0 text-[11px] text-zinc-600">{label}</span>
      <div className="relative h-2 w-full rounded bg-zinc-200">
        <div className={`h-2 rounded ${bar} ${barClass}`} style={{ width: `${clamp}%` }} />
      </div>
      <span className="w-8 shrink-0 text-right text-[11px] text-zinc-600">{clamp}%</span>
    </div>
  );
}
