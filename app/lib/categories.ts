"use client";

import { STORAGE_KEYS } from "./types";

type CategoryMap = Record<string, string | undefined>;

function read(): CategoryMap {
  try {
    const s = localStorage.getItem(STORAGE_KEYS.categories);
    if (!s) return {};
    return JSON.parse(s) as CategoryMap;
  } catch {
    return {};
  }
}

function write(map: CategoryMap) {
  try {
    localStorage.setItem(STORAGE_KEYS.categories, JSON.stringify(map));
  } catch {}
}

export function getCategory(videoId: string): string | undefined {
  const map = read();
  return map[videoId] || undefined;
}

export function setCategory(videoId: string, category?: string) {
  const map = read();
  if (category && category.trim()) {
    map[videoId] = category.trim();
  } else {
    delete map[videoId];
  }
  write(map);
  try { window.dispatchEvent(new Event("tracknote-category-changed")); } catch {}
}

export function removeCategory(videoId: string) {
  const map = read();
  if (map[videoId] !== undefined) {
    delete map[videoId];
    write(map);
    try { window.dispatchEvent(new Event("tracknote-category-changed")); } catch {}
  }
}

export function getAllCategories(): string[] {
  const map = read();
  const set = new Set<string>();
  Object.values(map).forEach((v) => { if (v) set.add(v); });
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

