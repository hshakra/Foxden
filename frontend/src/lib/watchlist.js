import { useSyncExternalStore } from "react";

// pinned families and tags, stored in the browser
// a tiny external store so every component sees the same list

const KEY = "foxden-watchlist";
const listeners = new Set();
let cache = load();

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function save(next) {
  cache = next;
  localStorage.setItem(KEY, JSON.stringify(next));
  for (const fn of listeners) fn();
}

function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function isWatched(kind, name) {
  return cache.some((w) => w.kind === kind && w.name === name);
}

export function toggleWatch(kind, name) {
  save(
    isWatched(kind, name)
      ? cache.filter((w) => !(w.kind === kind && w.name === name))
      : [...cache, { kind, name }],
  );
}

export function useWatchlist() {
  return useSyncExternalStore(subscribe, () => cache);
}
