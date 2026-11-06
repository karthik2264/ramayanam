import type { Bookmark, BookmarkTombstone, KandaId, Progress, ReadingFile } from "./types";

const TOMBSTONES_KEY = "ramayanam.bookmarkTombstones";
const readingListeners = new Set<() => void>();
let afterWrite: (() => void) | null = null;

export function subscribeReading(listener: () => void) {
  readingListeners.add(listener);
  return () => {
    readingListeners.delete(listener);
  };
}

export function onReadingWrite(listener: () => void) {
  afterWrite = listener;
}

function emitReading() {
  for (const listener of readingListeners) listener();
}

function wrote() {
  emitReading();
  afterWrite?.();
}

const DB_NAME = "ramayanam";
const DB_VERSION = 1;

function openDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("bookmarks")) {
        db.createObjectStore("bookmarks", { keyPath: "verseId" });
      }
      if (!db.objectStoreNames.contains("progress")) {
        db.createObjectStore("progress", { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionDone(tx: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

function requestToPromise<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function listBookmarks() {
  const db = await openDb();
  const rows = await requestToPromise(db.transaction("bookmarks").objectStore("bookmarks").getAll());
  return (rows as Bookmark[]).sort((a, b) => b.createdAt - a.createdAt);
}

export async function getBookmark(verseId: string) {
  const db = await openDb();
  const row = await requestToPromise(db.transaction("bookmarks").objectStore("bookmarks").get(verseId));
  return (row as Bookmark | undefined) ?? null;
}

export async function saveBookmark(bookmark: Bookmark) {
  const db = await openDb();
  await requestToPromise(db.transaction("bookmarks", "readwrite").objectStore("bookmarks").put(bookmark));
  forgetRemoval(bookmark.verseId);
  wrote();
}

export async function removeBookmark(verseId: string) {
  const db = await openDb();
  await requestToPromise(db.transaction("bookmarks", "readwrite").objectStore("bookmarks").delete(verseId));
  rememberRemoval(verseId);
  wrote();
}

export async function saveProgress(progress: Omit<Progress, "id">) {
  const db = await openDb();
  const tx = db.transaction("progress", "readwrite");
  const store = tx.objectStore("progress");
  const chapter: Progress = { ...progress, id: `${progress.kanda}/${progress.sarga}` };
  const last: Progress = { ...progress, id: "last" };
  store.put(chapter);
  store.put(last);
  await transactionDone(tx);
  wrote();
}

export async function getLastProgress() {
  const db = await openDb();
  const row = await requestToPromise(db.transaction("progress").objectStore("progress").get("last"));
  return (row as Progress | undefined) ?? null;
}

export async function listProgress() {
  const db = await openDb();
  const rows = await requestToPromise(db.transaction("progress").objectStore("progress").getAll());
  return (rows as Progress[]).filter((row) => row?.id);
}

export function readTombstones(): BookmarkTombstone[] {
  try {
    const raw = localStorage.getItem(TOMBSTONES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as BookmarkTombstone[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item && typeof item.verseId === "string" && typeof item.deletedAt === "number");
  } catch {
    return [];
  }
}

export function writeTombstones(rows: BookmarkTombstone[]) {
  const trimmed = [...rows].sort((a, b) => b.deletedAt - a.deletedAt).slice(0, 500);
  try {
    localStorage.setItem(TOMBSTONES_KEY, JSON.stringify(trimmed));
  } catch {
    // A full private-mode store can still keep the bookmarks in IndexedDB.
  }
}

function rememberRemoval(verseId: string) {
  const rows = readTombstones().filter((item) => item.verseId !== verseId);
  rows.push({ verseId, deletedAt: Date.now() });
  writeTombstones(rows);
}

function forgetRemoval(verseId: string) {
  writeTombstones(readTombstones().filter((item) => item.verseId !== verseId));
}

export async function exportReading(): Promise<ReadingFile> {
  const [bookmarks, progress] = await Promise.all([listBookmarks(), listProgress()]);
  return { version: 1, bookmarks, progress, removedBookmarks: readTombstones() };
}

export async function replaceReading(file: ReadingFile) {
  writeTombstones(file.removedBookmarks);
  const db = await openDb();
  const tx = db.transaction(["bookmarks", "progress"], "readwrite");
  const bookmarks = tx.objectStore("bookmarks");
  const progress = tx.objectStore("progress");
  bookmarks.clear();
  progress.clear();
  for (const bookmark of file.bookmarks) bookmarks.put(bookmark);
  for (const row of file.progress) progress.put(row);
  await transactionDone(tx);
  emitReading();
}

export function chapterPath(kanda: KandaId, sarga: number, verseId?: string) {
  const path = `/kanda/${kanda}/sarga/${sarga}`;
  return verseId ? `${path}?v=${encodeURIComponent(verseId)}` : path;
}
