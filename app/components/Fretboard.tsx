"use client";

import React from "react";
import { useT } from "@/app/components/LocaleProvider";
import { notePcName, pc } from "@/app/lib/music";

type Props = {
  rootMidi?: number | null;
  currentMidi?: number | null;
  answerMidi?: number | null;
  frets?: number; // 表示フレット数（0含む）
  tuning?: number[]; // 各弦の開放音のMIDI（低→高）
  mode?: "root-only" | "current-only" | "both"; // 表示モード
  markByPcRoot?: boolean; // ルートをピッチクラス一致で表示
  markByPcCurrent?: boolean; // 現在音をピッチクラス一致で表示
  markByPcAnswer?: boolean; // 答えをピッチクラス一致で表示
};

const defaultTuning = [28, 33, 38, 43]; // E1 A1 D2 G2（低→高）

// NOTE_NAMES, pc 等は共通ユーティリティから利用

export default function Fretboard({ rootMidi = null, currentMidi = null, answerMidi = null, frets = 12, tuning = defaultTuning, mode = "both", markByPcRoot = false, markByPcCurrent = false, markByPcAnswer = false }: Props) {
  const t = useT();
  const rootRounded = rootMidi == null ? null : Math.round(rootMidi);
  const curRounded = currentMidi == null ? null : Math.round(currentMidi);
  const ansRounded = answerMidi == null ? null : Math.round(answerMidi);

  // 表示は 上=1弦(G) 下=4弦(E) になるように高→低で並べる
  const ordered = [...tuning].reverse(); // 高→低

  return (
    <div className="rounded-xl bg-white px-2 py-4 shadow-sm">
      <div className="mb-3 flex items-center gap-3 text-xs text-zinc-600">
        <span className="inline-flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-full bg-red-500" /> {t("fret.legend.root")}</span>
        <span className="inline-flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-full bg-blue-500" /> {t("fret.legend.current")}</span>
        {ansRounded != null && (
          <span className="inline-flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-full bg-emerald-500" /> {t("fret.legend.answer")}</span>
        )}
      </div>
      {/* 横スクロールなしで全表示（コンテナ幅にフィット） */}
      {/* ラベル列をさらに狭めてフレット幅を最大化（左余白を極小化） */}
      <div className="grid" style={{ gridTemplateColumns: `20px repeat(${frets + 1}, minmax(0, 1fr))` }}>
        {/* ヘッダ（空白 + フレット番号） */}
        <div />
        {Array.from({ length: frets + 1 }).map((_, i) => (
          <div key={i} className="px-1 py-1 text-center text-[10px] text-zinc-500">{i}</div>
        ))}

        {ordered.map((open, sIdx) => (
          <React.Fragment key={sIdx}>
            {/* 弦ラベル：弦番号を除き、開放音のコード名のみ表示（左余白を最小化） */}
            <div className="flex items-center justify-end pr-0 text-[10px] text-zinc-600">{notePcName(open)}</div>
            {/* フレットマス */}
            {Array.from({ length: frets + 1 }).map((_, fIdx) => {
              const m = open + fIdx; // そのマスの正確なMIDIノート
              const rootHit =
                rootRounded != null && (markByPcRoot ? pc(m) === pc(rootRounded) : m === rootRounded);
              const curHit =
                curRounded != null && (markByPcCurrent ? pc(m) === pc(curRounded) : m === curRounded);
              const ansHit =
                ansRounded != null && (markByPcAnswer ? pc(m) === pc(ansRounded) : m === ansRounded);
              const isRoot = mode !== "current-only" && rootHit;
              const isCur = mode !== "root-only" && curHit;
              const isAns = ansHit;
              const showDot = isRoot || isCur || isAns;
              const overlapCount = (isRoot ? 1 : 0) + (isCur ? 1 : 0) + (isAns ? 1 : 0);
              const dotColor = overlapCount >= 2
                ? "bg-purple-500"
                : isRoot
                ? "bg-red-500"
                : isCur
                ? "bg-blue-500"
                : isAns
                ? "bg-emerald-500"
                : "";
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
                      title={
                        isRoot && isCur
                          ? t("fret.tooltip.root_current")
                          : isRoot
                          ? t("fret.tooltip.root")
                          : isCur
                          ? t("fret.tooltip.current")
                          : undefined
                      }
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
