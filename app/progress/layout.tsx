import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "コピー練習 (YouTube)",
  description:
    "YouTube の演奏動画を登録して、5秒ブロック単位でコピー練習の進捗を管理。ゲストでもすぐ記録できます。",
  keywords: [
    "曲コピー",
    "練習記録",
    "YouTube",
    "コピー練習",
    "progress tracker",
  ],
};

export default function ProgressLayout({ children }: { children: React.ReactNode }) {
  return children;
}

