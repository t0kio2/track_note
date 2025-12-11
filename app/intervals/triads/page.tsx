import type { Metadata } from "next";
import TriadQuizClient from "./Client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Triads Quiz",
};

export default function Page() {
  return <TriadQuizClient />;
}

