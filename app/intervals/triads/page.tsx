import type { Metadata } from "next";
import TriadQuizClient from "./Client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "三和音クイズ (Triads)",
  description:
    "C, Cm, C+, C° などの三和音を指定順に演奏して判定。基本形/第1/第2転回形にも対応。",
  keywords: [
    "三和音",
    "トライアド",
    "三和音クイズ",
    "triad quiz",
    "ear training",
  ],
};

export default function Page() {
  return <TriadQuizClient />;
}
