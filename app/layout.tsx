import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AuthBar from "./components/AuthBar";
import Analytics from "./components/Analytics";
import { Suspense } from "react";
import pkg from "../package.json";
import Toast from "./components/Toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TrackNote",
  description: "",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const year = new Date().getFullYear();
  const version = process.env.NEXT_PUBLIC_APP_VERSION || (pkg as any).version || "0.0.0";
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="mx-auto max-w-5xl px-4 py-2">
          <AuthBar />
        </div>
        {children}
        <footer className="mt-10 border-t">
          <div className="mx-auto max-w-5xl px-4 py-6 text-center text-xs text-zinc-500">
            © {year} TrackNote · v{version}
          </div>
        </footer>
        <Suspense fallback={null}>
          <Analytics />
        </Suspense>
        <Toast />
      </body>
    </html>
  );
}
