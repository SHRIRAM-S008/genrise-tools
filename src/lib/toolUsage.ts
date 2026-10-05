"use client";

import { useSyncExternalStore } from "react";

const RECENT_KEY = "genrise:recent-tools";
const FAVORITES_KEY = "genrise:favorite-tools";
const CHANGE_EVENT = "genrise:tools-changed";
const MAX_RECENT = 8;

function readList(key: string): string[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(key) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === "string") : [];
  } catch {
    return [];
  }
}

function writeList(key: string, value: string[]) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    // Quota or private mode: usage simply isn't remembered.
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function rawSnapshot(key: string) {
  return () => {
    try {
      return window.localStorage.getItem(key) ?? "[]";
    } catch {
      return "[]";
    }
  };
}

const serverSnapshot = () => "[]";

/** Call once when a tool page opens to move it to the front of "recent". */
export function recordToolVisit(slug: string) {
  const recent = readList(RECENT_KEY).filter((s) => s !== slug);
  writeList(RECENT_KEY, [slug, ...recent].slice(0, MAX_RECENT));
}

export function toggleFavorite(slug: string) {
  const favorites = readList(FAVORITES_KEY);
  writeList(
    FAVORITES_KEY,
    favorites.includes(slug) ? favorites.filter((s) => s !== slug) : [...favorites, slug]
  );
}

export function useRecentTools(): string[] {
  const raw = useSyncExternalStore(subscribe, rawSnapshot(RECENT_KEY), serverSnapshot);
  return parseList(raw);
}

export function useFavoriteTools(): string[] {
  const raw = useSyncExternalStore(subscribe, rawSnapshot(FAVORITES_KEY), serverSnapshot);
  return parseList(raw);
}

function parseList(raw: string): string[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === "string") : [];
  } catch {
    return [];
  }
}
