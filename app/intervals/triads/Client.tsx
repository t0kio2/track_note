"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as Pitchfinder from "pitchfinder";
import Fretboard from "@/app/components/Fretboard";
import { useT } from "@/app/components/LocaleProvider";
import { centsOff, freqToMidi, NOTE_NAMES_SHARP, pc } from "@/app/lib/music";

type Detector = (data: Float32Array) => number | null;

const TRIADS = [
  { key: "major", label: "メジャートライアド", semis: [0, 4, 7] as const, degreeLabels: ["R", "3", "5"] },
  { key: "minor", label: "マイナートライアド", semis: [0, 3, 7] as const, degreeLabels: ["R", "b3", "5"] },
  { key: "aug",   label: "オーグメンテッドトライアド", semis: [0, 4, 8] as const, degreeLabels: ["R", "3", "#5"] },
  { key: "dim",   label: "ディミニッシュドトライアド", semis: [0, 3, 6] as const, degreeLabels: ["R", "b3", "b5"] },
] as const;

export default function TriadQuizClient() {
  const t = useT();
  const [running, setRunning] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string | undefined>(undefined);
  const [algo, setAlgo] = useState<"ACF2PLUS" | "YIN" | "DynamicWavelet" | "Macleod">("ACF2PLUS");

  const [status, setStatus] = useState<string>(t("triads.status.idle"));
  const [curFreq, setCurFreq] = useState<number | null>(null);
  const [curMidi, setCurMidi] = useState<number | null>(null);

  const [rootPc, setRootPc] = useState<number>(0);
  const [triadIndex, setTriadIndex] = useState<number>(0);
  const triad = TRIADS[triadIndex];
  const [inversion, setInversion] = useState<0 | 1 | 2>(0); // 0: 根音位置, 1: 第1転回形, 2: 第2転回形
  const [inversionMode, setInversionMode] = useState<"root" | "first" | "second" | "mix">("mix");
  const [step, setStep] = useState<number>(0); // 0..2 (R -> 3rd/5th)
  const [done, setDone] = useState<boolean>(false);
  const [judgement, setJudgement] = useState<"idle" | "correct" | "wrong">("idle");
  const [stepsCorrect, setStepsCorrect] = useState<boolean[]>([false, false, false]);
  const [showAnswer, setShowAnswer] = useState(false);

  const audioRef = useRef<AudioContext | null>(null);
  const procRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<Detector | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const collectRef = useRef<Float32Array | null>(null);
  const writePosRef = useRef<number>(0);
  const runningRef = useRef<boolean>(false);
  const rootPcRef = useRef<number>(rootPc);
  const stepRef = useRef<number>(step);
  const triadRef = useRef<typeof TRIADS[number]>(triad);
  const inversionRef = useRef<0 | 1 | 2>(0);

  useEffect(() => { rootPcRef.current = rootPc; }, [rootPc]);
  useEffect(() => { stepRef.current = step; }, [step]);
  useEffect(() => { triadRef.current = triad; }, [triad]);
  useEffect(() => { inversionRef.current = inversion; }, [inversion]);

  const newQuestion = () => {
    setRootPc(Math.floor(Math.random() * 12));
    setTriadIndex(Math.floor(Math.random() * TRIADS.length));
    setInversion(
      ((mode) =>
        mode === "root" ? 0 : mode === "first" ? 1 : mode === "second" ? 2 : (Math.floor(Math.random() * 3) as 0 | 1 | 2)
      )(inversionMode)
    );
    setStep(0);
    setDone(false);
    setStepsCorrect([false, false, false]);
    setShowAnswer(false);
    setJudgement("idle");
  };

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

  const stopAudio = async () => {
    try { if (procRef.current) procRef.current.onaudioprocess = null as any; procRef.current?.disconnect(); } catch {}
    try { sourceRef.current?.disconnect(); } catch {}
    try { gainRef.current?.disconnect(); } catch {}
    try { audioRef.current?.close(); } catch {}
    try { streamRef.current?.getTracks().forEach((t) => t.stop()); } catch {}
    audioRef.current = null; procRef.current = null; sourceRef.current = null; streamRef.current = null; detectorRef.current = null; gainRef.current = null; collectRef.current = null; writePosRef.current = 0;
  };
  useEffect(() => { return () => { stopAudio(); }; }, []);

  const setupProcessor = (ctx: AudioContext, source: MediaStreamAudioSourceNode, gain: GainNode) => {
    try { if (procRef.current) procRef.current.onaudioprocess = null as any; procRef.current?.disconnect(); } catch {}
    const bufferSize = 1024; const collectLen = Math.pow(2, 12);
    collectRef.current = new Float32Array(collectLen); writePosRef.current = 0;
    const proc = ctx.createScriptProcessor(bufferSize, 1, 1);
    let detector: Detector;
    switch (algo) {
      case "YIN": detector = Pitchfinder.YIN({ sampleRate: ctx.sampleRate }) as Detector; break;
      case "DynamicWavelet": detector = Pitchfinder.DynamicWavelet({ sampleRate: ctx.sampleRate }) as Detector; break;
      case "Macleod": { const m = Pitchfinder.Macleod({ sampleRate: ctx.sampleRate }); detector = (buf: Float32Array) => { const r: any = m(buf); const f = r && typeof r.freq === "number" ? r.freq : null; return f && f > 0 ? f : null; }; break; }
      case "ACF2PLUS":
      default: detector = Pitchfinder.ACF2PLUS({ sampleRate: ctx.sampleRate }) as Detector;
    }
    detectorRef.current = detector;

    proc.onaudioprocess = (e) => {
      if (!runningRef.current) return;
      const data = e.inputBuffer.getChannelData(0);
      const buf = collectRef.current!; const N = buf.length; const w0 = writePosRef.current;
      for (let i = 0; i < data.length; i++) buf[(w0 + i) & (N - 1)] = data[i];
      writePosRef.current = (w0 + data.length) & (N - 1);

      // 簡易RMSゲート
      let rms = 0; for (let i = 0; i < data.length; i++) rms += data[i] * data[i]; rms = Math.sqrt(rms / data.length);
      if (rms < 0.002) { setStatus(t("triads.status.detecting")); return; }

      // 解析窓
      const want = Math.min(N, 2048);
      const windowed = new Float32Array(want);
      const start = (writePosRef.current - N + N) & (N - 1);
      const offset = N - want;
      for (let i = 0; i < want; i++) windowed[i] = buf[(start + offset + i) & (N - 1)];

      const freq = detector(windowed) || null;
      if (!freq || !isFinite(freq) || freq < 30 || freq > 1000) { setStatus(t("triads.status.detecting")); return; }
      const midi = freqToMidi(freq);
      setCurFreq(freq); setCurMidi(midi); setStatus(t("triads.status.detecting"));

      // 採点（順番に R -> 3rd -> 5th）
      const currentStep = stepRef.current;
      if (currentStep > 2 || triadRef.current == null) return;
      const playedPc = pc(Math.round(midi));
      const semisSeq = rotate(triadRef.current.semis as readonly number[], inversionRef.current);
      const target = semisSeq[currentStep];
      const diff = ((playedPc - rootPcRef.current) % 12 + 12) % 12;
      if (diff === target) {
        setJudgement("correct");
        setStepsCorrect((prev) => {
          const n = prev.slice(); n[currentStep] = true; return n;
        });
        if (currentStep >= 2) {
          setDone(true);
        } else {
          setStep(currentStep + 1);
          // 次ステップ用に一旦判定をクリア
          setTimeout(() => setJudgement("idle"), 150);
        }
      }
      else {
        setJudgement("wrong");
      }
    };

    source.connect(proc); proc.connect(gain); gain.connect(ctx.destination); procRef.current = proc;
  };

  const start = async () => {
    if (running) return;
    setStatus(t("triads.status.mic_wait"));
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: deviceId ? { exact: deviceId } : undefined, channelCount: 1, echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = ctx.createMediaStreamSource(stream);
      const gain = ctx.createGain(); gain.gain.value = 0;
      audioRef.current = ctx; sourceRef.current = source; streamRef.current = stream; gainRef.current = gain;
      setRunning(true); runningRef.current = true;
      setupProcessor(ctx, source, gain);
      setStatus(t("triads.status.running"));
    } catch (e) { console.error(e); setStatus(t("triads.status.mic_denied")); }
  };

  const stop = async () => { await stopAudio(); setRunning(false); runningRef.current = false; setStatus(t("triads.status.stopped")); };

  // 初回問題
  useEffect(() => { newQuestion(); }, []);

  const rootName = useMemo(() => NOTE_NAMES_SHARP[rootPc], [rootPc]);
  const curCents = useMemo(() => (curFreq && curMidi ? centsOff(curFreq, Math.round(curMidi)) : 0), [curFreq, curMidi]);

  // 答え（構成音）をノート名で列挙
  const rotate = <T,>(arr: readonly T[], shift: number): T[] => {
    const n = arr.length; const s = ((shift % n) + n) % n; return [...arr.slice(s), ...arr.slice(0, s)];
  };
  const orderedSemis = useMemo(() => rotate(triad.semis, inversion), [triad.semis, inversion]);
  const orderedDegrees = useMemo(() => rotate(triad.degreeLabels, inversion), [triad.degreeLabels, inversion]);
  const triadNotes = useMemo(() => orderedSemis.map(s => NOTE_NAMES_SHARP[((rootPc + s) % 12 + 12) % 12]).join(" "), [rootPc, orderedSemis]);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto max-w-3xl px-3 py-4">
        <h1 className="text-xl font-semibold sm:text-2xl">{t("triads.title")}</h1>
        <p className="mt-1 text-sm text-zinc-600">{t("triads.subtitle")}</p>

        <div className="mt-3 flex items-center gap-2 flex-wrap">
          {!running ? (
            <button onClick={start} className="rounded-full bg-emerald-600 px-4 py-2 text-sm text-white shadow-sm hover:bg-emerald-700">{t("triads.start")}</button>
          ) : (
            <button onClick={stop} className="rounded-full bg-emerald-600 px-4 py-2 text-sm text-white shadow-sm hover:bg-emerald-700">{t("triads.stop")}</button>
          )}
          <button onClick={newQuestion} className="rounded-full border border-emerald-300 px-4 py-2 text-sm text-emerald-700 hover:bg-emerald-50">{t("triads.next")}</button>
          <label className="flex items-center gap-2 text-sm">
            <span className="text-zinc-600">{t("triads.inversion_mode.title")}</span>
            <select
              className="rounded-md border bg-white px-2 py-1 text-zinc-900"
              value={inversionMode}
              onChange={(e) => {
                const mode = e.target.value as any;
                setInversionMode(mode);
                if (mode === "root") setInversion(0);
                else if (mode === "first") setInversion(1);
                else if (mode === "second") setInversion(2);
              }}
            >
              <option value="root">{t("triads.inversion.root")}</option>
              <option value="first">{t("triads.inversion.first")}</option>
              <option value="second">{t("triads.inversion.second")}</option>
              <option value="mix">{t("triads.inversion_mode.mix")}</option>
            </select>
          </label>
          <span className="inline-flex items-center gap-1 text-xs text-zinc-500 sm:text-sm">
            <span className={`inline-block h-2 w-2 rounded-full ${running ? "bg-emerald-500" : "bg-zinc-300"}`} aria-hidden />
            {status}
          </span>
        </div>

        <div className="mt-2 hidden flex-wrap items-center gap-3 text-sm sm:flex">
          <label className="flex items-center gap-2">
            <span className="text-zinc-600">{t("triads.detector")}</span>
            <select className="rounded-md border bg-white px-2 py-1 text-zinc-900" value={algo} onChange={(e) => setAlgo(e.target.value as any)} disabled={running}>
              <option value="ACF2PLUS">ACF2PLUS</option>
              <option value="YIN">YIN</option>
              <option value="DynamicWavelet">DynamicWavelet</option>
              <option value="Macleod">Macleod</option>
            </select>
          </label>
          <label className="flex items-center gap-2">
            <span className="text-zinc-600">{t("triads.input")}</span>
            <select className="min-w-56 rounded-md border bg-white px-2 py-1 text-zinc-900" value={deviceId} onChange={(e) => setDeviceId(e.target.value)} disabled={running}>
              {devices.map((d) => (<option key={d.deviceId} value={d.deviceId}>{d.label || `デバイス (${d.deviceId.slice(0,6)})`}</option>))}
            </select>
          </label>
        </div>

        <div className="mt-4 rounded-xl bg-white p-4 shadow-sm mx-auto max-w-md">
          <div className="text-center">
            <div className="text-xs text-zinc-500">{t("triads.problem")}</div>
            <div className="mt-1 mb-1 flex justify-center">
              <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                {t(`triads.inversion.${inversion === 0 ? "root" : inversion === 1 ? "first" : "second"}`)}
              </span>
            </div>
            <div className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
              {t("triads.prompt").replace("{chord}", (() => { const root = NOTE_NAMES_SHARP[rootPc]; const suffix = triad.key === "major" ? "" : triad.key === "minor" ? "m" : triad.key === "aug" ? "+" : "°"; return `${root}${suffix}`; })())}
            </div>
            <div className="mt-1">
              <span className="rounded bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-700">
                {t(`triads.kind.${triad.key}`)}
              </span>
            </div>
            <div className="mt-1 text-sm text-zinc-600">{t("triads.order")}: {orderedDegrees.join(" → ")}</div>
          </div>

          <div className="mt-3 flex items-center gap-2 justify-center text-sm">
            <span className="text-zinc-600">{t("triads.progress")}</span>
            {orderedDegrees.map((lab, i) => (
              <span key={i} className={`rounded-full px-2.5 py-0.5 text-xs ${stepsCorrect[i] ? "bg-emerald-100 text-emerald-700" : i === step && !done ? "bg-zinc-100 text-zinc-700" : "bg-zinc-50 text-zinc-400"}`}>{lab}</span>
            ))}
            {done && <span className="rounded-full bg-emerald-600 px-2.5 py-0.5 text-xs text-white">{t("triads.correct")}</span>}
            {!done && judgement !== "idle" && (
              judgement === "correct" ? (
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">{t("triads.correct")}</span>
              ) : (
                <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-medium text-rose-700">{t("triads.wrong")}</span>
              )
            )}
          </div>

          <div className="mt-2 rounded-md bg-zinc-50 px-2 py-1 text-xs text-zinc-700">
            {curMidi != null ? (
              <span>
                {t("triads.current_note")}: {NOTE_NAMES_SHARP[pc(curMidi)]} ({curFreq?.toFixed(1)} Hz{curMidi != null ? `, ${curCents >= 0 ? "+" : ""}${curCents} cents` : ""})
              </span>
            ) : (
              <span>{t("triads.current_note_none")}</span>
            )}
          </div>

          <div className="mt-3 flex justify-center">
            <button onClick={() => setShowAnswer((v) => !v)} className="rounded-full border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50">
              {showAnswer ? t("triads.hide_answer") : t("triads.show_answer")}
            </button>
          </div>
          {showAnswer && (
            <div className="mt-2 text-sm text-zinc-800 text-center">
              {t("triads.answer")}: <span className="rounded bg-zinc-100 px-2 py-0.5 text-zinc-900 font-medium">{triadNotes}</span>
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-3 mt-4">
        <Fretboard
          rootMidi={makeRootMidiFromPc(rootPc)}
          currentMidi={curMidi ?? undefined}
          frets={12}
          mode={"both"}
          markByPcRoot
          markByPcCurrent
        />
      </div>

      <div className="mx-auto max-w-3xl px-3 mt-8 text-sm text-zinc-600">
        <p className="font-medium">{t("triads.hint.title")}</p>
        <ul className="mt-1 list-disc pl-5 space-y-1">
          <li>{t("triads.hint.1")}</li>
          <li>{t("triads.hint.order_prefix")} {orderedDegrees.join(" → ")} {t("triads.hint.order_suffix")}</li>
          <li>{t("triads.hint.3")}</li>
        </ul>
      </div>
    </div>
  );
}

function makeRootMidiFromPc(pcIndex: number) {
  const baseC3 = 48; // C3
  return baseC3 + ((pcIndex % 12) + 12) % 12;
}
