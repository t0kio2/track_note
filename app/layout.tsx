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
    <html lang={headerLocale}>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
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
          <div className="sticky top-0 z-40 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 dark:bg-black/90 supports-[backdrop-filter]:dark:bg-black/80">
            <div className="mx-auto max-w-5xl px-4 py-2">
              <AuthBar />
            </div>
            <div className="h-px w-full bg-zinc-200/70 dark:bg-zinc-800/60" />
          </div>
          {children}
          <footer className="mt-10">
            <div className="mx-auto max-w-5xl px-4 py-6 text-center text-xs text-zinc-500">
              © {year} TrackNote · v{version}
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
