"use client";

import Link from "next/link";
import { useT } from "@/app/components/LocaleProvider";

export default function HomeHub() {
  const t = useT();
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
        <h1 className="text-2xl font-semibold tracking-tight">TrackNote</h1>
        <p className="mt-1 text-sm text-zinc-600">{t("hub.subtitle")}</p>
      </header>
      <main className="mx-auto max-w-5xl px-4 pb-24">
        <section aria-label="modules" className="mt-2">
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <li>
              <Link
                href="/progress"
                aria-labelledby="card-progress-title"
                className="group block rounded-xl bg-white p-5 shadow-sm transition duration-150 hover:-translate-y-0.5 hover:bg-zinc-50 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600"
              >
                <div className="flex items-start gap-3">
                  <div aria-hidden className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-md bg-emerald-100 text-emerald-700">🎬</div>
                  <div className="min-w-0">
                    <h2 id="card-progress-title" className="truncate text-base font-medium text-zinc-900">
                      {t("hub.progress.title")}
                    </h2>
                    <p className="mt-0.5 line-clamp-2 text-sm text-zinc-600">{t("hub.progress.desc")}</p>
                  </div>
                  <div aria-hidden className="ml-auto mt-1 text-zinc-400 transition group-hover:translate-x-0.5">→</div>
                </div>
              </Link>
            </li>
            <li>
              <Link
                href="/intervals"
                aria-labelledby="card-intervals-title"
                className="group block rounded-xl bg-white p-5 shadow-sm transition duration-150 hover:-translate-y-0.5 hover:bg-zinc-50 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600"
              >
                <div className="flex items-start gap-3">
                  <div aria-hidden className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-md bg-blue-100 text-blue-700">🎵</div>
                  <div className="min-w-0">
                    <h2 id="card-intervals-title" className="truncate text-base font-medium text-zinc-900">
                      {t("hub.intervals.title")}
                    </h2>
                    <p className="mt-0.5 line-clamp-2 text-sm text-zinc-600">{t("hub.intervals.desc")}</p>
                  </div>
                  <div aria-hidden className="ml-auto mt-1 text-zinc-400 transition group-hover:translate-x-0.5">→</div>
                </div>
              </Link>
            </li>
            <li>
              <Link
                href="/intervals/quiz"
                aria-labelledby="card-quiz-title"
                className="group block rounded-xl bg-white p-5 shadow-sm transition duration-150 hover:-translate-y-0.5 hover:bg-zinc-50 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600"
              >
                <div className="flex items-start gap-3">
                  <div aria-hidden className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-md bg-violet-100 text-violet-700">❓</div>
                  <div className="min-w-0">
                    <h2 id="card-quiz-title" className="truncate text-base font-medium text-zinc-900">
                      {t("hub.intervals_quiz.title")}
                    </h2>
                    <p className="mt-0.5 line-clamp-2 text-sm text-zinc-600">{t("hub.intervals_quiz.desc")}</p>
                  </div>
                  <div aria-hidden className="ml-auto mt-1 text-zinc-400 transition group-hover:translate-x-0.5">→</div>
                </div>
              </Link>
            </li>
          </ul>
        </section>
      </main>
    </div>
  );
}
