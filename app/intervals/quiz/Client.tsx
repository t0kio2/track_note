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

const NOTE_NAMES_SHARP = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"] as const;

function pc(n: number) { return ((Math.round(n) % 12) + 12) % 12; }
function notePcName(midi: number) { return NOTE_NAMES_SHARP[pc(midi)]; }

const DEGREE_LABEL: Record<number, string> = { 0: "R", 1: "b2", 2: "2", 3: "b3", 4: "3", 5: "4", 6: "#4/b5", 7: "5", 8: "#5/b6", 9: "6", 10: "b7", 11: "7" };
const ALL_DEGREES = [1,2,3,4,5,6,7,8,9,10,11] as const; // Rは除外
function randomElement<T>(arr: readonly T[]) { return arr[Math.floor(Math.random() * arr.length)]; }
function makeRootMidiFromPc(pcIndex: number) { const baseC3 = 48; return baseC3 + ((pcIndex % 12) + 12) % 12; }

export default function IntervalQuizClient() {
  const t = useT();
  const [running, setRunning] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string | undefined>(undefined);
  const [algo, setAlgo] = useState<"ACF2PLUS" | "YIN" | "DynamicWavelet" | "Macleod">("ACF2PLUS");

  const [curFreq, setCurFreq] = useState<number | null>(null);
  const [curMidi, setCurMidi] = useState<number | null>(null);
  const [status, setStatus] = useState<string>(t("quiz.status.idle"));

  const [rootPc, setRootPc] = useState<number>(0);
  const [targetSemis, setTargetSemis] = useState<number>(4);
  const rootMidi = useMemo(() => makeRootMidiFromPc(rootPc), [rootPc]);

  const [judgement, setJudgement] = useState<"idle" | "listening" | "correct" | "wrong">("idle");
  const [showAnswer, setShowAnswer] = useState(false);
  const rootPcRef = useRef<number>(rootPc);
  const targetRef = useRef<number>(targetSemis);
  useEffect(() => { rootPcRef.current = rootPc; }, [rootPc]);
  useEffect(() => { targetRef.current = targetSemis; }, [targetSemis]);

  const audioRef = useRef<AudioContext | null>(null);
  const procRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<Detector | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const collectRef = useRef<Float32Array | null>(null);
  const writePosRef = useRef<number>(0);
  const runningRef = useRef<boolean>(false);

  const newQuestion = () => {
    setRootPc(Math.floor(Math.random() * 12));
    setTargetSemis(randomElement(ALL_DEGREES));
    setJudgement("idle");
    setShowAnswer(false);
  };

  useEffect(() => { (async () => { try { const list = await navigator.mediaDevices.enumerateDevices(); const inputs = list.filter((d) => d.kind === "audioinput"); setDevices(inputs); if (inputs.length && !deviceId) setDeviceId(inputs[0].deviceId); } catch {} })(); }, []);

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
      let rms = 0; for (let i = 0; i < data.length; i++) rms += data[i] * data[i]; rms = Math.sqrt(rms / data.length);
      if (rms < 0.002) { setStatus(t("quiz.status.listening")); return; }
      const want = Math.min(N, 2048);
      const windowed = new Float32Array(want);
      const start = (writePosRef.current - N + N) & (N - 1);
      const offset = N - want;
      for (let i = 0; i < want; i++) windowed[i] = buf[(start + offset + i) & (N - 1)];
      const freq = detector(windowed) || null;
      if (!freq || !isFinite(freq) || freq < 30 || freq > 1000) { setStatus(t("quiz.status.listening")); return; }
      const midi = freqToMidi(freq);
      setCurFreq(freq); setCurMidi(midi); setStatus(t("quiz.status.detected"));
      const playedPc = pc(Math.round(midi));
      const rootPcLocal = ((rootPcRef.current % 12) + 12) % 12;
      const diff = ((playedPc - rootPcLocal) % 12 + 12) % 12;
      const ok = diff === targetRef.current;
      setJudgement(ok ? "correct" : "wrong");
    };
    source.connect(proc); proc.connect(gain); gain.connect(ctx.destination); procRef.current = proc;
  };

  const start = async () => {
    if (running) return;
    setStatus(t("quiz.status.mic_access"));
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: deviceId ? { exact: deviceId } : undefined, channelCount: 1, echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = ctx.createMediaStreamSource(stream);
      const gain = ctx.createGain(); gain.gain.value = 0;
      audioRef.current = ctx; sourceRef.current = source; streamRef.current = stream; gainRef.current = gain;
      setRunning(true); runningRef.current = true; setupProcessor(ctx, source, gain); setStatus(t("quiz.status.running"));
    } catch (err) { console.error(err); setStatus(t("quiz.status.mic_denied")); }
  };

  const stop = async () => { await stopAudio(); setRunning(false); runningRef.current = false; setStatus(t("quiz.status.stopped")); };

  useEffect(() => { newQuestion(); }, []);

  const rootName = useMemo(() => notePcName(rootMidi), [rootMidi]);
  const targetLabel = useMemo(() => DEGREE_LABEL[targetSemis] || "-", [targetSemis]);
  function renderQuestion() { const s = t("quiz.question"); return s.replace("{root}", rootName).replace("{degree}", targetLabel); }
  const answerPc = useMemo(() => ((rootPc + targetSemis) % 12 + 12) % 12, [rootPc, targetSemis]);
  const answerNote = useMemo(() => NOTE_NAMES_SHARP[answerPc], [answerPc]);
  const answerMidiForBoard = useMemo(() => makeRootMidiFromPc(answerPc), [answerPc]);
  const sameStringShift = targetSemis; const upperStringShift = targetSemis - 5; const fmtShift = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `-${Math.abs(n)}` : `±0`);
  const curCents = useMemo(() => (curFreq && curMidi ? centsOff(curFreq, Math.round(curMidi)) : 0), [curFreq, curMidi]);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto max-w-3xl px-3 py-4">
        <h1 className="text-xl font-semibold sm:text-2xl">{t("quiz.title")}</h1>
        <p className="mt-1 text-sm text-zinc-600">{t("quiz.subtitle")}</p>

        <div className="mt-3 flex items-center gap-2">
          {!running ? (
            <button onClick={start} className="rounded-full bg-emerald-600 px-4 py-2 text-sm text-white shadow-sm hover:bg-emerald-700">{t("quiz.start")}</button>
          ) : (
            <button onClick={stop} className="rounded-full bg-emerald-600 px-4 py-2 text-sm text-white shadow-sm hover:bg-emerald-700">{t("quiz.stop")}</button>
          )}
          <button onClick={newQuestion} className="rounded-full border border-emerald-300 px-4 py-2 text-sm text-emerald-700 hover:bg-emerald-50">{t("quiz.next")}</button>
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

        <div className="mt-4 rounded-xl bg-white p-4 shadow-sm mx-auto max-w-md">
          <div className="text-center">
            <div className="text-xs text-zinc-500">{t("quiz.question_label")}</div>
            <div className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">{renderQuestion()}</div>
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2" aria-hidden>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">{rootName}</span>
            <span className="text-zinc-400">→</span>
            <span className="rounded-full bg-violet-50 px-3 py-1 text-sm font-medium text-violet-700">{targetLabel}</span>
          </div>
          <div className="mt-3 flex items-center justify-start gap-2 text-sm">
            <span className="text-zinc-600">{t("quiz.judge")}</span>
            {judgement === "idle" && (<span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-700">{t("quiz.judge_idle")}</span>)}
            {judgement === "listening" && (<span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-700">{t("quiz.judge_listening")}</span>)}
            {judgement === "correct" && (<span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">{t("quiz.correct")}</span>)}
            {judgement === "wrong" && (<span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-medium text-rose-700">{t("quiz.wrong")}</span>)}
          </div>
          <div className="mt-2 rounded-md bg-zinc-50 px-2 py-1 text-xs text-zinc-700">
            {curMidi != null ? (
              <span>
                {t("quiz.current_note")}: {NOTE_NAMES_SHARP[pc(curMidi)]} ({curFreq?.toFixed(1)} Hz{curMidi != null ? `, ${curCents >= 0 ? "+" : ""}${curCents} cents` : ""})
              </span>
            ) : (
              <span>{t("quiz.current_note_none")}</span>
            )}
          </div>
          <div className="mt-3 flex justify-center">
            <button onClick={() => setShowAnswer((v) => !v)} className="rounded-full border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50">
              {showAnswer ? t("quiz.hide_answer") : t("quiz.show_answer")}
            </button>
          </div>
          {showAnswer && (
            <div className="mt-2 text-sm text-zinc-800">
              <div className="flex items-center justify-center gap-2">
                <span className="font-medium">{t("quiz.answer_label")}:</span>
                <span className="rounded bg-zinc-100 px-2 py-0.5 text-zinc-800">{answerNote}</span>
              </div>
              <div className="mt-2 text-xs text-zinc-600">
                <div className="font-medium text-zinc-700">{t("quiz.finding_title")}:</div>
                <div className="mt-1"><span className="rounded bg-zinc-100 px-1.5 py-0.5 text-zinc-700">{t("quiz.finding_same_string")}: {fmtShift(sameStringShift)}f</span></div>
                <div className="mt-1"><span className="rounded bg-zinc-100 px-1.5 py-0.5 text-zinc-700">{t("quiz.finding_upper_string")}: {fmtShift(upperStringShift)}f</span><span className="ml-1 text-[11px] text-zinc-500">({t("quiz.upper_string_hint")})</span></div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-3 mt-4">
        <Fretboard
          rootMidi={rootMidi}
          currentMidi={curMidi ?? undefined}
          answerMidi={showAnswer ? answerMidiForBoard : undefined}
          frets={12}
          mode={"both"}
          markByPcRoot
          markByPcAnswer={showAnswer}
        />
      </div>

      <div className="mx-auto max-w-3xl px-3 mt-8 text-sm text-zinc-600">
        <p className="font-medium">{t("quiz.howto.title")}</p>
        <ul className="mt-1 list-disc pl-5 space-y-1">
          <li>{t("quiz.howto.1")}</li>
          <li>{t("quiz.howto.2")}</li>
          <li>{t("quiz.howto.3")}</li>
          <li>{t("quiz.howto.4")}</li>
        </ul>
      </div>
    </div>
  );
}

