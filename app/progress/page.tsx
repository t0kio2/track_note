"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/app/components/LocaleProvider";
import type { Video } from "@/app/lib/types";
import { getTrack, getVideos } from "@/app/lib/storage";
import { onAuthStateChange, signInWithGoogle } from "@/app/lib/auth";
import { thumbnailUrlFromId } from "@/app/lib/youtube";
import { getCategory as getLocalCategory, getAllCategories as getLocalCategories } from "@/app/lib/categories";
import { logEvent } from "@/app/lib/analytics";

export default function ProgressListPage() {
  const t = useT();
  const router = useRouter();
  const [videos, setVideos] = useState<Video[]>([]);
  const [authed, setAuthed] = useState(false);
  const [catRev, setCatRev] = useState(0);
  const [guestBannerLogged, setGuestBannerLogged] = useState(false);
  const categoryOptions = useMemo(() => {
    const fromLocal = getLocalCategories();
    const fromVideos = Array.from(new Set(videos.map((v) => v.category).filter((x): x is string => !!x)));
    return Array.from(new Set([...fromLocal, ...fromVideos])).sort((a, b) => a.localeCompare(b));
  }, [videos, catRev]);

  useEffect(() => {
    const off = onAuthStateChange((s) => setAuthed(!!s));
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

  useEffect(() => {
    const reached = !authed && videos.length >= 3;
    if (reached && !guestBannerLogged) {
      try { logEvent('guest_limit_shown'); } catch {}
      setGuestBannerLogged(true);
    }
  }, [authed, videos.length, guestBannerLogged]);

  const guestLimitReached = !authed && videos.length >= 3;

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-2xl font-semibold">{t("progress.title")}</h1>
        <p className="text-sm text-zinc-600">{t("home.subtitle")}</p>
      </header>
      <main className="mx-auto max-w-5xl px-4 pb-24">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-medium">{t("home.list_title")}</h2>
          <Link
            href="/progress/new"
            className="rounded-full bg-emerald-600 px-4 py-2 text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
            onClick={() => { try { logEvent('open_add_dialog'); } catch {} }}
            aria-disabled={guestLimitReached}
          >
            {t("common.add")}
          </Link>
        </div>

        {guestLimitReached && (
          <div className="mb-4 rounded-lg bg-amber-50 p-3 text-amber-900 ring-1 ring-amber-200/60">
            {t("home.guest_limit")}
            <button
              className="ml-3 inline-flex items-center rounded-full border border-amber-300 bg-white px-3 py-1.5 text-sm hover:bg-amber-100"
              onClick={() => { try { logEvent('guest_limit_login_click'); } catch {}; signInWithGoogle(); }}
            >
              {t("home.register_login")}
            </button>
          </div>
        )}

        {!videos.length ? (
          authed ? (
            <div className="rounded-xl bg-white p-8 text-center text-zinc-700 shadow-sm">
              <p className="mb-4">{t("home.empty_auth.1")}</p>
              <Link
                href="/progress/new"
                className="rounded-full bg-emerald-600 px-4 py-2 text-white shadow-sm hover:bg-emerald-700"
              >
                {t("video.add")}
              </Link>
            </div>
          ) : (
            <div className="rounded-xl bg-white p-10 text-center text-zinc-700 shadow-sm">
              <p className="mb-2">{t("home.empty.1")}</p>
              <p className="mb-2">{t("home.empty.2")}</p>
              <p>{t("home.empty.3")}</p>
            </div>
          )
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
                    <h3 className="mb-2 text-sm font-medium text-zinc-700">{k === "__none__" ? t("category.none") : k}</h3>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {groups.get(k)!.map((v) => (
                        <article key={v.id} className="overflow-hidden rounded-xl bg-white shadow-sm transition duration-150 hover:shadow-md hover:-translate-y-0.5">
                          {/* Mobile layout */}
                          <div className="p-3 sm:hidden">
                            <Link href={`/progress/${v.videoId}`} className="font-medium hover:underline block truncate focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600" title={v.title} onClick={() => { try { logEvent('open_video_detail', { video_id: v.videoId }); } catch {} }}>
                              {v.title || v.videoId}
                            </Link>
                            <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
                              <span>{formatDuration(v.durationSec)} {v.instrument && `/ ${v.instrument}`}</span>
                            </div>
                            <div className="mt-2 flex items-stretch gap-2">
                              <Link href={`/progress/${v.videoId}`} className="flex-none shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600" onClick={() => { try { logEvent('open_video_detail', { video_id: v.videoId }); } catch {} }}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={v.thumbnailUrl || thumbnailUrlFromId(v.videoId)}
                                  alt={v.title}
                                  className="h-24 w-36 rounded object-cover"
                                />
                              </Link>
                              <div className="flex-1 min-w-0 h-24 flex items-center">
                                <CardMetrics videoId={v.videoId} />
                              </div>
                            </div>
                          </div>

                          {/* Desktop layout */}
                          <div className="hidden sm:block">
                            <Link href={`/progress/${v.videoId}`} className="group block focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600" onClick={() => { try { logEvent('open_video_detail', { video_id: v.videoId }); } catch {} }}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={v.thumbnailUrl || thumbnailUrlFromId(v.videoId)}
                                alt={v.title}
                                className="w-full aspect-video object-cover transition group-hover:brightness-[0.98]"
                              />
                            </Link>
                            <div className="p-3 min-w-0">
                              <Link href={`/progress/${v.videoId}`} className="block truncate font-medium hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600" title={v.title} onClick={() => { try { logEvent('open_video_detail', { video_id: v.videoId }); } catch {} }}>
                                {v.title || v.videoId}
                              </Link>
                              <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
                                <span>{formatDuration(v.durationSec)} {v.instrument && `/ ${v.instrument}`}</span>
                                {(v.category || getLocalCategory(v.videoId)) && (
                                  <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-700">
                                    {v.category || getLocalCategory(v.videoId)}
                                  </span>
                                )}
                              </div>
                              <div className="mt-2">
                                <CardMetrics videoId={v.videoId} />
                              </div>
                            </div>
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
    </div>
  );
}

function formatDuration(sec?: number) {
  if (!sec || sec < 0) return "--:--";
  const m = Math.floor(sec / 60).toString().padStart(1, "0");
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function CardMetrics({ videoId }: { videoId: string }) {
  const [coverageRate, setCoverageRate] = useState<number | null>(null);
  const [proficiencyRate, setProficiencyRate] = useState<number | null>(null);
  const t = useT();
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
    <div className="mt-2 w-full space-y-1">
      <Gauge label={t("video.coverage")} percent={coverageRate} color="emerald" />
      <Gauge label={t("video.proficiency")} percent={proficiencyRate} color="emerald" subtle />
    </div>
  );
}

function Gauge({ label, percent, color = "emerald", subtle = false }: { label: string; percent: number; color?: "emerald"; subtle?: boolean }) {
  const clamp = Math.max(0, Math.min(100, percent));
  const bar = subtle ? `bg-${color}-200` : `bg-${color}-500`;
  const barClass = subtle ? "bg-emerald-200" : "bg-emerald-500";
  return (
    <>
      <div className="grid gap-1 md:hidden">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-zinc-600">{label}</span>
          <span className="text-[11px] text-zinc-600">{clamp}%</span>
        </div>
        <div className="relative h-2 w-full rounded bg-zinc-200">
          <div className={`h-2 rounded ${bar} ${barClass}`} style={{ width: `${clamp}%` }} />
        </div>
      </div>
      <div className="hidden items-center gap-2 md:flex">
        <span className="w-20 shrink-0 whitespace-nowrap text-[11px] text-zinc-600">{label}</span>
        <div className="relative h-2 flex-1 min-w-0 rounded bg-zinc-200">
          <div className={`h-2 rounded ${bar} ${barClass}`} style={{ width: `${clamp}%` }} />
        </div>
        <span className="w-10 shrink-0 whitespace-nowrap text-right text-[11px] text-zinc-600">{clamp}%</span>
      </div>
    </>
  );
}
