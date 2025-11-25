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
    default: "TrackNote",
    template: "%s | TrackNote",
  },
  description: "YouTube のタブ譜動画で練習進捗を記録・管理できるアプリ",
  metadataBase: siteUrl ? new URL(siteUrl) : undefined,
  alternates: {
    canonical: siteUrl ? "/" : undefined,
  },
  openGraph: {
    type: "website",
    url: siteUrl || undefined,
    siteName: "TrackNote",
    title: "TrackNote",
    description: "YouTube のタブ譜動画で練習進捗を記録・管理",
    images: [{ url: "/opengraph-image" }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@",
    creator: "@",
    title: "TrackNote",
    description: "YouTube のタブ譜動画で練習進捗を記録・管理",
    images: ["/twitter-image"],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/favicon.ico",
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
              applicationCategory: "Music",
            }),
          }}
        />
        <LocaleProvider locale={headerLocale}>
          <div className="mx-auto max-w-5xl px-4 py-2">
            <AuthBar />
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
