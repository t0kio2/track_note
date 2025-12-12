import type { Metadata } from "next";
import TetradsQuizClient from "./Client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "四和音トレーニング (Tetrads)",
  description:
    "maj7/7/m7/m7b5/dim7 の四和音を指定の順番で演奏して判定。基本形〜第3転回形にも対応。",
  keywords: [
    "四和音",
    "セブンス",
    "テトラッド",
    "四和音トレーニング",
    "tetrad training",
    "ear training",
  ],
};

export default function Page() {
  return <TetradsQuizClient />;
}
