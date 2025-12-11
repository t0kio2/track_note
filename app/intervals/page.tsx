import type { Metadata } from "next";
import IntervalsClient from "./Client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "音程練習 (Intervals)",
  description:
    "マイク入力から音程(度数)をリアルタイム検出。ルート音と現在音の関係を可視化して耳と指板の結びつきを強化。",
  keywords: [
    "インターバル",
    "度数",
    "音程練習",
    "耳トレ",
    "指板",
    "interval training",
    "ear training",
    "fretboard",
  ],
};

export default function Page() {
  return <IntervalsClient />;
}
