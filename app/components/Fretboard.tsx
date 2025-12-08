"use client";

import React from "react";

type Props = {
  rootMidi?: number | null;
  currentMidi?: number | null;
  frets?: number; // 表示フレット数（0含む）
  tuning?: number[]; // 各弦の開放音のMIDI（低→高）
  mode?: "root-only" | "current-only" | "both"; // 表示モード
};

const defaultTuning = [28, 33, 38, 43]; // E1 A1 D2 G2（低→高）

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;
function noteNamePc(m: number) {
  const p = ((Math.round(m) % 12) + 12) % 12;
  return NOTE_NAMES[p];
}

function pc(m: number) {
  return ((Math.round(m) % 12) + 12) % 12;
}

export default function Fretboard({ rootMidi = null, currentMidi = null, frets = 12, tuning = defaultTuning, mode = "both" }: Props) {
  const rootRounded = rootMidi == null ? null : Math.round(rootMidi);
  const curRounded = currentMidi == null ? null : Math.round(currentMidi);

  // 表示は 上=1弦(G) 下=4弦(E) になるように高→低で並べる
  const ordered = [...tuning].reverse(); // 高→低

  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-3 text-xs text-zinc-600">
        <span className="inline-flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-full bg-red-500" /> ルート音の位置</span>
        <span className="inline-flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-full bg-blue-500" /> 現在音の位置</span>
      </div>
      {/* 横スクロールなしで全表示（コンテナ幅にフィット） */}
      {/* ナット行（フレット0） + frets 列 */}
      <div className="grid" style={{ gridTemplateColumns: `42px repeat(${frets + 1}, 1fr)` }}>
        {/* ヘッダ（空白 + フレット番号） */}
        <div />
        {Array.from({ length: frets + 1 }).map((_, i) => (
          <div key={i} className="px-1 py-1 text-center text-[10px] text-zinc-500">{i}</div>
        ))}

        {ordered.map((open, sIdx) => (
          <React.Fragment key={sIdx}>
            {/* 弦ラベル（1弦=最上段、開放音コードを併記） */}
            <div className="flex items-center justify-end pr-1 text-[11px] text-zinc-600">{`${sIdx + 1}弦 (${noteNamePc(open)})`}</div>
            {/* フレットマス */}
            {Array.from({ length: frets + 1 }).map((_, fIdx) => {
              const m = open + fIdx; // そのマスの正確なMIDIノート
              const rootHit = rootRounded != null && m === rootRounded;
              const curHit = curRounded != null && m === curRounded;
              const isRoot = mode !== "current-only" && rootHit;
              const isCur = mode !== "root-only" && curHit;
              const showDot = isRoot || isCur;
              const dotColor = isRoot && isCur ? "bg-purple-500" : isRoot ? "bg-red-500" : isCur ? "bg-blue-500" : "";
              const borderRight = fIdx === 0 ? "border-r-4 border-zinc-600" : "border-r"; // ナット太線
              const dotSize = 10;
              return (
                <div
                  key={fIdx}
                  className={`relative h-10 border-b ${borderRight} border-zinc-300 sm:h-12`}
                >
                  {/* ポジションマーク（3,5,7,9,12） */}
                  {sIdx === Math.floor(ordered.length / 2) && [3, 5, 7, 9, 12].includes(fIdx) && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-20">
                      <div className="h-2 w-2 rounded-full bg-zinc-500" />
                    </div>
                  )}
                  {/* ルート/現在マーク */}
                  {showDot && (
                    <div
                      className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 ${dotColor} rounded-full`}
                      style={{ width: dotSize, height: dotSize }}
                      title={isRoot && isCur ? "ルート・現在" : isRoot ? "ルート" : "現在"}
                    />
                  )}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
