import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AuthBar from "./components/AuthBar";
import Analytics from "./components/Analytics";
import { Suspense } from "react";
import pkg from "../package.json";
import Toast from "./components/Toast";
import { headers } from "next/headers";
import { LocaleProvider } from "./components/LocaleProvider";
import type { Locale } from "./lib/i18n";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";

export const metadata: Metadata = {
  title: {
    default: "TrackNote - 音楽練習の見える化ツール",
    template: "%s | TrackNote",
  },
  description:
    "TrackNoteはYouTube動画の曲コピー練習・音程トレーニング・コードトーンなど、楽器練習を見える化するWebアプリ。ゲストモードで今すぐ利用できます。",
  metadataBase: siteUrl ? new URL(siteUrl) : undefined,
  applicationName: "TrackNote",
  keywords: [
    "練習ツール",
    "練習記録",
    "練習進捗",
    "音程",
    "コード理論",
    "インターバル",
    "度数",
    "耳トレ",
    "指板",
    "ギター",
    "ベース",
    "TrackNote",
    "曲コピー",
    "タブ譜",
    "YouTube",
    // Triads/Tetrads (JP)
    "三和音",
    "四和音",
    "メジャートライアド",
    "マイナートライアド",
    "オーグメント",
    "ディミニッシュ",
    "セブンス",
    "メジャーセブンス",
    "ドミナントセブンス",
    "ハーフディミニッシュ",
    "ディミニッシュドセブンス",
    // Training (JP)
    "インターバルクイズ",
    "三和音クイズ",
    "4和音クイズ",
    "耳コピ",
    // English keywords
    "music practice app",
    "ear training",
    "interval training",
    "fretboard",
    "guitar practice",
    "bass practice",
    "triad",
    "major triad",
    "minor triad",
    "augmented triad",
    "diminished triad",
    "tetrad",
    "seventh chord",
    "major 7th",
    "dominant 7th",
    "minor 7th",
    "half-diminished",
    "diminished 7th",
  ],
  category: "Music",
  alternates: {
    canonical: siteUrl ? "/" : undefined,
  },
  openGraph: {
    type: "website",
    url: siteUrl || undefined,
    siteName: "TrackNote",
    title: "TrackNote",
    description:
      "TrackNoteはYouTube動画の曲コピー練習・音程トレーニング・コードトーンなど、楽器練習を見える化するWebアプリ。ゲストモードで今すぐ利用できます。",
    images: [{ url: "/opengraph-image" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "TrackNote",
    description:
      "TrackNoteはYouTube動画の曲コピー練習・音程トレーニング・コードトーンなど、楽器練習を見える化するWebアプリ。ゲストモードで今すぐ利用できます。",
    images: ["/twitter-image"],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/logo.png", type: "image/png", sizes: "192x192" },
      { url: "/logo.png", type: "image/png", sizes: "512x512" },
    ],
    shortcut: "/favicon.ico",
    apple: [
      { url: "/logo.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const h = await headers();
  const headerLocale = (h.get("x-locale") || "ja") as Locale;
  const year = new Date().getFullYear();
  const version = process.env.NEXT_PUBLIC_APP_VERSION || (pkg as any).version || "0.0.0";
  return (
    <html lang={headerLocale} className="bg-zinc-50">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-zinc-50 min-h-screen flex flex-col`}>
        {/* JSON-LD structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "TrackNote",
              url: siteUrl || undefined,
              description:
                "TrackNoteはYouTube動画の曲コピー練習・音程トレーニング・コードトーンなど、楽器練習を見える化するWebアプリ。ゲストモードで今すぐ利用できます。",
              applicationCategory: "Music",
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "TrackNote",
              alternateName: ["Track Note"],
              url: siteUrl || undefined,
            }),
          }}
        />
        <LocaleProvider locale={headerLocale}>
          <div className="sticky top-0 z-40 bg-white/95 backdrop-blur dark:bg-black/90">
            <div className="mx-auto max-w-5xl px-4 py-2">
              <AuthBar />
            </div>
            <div className="h-px w-full bg-zinc-200/70 dark:bg-zinc-800/60" />
          </div>
          <main className="flex-1 pb-12 md:pb-20">
            {children}
          </main>
          <footer className="border-t border-zinc-200/70 dark:border-zinc-800/60 bg-white/95 backdrop-blur dark:bg-black/90">
            <div className="mx-auto max-w-5xl px-4 py-6 text-center text-xs text-zinc-100">
              © {year} TrackNote v{version}
            </div>
          </footer>
          <Suspense fallback={null}>
            <Analytics />
          </Suspense>
          <Toast />
        </LocaleProvider>
      </body>
    </html>
  );
}
