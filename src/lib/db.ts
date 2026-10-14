import type { Bookmark, KandaId, Progress } from "./types";

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
}

export async function removeBookmark(verseId: string) {
  const db = await openDb();
  await requestToPromise(db.transaction("bookmarks", "readwrite").objectStore("bookmarks").delete(verseId));
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
}

export async function getLastProgress() {
  const db = await openDb();
  const row = await requestToPromise(db.transaction("progress").objectStore("progress").get("last"));
  return (row as Progress | undefined) ?? null;
}

export function chapterPath(kanda: KandaId, sarga: number, verseId?: string) {
  const path = `/kanda/${kanda}/sarga/${sarga}`;
  return verseId ? `${path}?v=${encodeURIComponent(verseId)}` : path;
}
