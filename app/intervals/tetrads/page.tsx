import type { Metadata } from "next";
import TetradsQuizClient from "./Client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Tetrads Quiz",
};

export default function Page() {
  return <TetradsQuizClient />;
}

