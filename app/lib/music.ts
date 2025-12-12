// 音名・音高関連の共通ユーティリティ

export const NOTE_NAMES_SHARP = [
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

export type NoteNameSharp = (typeof NOTE_NAMES_SHARP)[number];

// 四捨五入した MIDI ノート番号を 0..11 のピッチクラスに正規化
export const pc = (n: number) => ((Math.round(n) % 12) + 12) % 12;

export function midiToFreq(midi: number) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function freqToMidi(freq: number) {
  return 69 + 12 * Math.log2(freq / 440);
}

export function centsOff(freq: number, midi: number) {
  const ref = midiToFreq(midi);
  return Math.round(1200 * Math.log2(freq / ref));
}

export function notePcName(midi: number): NoteNameSharp {
  return NOTE_NAMES_SHARP[pc(midi)];
}

export function noteNameFromMidi(midi: number) {
  const n = Math.round(midi);
  const name = NOTE_NAMES_SHARP[(n + 1200) % 12];
  const octave = Math.floor(n / 12) - 1;
  return `${name}${octave}`;
}

// 半音数(0..11) -> 表示用度数ラベル
export const DEGREE_LABEL: Record<number, string> = {
  0: "R",
  1: "b2",
  2: "2",
  3: "b3",
  4: "3",
  5: "4",
  6: "#4/b5",
  7: "5",
  8: "#5/b6",
  9: "6",
  10: "b7",
  11: "7",
};

// 互換目的のエイリアス
export const DEGREE_MAP = DEGREE_LABEL;
