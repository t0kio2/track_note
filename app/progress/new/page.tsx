"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/app/components/LocaleProvider";
import { addVideo } from "@/app/lib/storage";
import { onAuthStateChange, signInWithGoogle } from "@/app/lib/auth";
import { getYouTubeDurationSeconds } from "@/app/lib/yt-iframe";
import { fetchYouTubeTitle } from "@/app/lib/yt-oembed";
import { logEvent } from "@/app/lib/analytics";

export default function NewProgressPage() {
  const t = useT();
  const router = useRouter();
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    const off = onAuthStateChange((s) => setAuthed(!!s));
    return () => off();
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="mx-auto max-w-5xl px-4 py-6">
        <h1 className="text-2xl font-semibold">{t("video.add")}</h1>
        <p className="text-sm text-zinc-600">{t("progress.new.subtitle")}</p>
      </header>
      <main className="mx-auto max-w-5xl px-4 pb-24">
        <AddForm authed={authed} onDone={(vid) => router.push(`/progress/${vid}`)} />
      </main>
    </div>
  );
}

function AddForm({ authed, onDone }: { authed: boolean; onDone: (videoId: string) => void }) {
  const t = useT();
  const openedAt = useMemo(() => Date.now(), []);
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
  const [autoTitleUsed, setAutoTitleUsed] = useState(false);
  const [autoDurationUsed, setAutoDurationUsed] = useState(false);
  const [urlEverTyped, setUrlEverTyped] = useState(false);
  const valid = useMemo(() => url.trim().length > 0, [url]);

  const submit = async () => {
    if (!valid) return;
    try {
      setSaving(true);
      try { logEvent('add_dialog_submit_click', { ttc_ms: Date.now() - openedAt, has_url: !!url, has_title: !!title.trim(), has_duration: typeof duration === 'number', auto_title_used: autoTitleUsed, auto_duration_used: autoDurationUsed }); } catch {}
      const v = await addVideo({ url, title: title.trim(), instrument: instrument.trim(), category: category.trim() || undefined, durationSec: typeof duration === "number" ? duration : undefined });
      try { logEvent('add_video', { provider: v?.provider, video_id: v?.videoId }); } catch {}
      if (v) onDone(v.videoId);
    } catch (e: any) {
      try { logEvent('add_video_failed', { reason: String(e?.message || 'error').slice(0, 120), has_url: !!url, has_title: !!title.trim(), has_duration: typeof duration === 'number' }); } catch {}
      alert(e?.message || t("error.add_failed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-md rounded-lg border bg-white p-4 shadow-sm">
      {!authed && (
        <div className="mb-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-900 text-sm">
          {t("home.guest_limit")}
          <button
            className="ml-2 inline-flex items-center rounded-md border border-amber-400 bg-white px-2 py-0.5 text-sm hover:bg-amber-100"
            onClick={() => signInWithGoogle()}
          >
            {t("home.register_login")}
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
            onChange={(e) => {
              const v = e.target.value;
              if (!urlEverTyped && v.trim().length > 0) {
                try { logEvent('add_dialog_input_url_first'); } catch {}
                setUrlEverTyped(true);
              }
              setUrl(v);
            }}
            autoFocus
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm">{t("field.title_optional")}</span>
          <input
            className="w-full rounded-md border px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder={t("placeholder.sample_title")}
            value={title}
            onChange={(e) => { setTitle(e.target.value); setUserEditedTitle(true); }}
          />
          {autoTitleLoading && (
            <span className="mt-1 block text-xs text-zinc-500">{t("auto_title.loading")}</span>
          )}
        </label>
        <label className="block">
          <span className="mb-1 block text-sm">{t("field.instrument_optional")}</span>
          <input
            className="w-full rounded-md border px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="Guitar / Bass / Drums"
            value={instrument}
            onChange={(e) => setInstrument(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm">{t("field.category_optional")}</span>
          <input
            className="w-full rounded-md border px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="e.g. Band / Unit"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm">{t("field.duration_optional")}</span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              className="w-full rounded-md border px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
              value={duration}
              onChange={(e) => { setDuration(e.target.value === "" ? "" : Number(e.target.value)); setUserEditedDuration(true); }}
            />
            <button
              className="whitespace-nowrap rounded-md border px-2 py-1 text-sm hover:bg-zinc-50 disabled:opacity-50"
              onClick={async () => {
                if (!url) return;
                try {
                  setGettingDur(true);
                  const sec = await getYouTubeDurationSeconds(url);
                  if (typeof sec === "number" && sec > 0) {
                    setDuration(sec);
                    setAutoDurationUsed(true);
                  }
                } finally {
                  setGettingDur(false);
                }
              }}
              disabled={!url || gettingDur}
            >
              {gettingDur ? t("common.loading") : t("common.auto")}
            </button>
          </div>
        </label>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button className="rounded-md px-3 py-1.5 text-zinc-700 hover:bg-zinc-100" onClick={() => history.back()} disabled={saving}>{t("common.cancel")}</button>
        <button
          className="rounded-md bg-emerald-600 px-4 py-1.5 text-white disabled:opacity-60 hover:bg-emerald-700"
          onClick={submit}
          disabled={!valid || saving}
        >
          {saving ? t("common.saving") : t("common.save")}
        </button>
      </div>

      <AutoTitleFetcher url={url} onTitle={(t0) => { if (!userEditedTitle) setTitle(t0); }} onLoading={setAutoTitleLoading} onUsed={() => setAutoTitleUsed(true)} />
      {!userEditedDuration && <AutoDurationFetcher url={url} onDuration={(sec) => setDuration(sec)} onLoading={setGettingDur} onUsed={() => setAutoDurationUsed(true)} />}
    </div>
  );
}

function AutoTitleFetcher({ url, onTitle, onLoading, onUsed }: { url: string; onTitle: (t: string) => void; onLoading: (b: boolean) => void; onUsed?: () => void }) {
  const [lastUrl, setLastUrl] = useState<string>("");
  useEffect(() => {
    if (!url || url === lastUrl) return;
    const controller = new AbortController();
    const id = setTimeout(async () => {
      try {
        onLoading(true);
        try { logEvent('add_dialog_title_autofill_start'); } catch {}
        const t = await fetchYouTubeTitle(url, controller.signal);
        onTitle(t);
        setLastUrl(url);
        try { onUsed && onUsed(); logEvent('add_dialog_title_autofill_success'); } catch {}
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

function AutoDurationFetcher({ url, onDuration, onLoading, onUsed }: { url: string; onDuration: (sec: number) => void; onLoading: (b: boolean) => void; onUsed?: () => void }) {
  const [lastUrl, setLastUrl] = useState<string>("");
  useEffect(() => {
    if (!url || url === lastUrl) return;
    const controller = new AbortController();
    const id = setTimeout(async () => {
      try {
        onLoading(true);
        try { logEvent('add_dialog_duration_autofill_start'); } catch {}
        const sec = await getYouTubeDurationSeconds(url);
        if (typeof sec === "number" && sec > 0) {
          onDuration(sec);
          setLastUrl(url);
          try { onUsed && onUsed(); logEvent('add_dialog_duration_autofill_success'); } catch {}
        }
      } catch {
      } finally {
        onLoading(false);
      }
    }, 700);
    return () => { controller.abort(); clearTimeout(id); };
  }, [url]);
  return null;
}
