import type { Metadata } from "next";
import QuizClient from "./Client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "度数トレーニング (Intervals Training)",
  description:
    "指定された度数をマイクで弾いて自動判定。耳と理論のトレーニングに最適なインタラクティブツール。",
  keywords: [
    "度数トレーニング",
    "インターバル",
    "耳トレ",
    "interval training",
    "ear training",
  ],
};

export default function Page() {
  return <QuizClient />;
}
