import type { Metadata } from "next";
import QuizClient from "./Client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Intervals Quiz",
};

export default function Page() {
  return <QuizClient />;
}

