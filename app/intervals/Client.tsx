"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useT } from "@/app/components/LocaleProvider";
import * as Pitchfinder from "pitchfinder";
import Fretboard from "@/app/components/Fretboard";

type Detector = (data: Float32Array) => number | null;

function freqToMidi(freq: number) {
  return 69 + 12 * Math.log2(freq / 440);
}

function midiToFreq(midi: number) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function centsOff(freq: number, midi: number) {
  const ref = midiToFreq(midi);
  return Math.round(1200 * Math.log2(freq / ref));
}

const NOTE_NAMES_SHARP = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
] as const;

function noteNameFromMidi(midi: number) {
  const n = Math.round(midi);
  const name = NOTE_NAMES_SHARP[(n + 1200) % 12];
  const octave = Math.floor(n / 12) - 1;
  return `${name}${octave}`;
}

const DEGREE_MAP: Record<number, string> = {
  0: "R", // ルート
  1: "b2", // 短2度
  2: "2", // 長2度
  3: "b3", // 短3度
  4: "3", // 長3度
  5: "4", // 完全4度
  6: "b5/#4", // 増4度
  7: "5", // 完全5度
  8: "b6/#5", // 増5度
  9: "6", // 長6度
  10: "b7", // 短7度
  11: "7", // 長7度
};

export default function IntervalsClient() {
  const t = useT();
  const [running, setRunning] = useState(false);
  const [rootMidi, setRootMidi] = useState<number | null>(null);
  const [rootFreq, setRootFreq] = useState<number | null>(null);
  const [curFreq, setCurFreq] = useState<number | null>(null);
  const [curMidi, setCurMidi] = useState<number | null>(null);
  const [degree, setDegree] = useState<string>("-");
  const [status, setStatus] = useState<string>(t("intervals.status.idle"));
  const [algo, setAlgo] = useState<"ACF2PLUS" | "YIN" | "DynamicWavelet" | "Macleod">("ACF2PLUS");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string | undefined>(undefined);
  const [fbMode, setFbMode] = useState<"root-only" | "current-only" | "both">("both");

  const audioRef = useRef<AudioContext | null>(null);
  const procRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<Detector | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const collectRef = useRef<Float32Array | null>(null);
  const writePosRef = useRef<number>(0);
  const runningRef = useRef<boolean>(false);
  const rootMidiRef = useRef<number | null>(null);
  const rootFreqRef = useRef<number | null>(null);
  const modeRef = useRef<"stable" | "low">("stable");
  const fbModeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopAudio = async () => {
    runningRef.current = false;
    try {
      if (procRef.current) procRef.current.onaudioprocess = null as any;
      procRef.current?.disconnect();
    } catch {}
    try { sourceRef.current?.disconnect(); } catch {}
    try { gainRef.current?.disconnect(); } catch {}
    try { audioRef.current?.close(); } catch {}
    try { streamRef.current?.getTracks().forEach((t) => t.stop()); } catch {}
    audioRef.current = null;
    procRef.current = null;
    sourceRef.current = null;
    streamRef.current = null;
    detectorRef.current = null;
    gainRef.current = null;
    collectRef.current = null;
    writePosRef.current = 0;
    if (fbModeTimerRef.current) { clearTimeout(fbModeTimerRef.current); fbModeTimerRef.current = null; }
  };

  useEffect(() => { return () => { stopAudio(); }; }, []);

  useEffect(() => { rootMidiRef.current = rootMidi; }, [rootMidi]);
  useEffect(() => { rootFreqRef.current = rootFreq; }, [rootFreq]);

  useEffect(() => {
    (async () => {
      try {
        const list = await navigator.mediaDevices.enumerateDevices();
        const inputs = list.filter((d) => d.kind === "audioinput");
        setDevices(inputs);
        if (inputs.length && !deviceId) setDeviceId(inputs[0].deviceId);
      } catch {}
    })();
  }, []);

  const setupProcessor = (ctx: AudioContext, source: MediaStreamAudioSourceNode, gain: GainNode, initial = false) => {
    try { if (procRef.current) procRef.current.onaudioprocess = null as any; procRef.current?.disconnect(); } catch {}
    const mode = rootMidiRef.current == null ? "stable" : "low";
    modeRef.current = mode;
    const bufferSize = mode === "low" ? 1024 : 4096;
    const collectLen = mode === "low" ? Math.pow(2, 12) : Math.pow(2, 14);
    collectRef.current = new Float32Array(collectLen);
    writePosRef.current = 0;
    const proc = ctx.createScriptProcessor(bufferSize, 1, 1);

    let detector: Detector;
    switch (algo) {
      case "YIN":
        detector = Pitchfinder.YIN({ sampleRate: ctx.sampleRate }) as Detector; break;
      case "DynamicWavelet":
        detector = Pitchfinder.DynamicWavelet({ sampleRate: ctx.sampleRate }) as Detector; break;
      case "Macleod": {
        const m = Pitchfinder.Macleod({ sampleRate: ctx.sampleRate });
        detector = (buf: Float32Array) => { const r: any = m(buf); const f = r && typeof r.freq === "number" ? r.freq : null; return f && f > 0 ? f : null; };
        break;
      }
      case "ACF2PLUS":
      default:
        detector = Pitchfinder.ACF2PLUS({ sampleRate: ctx.sampleRate }) as Detector;
    }
    detectorRef.current = detector;

    proc.onaudioprocess = (e) => {
      if (!runningRef.current) return;
      const data = e.inputBuffer.getChannelData(0);
      const buf = collectRef.current!; const N = buf.length; const w0 = writePosRef.current;
      for (let i = 0; i < data.length; i++) buf[(w0 + i) & (N - 1)] = data[i];
      writePosRef.current = (w0 + data.length) & (N - 1);

      let rms = 0; for (let i = 0; i < data.length; i++) rms += data[i] * data[i];
      rms = Math.sqrt(rms / data.length);
      if (rms < 0.002) { setStatus(t("intervals.status.detecting")); return; }

      const want = modeRef.current === "low" ? Math.min(N, 2048) : N;
      const windowed = new Float32Array(want);
      const start = (writePosRef.current - N + N) & (N - 1);
      const offset = N - want;
      for (let i = 0; i < want; i++) windowed[i] = buf[(start + offset + i) & (N - 1)];

      const freq = detector(windowed) || null;
      if (!freq || !isFinite(freq) || freq < 30 || freq > 1000) { setStatus(t("intervals.status.detecting")); return; }
      const midi = freqToMidi(freq);
      setCurFreq(freq); setCurMidi(midi);
      setStatus(modeRef.current === "low" ? t("intervals.status.detecting_low") : t("intervals.status.detecting_stable"));

      if (rootMidiRef.current == null) {
        if (freq >= 35 && freq <= 1000) {
          let rMidi = Math.round(midi); let rFreq = freq;
          while (rFreq > 95 && rMidi - 12 >= 28 /* E1 */) { rFreq /= 2; rMidi -= 12; }
          setRootMidi(rMidi); setRootFreq(rFreq); rootMidiRef.current = rMidi; rootFreqRef.current = rFreq;
          setFbMode("root-only"); if (fbModeTimerRef.current) clearTimeout(fbModeTimerRef.current); fbModeTimerRef.current = setTimeout(() => setFbMode("both"), 300);
          setTimeout(() => { if (!runningRef.current || !audioRef.current || !sourceRef.current || !gainRef.current) return; setupProcessor(audioRef.current, sourceRef.current, gainRef.current); }, 0);
        }
        return;
      }

      const diff = Math.round(midi) - Math.round(rootMidiRef.current!);
      const semis = ((diff % 12) + 12) % 12;
      setDegree(DEGREE_MAP[semis] ?? "-");
    };

    source.connect(proc);
    proc.connect(gain);
    gain.connect(ctx.destination);
    procRef.current = proc;
    if (!initial) setStatus(mode === "low" ? t("intervals.status.running_low") : t("intervals.status.running_stable"));
  };

  const start = async () => {
    if (running) return;
    setStatus(t("intervals.status.mic_access"));
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: deviceId ? { exact: deviceId } : undefined, channelCount: 1, echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = ctx.createMediaStreamSource(stream);
      const gain = ctx.createGain();
      gain.gain.value = 0;
      audioRef.current = ctx; sourceRef.current = source; streamRef.current = stream; gainRef.current = gain;
      setRunning(true); runningRef.current = true;
      setupProcessor(ctx, source, gain, true);
      setStatus(t("intervals.status.running_stable"));
    } catch (err) { console.error(err); setStatus(t("intervals.status.mic_denied")); }
  };

  const stop = async () => { await stopAudio(); setRunning(false); runningRef.current = false; setStatus(t("intervals.status.stopped")); };

  const resetRoot = () => {
    setRootMidi(null); setRootFreq(null); setCurMidi(null); setCurFreq(null); setDegree("-"); setFbMode("both");
    if (runningRef.current && audioRef.current && sourceRef.current && gainRef.current) {
      rootMidiRef.current = null; rootFreqRef.current = null; setupProcessor(audioRef.current, sourceRef.current, gainRef.current); setStatus(t("intervals.status.running_stable"));
    }
  };

  const rootName = useMemo(() => (rootMidi != null ? noteNameFromMidi(rootMidi) : "-"), [rootMidi]);
  const curName = useMemo(() => (curMidi != null ? noteNameFromMidi(curMidi) : "-"), [curMidi]);
  const rootCents = useMemo(() => (rootFreq && rootMidi ? centsOff(rootFreq, Math.round(rootMidi)) : 0), [rootFreq, rootMidi]);
  const curCents = useMemo(() => (curFreq && curMidi ? centsOff(curFreq, Math.round(curMidi)) : 0), [curFreq, curMidi]);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto max-w-3xl px-3 py-4">
        <h1 className="text-xl font-semibold sm:text-2xl">{t("intervals.title")}</h1>
        <p className="mt-1 text-sm text-zinc-600">{t("intervals.subtitle")}</p>

        <div className="mt-3 flex items-center gap-2">
          {!running ? (
            <button onClick={start} className="rounded-full bg-emerald-600 px-4 py-2 text-sm text-white shadow-sm hover:bg-emerald-700">{t("intervals.start")}</button>
          ) : (
            <button onClick={stop} className="rounded-full bg-emerald-600 px-4 py-2 text-sm text-white shadow-sm hover:bg-emerald-700">{t("intervals.stop")}</button>
          )}
          <button onClick={resetRoot} className="rounded-full border border-emerald-300 px-4 py-2 text-sm text-emerald-700 hover:bg-emerald-50">{t("intervals.reset_root")}</button>
          <span className="inline-flex items-center gap-1 text-xs text-zinc-500 sm:text-sm">
            <span className={`inline-block h-2 w-2 rounded-full ${running ? "bg-emerald-500" : "bg-zinc-300"}`} aria-hidden />
            {status}
          </span>
        </div>

        <div className="mt-2 hidden flex-wrap items-center gap-3 text-sm sm:flex">
          <label className="flex items-center gap-2">
            <span className="text-zinc-600">{t("intervals.settings.detector")}</span>
            <select className="rounded-md border bg-white px-2 py-1 text-zinc-900" value={algo} onChange={(e) => setAlgo(e.target.value as any)} disabled={running}>
              <option value="ACF2PLUS">{t("intervals.detector.acf2plus")}</option>
              <option value="YIN">YIN</option>
              <option value="DynamicWavelet">DynamicWavelet</option>
              <option value="Macleod">Macleod</option>
            </select>
          </label>
          <label className="flex items-center gap-2">
            <span className="text-zinc-600">{t("intervals.settings.input")}</span>
            <select className="min-w-56 rounded-md border bg-white px-2 py-1 text-zinc-900" value={deviceId} onChange={(e) => setDeviceId(e.target.value)} disabled={running}>
              {devices.map((d) => (<option key={d.deviceId} value={d.deviceId}>{d.label || `${t("intervals.device")} (${d.deviceId.slice(0,6)})`}</option>))}
            </select>
          </label>
        </div>
        <details className="mt-2 sm:hidden">
          <summary className="cursor-pointer select-none text-sm text-zinc-600">{t("intervals.settings.advanced")}</summary>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
            <label className="flex items-center gap-2">
              <span className="text-zinc-600">{t("intervals.settings.detector")}</span>
              <select className="rounded-md border bg-white px-2 py-1 text-zinc-900" value={algo} onChange={(e) => setAlgo(e.target.value as any)} disabled={running}>
                <option value="ACF2PLUS">{t("intervals.detector.acf2plus")}</option>
                <option value="YIN">YIN</option>
                <option value="DynamicWavelet">DynamicWavelet</option>
                <option value="Macleod">Macleod</option>
              </select>
            </label>
            <label className="flex items-center gap-2">
              <span className="text-zinc-600">{t("intervals.settings.input")}</span>
              <select className="min-w-56 rounded-md border bg-white px-2 py-1 text-zinc-900" value={deviceId} onChange={(e) => setDeviceId(e.target.value)} disabled={running}>
                {devices.map((d) => (<option key={d.deviceId} value={d.deviceId}>{d.label || `${t("intervals.device")} (${d.deviceId.slice(0,6)})`}</option>))}
              </select>
            </label>
          </div>
        </details>

        <div className="mt-3 grid grid-cols-3 gap-2 sm:hidden">
          <div className="rounded-xl bg-white p-2 text-center shadow-sm"><div className="text-[10px] text-zinc-500">{t("intervals.root")}</div><div className="mt-0.5 text-lg font-bold text-zinc-900">{rootName}</div></div>
          <div className="rounded-xl bg-white p-2 text-center shadow-sm"><div className="text-[10px] text-zinc-500">{t("intervals.current")}</div><div className="mt-0.5 text-lg font-bold text-zinc-900">{curName}</div></div>
          <div className="rounded-xl bg-white p-2 text-center shadow-sm"><div className="text-[10px] text-zinc-500">{t("intervals.degree")}</div><div className="mt-0.5 text-xl font-extrabold tracking-wide text-zinc-900">{degree}</div></div>
        </div>

        <div className="mt-4 hidden grid-cols-1 gap-3 sm:grid sm:grid-cols-3">
          <div className="rounded-xl bg-white p-3 text-center shadow-sm sm:p-4">
            <div className="text-xs text-zinc-500">{t("intervals.root")} (R)</div>
            <div className="mt-1 text-2xl font-bold text-zinc-900 sm:text-3xl">{rootName}</div>
            <div className="mt-1 text-xs text-zinc-800 sm:text-sm">{rootFreq ? `${rootFreq.toFixed(1)} Hz` : "-"} {rootFreq ? `(${rootCents >= 0 ? "+" : ""}${rootCents} cents)` : ""}</div>
            <p className="mt-2 text-xs text-zinc-500">{t("intervals.tip.root_auto")}</p>
          </div>
          <div className="rounded-xl bg-white p-3 text-center shadow-sm sm:p-4">
            <div className="text-xs text-zinc-500">{t("intervals.current_note")}</div>
            <div className="mt-1 text-2xl font-bold text-zinc-900 sm:text-3xl">{curName}</div>
            <div className="mt-1 text-xs text-zinc-800 sm:text-sm">{curFreq ? `${curFreq.toFixed(1)} Hz` : "-"} {curFreq ? `(${curCents >= 0 ? "+" : ""}${curCents} cents)` : ""}</div>
          </div>
          <div className="rounded-xl bg-white p-3 text-center shadow-sm sm:p-4">
            <div className="text-xs text-zinc-500">{t("intervals.degree")}</div>
            <div className="mt-1 text-3xl font-extrabold tracking-wide text-zinc-900 sm:text-4xl">{degree}</div>
            <p className="mt-2 text-xs text-zinc-500 sm:mt-3">{t("intervals.example.degrees")}</p>
          </div>
        </div>

        <div className="hidden"></div>

        <div className="mt-3 sm:mt-6">
          <Fretboard rootMidi={rootMidi ?? undefined} currentMidi={curMidi ?? undefined} frets={12} mode={fbMode} />
        </div>

        <div className="mt-8 text-sm text-zinc-600">
          <p className="font-medium">{t("intervals.howto.title")}</p>
          <ul className="mt-1 list-disc pl-5 space-y-1">
            <li>{t("intervals.howto.1")}</li>
            <li>{t("intervals.howto.2")}</li>
            <li>{t("intervals.howto.3")}</li>
            <li>{t("intervals.howto.4")}</li>
            <li>{t("intervals.howto.5")}</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

