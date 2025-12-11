import type { Metadata } from "next";
import QuizClient from "./Client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "度数クイズ (Intervals Quiz)",
  description:
    "指定された度数をマイクで弾いて自動判定。耳と理論のトレーニングに最適なインタラクティブクイズ。",
  keywords: [
    "度数クイズ",
    "インターバル",
    "耳トレ",
    "interval quiz",
    "ear training",
  ],
};

export default function Page() {
  return <QuizClient />;
}
