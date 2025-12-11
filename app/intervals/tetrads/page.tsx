import type { Metadata } from "next";
import TetradsQuizClient from "./Client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "4和音クイズ (Tetrads)",
  description:
    "maj7/7/m7/m7b5/dim7 の4和音を指定の順番で演奏して判定。基本形〜第3転回形にも対応。",
  keywords: [
    "4和音",
    "セブンス",
    "テトラッド",
    "4和音クイズ",
    "tetrad quiz",
    "ear training",
  ],
};

export default function Page() {
  return <TetradsQuizClient />;
}
